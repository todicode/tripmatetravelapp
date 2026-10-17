package com.tripmate.social.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.shared.security.CurrentActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.RelationshipLookup;
import com.tripmate.social.domain.FriendRequestEntity;
import com.tripmate.social.domain.FriendRequestStatus;
import com.tripmate.social.domain.FriendshipEntity;
import com.tripmate.social.domain.FriendshipKey;
import com.tripmate.social.infrastructure.FriendRequestRepository;
import com.tripmate.social.infrastructure.FriendshipRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
public class SocialService implements RelationshipLookup {
    private final UserDirectory users;
    private final FriendRequestRepository requests;
    private final FriendshipRepository friendships;

    public SocialService(
            UserDirectory users,
            FriendRequestRepository requests,
            FriendshipRepository friendships) {
        this.users = users;
        this.requests = requests;
        this.friendships = friendships;
    }

    @Override
    @Transactional(readOnly = true)
    public Relationship between(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) return new Relationship("SELF", null);
        if (friendships.existsById(new FriendshipKey(actorId, targetId)))
            return new Relationship("FRIEND", null);
        return requests.findPairByStatus(actorId, targetId, FriendRequestStatus.PENDING)
                .map(
                        request ->
                                new Relationship(
                                        request.getSenderId().equals(actorId)
                                                ? "OUTGOING_PENDING"
                                                : "INCOMING_PENDING",
                                        request.getId()))
                .orElseGet(() -> new Relationship("NONE", null));
    }

    @Transactional
    public Object send(UUID recipientId, String message) {
        UUID senderId = actorId();
        if (senderId.equals(recipientId))
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "SELF_FRIEND_REQUEST",
                    "Không thể tự kết bạn.");
        lockPair(senderId, recipientId);

        FriendshipKey key = new FriendshipKey(senderId, recipientId);
        var friendship = friendships.findById(key);
        if (friendship.isPresent())
            return new AlreadyFriendsResult(
                    "ALREADY_FRIENDS", friendship(friendship.get(), senderId));
        var pending = requests.findPairByStatus(senderId, recipientId, FriendRequestStatus.PENDING);
        if (pending.isPresent()) return new PendingResult("PENDING", request(pending.get()));
        String note = message == null || message.isBlank() ? null : message.trim();
        if (note != null && note.length() > 500) throw invalid("Lời nhắn tối đa 500 ký tự.");
        FriendRequestEntity created =
                requests.saveAndFlush(
                        new FriendRequestEntity(UUID.randomUUID(), senderId, recipientId, note));
        return new PendingResult("PENDING", request(created));
    }

    @Transactional
    public FriendRequestView accept(UUID requestId) {
        return resolve(requestId, FriendRequestStatus.ACCEPTED);
    }

    @Transactional
    public FriendRequestView reject(UUID requestId) {
        return resolve(requestId, FriendRequestStatus.REJECTED);
    }

    @Transactional
    public FriendRequestView cancel(UUID requestId) {
        return resolve(requestId, FriendRequestStatus.CANCELLED);
    }

    private FriendRequestView resolve(UUID requestId, FriendRequestStatus action) {
        UUID actor = actorId();
        // Read identifiers only so the entity is first loaded after the pair locks.
        var participants = requests.participants(requestId).orElseThrow(this::requestNotFound);
        UUID senderId = participants.getSenderId(), recipientId = participants.getRecipientId();
        boolean allowed =
                action == FriendRequestStatus.CANCELLED
                        ? actor.equals(senderId)
                        : actor.equals(recipientId);
        if (!allowed)
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không thể xử lý lời mời này.");
        lockPair(senderId, recipientId);
        FriendRequestEntity current =
                requests.findByIdForUpdate(requestId).orElseThrow(this::requestNotFound);
        if (current.getStatus() != FriendRequestStatus.PENDING) return request(current);
        if (action == FriendRequestStatus.ACCEPTED) {
            FriendshipKey key = new FriendshipKey(senderId, recipientId);
            if (!friendships.existsById(key)) friendships.saveAndFlush(new FriendshipEntity(key));
        }
        current.resolve(action);
        requests.saveAndFlush(current);
        return request(current);
    }

    @Transactional
    public void removeFriend(UUID otherId) {
        UUID actor = actorId();
        if (actor.equals(otherId)) throw invalid("Không thể tự hủy kết bạn.");
        lockPair(actor, otherId);
        friendships.deleteById(new FriendshipKey(actor, otherId));
    }

    @Transactional(readOnly = true)
    public PageResult<FriendshipView> friends(String cursor, int limit) {
        UUID actor = actorId();
        int index = pageIndex(cursor, limit);
        Page<FriendshipEntity> page =
                friendships.forUser(
                        actor,
                        PageRequest.of(
                                index,
                                limit,
                                Sort.by(
                                        Sort.Order.desc("createdAt"),
                                        Sort.Order.desc("id.userLowId"),
                                        Sort.Order.desc("id.userHighId"))));
        var profiles = users.findAll(page.stream().map(item -> otherId(item, actor)).toList());
        return new PageResult<>(
                page.map(
                                item ->
                                        new FriendshipView(
                                                summary(profiles.get(otherId(item, actor))),
                                                item.getCreatedAt()))
                        .getContent(),
                pageInfo(page, index, limit));
    }

    @Transactional(readOnly = true)
    public PageResult<FriendRequestView> requests(
            String cursor, int limit, Direction direction, FriendRequestStatus status) {
        UUID actor = actorId();
        int index = pageIndex(cursor, limit);
        var paging =
                PageRequest.of(
                        index, limit, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<FriendRequestEntity> page =
                direction == Direction.INCOMING
                        ? requests.incoming(actor, status, paging)
                        : requests.outgoing(actor, status, paging);
        var ids = new java.util.HashSet<UUID>();
        page.forEach(
                item -> {
                    ids.add(item.getSenderId());
                    ids.add(item.getRecipientId());
                });
        var profiles = users.findAll(ids);
        return new PageResult<>(
                page.map(item -> request(item, profiles)).getContent(),
                pageInfo(page, index, limit));
    }

    private UserDirectory.UserPair lockPair(UUID a, UUID b) {
        return users.lockActivePair(a, b);
    }

    private FriendRequestView request(FriendRequestEntity item) {
        return request(
                item, users.findAll(java.util.List.of(item.getSenderId(), item.getRecipientId())));
    }

    private FriendRequestView request(
            FriendRequestEntity item, java.util.Map<UUID, UserDirectory.UserSummary> profiles) {
        return new FriendRequestView(
                item.getId(),
                summary(profiles.get(item.getSenderId())),
                summary(profiles.get(item.getRecipientId())),
                item.getMessage(),
                item.getStatus(),
                item.getCreatedAt(),
                item.getResolvedAt());
    }

    private FriendshipView friendship(FriendshipEntity item, UUID actor) {
        var other = users.find(otherId(item, actor));
        return new FriendshipView(summary(other), item.getCreatedAt());
    }

    private UUID otherId(FriendshipEntity item, UUID actor) {
        return item.getId().getUserLowId().equals(actor)
                ? item.getId().getUserHighId()
                : item.getId().getUserLowId();
    }

    private UserSummary summary(UserDirectory.UserSummary user) {
        return new UserSummary(user.id(), user.displayName(), user.avatarMediaId());
    }

    private PageInfo pageInfo(Page<?> page, int index, int limit) {
        return new PageInfo(
                page.hasNext()
                        ? Base64.getUrlEncoder()
                                .withoutPadding()
                                .encodeToString(
                                        ((index + 1) + ":" + limit)
                                                .getBytes(StandardCharsets.UTF_8))
                        : null,
                page.hasNext());
    }

    private int pageIndex(String cursor, int limit) {
        if (limit < 1 || limit > 100) throw invalid("limit phải từ 1 đến 100.");
        if (cursor == null) return 0;
        try {
            if (cursor.length() > 2048) throw new IllegalArgumentException();
            String decoded =
                    new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", -1);
            int index = Integer.parseInt(parts[0]);
            if (parts.length != 2
                    || index < 1
                    || index > 100_000
                    || Integer.parseInt(parts[1]) != limit) throw new IllegalArgumentException();
            return index;
        } catch (RuntimeException error) {
            throw invalid("cursor không hợp lệ.");
        }
    }

    private UUID actorId() {
        return CurrentActor.userId();
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message);
    }

    private ApiException userNotFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    private ApiException requestNotFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND, "FRIEND_REQUEST_NOT_FOUND", "Không tìm thấy lời mời.");
    }

    public enum Direction {
        INCOMING,
        OUTGOING
    }

    public record UserSummary(UUID id, String displayName, UUID avatarMediaId) {}

    public record FriendRequestView(
            UUID id,
            UserSummary sender,
            UserSummary recipient,
            String message,
            FriendRequestStatus status,
            java.time.Instant createdAt,
            java.time.Instant resolvedAt) {}

    public record FriendshipView(UserSummary user, java.time.Instant createdAt) {}

    public record PendingResult(String outcome, FriendRequestView request) {}

    public record AlreadyFriendsResult(String outcome, FriendshipView friendship) {}

    public record PageInfo(String nextCursor, boolean hasMore) {}

    public record PageResult<T>(java.util.List<T> items, PageInfo pageInfo) {}
}
