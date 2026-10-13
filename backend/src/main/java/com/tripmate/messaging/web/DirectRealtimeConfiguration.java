package com.tripmate.messaging.web;

import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.http.server.*;
import org.springframework.messaging.simp.config.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.server.HandshakeInterceptor;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class DirectRealtimeConfiguration implements WebSocketMessageBrokerConfigurer {
    private final RealtimeChannelSecurity security;
    private final RealtimeSessions sessions;
    public DirectRealtimeConfiguration(RealtimeChannelSecurity security, RealtimeSessions sessions) {
        this.security = security; this.sessions = sessions;
    }
    @Bean public ThreadPoolTaskScheduler realtimeHeartbeats() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1); scheduler.setThreadNamePrefix("realtime-heartbeat-");
        return scheduler;
    }
    @Override public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.setErrorHandler(new RealtimeErrorHandler());
        registry.setPreserveReceiveOrder(true);
        registry.addEndpoint("/ws").addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler handler, Map<String, Object> attributes) {
                if (request.getURI().getRawQuery() != null) { response.setStatusCode(HttpStatus.BAD_REQUEST); return false; }
                return true;
            }
            @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler handler, Exception exception) { }
        });
    }
    @Override public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue").setTaskScheduler(realtimeHeartbeats()).setHeartbeatValue(new long[] {10000, 10000});
        registry.setUserDestinationPrefix("/user");
        registry.setPreservePublishOrder(true);
    }
    @Override public void configureClientInboundChannel(ChannelRegistration registration) { registration.interceptors(security); }
    @Override public void configureClientOutboundChannel(ChannelRegistration registration) { registration.interceptors(security.outbound()); }
    @Override public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(8192).setSendBufferSizeLimit(131072).setSendTimeLimit(10000);
        registration.addDecoratorFactory(handler -> new WebSocketHandlerDecorator(handler) {
            @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sessions.opened(session); super.afterConnectionEstablished(session);
            }
            @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                sessions.closed(session.getId()); super.afterConnectionClosed(session, status);
            }
        });
    }
}
