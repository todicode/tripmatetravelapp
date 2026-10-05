package com.tripmate.messaging;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.messaging.application.*;
import com.tripmate.messaging.infrastructure.GroupConversationRepository;
import com.tripmate.messaging.infrastructure.GroupConversationRepository.*;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;
import com.tripmate.trips.api.GroupTripSharing;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GroupMessagingServiceTest {
    private final GroupConversationRepository repo = mock(GroupConversationRepository.class);
    private final UserDirectory users = mock(UserDirectory.class);
    private final FriendshipAccess friends = mock(FriendshipAccess.class);
    private final GroupTripSharing trips = mock(GroupTripSharing.class);
    private final ConversationCursor cursors = new ConversationCursor("group-service-test-cursor-secret");
    private final GroupMessagingService service = new GroupMessagingService(repo, users, friends, trips, cursors);
    private final UUID id = UUID.randomUUID(), owner = UUID.randomUUID(), peer = UUID.randomUUID();
    private Group group;
    @BeforeEach void setup() {
        group = new Group(id, owner, "Team", null, 0, 5, null, Instant.now(), Instant.now());
        auth(owner); when(repo.find(eq(id), anyBoolean())).thenReturn(Optional.of(group));
        when(repo.member(id, owner)).thenReturn(Optional.of(new Member(owner, "ACTIVE", 0, Instant.now())));
        when(repo.member(id, peer)).thenReturn(Optional.of(new Member(peer, "ACTIVE", 0, Instant.now())));
        when(users.find(any())).thenAnswer(call -> new UserDirectory.UserSummary(call.getArgument(0), "Name", null, true));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    private void auth(UUID user) { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            new AuthenticatedUser(user, UUID.randomUUID(), 1), null, List.of())); }
    private String error(org.junit.jupiter.api.function.Executable work) { return assertThrows(ApiException.class, work).getCode(); }
    @Test void authMembershipOwnerAndOptimisticVersionCannotBeForged() {
        SecurityContextHolder.clearContext(); assertEquals("UNAUTHORIZED", error(() -> service.get(id)));
        auth(UUID.randomUUID()); assertEquals("GROUP_NOT_FOUND", error(() -> service.get(id)));
        auth(peer); assertEquals("OWNER_REQUIRED", error(() -> service.transfer(id, peer, "0")));
        auth(owner); assertEquals("VERSION_CONFLICT", error(() -> service.update(id, "1", "New", false, null)));
        verify(repo, never()).save(any());
    }
    @Test void sendRetriesRetainPayloadAndSequenceAndRejectBlankOversizedMessages() {
        UUID client = UUID.randomUUID();
        var message = new Message(UUID.randomUUID(), id, owner, client, 5, "same", Instant.now());
        when(repo.retry(id, owner, client)).thenReturn(Optional.of(message));
        assertEquals(message.id(), service.send(id, client, "same").id());
        assertEquals("IDEMPOTENCY_CONFLICT", error(() -> service.send(id, client, "different")));
        assertEquals("VALIDATION_ERROR", error(() -> service.send(id, UUID.randomUUID(), "\u00a0")));
        assertEquals("VALIDATION_ERROR", error(() -> service.send(id, UUID.randomUUID(), "😀".repeat(4001))));
        verify(repo, never()).insertMessage(any());
    }
    @Test void invalidCreateInputsCannotWriteAndForeignTripCannotBeLinked() {
        assertEquals("VALIDATION_ERROR", error(() -> service.create(" ", List.of(), null)));
        assertEquals("VALIDATION_ERROR", error(() -> service.create("Name", List.of(peer, peer), null)));
        assertEquals("VALIDATION_ERROR", error(() -> service.create("Name", List.of(owner), null)));
        assertEquals("NOT_FRIENDS", error(() -> service.create("Name", List.of(peer), null)));
        UUID foreign = UUID.randomUUID(); doThrow(new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "Missing"))
                .when(trips).requireOwned(foreign, owner);
        assertEquals("TRIP_NOT_FOUND", error(() -> service.update(id, "0", null, true, foreign)));
        verify(repo, never()).insert(any()); verify(repo, never()).save(any());
    }
    @Test void readMarkersAreMonotonicAndQueryBoundsAreStrict() {
        when(repo.member(id, owner)).thenReturn(Optional.of(new Member(owner, "ACTIVE", 4, Instant.now())));
        assertEquals("4", service.read(id, "2").lastReadSeq()); verify(repo).read(id, owner, 4);
        assertEquals("VALIDATION_ERROR", error(() -> service.read(id, "6")));
        assertEquals("VALIDATION_ERROR", error(() -> service.read(id, "9223372036854775808")));
        assertEquals("INVALID_REQUEST", error(() -> service.history(id, "1", "2", 50)));
        assertEquals("INVALID_REQUEST", error(() -> service.history(id, "01", null, 50)));
        assertEquals("INVALID_REQUEST", error(() -> service.list(null, 101)));
    }
    @Test void ownerTransferClearsPreviousTripAndCannotTargetNonMember() {
        var result = service.transfer(id, peer, "0"); assertEquals(peer, result.ownerId()); assertNull(result.tripId());
        var saved = org.mockito.ArgumentCaptor.forClass(Group.class); verify(repo).save(saved.capture());
        assertEquals(1, saved.getValue().version());
        assertEquals("GROUP_NOT_FOUND", error(() -> service.transfer(id, UUID.randomUUID(), "0")));
    }
}
