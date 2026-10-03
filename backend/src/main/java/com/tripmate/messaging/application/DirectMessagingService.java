package com.tripmate.messaging.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.messaging.domain.*;
import com.tripmate.messaging.infrastructure.*;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Service
public class DirectMessagingService {
    private final UserDirectory users;
    private final FriendshipAccess friendships;
    private final DirectConversationRepository conversations;
    private final DirectMessageRepository messages;
    private final ConversationCursor cursors;

    public DirectMessagingService(UserDirectory users, FriendshipAccess friendships,
                                  DirectConversationRepository conversations, DirectMessageRepository messages,
                                  ConversationCursor cursors) {
        this.users = users; this.friendships = friendships; this.conversations = conversations;
        this.messages = messages; this.cursors = cursors;
    }

    @Transactional
    public ConversationView open(UUID recipientId) {
        UUID actor = actorId();
        if (recipientId == null || actor.equals(recipientId)) throw invalid("Chọn một người bạn khác để nhắn tin.");
        var pair = friendships.lockFriends(actor, recipientId);
        DirectConversationEntity conversation = conversations.findByLowUserIdAndHighUserId(
                pair.low().id(), pair.high().id()).orElseGet(() -> conversations.saveAndFlush(
                new DirectConversationEntity(UUID.randomUUID(), pair.low().id(), pair.high().id())));
        return view(conversation, actor);
    }

    @Transactional(readOnly = true)
    public ConversationPage list(String cursor, int limit) {
        UUID actor = actorId();
        validateLimit(limit);
        var paging = PageRequest.of(0, limit + 1);
        List<DirectConversationEntity> found;
        if (cursor == null) found = conversations.firstPage(actor, paging);
        else {
            var position = cursors.decode(cursor, actor, limit);
            found = conversations.nextPage(actor, position.time(), position.id(), paging);
        }
        boolean more = found.size() > limit;
        var items = found.subList(0, Math.min(limit, found.size()));
        String next = more ? cursors.encode(actor, limit, items.getLast().getUpdatedAt(), items.getLast().getId()) : null;
        return new ConversationPage(items.stream().map(c -> view(c, actor)).toList(), new PageInfo(next, more));
    }

    @Transactional
    public MessageView send(UUID conversationId, UUID clientMessageId, String body) {
        UUID actor = actorId();
        var pair = conversations.participants(conversationId).orElseThrow(this::notFound);
        if (!actor.equals(pair.getLowId()) && !actor.equals(pair.getHighId())) throw notFound();
        friendships.lockFriends(pair.getLowId(), pair.getHighId());
        DirectConversationEntity conversation = conversations.findByIdForUpdate(conversationId).orElseThrow(this::notFound);
        validateBody(clientMessageId, body);
        var previous = messages.findByConversationIdAndSenderIdAndClientMessageId(conversationId, actor, clientMessageId);
        if (previous.isPresent()) {
            if (!previous.get().getBody().equals(body))
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Mã gửi tin đã được dùng với nội dung khác.");
            return message(previous.get());
        }
        if (conversation.getLastSeq() == Long.MAX_VALUE)
            throw new ApiException(HttpStatus.CONFLICT, "MESSAGE_LIMIT_REACHED", "Cuộc trò chuyện đã đạt giới hạn tin nhắn.");
        DirectMessageEntity created = messages.saveAndFlush(new DirectMessageEntity(UUID.randomUUID(), conversation,
                actor, clientMessageId, conversation.nextSeq(), body));
        return message(created);
    }

    @Transactional(readOnly = true)
    public MessagePage history(UUID conversationId, String beforeSeq, String afterSeq, int limit) {
        UUID actor = actorId();
        participant(conversations.findById(conversationId).orElseThrow(this::notFound), actor);
        validateLimit(limit);
        if (beforeSeq != null && afterSeq != null) throw badQuery("Không dùng đồng thời beforeSeq và afterSeq.");
        Long before = beforeSeq == null ? null : querySequence(beforeSeq);
        Long after = afterSeq == null ? null : querySequence(afterSeq);
        var paging = PageRequest.of(0, limit + 1);
        List<DirectMessageEntity> found = after != null ? messages.after(conversationId, after, paging)
                : before != null ? messages.before(conversationId, before, paging) : messages.latest(conversationId, paging);
        boolean more = found.size() > limit;
        List<DirectMessageEntity> selected = new ArrayList<>(found.subList(0, Math.min(limit, found.size())));
        if (after == null) Collections.reverse(selected);
        long min = selected.isEmpty() ? 0 : selected.getFirst().getSeq();
        long max = selected.isEmpty() ? (after == null ? 0 : after) : selected.getLast().getSeq();
        // Sequences are contiguous and messages are retained; min > 1 means older history exists.
        return new MessagePage(selected.stream().map(this::message).toList(),
                new MessagePageInfo(more, min > 1 ? Long.toString(min) : null, Long.toString(max)));
    }

