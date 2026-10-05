package com.tripmate.messaging;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.messaging.application.GroupMessagingService;
import com.tripmate.messaging.application.ConversationCursor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.application.SocialService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "GROUP_TEST_DATABASE_URL", matches = "jdbc:postgresql://.*/tripmate_group_test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
        "spring.datasource.url=${GROUP_TEST_DATABASE_URL}", "spring.datasource.username=tripmate",
        "spring.datasource.password=${GROUP_TEST_DATABASE_PASSWORD}", "spring.flyway.enabled=true", "tripmate.email.mode=log"
})
class GroupMessagingPersistenceTest {
    @Autowired UserRepository users;
    @Autowired SocialService social;
    @Autowired GroupMessagingService groups;
    @Autowired ConversationCursor cursors;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @AfterEach void clearActor() { SecurityContextHolder.clearContext(); }

    @Test void independentGroupsPersistMessagesUnreadAndActiveMembershipPermissions() {
        var owner = user("Owner"); var peer = user("Peer"); var outsider = user("Outsider"); friend(owner, peer);
        auth(owner); var group = groups.create("  Team  ", List.of(peer.getId()), null);
        assertNull(group.tripId()); assertEquals("Team", group.name()); assertEquals(2, group.memberCount());
        UUID client = UUID.randomUUID(); var sent = groups.send(group.id(), client, "  hello\n😀");
        assertEquals(sent, groups.send(group.id(), client, "  hello\n😀"));
        assertEquals("IDEMPOTENCY_CONFLICT", error(() -> groups.send(group.id(), client, "different")));
        auth(peer); assertEquals("1", groups.get(group.id()).unreadCount());
        assertEquals("0", groups.read(group.id(), "1").unreadCount());
        assertEquals("1", groups.read(group.id(), "0").lastReadSeq());
        assertEquals("VALIDATION_ERROR", error(() -> groups.read(group.id(), "2")));
        assertEquals("OWNER_REQUIRED", error(() -> groups.update(group.id(), "0", "attack", false, null)));
        auth(outsider); assertTrue(groups.list(null, 20).items().isEmpty());
        assertEquals("GROUP_NOT_FOUND", error(() -> groups.history(group.id(), null, null, 50)));
        assertEquals("GROUP_NOT_FOUND", error(() -> groups.send(group.id(), UUID.randomUUID(), "attack")));
        assertEquals("GROUP_NOT_FOUND", error(() -> groups.read(group.id(), "1")));
        auth(owner); social.removeFriend(peer.getId());
        auth(peer); groups.send(group.id(), UUID.randomUUID(), "Still a member"); groups.leave(group.id()); groups.leave(group.id());
        assertEquals("GROUP_NOT_FOUND", error(() -> groups.get(group.id())));
        auth(owner); assertEquals("OWNER_CANNOT_LEAVE", error(() -> groups.leave(group.id())));
        assertEquals(2, groups.history(group.id(), null, null, 50).items().size());
        assertEquals("NOT_FRIENDS", error(() -> groups.add(group.id(), outsider.getId(), groups.get(group.id()).version())));
    }
    @Test void tripSharingIsOwnerVerifiedReadOnlyAndUnlinkTransferDoNotEraseChat() {
        UserEntity owner = user("Trip owner"), peer = user("Follower"), other = user("Other owner"); friend(owner, peer);
        UUID trip = seedTrip(owner), foreign = seedTrip(other);
        auth(owner); assertEquals("TRIP_NOT_FOUND", error(() -> groups.create("Bad link", List.of(), foreign)));
        var g = groups.create("Travel", List.of(peer.getId()), trip); groups.send(g.id(), UUID.randomUUID(), "history");
        auth(peer); var view = groups.trip(g.id()); assertEquals(trip, view.id()); assertEquals(owner.getId(), view.ownerId());
        assertEquals(1, view.itinerary().days().size()); assertEquals("Meet here", view.itinerary().days().getFirst().items().getFirst().title());
        assertEquals(0, jdbc.queryForObject("select count(*) from trip_members where trip_id=? and user_id=?", Integer.class, trip, peer.getId()));
        assertEquals("OWNER_REQUIRED", error(() -> groups.update(g.id(), "0", null, true, null)));
        auth(owner); var detached = groups.update(g.id(), "0", null, true, null); assertNull(detached.tripId());
        assertEquals("TRIP_NOT_LINKED", error(() -> groups.trip(g.id()))); assertEquals(1, groups.history(g.id(), null, null, 50).items().size());
        assertEquals("VERSION_CONFLICT", error(() -> groups.update(g.id(), "0", "stale", false, null)));
        var linked = groups.update(g.id(), detached.version(), null, true, trip);
        var transferred = groups.transfer(g.id(), peer.getId(), linked.version()); assertNull(transferred.tripId());
        assertEquals(peer.getId(), transferred.ownerId()); groups.leave(g.id());
        auth(peer); assertEquals(1, groups.history(g.id(), null, null, 50).items().size());
        assertEquals("TRIP_NOT_FOUND", error(() -> groups.update(g.id(), groups.get(g.id()).version(), null, true, trip)));
    }
    @Test void concurrentRetriesAndDifferentSendersAllocateUniqueContiguousSequences() throws Exception {
        UserEntity a = user("A"), b = user("B"); friend(a, b); auth(a); UUID g = groups.create("Concurrency", List.of(b.getId()), null).id();
        UUID retry = UUID.randomUUID(); var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(4)) {
            var first = pool.submit(() -> as(a, start, () -> groups.send(g, retry, "same")));
            var second = pool.submit(() -> as(a, start, () -> groups.send(g, retry, "same")));
            var third = pool.submit(() -> as(b, start, () -> groups.send(g, retry, "other sender")));
            start.countDown(); assertEquals(first.get(10, TimeUnit.SECONDS).id(), second.get(10, TimeUnit.SECONDS).id()); third.get(10, TimeUnit.SECONDS);
        }
        auth(a); assertEquals(List.of("1", "2"), groups.history(g, null, null, 50).items().stream().map(m -> m.seq()).toList());
        assertEquals(2, jdbc.queryForObject("select count(*) from group_messages where conversation_id=?", Integer.class, g));
        assertEquals("0", groups.get(g).version());
    }
    @Test void removeRevokesHistoryAndRejoinStartsUnreadAtCurrentTail() {
        UserEntity a = user("Owner"), b = user("Member"); friend(a, b); auth(a); var g = groups.create("Membership", List.of(b.getId()), null);
        groups.send(g.id(), UUID.randomUUID(), "before"); groups.remove(g.id(), b.getId(), "0");
        auth(b); assertEquals("GROUP_NOT_FOUND", error(() -> groups.history(g.id(), null, null, 50)));
        assertEquals("GROUP_NOT_FOUND", error(() -> groups.members(g.id())));
        auth(a); groups.send(g.id(), UUID.randomUUID(), "while removed");
        var rejoined = groups.add(g.id(), b.getId(), groups.get(g.id()).version()); assertEquals("2", rejoined.lastReadSeq());
        auth(b); assertEquals("0", groups.get(g.id()).unreadCount()); assertEquals(2, groups.history(g.id(), null, null, 50).items().size());
        auth(a); groups.send(g.id(), UUID.randomUUID(), "after");
        auth(b); assertEquals("1", groups.get(g.id()).unreadCount());
    }
    @Test void lastMembershipSlotIsSerializedAcrossConcurrentAdds() throws Exception {
        UserEntity owner = user("Owner"), x = user("X"), y = user("Y"); friend(owner, x); friend(owner, y);
        auth(owner); UUID g = groups.create("Capacity", List.of(), null).id();
        for (int i = 0; i < 98; i++) { var filler = user("Filler"); jdbc.update("insert into group_members(conversation_id,user_id,status,read_seq,joined_at) values(?,?,'ACTIVE',0,now())", g, filler.getId()); }
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var one = pool.submit(() -> as(owner, start, () -> addResult(g, x.getId())));
            var two = pool.submit(() -> as(owner, start, () -> addResult(g, y.getId())));
            start.countDown(); var results = List.of(one.get(10, TimeUnit.SECONDS), two.get(10, TimeUnit.SECONDS));
            assertTrue(results.contains("OK")); assertTrue(results.contains("VERSION_CONFLICT"));
        }
        auth(owner); assertEquals(100, groups.members(g).size());
        UUID missing = groups.members(g).stream().anyMatch(m -> m.user().id().equals(x.getId())) ? y.getId() : x.getId();
        assertEquals("GROUP_FULL", error(() -> groups.add(g, missing, groups.get(g).version())));
    }
    @Test void pagingArchiveCursorScopesAndFailedCreatePreserveExistingData() {
        UserEntity owner = user("Owner"), peer = user("Peer"); friend(owner, peer); auth(owner);
        var old = groups.create("Older", List.of(peer.getId()), null); var latest = groups.create("Newer", List.of(peer.getId()), null);
        var page = groups.list(null, 1); assertEquals(latest.id(), page.items().getFirst().id()); assertTrue(page.pageInfo().hasMore());
        assertEquals(old.id(), groups.list(page.pageInfo().nextCursor(), 1).items().getFirst().id());
        auth(peer); assertEquals("INVALID_REQUEST", error(() -> groups.list(page.pageInfo().nextCursor(), 1)));
        auth(owner); String directCursor = cursors.encode(owner.getId(), 1, Instant.now(), UUID.randomUUID());
        assertEquals("INVALID_REQUEST", error(() -> groups.list(directCursor, 1)));
        for (int i = 0; i < 4; i++) groups.send(old.id(), UUID.randomUUID(), "m" + i);
        assertEquals(List.of("3", "4"), groups.history(old.id(), null, null, 2).items().stream().map(m -> m.seq()).toList());
        assertEquals(List.of("1", "2"), groups.history(old.id(), "3", null, 2).items().stream().map(m -> m.seq()).toList());
        assertEquals(List.of("2", "3"), groups.history(old.id(), null, "1", 2).items().stream().map(m -> m.seq()).toList());
        assertEquals("4", groups.history(old.id(), null, "4", 2).pageInfo().nextAfterSeq());
        groups.archive(old.id(), "0"); groups.archive(old.id(), "0"); assertFalse(groups.get(old.id()).canSend());
        assertEquals("GROUP_ARCHIVED", error(() -> groups.send(old.id(), UUID.randomUUID(), "blocked")));
        assertEquals(4, groups.history(old.id(), null, null, 50).items().size());
        int before = jdbc.queryForObject("select count(*) from group_conversations where owner_id=?", Integer.class, owner.getId());
        assertEquals("VALIDATION_ERROR", error(() -> groups.create("Bad", List.of(peer.getId(), peer.getId()), null)));
        assertEquals("VALIDATION_ERROR", error(() -> groups.send(latest.id(), UUID.randomUUID(), "😀".repeat(4001))));
        assertEquals(before, jdbc.queryForObject("select count(*) from group_conversations where owner_id=?", Integer.class, owner.getId()));
    }
    private String addResult(UUID group, UUID user) { try { groups.add(group, user, "0"); return "OK"; } catch (ApiException e) { return e.getCode(); } }
    private String error(org.junit.jupiter.api.function.Executable work) { return assertThrows(ApiException.class, work).getCode(); }
    private <T> T as(UserEntity actor, CountDownLatch start, Callable<T> work) throws Exception {
        start.await(); auth(actor); try { return work.call(); } finally { SecurityContextHolder.clearContext(); }
    }
    private UserEntity user(String name) { UUID id = UUID.randomUUID(); return users.saveAndFlush(new UserEntity(id, id + "@example.test", "hash", name, null,
            "TM-" + id.toString().substring(0, 8).toUpperCase(Locale.ROOT), Instant.now())); }
    private void auth(UserEntity user) { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            new AuthenticatedUser(user.getId(), UUID.randomUUID(), 1), null, AuthorityUtils.NO_AUTHORITIES)); }
    private void friend(UserEntity a, UserEntity b) { auth(a); var pending = (SocialService.PendingResult) social.send(b.getId(), null); auth(b); social.accept(pending.request().id()); }
    private UUID seedTrip(UserEntity owner) {
        UUID trip = UUID.randomUUID(), day = UUID.randomUUID();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            jdbc.update("insert into cities(code,name) values('GROUP_TEST','Test city') on conflict do nothing");
            jdbc.update("insert into trips(id,owner_id,city_code,title,start_date,end_date) values(?,?,'GROUP_TEST','Owner trip','2026-10-05','2026-10-05')", trip, owner.getId());
            jdbc.update("insert into trip_members(trip_id,user_id) values(?,?)", trip, owner.getId());
            jdbc.update("insert into itineraries(trip_id,updated_by) values(?,?)", trip, owner.getId());
            jdbc.update("insert into itinerary_days(id,trip_id,day_number) values(?,?,1)", day, trip);
            jdbc.update("insert into itinerary_items(id,day_id,kind,custom_title,position,start_time,end_time,created_by,updated_by) "
                    + "values(?,?,'NOTE','Meet here',0,'09:00','10:00',?,?)", UUID.randomUUID(), day, owner.getId(), owner.getId());
        }); return trip;
    }
}
