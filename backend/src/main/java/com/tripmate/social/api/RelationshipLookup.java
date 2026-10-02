package com.tripmate.social.api;

import java.util.UUID;

public interface RelationshipLookup {
    Relationship between(UUID actorId, UUID targetId);
    record Relationship(String status, UUID pendingRequestId) {}
}
