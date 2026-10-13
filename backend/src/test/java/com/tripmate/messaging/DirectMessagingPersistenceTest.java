package com.tripmate.messaging;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.messaging.application.DirectMessagingService;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.application.SocialService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Only a dedicated disposable PostgreSQL database; migrations never target application data. */
@EnabledIfEnvironmentVariable(named = "MESSAGING_TEST_DATABASE_URL", matches = "jdbc:postgresql://.*/tripmate_messaging_test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
        "spring.datasource.url=${MESSAGING_TEST_DATABASE_URL}", "spring.datasource.username=tripmate",
        "spring.datasource.password=${MESSAGING_TEST_DATABASE_PASSWORD}", "spring.flyway.enabled=true",
        "tripmate.email.mode=log"
})
class DirectMessagingPersistenceTest {
    @Autowired UserRepository users;
    @Autowired SocialService social;
    @Autowired DirectMessagingService messaging;

    @Test void messagesHistoryUnreadPermissionsAndUnfriendPersistAcrossTransactions() {
        UserEntity a = user("A"), b = user("B"), outsider = user("Outsider");
        try {
            befriend(a, b);
            authenticate(a);
            UUID id = messaging.open(b.getId()).id();
            UUID retry = UUID.randomUUID();
            var first = messaging.send(id, retry, "  hello\n");
            assertEquals(first, messaging.send(id, retry, "  hello\n"));
            assertEquals("IDEMPOTENCY_CONFLICT", assertThrows(ApiException.class,
                    () -> messaging.send(id, retry, "different")).getCode());
            authenticate(b);
            assertEquals(id, messaging.open(a.getId()).id());
            assertEquals("1", messaging.list(null, 20).items().getFirst().unreadCount());
            messaging.send(id, UUID.randomUUID(), "reply");
            assertEquals("1", messaging.list(null, 20).items().getFirst().unreadCount());
            var last = messaging.send(id, UUID.randomUUID(), "second reply");
            authenticate(a);
            assertEquals("2", messaging.list(null, 20).items().getFirst().unreadCount());
            var latest = messaging.history(id, null, null, 2);
            assertEquals(List.of("2", "3"), latest.items().stream().map(m -> m.seq()).toList());
            assertTrue(latest.pageInfo().hasMore());
            // Insert between history requests: keyset still returns exactly the older message.
            messaging.send(id, UUID.randomUUID(), "new since paging");
            var older = messaging.history(id, latest.pageInfo().nextBeforeSeq(), null, 2);
            assertEquals(List.of(first.id()), older.items().stream().map(m -> m.id()).toList());
            var catchUp = messaging.history(id, null, "1", 2);
            assertEquals(List.of("2", "3"), catchUp.items().stream().map(m -> m.seq()).toList());
            assertTrue(catchUp.pageInfo().hasMore());
            assertEquals("1", messaging.markRead(id, "2").unreadCount());
            assertEquals("2", messaging.markRead(id, "1").lastReadSeq());
            assertEquals("0", messaging.markRead(id, "4").unreadCount());
            assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> messaging.markRead(id, "5")).getCode());
            authenticate(outsider);
            assertTrue(messaging.list(null, 20).items().isEmpty());
            assertEquals("CONVERSATION_NOT_FOUND", assertThrows(ApiException.class,
                    () -> messaging.history(id, null, null, 50)).getCode());
            assertEquals("CONVERSATION_NOT_FOUND", assertThrows(ApiException.class,
                    () -> messaging.send(id, UUID.randomUUID(), "attack")).getCode());
            assertEquals("CONVERSATION_NOT_FOUND", assertThrows(ApiException.class,
                    () -> messaging.markRead(id, "4")).getCode());
            authenticate(a);
            social.removeFriend(b.getId());
            assertFalse(messaging.list(null, 20).items().getFirst().canSend());
            assertEquals("NOT_FRIENDS", assertThrows(ApiException.class,
                    () -> messaging.send(id, UUID.randomUUID(), "blocked")).getCode());
            assertEquals(4, messaging.history(id, null, null, 50).items().size());
            assertEquals(last.id(), messaging.history(id, "4", null, 1).items().getFirst().id());
            assertEquals("4", messaging.markRead(id, "4").lastReadSeq());
            befriend(a, b);
            authenticate(a);
            assertEquals(id, messaging.open(b.getId()).id());
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test void oppositeConcurrentOpensAndDuplicateSendsRemainUnique() throws Exception {
        UserEntity a = user("Concurrent A"), b = user("Concurrent B");
        befriend(a, b);
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var left = pool.submit(() -> as(a, start, () -> messaging.open(b.getId()).id()));
            var right = pool.submit(() -> as(b, start, () -> messaging.open(a.getId()).id()));
            start.countDown();
            UUID id = left.get(20, TimeUnit.SECONDS);
            assertEquals(id, right.get(20, TimeUnit.SECONDS));
            UUID clientId = UUID.randomUUID();
            CountDownLatch sendStart = new CountDownLatch(1);
            var first = pool.submit(() -> as(a, sendStart, () -> messaging.send(id, clientId, "once")));
            var retry = pool.submit(() -> as(a, sendStart, () -> messaging.send(id, clientId, "once")));
            sendStart.countDown();
            assertEquals(first.get(20, TimeUnit.SECONDS).id(), retry.get(20, TimeUnit.SECONDS).id());
            CountDownLatch twoSendStart = new CountDownLatch(1);
            var aSend = pool.submit(() -> as(a, twoSendStart, () -> messaging.send(id, UUID.randomUUID(), "A")));
            var bSend = pool.submit(() -> as(b, twoSendStart, () -> messaging.send(id, UUID.randomUUID(), "B")));
            twoSendStart.countDown();
            Set<String> seqs = Set.of(aSend.get(20, TimeUnit.SECONDS).seq(), bSend.get(20, TimeUnit.SECONDS).seq());
            assertEquals(Set.of("2", "3"), seqs);
            authenticate(a);
            assertEquals(3, messaging.history(id, null, null, 50).items().size());
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test void conversationKeysetListsBothSidesOfCanonicalPair() {
        UserEntity actor = user("Paging"), a = user("Peer A"), b = user("Peer B");
        try {
            befriend(actor, a); befriend(actor, b);
            authenticate(actor);
            UUID firstId = messaging.open(a.getId()).id(), secondId = messaging.open(b.getId()).id();
            messaging.send(firstId, UUID.randomUUID(), "newest");
            var first = messaging.list(null, 1);
            assertEquals(firstId, first.items().getFirst().id());
            assertTrue(first.pageInfo().hasMore());
            var second = messaging.list(first.pageInfo().nextCursor(), 1);
            assertEquals(secondId, second.items().getFirst().id());
            assertFalse(second.pageInfo().hasMore());
            authenticate(a);
            assertEquals(firstId, messaging.list(null, 20).items().getFirst().id());
        } finally { SecurityContextHolder.clearContext(); }
    }
    private <T> T as(UserEntity actor, CountDownLatch signal, Callable<T> task) throws Exception {
        signal.await(); authenticate(actor);
        try { return task.call(); } finally { SecurityContextHolder.clearContext(); }
    }
    private void befriend(UserEntity a, UserEntity b) {
        authenticate(a);
        var pending = (SocialService.PendingResult) social.send(b.getId(), null);
        authenticate(b); social.accept(pending.request().id());
    }
    private UserEntity user(String name) {
        UUID id = UUID.randomUUID();
        String phone = "+84" + String.format("%09d", Math.floorMod(id.getLeastSignificantBits(), 1_000_000_000L));
        return users.saveAndFlush(new UserEntity(id, id + "@example.test", "hash", name, phone,
                "TM-" + id.toString().substring(0, 8).toUpperCase(Locale.ROOT), Instant.now()));
    }
    private void authenticate(UserEntity user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(user.getId(), UUID.randomUUID(), 1L), null, AuthorityUtils.NO_AUTHORITIES));
    }
}