    @Transactional
    public ReadView markRead(UUID conversationId, String lastReadSeq) {
        UUID actor = actorId();
        DirectConversationEntity conversation = conversations.findByIdForUpdate(conversationId).orElseThrow(this::notFound);
        participant(conversation, actor);
        long seq;
        try { seq = sequence(lastReadSeq); }
        catch (RuntimeException error) { throw invalid("lastReadSeq phải là chuỗi số nguyên không âm hợp lệ."); }
        if (seq > conversation.getLastSeq()) throw invalid("lastReadSeq vượt quá tin nhắn cuối cùng.");
        conversation.markRead(actor, seq);
        return new ReadView(conversationId, Long.toString(conversation.readSeq(actor)), unread(conversation, actor));
    }

    private ConversationView view(DirectConversationEntity c, UUID actor) {
        var other = users.find(c.otherId(actor));
        MessageView last = c.getLastSeq() == 0 ? null
                : messages.findByConversationIdAndSeq(c.getId(), c.getLastSeq()).map(this::message).orElse(null);
        return new ConversationView(c.getId(), summary(other), last, Long.toString(c.getLastSeq()),
                Long.toString(c.readSeq(actor)), unread(c, actor),
                friendships.areFriends(actor, other.id()) && other.active(),
                c.getCreatedAt(), c.getUpdatedAt());
    }
    private String unread(DirectConversationEntity c, UUID actor) {
        return Long.toString(messages.countByConversationIdAndSenderIdAndSeqGreaterThan(
                c.getId(), c.otherId(actor), c.readSeq(actor)));
    }
    private MessageView message(DirectMessageEntity m) {
        return new MessageView(m.getId(), m.getConversation().getId(), Long.toString(m.getSeq()),
                summary(users.find(m.getSenderId())), m.getClientMessageId(), m.getBody(), m.getCreatedAt());
    }
    private UserSummary summary(UserDirectory.UserSummary u) { return new UserSummary(u.id(), u.displayName(), u.avatarMediaId()); }
    private void participant(DirectConversationEntity c, UUID actor) { if (!c.includes(actor)) throw notFound(); }
    private void validateBody(UUID clientMessageId, String body) {
        if (clientMessageId == null || body == null || body.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))
                || body.codePointCount(0, body.length()) > 4000)
            throw invalid("Tin nhắn cần clientMessageId và nội dung không trắng, tối đa 4.000 ký tự.");
    }
    private void validateLimit(int limit) { if (limit < 1 || limit > 100) throw badQuery("limit phải từ 1 đến 100."); }
    private long querySequence(String value) {
        try { return sequence(value); }
        catch (RuntimeException error) { throw badQuery("seq phải là chuỗi số nguyên không âm hợp lệ."); }
    }
    private long sequence(String value) {
        if (value == null || !value.matches("^(0|[1-9][0-9]{0,18})$")) throw new IllegalArgumentException();
        return Long.parseLong(value);
    }
    private UUID actorId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedActor actor))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        return actor.userId();
    }
    private ApiException invalid(String message) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message); }
    private ApiException badQuery(String message) { return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message); }
    private ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Không tìm thấy cuộc trò chuyện."); }
    public record UserSummary(UUID id, String displayName, UUID avatarMediaId) {}
    public record MessageView(UUID id, UUID conversationId, String seq, UserSummary sender,
                              UUID clientMessageId, String body, Instant createdAt) {}
    public record ConversationView(UUID id, UserSummary user, MessageView lastMessage, String lastSeq,
                                   String lastReadSeq, String unreadCount, boolean canSend, Instant createdAt, Instant updatedAt) {}
    public record PageInfo(String nextCursor, boolean hasMore) {}
    public record ConversationPage(List<ConversationView> items, PageInfo pageInfo) {}
    public record MessagePageInfo(boolean hasMore, String nextBeforeSeq, String nextAfterSeq) {}
    public record MessagePage(List<MessageView> items, MessagePageInfo pageInfo) {}
    public record ReadView(UUID conversationId, String lastReadSeq, String unreadCount) {}
}
