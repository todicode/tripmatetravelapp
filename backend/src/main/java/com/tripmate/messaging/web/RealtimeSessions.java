package com.tripmate.messaging.web;

import com.tripmate.identity.api.AccessTokenVerifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RealtimeSessions {
    private record Connection(WebSocketSession socket, Instant openedAt) {}
    private record Credential(String token, String userName) {}
    private final Map<String, Connection> connections = new ConcurrentHashMap<>();
    private final Map<String, Credential> credentials = new ConcurrentHashMap<>();
    private final AccessTokenVerifier tokens;

    public RealtimeSessions(AccessTokenVerifier tokens) { this.tokens = tokens; }
    public void opened(WebSocketSession socket) { connections.put(socket.getId(), new Connection(socket, Instant.now())); }
    public void closed(String sessionId) { connections.remove(sessionId); credentials.remove(sessionId); }
    public Authentication authenticate(String sessionId, String token) {
        if (credentials.containsKey(sessionId)) throw new IllegalArgumentException("Already connected");
        var actor = tokens.verify(token);
        credentials.put(sessionId, new Credential(token, actor.getName()));
        return actor;
    }
    public Authentication verify(String sessionId) {
        var credential = credentials.get(sessionId);
        if (credential == null) throw new IllegalArgumentException("Authentication required");
        var actor = tokens.verify(credential.token());
        if (!actor.getName().equals(credential.userName())) throw new IllegalArgumentException("Invalid principal");
        return actor;
    }
    public void reject(String sessionId) {
        reject(sessionId, "AUTH_REQUIRED");
    }
    public void reject(String sessionId, String code) {
        var connection = connections.get(sessionId);
        credentials.remove(sessionId);
        if (connection == null) return;
        var socket = connection.socket();
        try {
            if (socket.isOpen()) socket.sendMessage(new TextMessage("ERROR\ncontent-type:application/json\n\n"
                    + "{\"requestId\":\"" + UUID.randomUUID() + "\",\"code\":\"" + code + "\","
                    + "\"message\":\"Session is no longer valid.\"}\u0000"));
        } catch (Exception ignored) { /* Closing must still revoke a broken connection. */ }
        try { socket.close(CloseStatus.POLICY_VIOLATION); } catch (Exception ignored) { }
    }
    @Scheduled(fixedDelay = 10000)
    public void expireSessions() {
        connections.forEach((id, connection) -> {
            if (!credentials.containsKey(id)) {
                if (connection.openedAt().plusSeconds(10).isBefore(Instant.now())) reject(id);
            } else {
                try { verify(id); } catch (RuntimeException error) { reject(id); }
            }
        });
    }
}
