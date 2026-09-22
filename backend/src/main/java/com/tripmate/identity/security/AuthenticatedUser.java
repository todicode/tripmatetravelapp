package com.tripmate.identity.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, UUID deviceId, long bindingVersion) {
}
