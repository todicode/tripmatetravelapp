package com.tripmate.identity.security;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.UserEntity;
import org.junit.jupiter.api.Test;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtTokenServiceTest {

    @Test
    void issuedTokenCanBeParsedByTheConfiguredDecoder() {
        JwtConfiguration configuration = new JwtConfiguration();
        var secret = new SecretKeySpec(
                "jwt-round-trip-secret-with-at-least-32-chars".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");
        JwtTokenService service = new JwtTokenService(
                configuration.jwtEncoder(secret), configuration.jwtDecoder(secret), Duration.ofMinutes(15));
        UUID userId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();
        UserEntity user = new UserEntity(userId, "jwt@example.com", "hash", "JWT User", "+84901234567",
                "TM-TEST1234", Instant.now());
        DeviceEntity device = new DeviceEntity(deviceId, UUID.randomUUID());
        device.bind(user);

        AuthenticatedUser parsed = service.parse(service.issue(user, device));

        assertEquals(userId, parsed.userId());
        assertEquals(deviceId, parsed.deviceId());
        assertEquals(device.getBindingVersion(), parsed.bindingVersion());
    }
}
