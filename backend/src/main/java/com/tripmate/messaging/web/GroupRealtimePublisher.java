package com.tripmate.messaging.web;

import com.tripmate.messaging.application.GroupRealtimeDelivery;
import com.tripmate.messaging.application.GroupRealtimeEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.slf4j.LoggerFactory;

@Component
public class GroupRealtimePublisher {
    private final GroupRealtimeDelivery delivery;
    public GroupRealtimePublisher(GroupRealtimeDelivery delivery) { this.delivery = delivery; }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(GroupRealtimeEvent event) {
        try { delivery.deliver(event); }
        catch (RuntimeException error) { LoggerFactory.getLogger(getClass()).warn("Group realtime event {} could not be delivered", event.payload().eventId()); }
    }
}
