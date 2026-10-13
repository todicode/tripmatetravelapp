package com.tripmate.messaging.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Recipients and payload captured under the group transaction lock. */
public record GroupRealtimeEvent(
        UUID conversationId, List<UUID> recipients, Payload payload, boolean revoked) {
    public record Payload(
            UUID eventId, String type, int schemaVersion, Instant occurredAt, Object data) {}

    public record Changed(UUID conversationId) {}

    public static GroupRealtimeEvent of(UUID id, List<UUID> recipients, String type, Object data) {
        return new GroupRealtimeEvent(
                id,
                List.copyOf(recipients),
                new Payload(UUID.randomUUID(), type, 1, Instant.now(), data),
                type.equals("group.access.revoked"));
    }
}
