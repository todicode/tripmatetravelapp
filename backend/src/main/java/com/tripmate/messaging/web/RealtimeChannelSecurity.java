package com.tripmate.messaging.web;

import org.springframework.messaging.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import com.tripmate.messaging.infrastructure.GroupConversationRepository;
import java.util.UUID;

@Component
public class RealtimeChannelSecurity implements ChannelInterceptor {
    private final RealtimeSessions sessions;
    private final GroupConversationRepository groups;
    public RealtimeChannelSecurity(RealtimeSessions sessions, GroupConversationRepository groups) { this.sessions = sessions; this.groups = groups; }
    @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var headers = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (headers == null) return message;
        var command = headers.getCommand();
        if (command == StompCommand.DISCONNECT) return message;
        try {
            if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
                String authorization = headers.getFirstNativeHeader("Authorization");
                // Never retain bearer credentials in broker headers or exception diagnostics.
                headers.removeNativeHeader("Authorization");
                if (authorization == null || !authorization.startsWith("Bearer ")) throw new IllegalArgumentException();
                headers.setUser(sessions.authenticate(headers.getSessionId(), authorization.substring(7)));
            } else {
                var actor = sessions.verify(headers.getSessionId());
                if (headers.getUser() == null || !actor.getName().equals(headers.getUser().getName()))
                    throw new IllegalArgumentException();
                if (command == StompCommand.SUBSCRIBE && !"/user/queue/events".equals(headers.getDestination()))
                    throw new AccessDeniedException("Destination is not allowed");
                if (command != null && command != StompCommand.SUBSCRIBE && command != StompCommand.UNSUBSCRIBE)
                    throw new AccessDeniedException("Client command is not allowed; use REST for writes");
            }
            return message;
        } catch (AccessDeniedException error) {
            sessions.reject(headers.getSessionId(), "FORBIDDEN"); return null;
        } catch (RuntimeException error) {
            sessions.reject(headers.getSessionId()); return null;
        }
    }
    public ChannelInterceptor outbound() {
        return new ChannelInterceptor() {
            @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
                var headers = SimpMessageHeaderAccessor.wrap(message);
                if (headers.getMessageType() != SimpMessageType.MESSAGE) return message;
                String sessionId = headers.getSessionId();
                try {
                    var actor = sessions.verify(sessionId);
                    var groupId = headers.getHeader("groupConversationId");
                    if (groupId != null) {
                        boolean active = groups.member(UUID.fromString(groupId.toString()), UUID.fromString(actor.getName()))
                                .filter(member -> member.status().equals("ACTIVE")).isPresent();
                        // Re-check at the final outbound boundary, including queued frames.
                        if (Boolean.TRUE.equals(headers.getHeader("groupRevoked")) ? active : !active) return null;
                    }
                    return message;
                }
                catch (RuntimeException error) { if (sessionId != null) sessions.reject(sessionId); return null; }
            }
        };
    }
}
