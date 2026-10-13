package com.tripmate.identity.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, UUID deviceId, long bindingVersion)
        implements com.tripmate.shared.security.AuthenticatedActor, java.security.Principal {
    @Override public String getName() { return userId.toString(); }
}
