package com.tripmate.social;

import static org.junit.jupiter.api.Assertions.*;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.application.SocialService;
import com.tripmate.social.application.SocialService.AlreadyFriendsResult;
import com.tripmate.social.application.SocialService.Direction;
import com.tripmate.social.application.SocialService.PendingResult;
import com.tripmate.social.application.UserLookupService;
import com.tripmate.social.domain.FriendRequestStatus;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** Opt-in: use only the dedicated disposable social database; no HTTP server is started. */
@EnabledIfEnvironmentVariable(
        named = "SOCIAL_TEST_DATABASE_URL",
        matches = ".*/tripmate_social_test")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "spring.datasource.url=${SOCIAL_TEST_DATABASE_URL}",
                    "spring.datasource.username=tripmate",
            "spring.datasource.password=${SOCIAL_TEST_DATABASE_PASSWORD}",
                    "spring.flyway.enabled=true",
            "tripmate.email.mode=log"
        })
class SocialPersistenceTest {
    @Autowired private UserRepository users;
    @Autowired private SocialService social;
    @Autowired private UserLookupService lookup;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired private org.springframework.transaction.PlatformTransactionManager transactions;

    @Test
    void concurrentAcceptAndCancelObserveOneTerminalResult() throws Exception {
        UserEntity sender = user("Concurrent sender"), recipient = user("Concurrent recipient");
        authenticate(sender);
        UUID request = ((PendingResult) social.send(recipient.getId(), null)).request().id();
        UUID low =
                sender.getId().toString().compareTo(recipient.getId().toString()) < 0
                        ? sender.getId()
                        : recipient.getId();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var futures =
                    new java.util.ArrayList<java.util.concurrent.Future<FriendRequestStatus>>();
            new org.springframework.transaction.support.TransactionTemplate(transactions)
                    .executeWithoutResult(
                            tx -> {
                                jdbc.queryForList(
                                        "select id from app_users where id=? for update", low);
                                futures.add(
                                        pool.submit(
                                                () -> {
                                                    authenticate(recipient);
                                                    try {
                                                        return social.accept(request).status();
                                                    } finally {
                                                        SecurityContextHolder.clearContext();
                                                    }
                                                }));
                                futures.add(
                                        pool.submit(
                                                () -> {
                                                    authenticate(sender);
                                                    try {
                                                        return social.cancel(request).status();
                                                    } finally {
                                                        SecurityContextHolder.clearContext();
                                                    }
                                                }));
                                // Both transactions must reach the pair lock before either resolves
                                // the request.
                                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                                while (System.nanoTime() < deadline) {
                                    jdbc.queryForList("select pg_stat_clear_snapshot()");
                                    int blocked =
                                            jdbc.queryForObject(
                                                    "select count(*) from pg_stat_activity where"
                                                        + " datname=current_database() and"
                                                        + " wait_event_type='Lock' and query like"
                                                        + " '%app_users%'",
                                                    Integer.class);
                                    if (blocked >= 2) return;
                                    try {
                                        Thread.sleep(25);
                                    } catch (InterruptedException error) {
                                        Thread.currentThread().interrupt();
                                        throw new IllegalStateException(error);
                                    }
                                }
                                fail("Both resolutions must block on the controlled pair lock");
                            });
            FriendRequestStatus first = futures.get(0).get(15, TimeUnit.SECONDS);
            assertEquals(first, futures.get(1).get(15, TimeUnit.SECONDS));
            assertEquals(
                    first.name(),
                    jdbc.queryForObject(
                            "select status from friend_requests where id=?",
                            String.class,
                            request));
            int friendships =
                    jdbc.queryForObject(
                            "select count(*) from friendships where user_low_id=? and"
                                    + " user_high_id=?",
                            Integer.class,
                            low,
                            low.equals(sender.getId()) ? recipient.getId() : sender.getId());
            assertEquals(first == FriendRequestStatus.ACCEPTED ? 1 : 0, friendships);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void requestMessageRolesRelationshipAndUnfriendPersist() {
        UserEntity sender = user("Sender"), recipient = user("Recipient");
        try {
            authenticate(sender);
            PendingResult first =
                    (PendingResult) social.send(recipient.getId(), "  Chào bạn, kết bạn nhé  ");
            assertEquals("Chào bạn, kết bạn nhé", first.request().message());
            assertEquals("PENDING", first.outcome());
            assertEquals(
                    "OUTGOING_PENDING",
                    lookup.byFriendCode(recipient.getFriendCode()).relationship());
            assertEquals(
                    first.request().id(),
                    lookup.byFriendCode(recipient.getFriendCode()).pendingRequestId());
            assertEquals(
                    "FORBIDDEN",
                    assertThrows(ApiException.class, () -> social.accept(first.request().id()))
                            .getCode());
            authenticate(recipient);
            assertEquals(
                    first.request().id(),
                    ((PendingResult) social.send(sender.getId(), "ignored")).request().id());
            assertEquals("INCOMING_PENDING", lookup.byPhone(sender.getPhone()).relationship());
            assertEquals(
                    1,
                    social.requests(null, 20, Direction.INCOMING, FriendRequestStatus.PENDING)
                            .items()
                            .size());
            assertEquals(
                    "FORBIDDEN",
                    assertThrows(ApiException.class, () -> social.cancel(first.request().id()))
                            .getCode());
            assertEquals(
                    FriendRequestStatus.ACCEPTED, social.accept(first.request().id()).status());
            assertEquals(
                    FriendRequestStatus.ACCEPTED, social.accept(first.request().id()).status());
            assertEquals("FRIEND", lookup.byFriendCode(sender.getFriendCode()).relationship());
            assertEquals(
                    "ALREADY_FRIENDS",
                    ((AlreadyFriendsResult) social.send(sender.getId(), null)).outcome());
            assertEquals(1, social.friends(null, 20).items().size());
            social.removeFriend(sender.getId());
            social.removeFriend(sender.getId());
            assertEquals("NONE", lookup.byFriendCode(sender.getFriendCode()).relationship());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void cancelRejectAndPagePendingRequests() {
        UserEntity sender = user("Sender"), recipient = user("Recipient"), other = user("Other");
        try {
            authenticate(sender);
            assertEquals(
                    "SELF_FRIEND_REQUEST",
                    assertThrows(ApiException.class, () -> social.send(sender.getId(), null))
                            .getCode());
            PendingResult first = (PendingResult) social.send(recipient.getId(), "First");
            assertEquals(
                    FriendRequestStatus.CANCELLED, social.cancel(first.request().id()).status());
            assertEquals(
                    FriendRequestStatus.CANCELLED, social.cancel(first.request().id()).status());
            PendingResult second = (PendingResult) social.send(recipient.getId(), "Second");
            assertNotEquals(first.request().id(), second.request().id());
            authenticate(recipient);
            assertEquals(
                    FriendRequestStatus.REJECTED, social.reject(second.request().id()).status());
            assertEquals(
                    FriendRequestStatus.REJECTED, social.reject(second.request().id()).status());
            authenticate(sender);
            social.send(recipient.getId(), null);
            social.send(other.getId(), "Other");
            var firstPage =
                    social.requests(null, 1, Direction.OUTGOING, FriendRequestStatus.PENDING);
            assertEquals(1, firstPage.items().size());
            assertTrue(firstPage.pageInfo().hasMore());
            var secondPage =
                    social.requests(
                            firstPage.pageInfo().nextCursor(),
                            1,
                            Direction.OUTGOING,
                            FriendRequestStatus.PENDING);
            assertEquals(1, secondPage.items().size());
            assertNotEquals(firstPage.items().getFirst().id(), secondPage.items().getFirst().id());
            assertFalse(secondPage.pageInfo().hasMore());
            assertEquals(
                    "VALIDATION_ERROR",
                    assertThrows(
                                    ApiException.class,
                                    () ->
                                            social.requests(
                                                    "bad cursor",
                                                    1,
                                                    Direction.OUTGOING,
                                                    FriendRequestStatus.PENDING))
                            .getCode());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void oppositeConcurrentSendsCreateOnlyOnePendingRequest() throws Exception {
        UserEntity first = user("Concurrent first"), second = user("Concurrent second");
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var left = pool.submit(() -> sendAfterSignal(first, second, start));
            var right = pool.submit(() -> sendAfterSignal(second, first, start));
            start.countDown();
            UUID leftId = left.get(15, TimeUnit.SECONDS), rightId = right.get(15, TimeUnit.SECONDS);
            assertEquals(leftId, rightId);
            authenticate(first);
            assertEquals(
                    1,
                    social.requests(null, 20, Direction.INCOMING, FriendRequestStatus.PENDING)
                                    .items()
                                    .size()
                            + social.requests(
                                            null,
                                            20,
                                            Direction.OUTGOING,
                                            FriendRequestStatus.PENDING)
                                    .items()
                                    .size());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private UUID sendAfterSignal(UserEntity sender, UserEntity recipient, CountDownLatch start)
            throws InterruptedException {
        start.await();
        authenticate(sender);
        try {
            return ((PendingResult) social.send(recipient.getId(), null)).request().id();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private UserEntity user(String name) {
        UUID id = UUID.randomUUID();
        String phone =
                "+84"
                        + String.format(
                                "%09d",
                                Math.floorMod(id.getLeastSignificantBits(), 1_000_000_000L));
        return users.saveAndFlush(
                new UserEntity(
                        id,
                        id + "@example.test",
                        "unused-hash",
                        name,
                        phone,
                        "TM-" + id.toString().substring(0, 8).toUpperCase(java.util.Locale.ROOT),
                        Instant.now()));
    }

    private void authenticate(UserEntity user) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                new AuthenticatedUser(user.getId(), UUID.randomUUID(), 1L),
                                null,
                                AuthorityUtils.NO_AUTHORITIES));
    }
}
