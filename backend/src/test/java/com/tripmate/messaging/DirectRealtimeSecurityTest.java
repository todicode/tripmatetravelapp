package com.tripmate.messaging;

import com.tripmate.identity.api.AccessTokenVerifier;
import com.tripmate.messaging.web.*;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DirectRealtimeSecurityTest {
    private final AccessTokenVerifier tokens = mock(AccessTokenVerifier.class);
    private final RealtimeSessions sessions = new RealtimeSessions(tokens);
    private final RealtimeChannelSecurity security = new RealtimeChannelSecurity(sessions);
    private final org.springframework.security.core.Authentication user = new UsernamePasswordAuthenticationToken("user-id", null, java.util.List.of());
    private Message<byte[]> frame(StompCommand command, String destination) {
        var accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("session"); accessor.setUser(user);
        if (destination != null) accessor.setDestination(destination);
        if (command == StompCommand.CONNECT) accessor.setNativeHeader("Authorization", "Bearer valid-token");
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
    @Test void connectAuthenticatesAndErasesCredentialsThenOnlyAllowsOwnQueueAndNoSend() {
        when(tokens.verify("valid-token")).thenReturn(user);
        var connect = frame(StompCommand.CONNECT, null);
        security.preSend(connect, mock(MessageChannel.class));
        assertNull(StompHeaderAccessor.wrap(connect).getFirstNativeHeader("Authorization"));
        assertNotNull(security.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/events"), mock(MessageChannel.class)));
        sessions.closed("session");
        for (String destination : java.util.List.of("/user/other/queue/events", "/queue/events-usersession", "/topic/trips/any/events")) {
            assertNotNull(security.preSend(frame(StompCommand.CONNECT, null), mock(MessageChannel.class)));
            assertNull(security.preSend(frame(StompCommand.SUBSCRIBE, destination), mock(MessageChannel.class)));
        }
        security.preSend(frame(StompCommand.CONNECT, null), mock(MessageChannel.class));
        assertNull(security.preSend(frame(StompCommand.SEND, "/user/queue/events"), mock(MessageChannel.class)));
        security.preSend(frame(StompCommand.CONNECT, null), mock(MessageChannel.class));
        assertNull(security.preSend(frame(StompCommand.MESSAGE, "/queue/events-usersession"), mock(MessageChannel.class)));
        security.preSend(frame(StompCommand.CONNECT, null), mock(MessageChannel.class));
        when(tokens.verify("valid-token")).thenThrow(new IllegalArgumentException("revoked"));
        assertNull(security.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/events"), mock(MessageChannel.class)));
    }
    @Test void revokedSessionCannotReceiveOutboundAndIsClosedEvenWithoutSending() throws Exception {
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("session"); when(socket.isOpen()).thenReturn(true);
        sessions.opened(socket);
        when(tokens.verify("valid-token")).thenReturn(user);
        sessions.authenticate("session", "valid-token");
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE); accessor.setSessionId("session");
        var message = MessageBuilder.createMessage("private", accessor.getMessageHeaders());
        assertNotNull(security.outbound().preSend(message, mock(MessageChannel.class)));
        when(tokens.verify("valid-token")).thenThrow(new IllegalArgumentException("revoked"));
        assertNull(security.outbound().preSend(message, mock(MessageChannel.class)));
        verify(socket).close(CloseStatus.POLICY_VIOLATION);
        verify(socket).sendMessage(argThat(frame -> frame instanceof TextMessage text && text.getPayload().contains("AUTH_REQUIRED")));
        sessions.closed("session");
        assertThrows(IllegalArgumentException.class, () -> sessions.verify("session"));
    }
    @Test void errorFramesContainOnlySafeContractFields() {
        var frame = new RealtimeErrorHandler().handleClientMessageProcessingError(null, new IllegalArgumentException("secret-token"));
        var body = new String(frame.getPayload(), java.nio.charset.StandardCharsets.UTF_8);
        assertFalse(body.contains("secret-token")); assertTrue(body.contains("AUTH_REQUIRED")); assertTrue(body.contains("requestId"));
    }
}
