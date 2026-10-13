package com.tripmate.identity.security;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtConfigurationTest {
    @Test
    void productionRejectsMissingAndPublicDefaultSecrets() {
        var environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        var configuration = new JwtConfiguration();
        assertThrows(
                IllegalStateException.class, () -> configuration.jwtSecretKey("", environment));
        assertThrows(
                IllegalStateException.class,
                () ->
                        configuration.jwtSecretKey(
                                "change-me-in-local-environment-to-a-long-random-secret",
                                environment));
        assertEquals(
                "HmacSHA256",
                configuration
                        .jwtSecretKey("a-private-test-secret-at-least-32-characters", environment)
                        .getAlgorithm());
    }

    @Test
    void localProfileRetainsItsExistingDevelopmentDefault() {
        var environment = new MockEnvironment();
        environment.setActiveProfiles("local");
        assertNotNull(
                new JwtConfiguration()
                        .jwtSecretKey(
                                "change-me-in-local-environment-to-a-long-random-secret",
                                environment));
    }
}
