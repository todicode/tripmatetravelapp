package com.tripmate.identity.infrastructure;

import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleApiIdentityVerifierTest {

    @Test
    void missingAudienceConfigurationIsUnavailable() {
        GoogleApiIdentityVerifier verifier = new GoogleApiIdentityVerifier("");

        ApiException exception = assertThrows(ApiException.class, () -> verifier.verify("token"));

        assertEquals(503, exception.getStatus().value());
        assertEquals("GOOGLE_NOT_CONFIGURED", exception.getCode());
    }

    @Test
    void malformedIdTokenIsRejected() {
        GoogleApiIdentityVerifier verifier = new GoogleApiIdentityVerifier("test-web-client-id");

        ApiException exception = assertThrows(ApiException.class, () -> verifier.verify("not-a-jwt"));

        assertEquals(401, exception.getStatus().value());
        assertEquals("INVALID_GOOGLE_TOKEN", exception.getCode());
        assertTrue(exception.getMessage().contains("Google"));
    }
}
