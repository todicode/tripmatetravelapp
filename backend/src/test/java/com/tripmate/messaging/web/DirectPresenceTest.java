package com.tripmate.messaging.web;

import com.tripmate.messaging.infrastructure.DirectConversationRepository;
import com.tripmate.messaging.application.DirectRealtimeEvent.Payload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DirectPresenceTest {
    private final UUID user = UUID.randomUUID(), peer = UUID.randomUUID(), stranger = UUID.randomUUID();
    private final DirectConversationRepository conversations = mock(DirectConversationRepository.class);
    private final SimpMessagingTemplate broker = mock(SimpMessagingTemplate.class);
    private final Clock clock = mock(Clock.class);
    private final DirectPresence presence = new DirectPresence(conversations, broker, clock);
    private void time(int seconds) { when(clock.instant()).thenReturn(Instant.EPOCH.plusSeconds(seconds)); }
    private void setup() {
        time(0); when(conversations.peers(user)).thenReturn(List.of(peer));
        when(conversations.peers(peer)).thenReturn(List.of(user));
        when(conversations.peers(stranger)).thenReturn(List.of());
    }
    @Test void multipleDevicesStayOnlineUntilLastDisconnectAndGraceExpires() {
        setup(); presence.connected("a", user); presence.connected("b", user);
        presence.connected("a", user); presence.disconnected("a"); presence.disconnected("a");
        time(20); presence.expire(); assertTrue(presence.snapshot(peer).getFirst().online());
        presence.disconnected("b"); time(29); presence.expire();
        assertTrue(presence.snapshot(peer).getFirst().online());
        time(30); presence.expire(); assertFalse(presence.snapshot(peer).getFirst().online());
        presence.expire();
        verify(broker, times(2)).convertAndSendToUser(eq(peer.toString()), eq("/queue/events"), any(Payload.class));
    }
    @Test void reconnectWithinGraceDoesNotFlickerOrPublishDuplicateOnline() {
        setup(); presence.connected("a", user); presence.disconnected("a");
        time(5); presence.connected("b", user); time(20); presence.expire();
        assertTrue(presence.snapshot(peer).getFirst().online());
        verify(broker, times(1)).convertAndSendToUser(eq(peer.toString()), eq("/queue/events"), any(Payload.class));
    }
    @Test void snapshotAndFanoutOnlyExposeConversationPeersAndBrokerFailureDoesNotBreakLifecycle() {
        setup(); doThrow(new RuntimeException()).when(broker).convertAndSendToUser(anyString(), anyString(), any(Payload.class));
        assertDoesNotThrow(() -> presence.connected("a", user));
        assertTrue(presence.snapshot(stranger).isEmpty());
        assertEquals(user, presence.snapshot(peer).getFirst().userId());
        verify(broker, never()).convertAndSendToUser(eq(stranger.toString()), anyString(), any(Payload.class));
        assertDoesNotThrow(() -> presence.disconnected("a"));
        time(11); assertDoesNotThrow(presence::expire);
    }
}
