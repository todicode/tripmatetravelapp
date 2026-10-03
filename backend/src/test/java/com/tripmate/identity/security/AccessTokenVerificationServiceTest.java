package com.tripmate.identity.security;

import com.tripmate.identity.domain.*;
import com.tripmate.identity.infrastructure.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccessTokenVerificationServiceTest {
    @Test void validatesDeviceOwnerBindingAccountAndTokenBeforeReturningUuidPrincipal() {
        var tokens = mock(JwtTokenService.class);
        var devices = mock(DeviceRepository.class);
        var users = mock(UserRepository.class);
        var verifier = new AccessTokenVerificationService(tokens, devices, users);
        var user = new UserEntity(UUID.randomUUID(), "verify@example.test", "hash", "User", "+84901234567", "TM-VERIFY01", Instant.now());
        var device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        device.bind(user);
        when(tokens.parse("valid")).thenReturn(new AuthenticatedUser(user.getId(), device.getId(), device.getBindingVersion()));
        when(devices.findById(device.getId())).thenReturn(Optional.of(device));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        assertEquals(user.getId().toString(), verifier.verify("valid").getName());
        user.setStatus(UserStatus.DISABLED);
        assertThrows(IllegalArgumentException.class, () -> verifier.verify("valid"));
        user.setStatus(UserStatus.ACTIVE);
        when(tokens.parse("valid")).thenReturn(new AuthenticatedUser(user.getId(), device.getId(), device.getBindingVersion() + 1));
        assertThrows(IllegalArgumentException.class, () -> verifier.verify("valid"));
        when(tokens.parse("expired")).thenThrow(new IllegalArgumentException("expired"));
        assertThrows(IllegalArgumentException.class, () -> verifier.verify("expired"));
    }
}
