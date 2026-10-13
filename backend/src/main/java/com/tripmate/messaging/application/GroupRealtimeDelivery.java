package com.tripmate.messaging.application;

import com.tripmate.messaging.infrastructure.GroupConversationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import java.util.HashSet;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;

@Service
public class GroupRealtimeDelivery {
    private final GroupConversationRepository groups;
    private final SimpMessagingTemplate broker;
    public GroupRealtimeDelivery(GroupConversationRepository groups, SimpMessagingTemplate broker) { this.groups = groups; this.broker = broker; }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(GroupRealtimeEvent event) {
        // Serialize delivery with removal. A departed user receives only an ID-only revocation.
        if (groups.find(event.conversationId(), true).isEmpty()) return;
        var active = new HashSet<>(groups.members(event.conversationId()).stream().map(m -> m.userId()).toList());
        for (var user : event.recipients()) {
            if (event.revoked() ? active.contains(user) : !active.contains(user)) continue;
            try {
                var headers = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
                headers.setHeader("groupConversationId", event.conversationId().toString());
                headers.setHeader("groupRevoked", event.revoked()); headers.setLeaveMutable(true);
                broker.convertAndSendToUser(user.toString(), "/queue/events", event.payload(), headers.getMessageHeaders());
            }
            catch (RuntimeException error) { LoggerFactory.getLogger(getClass()).warn("Group realtime delivery failed for event {}", event.payload().eventId()); }
        }
    }
}
