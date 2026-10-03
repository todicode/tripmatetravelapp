package com.tripmate.identity.api;

import org.springframework.security.core.Authentication;

/** Verifies expiry, active account and current device binding for REST and realtime. */
public interface AccessTokenVerifier {
    Authentication verify(String token);
}
