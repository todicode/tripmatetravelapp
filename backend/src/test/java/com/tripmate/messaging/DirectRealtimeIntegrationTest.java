package com.tripmate.messaging;

import com.tripmate.identity.api.*;
import com.tripmate.identity.security.*;
import com.tripmate.messaging.application.*;
import com.tripmate.messaging.domain.*;
import com.tripmate.messaging.infrastructure.*;
import com.tripmate.messaging.web.*;
import com.tripmate.social.api.FriendshipAccess;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.*;
import org.springframework.context.annotation.*;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.*;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real HTTP upgrade/STOMP sockets and REST; storage/auth doubles isolate application data. */
@SpringBootTest(classes = DirectRealtimeIntegrationTest.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.flyway.enabled=false", "spring.jpa.open-in-view=false"})
class DirectRealtimeIntegrationTest {
    private static final UUID LOW = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID HIGH = UUID.fromString("ffffffff-ffff-4fff-8fff-ffffffffffff");
    private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000003");
    @Configuration @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
    @EnableTransactionManagement
    @Import({DirectRealtimeConfiguration.class, RealtimeSessions.class, RealtimeChannelSecurity.class,
            DirectRealtimePublisher.class, DirectMessagingController.class, DirectMessagingService.class,
            SecurityConfiguration.class, SecurityErrorHandler.class})
    static class TestApplication {
        @Bean AccessTokenVerifier tokens() {
            return token -> {
                UUID id = switch (token) { case "sender" -> LOW; case "recipient" -> HIGH; case "outsider" -> OTHER;
                    default -> throw new IllegalArgumentException("Invalid token"); };
                return new UsernamePasswordAuthenticationToken(new AuthenticatedUser(id, UUID.randomUUID(), 1), null, AuthorityUtils.NO_AUTHORITIES);
            };
        }
        @Bean UserDirectory users() { return mock(UserDirectory.class); }
        @Bean FriendshipAccess friendships() { return mock(FriendshipAccess.class); }
        @Bean DirectConversationRepository conversations() { return mock(DirectConversationRepository.class); }
        @Bean DirectMessageRepository messages() { return mock(DirectMessageRepository.class); }
        @Bean ConversationCursor cursors() { return new ConversationCursor("isolated-websocket-test-secret-32-chars"); }
        @Bean PlatformTransactionManager transactions() {
            return new AbstractPlatformTransactionManager() {
                @Override protected Object doGetTransaction() { return new Object(); }
                @Override protected void doBegin(Object transaction, TransactionDefinition definition) { }
                @Override protected void doCommit(DefaultTransactionStatus status) { }
                @Override protected void doRollback(DefaultTransactionStatus status) { }
            };
        }
    }
    @LocalServerPort int port;
    @Autowired SimpUserRegistry registry;
    @Autowired UserDirectory users;
    @Autowired FriendshipAccess friendships;
    @Autowired DirectConversationRepository conversations;
    @Autowired DirectMessageRepository messages;
    @Autowired ApplicationEventPublisher publisher;
    @Autowired PlatformTransactionManager transactions;
    @Autowired tools.jackson.databind.ObjectMapper json;
    private final List<WebSocketStompClient> clients = new ArrayList<>();
    private final List<StompSession> sessions = new ArrayList<>();
    @AfterEach void closeSockets() { sessions.forEach(session -> { if (session.isConnected()) session.disconnect(); }); clients.forEach(WebSocketStompClient::stop); }
    private record Peer(StompSession session, BlockingQueue<String> events, BlockingQueue<String> errors) {}
    private Peer connect(String token) throws Exception {
        var client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new StringMessageConverter() {
            @Override protected boolean supportsMimeType(org.springframework.messaging.MessageHeaders headers) { return true; }
        }); clients.add(client);
        var errors = new LinkedBlockingQueue<String>(); var events = new LinkedBlockingQueue<String>();
        var headers = new StompHeaders(); headers.set("Authorization", "Bearer " + token);
        var session = client.connectAsync("ws://localhost:" + port + "/ws", new org.springframework.web.socket.WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { errors.add(payload.toString()); }
            @Override public void handleTransportError(StompSession session, Throwable error) { errors.add("transport closed"); }
            @Override public void handleException(StompSession session, StompCommand command, StompHeaders headers,
                    byte[] payload, Throwable error) { errors.add("conversion error: " + error.getMessage()); }
        }).get(5, TimeUnit.SECONDS);
        sessions.add(session);
        session.subscribe("/user/queue/events", new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { events.add(payload.toString()); }
        });
        UUID id = token.equals("sender") ? LOW : token.equals("recipient") ? HIGH : OTHER;
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline && (registry.getUser(id.toString()) == null
                || registry.getUser(id.toString()).getSessions().stream().allMatch(s -> s.getSubscriptions().isEmpty()))) Thread.sleep(20);
        assertNotNull(registry.getUser(id.toString()));
        assertTrue(registry.getUser(id.toString()).getSessions().stream().anyMatch(s -> !s.getSubscriptions().isEmpty()));
        return new Peer(session, events, errors);
    }
    private HttpResponse<String> post(String path, String method, String token, String body) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void restCommitImmediatelyReachesBothParticipantsButNotOutsiderAndRetriesDoNotBroadcastAgain() throws Exception {
        var sender = connect("sender"); var recipient = connect("recipient"); var outsider = connect("outsider");
        var conversation = new DirectConversationEntity(UUID.randomUUID(), LOW, HIGH);
        var low = new UserDirectory.UserSummary(LOW, "Sender", null, true);
        var high = new UserDirectory.UserSummary(HIGH, "Recipient", null, true);
        when(users.find(LOW)).thenReturn(low); when(users.find(HIGH)).thenReturn(high);
        when(friendships.lockFriends(LOW, HIGH)).thenReturn(new UserDirectory.UserPair(low, high));
        var participants = mock(DirectConversationRepository.Participants.class);
        when(participants.getLowId()).thenReturn(LOW); when(participants.getHighId()).thenReturn(HIGH);
        when(conversations.participants(conversation.getId())).thenReturn(Optional.of(participants));
        when(conversations.findByIdForUpdate(conversation.getId())).thenReturn(Optional.of(conversation));
        when(messages.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var clientId = UUID.randomUUID();
        String body = "{\"clientMessageId\":\"" + clientId + "\",\"body\":\"Xin chào realtime\"}";
        var response = post("/api/v1/direct-conversations/" + conversation.getId() + "/messages", "POST", "sender", body);
        assertEquals(200, response.statusCode(), response.body());
        String received = recipient.events().poll(3, TimeUnit.SECONDS);
        assertNotNull(received); assertTrue(received.contains("direct.message.created")); assertTrue(received.contains("Xin chào realtime"));
        // Native clients validate timestamps as ISO strings, not numeric Jackson timestamps.
        assertNotNull(Instant.parse(json.readTree(received).get("occurredAt").asText()));
        assertNotNull(Instant.parse(json.readTree(received).get("data").get("createdAt").asText()));
        assertFalse(received.contains("email")); assertEquals(received, sender.events().poll(3, TimeUnit.SECONDS));
        assertNull(outsider.events().poll(200, TimeUnit.MILLISECONDS));
        var saved = new DirectMessageEntity(UUID.randomUUID(), conversation, LOW, clientId, 1, "Xin chào realtime");
        when(messages.findByConversationIdAndSenderIdAndClientMessageId(conversation.getId(), LOW, clientId)).thenReturn(Optional.of(saved));
        assertEquals(200, post("/api/v1/direct-conversations/" + conversation.getId() + "/messages", "POST", "sender", body).statusCode());
        assertNull(recipient.events().poll(200, TimeUnit.MILLISECONDS));
        assertEquals(200, post("/api/v1/direct-conversations/" + conversation.getId() + "/read", "PUT", "recipient", "{\"lastReadSeq\":\"1\"}").statusCode());
        assertTrue(sender.events().poll(3, TimeUnit.SECONDS).contains("direct.read.updated"));
        assertTrue(recipient.events().poll(3, TimeUnit.SECONDS).contains("direct.read.updated"));
    }
    @Test void rollbackNeverPublishesAndNoEventIsDeliveredBeforeCommit() throws Exception {
        var recipient = connect("recipient");
        var message = new DirectMessagingService.MessageView(UUID.randomUUID(), UUID.randomUUID(), "1",
                new DirectMessagingService.UserSummary(LOW, "Sender", null), UUID.randomUUID(), "rolled back", Instant.now());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            publisher.publishEvent(DirectRealtimeEvent.message(LOW, HIGH, message));
            assertTrue(recipient.events().isEmpty()); status.setRollbackOnly();
        });
        assertNull(recipient.events().poll(200, TimeUnit.MILLISECONDS));
    }
    @Test void socketSendAndAnotherUsersQueueAreRejected() throws Exception {
        var sender = connect("sender");
        sender.session().send("/user/queue/events", "unauthorized write");
        String error = sender.errors().poll(3, TimeUnit.SECONDS);
        assertNotNull(error); assertTrue(error.contains("FORBIDDEN"), error);
        var recipient = connect("recipient");
        recipient.session().subscribe("/user/" + LOW + "/queue/events", new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { fail("Other user's queue was exposed"); }
        });
        assertNotNull(recipient.errors().poll(3, TimeUnit.SECONDS));
    }
    @Test void invalidConnectAndQueryCredentialsCannotAuthenticate() {
        var client = new WebSocketStompClient(new StandardWebSocketClient()); clients.add(client);
        var headers = new StompHeaders(); headers.set("Authorization", "Bearer invalid");
        assertThrows(Exception.class, () -> client.connectAsync("ws://localhost:" + port + "/ws",
                new org.springframework.web.socket.WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {})
                .get(3, TimeUnit.SECONDS));
        headers.set("Authorization", "Bearer sender");
        assertThrows(Exception.class, () -> client.connectAsync("ws://localhost:" + port + "/ws?token=not-allowed",
                new org.springframework.web.socket.WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {})
                .get(3, TimeUnit.SECONDS));
    }
}
