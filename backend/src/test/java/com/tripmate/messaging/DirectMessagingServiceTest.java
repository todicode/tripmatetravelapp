package com.tripmate.messaging;

import com.tripmate.identity.domain.*;
import com.tripmate.identity.api.UserDirectory;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.messaging.application.*;
import com.tripmate.messaging.domain.*;
import com.tripmate.messaging.infrastructure.*;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DirectMessagingServiceTest {
    private final UserDirectory users = mock(UserDirectory.class);
    private final FriendshipAccess friends = mock(FriendshipAccess.class);
    private final DirectConversationRepository conversations = mock(DirectConversationRepository.class);
    private final DirectMessageRepository messages = mock(DirectMessageRepository.class);
    private final ConversationCursor cursors = new ConversationCursor("test-secret-for-direct-conversation-cursors");
    private final DirectMessagingService service = new DirectMessagingService(users, friends, conversations, messages, cursors);
    private final UserEntity low = user("00000000-0000-4000-8000-000000000001");
    private final UserEntity high = user("ffffffff-ffff-4fff-8fff-ffffffffffff");
    private final DirectConversationEntity conversation = new DirectConversationEntity(UUID.randomUUID(), low.getId(), high.getId());

    @BeforeEach void setUp() {
        authenticate(low.getId());
        var lowSummary = new UserDirectory.UserSummary(low.getId(), low.getDisplayName(), null, true);
        var highSummary = new UserDirectory.UserSummary(high.getId(), high.getDisplayName(), null, true);
        when(users.find(low.getId())).thenReturn(lowSummary);
        when(users.find(high.getId())).thenReturn(highSummary);
        when(friends.lockFriends(any(), any())).thenReturn(new UserDirectory.UserPair(lowSummary, highSummary));
        when(friends.areFriends(any(), any())).thenReturn(true);
        when(conversations.findById(conversation.getId())).thenReturn(Optional.of(conversation));
        when(conversations.findByIdForUpdate(conversation.getId())).thenReturn(Optional.of(conversation));
        var participants = mock(DirectConversationRepository.Participants.class);
        when(participants.getLowId()).thenReturn(low.getId());
        when(participants.getHighId()).thenReturn(high.getId());
        when(conversations.participants(conversation.getId())).thenReturn(Optional.of(participants));
        when(messages.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void authenticatesAllEntryPoints() {
        SecurityContextHolder.clearContext();
        assertCode("UNAUTHORIZED", () -> service.open(high.getId()));
        assertCode("UNAUTHORIZED", () -> service.list(null, 20));
        assertCode("UNAUTHORIZED", () -> service.send(conversation.getId(), UUID.randomUUID(), "hello"));
        assertCode("UNAUTHORIZED", () -> service.history(conversation.getId(), null, null, 50));
        assertCode("UNAUTHORIZED", () -> service.markRead(conversation.getId(), "0"));
    }
    @Test void openReusesCanonicalPairAfterSocialLocks() {
        when(conversations.findByLowUserIdAndHighUserId(low.getId(), high.getId())).thenReturn(Optional.of(conversation));
        authenticate(high.getId());
        assertEquals(conversation.getId(), service.open(low.getId()).id());
        var order = inOrder(friends, conversations);
        order.verify(friends).lockFriends(high.getId(), low.getId());
        order.verify(conversations).findByLowUserIdAndHighUserId(low.getId(), high.getId());
        verify(conversations, never()).saveAndFlush(any());
    }
    @Test void createsNewConversationWithEmptyHistory() {
        when(conversations.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.open(high.getId());
        assertNull(result.lastMessage());
        assertEquals("0", result.lastSeq());
        assertEquals("0", result.unreadCount());
        assertTrue(result.canSend());
        assertCode("VALIDATION_ERROR", () -> service.open(low.getId()));
    }
    @Test void sendsPreservedBodyAndDeduplicatesOnlyIdenticalPayload() {
        UUID clientId = UUID.randomUUID();
        var result = service.send(conversation.getId(), clientId, "  hello\n");
        assertEquals("  hello\n", result.body());
        assertEquals("1", result.seq());
        assertEquals(low.getId(), result.sender().id());
        var saved = new DirectMessageEntity(result.id(), conversation, low.getId(), clientId, 1, result.body());
        when(messages.findByConversationIdAndSenderIdAndClientMessageId(conversation.getId(), low.getId(), clientId))
                .thenReturn(Optional.of(saved));
        assertEquals(result.id(), service.send(conversation.getId(), clientId, "  hello\n").id());
        assertCode("IDEMPOTENCY_CONFLICT", () -> service.send(conversation.getId(), clientId, "hello"));
        assertEquals(1, conversation.getLastSeq());
        verify(messages, times(1)).saveAndFlush(any());
    }
    @Test void nonFriendCannotCreateOrSendButCanReadHistoryAfterUnfriend() {
        when(friends.areFriends(any(), any())).thenReturn(false);
        when(friends.lockFriends(any(), any())).thenThrow(new ApiException(HttpStatus.FORBIDDEN, "NOT_FRIENDS", "Not friends"));
        assertCode("NOT_FRIENDS", () -> service.open(high.getId()));
        assertCode("NOT_FRIENDS", () -> service.send(conversation.getId(), UUID.randomUUID(), "hello"));
        when(messages.latest(eq(conversation.getId()), any())).thenReturn(List.of());
        assertTrue(service.history(conversation.getId(), null, null, 50).items().isEmpty());
        assertEquals("0", service.markRead(conversation.getId(), "0").lastReadSeq());
        when(conversations.firstPage(eq(low.getId()), any())).thenReturn(List.of(conversation));
        assertFalse(service.list(null, 20).items().getFirst().canSend());
    }
    @Test void outsiderCannotReadSendOrMarkReadAndInactivePeerCannotReceive() {
        authenticate(UUID.randomUUID());
        assertCode("CONVERSATION_NOT_FOUND", () -> service.history(conversation.getId(), null, null, 50));
        assertCode("CONVERSATION_NOT_FOUND", () -> service.markRead(conversation.getId(), "0"));
        assertCode("CONVERSATION_NOT_FOUND", () -> service.send(conversation.getId(), UUID.randomUUID(), "hello"));
        verify(friends, never()).lockFriends(any(), any());
        authenticate(low.getId());
        when(friends.lockFriends(any(), any())).thenThrow(new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Inactive peer"));
        assertCode("USER_NOT_FOUND", () -> service.send(conversation.getId(), UUID.randomUUID(), "hello"));
    }
    @Test void validatesBodyByUnicodeCodePointsWithoutTrimming() {
        for (String body : Arrays.asList(null, "", " \n\t", "\u00a0", "a".repeat(4001)))
            assertCode("VALIDATION_ERROR", () -> service.send(conversation.getId(), UUID.randomUUID(), body));
        assertCode("VALIDATION_ERROR", () -> service.send(conversation.getId(), null, "hello"));
        assertEquals("😀".repeat(4000), service.send(conversation.getId(), UUID.randomUUID(), "😀".repeat(4000)).body());
        assertCode("VALIDATION_ERROR", () -> service.send(conversation.getId(), UUID.randomUUID(), "😀".repeat(4001)));
    }
    @Test void historySelectsNearestPageAndReturnsAscendingSequences() {
        var one = stored(high, "one");
        var two = stored(low, "two");
        var three = stored(high, "three");
        when(messages.latest(eq(conversation.getId()), any())).thenReturn(List.of(three, two, one));
        var latest = service.history(conversation.getId(), null, null, 2);
        assertEquals(List.of("2", "3"), latest.items().stream().map(m -> m.seq()).toList());
        assertTrue(latest.pageInfo().hasMore());
        assertEquals("2", latest.pageInfo().nextBeforeSeq());
        when(messages.before(eq(conversation.getId()), eq(2L), any())).thenReturn(List.of(one));
        var older = service.history(conversation.getId(), "2", null, 2);
        assertEquals("1", older.items().getFirst().seq());
        assertNull(older.pageInfo().nextBeforeSeq());
        assertFalse(older.pageInfo().hasMore());
        when(messages.after(eq(conversation.getId()), eq(0L), any())).thenReturn(List.of(one, two, three));
        var catchUp = service.history(conversation.getId(), null, "0", 2);
        assertEquals(List.of("1", "2"), catchUp.items().stream().map(m -> m.seq()).toList());
        assertTrue(catchUp.pageInfo().hasMore());
        assertEquals("2", catchUp.pageInfo().nextAfterSeq());
        when(messages.after(eq(conversation.getId()), eq(3L), any())).thenReturn(List.of());
        assertEquals("3", service.history(conversation.getId(), null, "3", 2).pageInfo().nextAfterSeq());
    }
    @Test void rejectsInvalidQueriesAndReadSequencesAndNeverMovesReadBackwards() {
        assertCode("INVALID_REQUEST", () -> service.history(conversation.getId(), "1", "2", 50));
        for (String seq : List.of("01", "-1", "+1", "1.0", "9223372036854775808", " ")) {
            assertCode("INVALID_REQUEST", () -> service.history(conversation.getId(), seq, null, 50));
            assertCode("VALIDATION_ERROR", () -> service.markRead(conversation.getId(), seq));
        }
        assertCode("INVALID_REQUEST", () -> service.history(conversation.getId(), null, null, 0));
        assertCode("INVALID_REQUEST", () -> service.list(null, 101));
        assertCode("VALIDATION_ERROR", () -> service.markRead(conversation.getId(), "1"));
        stored(high, "one"); stored(low, "two"); stored(high, "three");
        when(messages.countByConversationIdAndSenderIdAndSeqGreaterThan(conversation.getId(), high.getId(), 2L)).thenReturn(1L);
        var read = service.markRead(conversation.getId(), "2");
        assertEquals("1", read.unreadCount());
        assertEquals("2", service.markRead(conversation.getId(), "1").lastReadSeq());
        assertEquals("0", conversation.readSeq(high.getId()) + "");
    }
    @Test void conversationPaginationUsesSignedActorBoundKeyset() {
        var other = new DirectConversationEntity(UUID.randomUUID(), low.getId(), high.getId());
        when(conversations.firstPage(eq(low.getId()), any())).thenReturn(List.of(conversation, other));
        var first = service.list(null, 1);
        assertTrue(first.pageInfo().hasMore());
        var cursor = first.pageInfo().nextCursor();
        when(conversations.nextPage(eq(low.getId()), eq(conversation.getUpdatedAt()), eq(conversation.getId()), any()))
                .thenReturn(List.of(other));
        var second = service.list(cursor, 1);
        assertEquals(other.getId(), second.items().getFirst().id());
        assertNull(second.pageInfo().nextCursor());
        assertCode("INVALID_REQUEST", () -> service.list(cursor, 2));
        assertCode("INVALID_REQUEST", () -> service.list("invalid", 1));
        assertCode("INVALID_REQUEST", () -> service.list(cursor.substring(0, 10) + "X" + cursor.substring(11), 1));
        authenticate(high.getId());
        assertCode("INVALID_REQUEST", () -> service.list(cursor, 1));
    }
    private DirectMessageEntity stored(UserEntity sender, String body) {
        return new DirectMessageEntity(UUID.randomUUID(), conversation, sender.getId(), UUID.randomUUID(), conversation.nextSeq(), body);
    }
    private UserEntity user(String id) {
        return new UserEntity(UUID.fromString(id), id + "@example.test", "hash", "User", "+84901234567", "TM-ABC12345", Instant.now());
    }
    private void authenticate(UUID id) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, UUID.randomUUID(), 1), null, AuthorityUtils.NO_AUTHORITIES));
    }
    private void assertCode(String code, org.junit.jupiter.api.function.Executable action) {
        assertEquals(code, assertThrows(ApiException.class, action).getCode());
    }
}
