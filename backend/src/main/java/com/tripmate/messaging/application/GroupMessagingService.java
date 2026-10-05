package com.tripmate.messaging.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.messaging.infrastructure.GroupConversationRepository;
import com.tripmate.messaging.infrastructure.GroupConversationRepository.*;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;
import com.tripmate.trips.api.GroupTripSharing;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional
public class GroupMessagingService {
    private static final int MAX_MEMBERS = 100;
    private final GroupConversationRepository groups;
    private final UserDirectory users;
    private final FriendshipAccess friends;
    private final GroupTripSharing trips;
    private final ConversationCursor cursors;
    public GroupMessagingService(GroupConversationRepository groups, UserDirectory users, FriendshipAccess friends,
                                 GroupTripSharing trips, ConversationCursor cursors) {
        this.groups = groups; this.users = users; this.friends = friends; this.trips = trips; this.cursors = cursors;
    }
    public GroupView create(String name, List<UUID> memberIds, UUID tripId) {
        UUID actor = actor(); name = name(name);
        if (memberIds == null || memberIds.size() >= MAX_MEMBERS || memberIds.stream().anyMatch(Objects::isNull)
                || memberIds.contains(actor) || new HashSet<>(memberIds).size() != memberIds.size())
            throw invalid("memberIds tối đa 99 người khác nhau, không gồm người tạo.");
        for (UUID member : memberIds) requireFriend(actor, member);
        if (tripId != null) trips.requireOwned(tripId, actor);
        Instant now = now();
        Group group = new Group(UUID.randomUUID(), actor, name, tripId, 0, 0, null, now, now);
        groups.insert(group); groups.join(group.id(), actor, 0, now);
        for (UUID member : memberIds) groups.join(group.id(), member, 0, now);
        return view(group, actor);
    }
    public GroupPage list(String cursor, int limit) {
        UUID actor = actor(); limit(limit);
        var position = cursor == null ? null : cursors.decode("group-conversations", cursor, actor, limit);
        var found = groups.list(actor, position == null ? null : position.time(), position == null ? null : position.id(), limit + 1);
        boolean more = found.size() > limit;
        var selected = found.subList(0, Math.min(found.size(), limit));
        var tail = selected.isEmpty() ? null : selected.getLast();
        return new GroupPage(selected.stream().map(g -> view(g, actor)).toList(),
                new PageInfo(more ? cursors.encode("group-conversations", actor, limit, tail.updatedAt(), tail.id()) : null, more));
    }
    public GroupView get(UUID id) { UUID actor = actor(); return view(access(id, actor, false), actor); }
    public GroupView update(UUID id, String expectedVersion, String name, boolean changeTrip, UUID tripId) {
        UUID actor = actor(); Group g = access(id, actor, true); owner(g, actor); writable(g); version(g, expectedVersion);
        if (name == null && !changeTrip) throw invalid("Cần name hoặc tripId.");
        String nextName = name == null ? g.name() : name(name);
        UUID nextTrip = changeTrip ? tripId : g.tripId();
        if (changeTrip && nextTrip != null) trips.requireOwned(nextTrip, actor);
        if (!nextName.equals(g.name()) || !Objects.equals(nextTrip, g.tripId())) {
            g = changed(g, actor, nextName, nextTrip, null); groups.save(g);
        }
        return view(g, actor);
    }
    public GroupView archive(UUID id, String expectedVersion) {
        UUID actor = actor(); Group g = access(id, actor, true); owner(g, actor);
        if (g.archivedAt() == null) { version(g, expectedVersion); g = changed(g, actor, g.name(), g.tripId(), now()); groups.save(g); }
        return view(g, actor);
    }
    public List<MemberView> members(UUID id) {
        UUID actor = actor(); Group g = access(id, actor, false);
        return groups.members(id).stream().map(m -> memberView(g, m)).toList();
    }
    public MemberView add(UUID id, UUID userId, String expectedVersion) {
        UUID actor = actor(); Group g = access(id, actor, true); owner(g, actor); writable(g);
        if (userId == null) throw invalid("Cần userId.");
        var existing = groups.member(id, userId);
        if (existing.filter(m -> m.status().equals("ACTIVE")).isPresent()) return memberView(g, existing.get());
        version(g, expectedVersion); requireFriend(actor, userId);
        if (groups.members(id).size() >= MAX_MEMBERS) throw conflict("GROUP_FULL", "Nhóm tối đa 100 thành viên.");
        Instant now = now(); groups.join(id, userId, g.lastSeq(), now);
        groups.save(changed(g, g.ownerId(), g.name(), g.tripId(), null));
        return memberView(g, new Member(userId, "ACTIVE", g.lastSeq(), now));
    }
    public void remove(UUID id, UUID userId, String expectedVersion) {
        UUID actor = actor(); Group g = access(id, actor, true); owner(g, actor);
        if (userId.equals(g.ownerId())) throw conflict("OWNER_CANNOT_LEAVE", "Chuyển quyền trước khi rời nhóm.");
        var member = groups.member(id, userId).orElseThrow(this::notFound);
        if (!member.status().equals("ACTIVE")) return;
        version(g, expectedVersion); groups.end(id, userId, "REMOVED", now());
        groups.save(changed(g, g.ownerId(), g.name(), g.tripId(), g.archivedAt()));
    }
    public void leave(UUID id) {
        UUID actor = actor(); Group g = groups.find(id, true).orElseThrow(this::notFound);
        var member = groups.member(id, actor).orElseThrow(this::notFound);
        if (!member.status().equals("ACTIVE")) return; // Retry is safe, without restoring access.
        if (g.ownerId().equals(actor)) throw conflict("OWNER_CANNOT_LEAVE", "Chuyển quyền trước khi rời nhóm.");
        groups.end(id, actor, "LEFT", now()); groups.save(changed(g, g.ownerId(), g.name(), g.tripId(), g.archivedAt()));
    }
    public GroupView transfer(UUID id, UUID nextOwner, String expectedVersion) {
        UUID actor = actor(); Group g = access(id, actor, true); owner(g, actor); writable(g); version(g, expectedVersion);
        if (nextOwner == null) throw invalid("Cần userId của trưởng nhóm mới.");
        active(id, nextOwner);
        if (!users.find(nextOwner).active()) throw notFound();
        if (!actor.equals(nextOwner)) { g = changed(g, nextOwner, g.name(), null, null); groups.save(g); }
        return view(g, actor); // Moving ownership clears the previous owner's private trip link.
    }
    public GroupTripSharing.TripView trip(UUID id) {
        UUID actor = actor(); Group g = access(id, actor, true);
        if (g.tripId() == null) throw new ApiException(HttpStatus.NOT_FOUND, "TRIP_NOT_LINKED", "Nhóm chưa gắn chuyến đi.");
        return trips.viewOwned(g.tripId(), g.ownerId());
    }
    public MessageView send(UUID id, UUID clientMessageId, String body) {
        UUID actor = actor(); Group g = access(id, actor, true);
        if (clientMessageId == null || body == null || body.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))
                || body.codePointCount(0, body.length()) > 4000) throw invalid("Tin nhắn cần mã gửi và nội dung không trắng, tối đa 4.000 ký tự.");
        var previous = groups.retry(id, actor, clientMessageId);
        if (previous.isPresent()) {
            if (!previous.get().body().equals(body)) throw conflict("IDEMPOTENCY_CONFLICT", "Mã gửi đã dùng cho nội dung khác.");
            return message(previous.get());
        }
        writable(g);
        if (g.lastSeq() == Long.MAX_VALUE) throw conflict("MESSAGE_LIMIT_REACHED", "Nhóm đã đạt giới hạn tin nhắn.");
        Instant now = now();
        var created = new Message(UUID.randomUUID(), id, actor, clientMessageId, g.lastSeq() + 1, body, now);
        groups.insertMessage(created);
        groups.save(new Group(g.id(), g.ownerId(), g.name(), g.tripId(), g.version(), created.seq(), g.archivedAt(), g.createdAt(), now));
        return message(created);
    }
    public MessagePage history(UUID id, String beforeSeq, String afterSeq, int limit) {
        UUID actor = actor(); access(id, actor, false); limit(limit);
        if (beforeSeq != null && afterSeq != null) throw badQuery("Không dùng cả beforeSeq và afterSeq.");
        Long before = beforeSeq == null ? null : querySeq(beforeSeq), after = afterSeq == null ? null : querySeq(afterSeq);
        var found = groups.history(id, before, after, limit + 1); boolean more = found.size() > limit;
        var selected = new ArrayList<>(found.subList(0, Math.min(found.size(), limit)));
        if (after == null) Collections.reverse(selected);
        long min = selected.isEmpty() ? 0 : selected.getFirst().seq();
        long max = selected.isEmpty() ? (after == null ? 0 : after) : selected.getLast().seq();
        return new MessagePage(selected.stream().map(this::message).toList(), new MessagePageInfo(more, min > 1 ? Long.toString(min) : null, Long.toString(max)));
    }
    public ReadView read(UUID id, String lastReadSeq) {
        UUID actor = actor(); Group g = access(id, actor, true); long seq = seq(lastReadSeq);
        if (seq > g.lastSeq()) throw invalid("Mốc đọc vượt quá tin nhắn cuối.");
        long next = Math.max(active(id, actor).readSeq(), seq); groups.read(id, actor, next);
        return new ReadView(id, Long.toString(next), Long.toString(groups.unread(id, actor, next)));
    }
    private Group access(UUID id, UUID actor, boolean lock) {
        Group group = groups.find(id, lock).orElseThrow(this::notFound); active(id, actor); return group;
    }
    private Member active(UUID id, UUID actor) {
        return groups.member(id, actor).filter(m -> m.status().equals("ACTIVE")).orElseThrow(this::notFound);
    }
    private GroupView view(Group g, UUID actor) {
        var member = active(g.id(), actor);
        return new GroupView(g.id(), g.name(), g.ownerId(), g.tripId(), Long.toString(g.version()), groups.members(g.id()).size(),
                groups.last(g.id()).map(this::message).orElse(null), Long.toString(g.lastSeq()), Long.toString(member.readSeq()),
                Long.toString(groups.unread(g.id(), actor, member.readSeq())), g.archivedAt() != null, g.archivedAt() == null, g.createdAt(), g.updatedAt());
    }
    private MemberView memberView(Group g, Member m) { return new MemberView(summary(users.find(m.userId())),
            g.ownerId().equals(m.userId()) ? "OWNER" : "MEMBER", Long.toString(m.readSeq()), m.joinedAt()); }
    private MessageView message(Message m) { return new MessageView(m.id(), m.conversationId(), Long.toString(m.seq()),
            summary(users.find(m.senderId())), m.clientMessageId(), m.body(), m.createdAt()); }
    private UserSummary summary(UserDirectory.UserSummary u) { return new UserSummary(u.id(), u.displayName(), u.avatarMediaId()); }
    private void requireFriend(UUID owner, UUID target) {
        if (owner.equals(target)) throw invalid("Không thêm lại trưởng nhóm.");
        if (!friends.areFriends(owner, target)) throw new ApiException(HttpStatus.FORBIDDEN, "NOT_FRIENDS", "Chỉ thêm người đang là bạn của trưởng nhóm.");
        if (!users.find(target).active()) throw notFound();
    }
    private void owner(Group g, UUID actor) { if (!g.ownerId().equals(actor)) throw new ApiException(HttpStatus.FORBIDDEN, "OWNER_REQUIRED", "Chỉ trưởng nhóm được quản lý nhóm."); }
    private void writable(Group g) { if (g.archivedAt() != null) throw conflict("GROUP_ARCHIVED", "Nhóm đã đóng, chỉ xem lịch sử."); }
    private void version(Group g, String value) { if (seq(value) != g.version()) throw conflict("VERSION_CONFLICT", "Nhóm đã thay đổi, hãy tải lại."); }
    private Group changed(Group g, UUID owner, String name, UUID trip, Instant archived) {
        if (g.version() == Long.MAX_VALUE) throw conflict("VERSION_LIMIT_REACHED", "Nhóm đạt giới hạn phiên bản.");
        return new Group(g.id(), owner, name, trip, g.version() + 1, g.lastSeq(), archived, g.createdAt(), now());
    }
    private String name(String value) {
        if (value == null || value.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))
                || value.strip().codePointCount(0, value.strip().length()) > 100) throw invalid("Tên nhóm từ 1 đến 100 ký tự.");
        return value.strip();
    }
    private long seq(String value) {
        try { if (value == null || !value.matches("^(0|[1-9][0-9]{0,18})$")) throw new IllegalArgumentException(); return Long.parseLong(value); }
        catch (RuntimeException e) { throw invalid("Mốc đọc/phiên bản phải là chuỗi bigint không âm."); }
    }
    private Long querySeq(String value) { try { return seq(value); } catch (ApiException e) { throw badQuery("seq không hợp lệ."); } }
    private void limit(int value) { if (value < 1 || value > 100) throw badQuery("limit từ 1 đến 100."); }
    private UUID actor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedActor actor))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        return actor.userId();
    }
    private Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
    private ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "GROUP_NOT_FOUND", "Không tìm thấy nhóm hoặc thành viên."); }
    private ApiException invalid(String message) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message); }
    private ApiException badQuery(String message) { return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message); }
    private ApiException conflict(String code, String message) { return new ApiException(HttpStatus.CONFLICT, code, message); }
    public record UserSummary(UUID id, String displayName, UUID avatarMediaId) {}
    public record GroupView(UUID id, String name, UUID ownerId, UUID tripId, String version, int memberCount, MessageView lastMessage,
                            String lastSeq, String lastReadSeq, String unreadCount, boolean archived, boolean canSend, Instant createdAt, Instant updatedAt) {}
    public record MemberView(UserSummary user, String role, String lastReadSeq, Instant joinedAt) {}
    public record MessageView(UUID id, UUID conversationId, String seq, UserSummary sender, UUID clientMessageId, String body, Instant createdAt) {}
    public record PageInfo(String nextCursor, boolean hasMore) {}
    public record GroupPage(List<GroupView> items, PageInfo pageInfo) {}
    public record MessagePageInfo(boolean hasMore, String nextBeforeSeq, String nextAfterSeq) {}
    public record MessagePage(List<MessageView> items, MessagePageInfo pageInfo) {}
    public record ReadView(UUID conversationId, String lastReadSeq, String unreadCount) {}
}
