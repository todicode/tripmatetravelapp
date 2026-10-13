package com.tripmate.messaging.web;

import com.tripmate.messaging.application.DirectRealtimeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;

@Component
public class DirectRealtimePublisher {
    private static final Logger log = LoggerFactory.getLogger(DirectRealtimePublisher.class);
    private final SimpMessagingTemplate broker;
    public DirectRealtimePublisher(SimpMessagingTemplate broker) { this.broker = broker; }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(DirectRealtimeEvent event) {
        // A broker failure must not turn a committed REST send into a failed response.
        for (var user : java.util.List.of(event.lowUserId(), event.highUserId())) {
            try { broker.convertAndSendToUser(user.toString(), "/queue/events", event.payload()); }
            catch (RuntimeException error) { log.warn("Realtime delivery failed for event {}", event.payload().eventId()); }
        }
    }
}
