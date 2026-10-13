package com.tripmate.messaging.web;

import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class RealtimeErrorHandler extends StompSubProtocolErrorHandler {
    @Override public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable error) {
        var headers = StompHeaderAccessor.create(StompCommand.ERROR);
        headers.setLeaveMutable(true);
        headers.setNativeHeader("content-type", "application/json");
        String code = "AUTH_REQUIRED";
        Throwable cause = error;
        while (cause != null) {
            if (cause instanceof AccessDeniedException && !"Authentication required".equals(cause.getMessage())) code = "FORBIDDEN";
            cause = cause.getCause();
        }
        String body = "{\"requestId\":\"" + UUID.randomUUID() + "\",\"code\":\"" + code
                + "\",\"message\":\"Realtime request was rejected.\"}";
        return MessageBuilder.createMessage(body.getBytes(StandardCharsets.UTF_8), headers.getMessageHeaders());
    }
}
