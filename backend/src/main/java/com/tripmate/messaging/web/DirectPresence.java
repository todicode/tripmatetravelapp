package com.tripmate.messaging.web;

import com.tripmate.messaging.infrastructure.DirectConversationRepository;
import com.tripmate.messaging.application.DirectRealtimeEvent.Payload;
import com.tripmate.shared.security.AuthenticatedActor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.*;
import java.time.*;
import java.util.*;

/** Ephemeral presence for the current single-backend broker. No durable last-seen history. */
@Service
public class DirectPresence {
    public record Status(UUID userId, boolean online) {}
    private final Map<String, UUID> sessions = new HashMap<>();
    private final Map<UUID, Instant> pendingOffline = new HashMap<>();
    private final DirectConversationRepository conversations;
    private final SimpMessagingTemplate broker;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public DirectPresence(DirectConversationRepository conversations, SimpMessagingTemplate broker) {
        this(conversations, broker, Clock.systemUTC());
    }
    DirectPresence(DirectConversationRepository conversations, SimpMessagingTemplate broker, Clock clock) {
        this.conversations = conversations; this.broker = broker; this.clock = clock;
    }
    @EventListener public void connected(SessionConnectedEvent event) {
        var headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        if (event.getUser() != null) connected(headers.getSessionId(), UUID.fromString(event.getUser().getName()));
    }
    public synchronized void connected(String sessionId, UUID userId) {
        if (sessionId == null || sessions.containsKey(sessionId)) return;
        boolean alreadyOnline = sessions.containsValue(userId) || pendingOffline.containsKey(userId);
        sessions.put(sessionId, userId); pendingOffline.remove(userId);
        if (!alreadyOnline) publish(userId, true);
    }
    @EventListener public void disconnected(SessionDisconnectEvent event) { disconnected(event.getSessionId()); }
    public synchronized void disconnected(String sessionId) {
        UUID user = sessions.remove(sessionId);
        if (user != null && !sessions.containsValue(user)) pendingOffline.put(user, clock.instant().plusSeconds(10));
    }
    @Scheduled(fixedDelay = 1000) public synchronized void expire() {
        var expired = pendingOffline.entrySet().stream().filter(e -> !e.getValue().isAfter(clock.instant()))
                .map(Map.Entry::getKey).toList();
        for (UUID user : expired) { pendingOffline.remove(user); publish(user, false); }
    }
    public synchronized List<Status> snapshot(UUID actor) {
        return conversations.peers(actor).stream().map(user -> new Status(user,
                sessions.containsValue(user) || pendingOffline.containsKey(user))).toList();
    }
    public List<Status> snapshot() {
        var principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return snapshot(((AuthenticatedActor) principal).userId());
    }
    private void publish(UUID user, boolean online) {
        try {
            var payload = new Payload(UUID.randomUUID(), "direct.presence.updated", 1, clock.instant(), new Status(user, online));
            for (UUID peer : conversations.peers(user)) {
                try { broker.convertAndSendToUser(peer.toString(), "/queue/events", payload); }
                catch (RuntimeException ignored) { /* Snapshot reconciles missed ephemeral events. */ }
            }
        } catch (RuntimeException ignored) { /* Presence must not break socket lifecycle. */ }
    }
}
