package com.tripmate.messaging.application;

import java.time.Instant;
import java.util.UUID;

/** Immutable payload captured in the transaction, delivered only after commit. */
public record DirectRealtimeEvent(UUID lowUserId, UUID highUserId, Payload payload) {
    public record Payload(UUID eventId, String type, int schemaVersion, Instant occurredAt, Object data) {}
    public record ReadChanged(UUID conversationId, UUID userId, String lastReadSeq) {}
    public static DirectRealtimeEvent message(UUID low, UUID high, DirectMessagingService.MessageView message) {
        return new DirectRealtimeEvent(low, high,
                new Payload(UUID.randomUUID(), "direct.message.created", 1, message.createdAt(), message));
    }
    public static DirectRealtimeEvent read(UUID low, UUID high, UUID conversationId, UUID actor, long seq) {
        return new DirectRealtimeEvent(low, high, new Payload(UUID.randomUUID(), "direct.read.updated", 1,
                Instant.now(), new ReadChanged(conversationId, actor, Long.toString(seq))));
    }
}
