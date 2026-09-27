package com.tripmate.identity.application;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.RefreshTokenEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.*;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.identity.security.JwtTokenService;
import com.tripmate.identity.web.AuthRequests.ChangePasswordRequest;
import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordChangeServiceTest {
    @Mock UserRepository users;
    @Mock DeviceRepository devices;
    @Mock RefreshTokenRepository tokens;
    @Mock PendingRegistrationRepository registrations;
    @Mock AuthIdentityRepository identities;
    @Mock PasswordEncoder encoder;
    @Mock JwtTokenService jwt;
    @Mock GoogleIdentityVerifier google;
    @Mock ApplicationEventPublisher events;
    IdentityService service;
    UserEntity user;
    DeviceEntity device;

    @BeforeEach
    void setUp() {
        service = new IdentityService(users, devices, tokens, registrations, identities, encoder,
                jwt, google, events, Duration.ofMinutes(3), Duration.ofSeconds(60), Duration.ofDays(30), 5);
        user = new UserEntity(UUID.randomUUID(), "test@example.test", "old-hash", "Test", null, "TM-TEST", Instant.now());
        device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        device.bind(user);
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(user.getId(), device.getId(), device.getBindingVersion()),
                null, AuthorityUtils.NO_AUTHORITIES));
    }

    private void arrangeSession() {
        authenticate();
        when(users.findByIdForUpdate(user.getId())).thenReturn(Optional.of(user));
        when(devices.findByUserIdForUpdate(user.getId())).thenReturn(List.of(device));
    }

    @Test
    void requiresAuthentication() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("old-password", "new-password")));
        assertEquals("UNAUTHORIZED", error.getCode());
        verifyNoInteractions(users, encoder, devices, tokens);
    }

    @Test
    void wrongPasswordDoesNotChangeHashOrRevokeSessions() {
        arrangeSession();
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("wrong-password", "new-password")));
        assertEquals("CURRENT_PASSWORD_INCORRECT", error.getCode());
        assertEquals("old-hash", user.getPasswordHash());
        assertSame(user, device.getUser());
        verify(users, never()).save(any());
        verify(encoder, never()).encode(any());
        verifyNoInteractions(tokens);
    }

    @Test
    void rejectsRevokedSessionEvenIfItWasAuthenticatedBeforeTransaction() {
        authenticate();
        device.unbind();
        when(users.findByIdForUpdate(user.getId())).thenReturn(Optional.of(user));
        when(devices.findByUserIdForUpdate(user.getId())).thenReturn(List.of());
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("old-password", "new-password")));
        assertEquals("UNAUTHORIZED", error.getCode());
        verifyNoInteractions(encoder, tokens);
    }

    @Test
    void rejectsSamePassword() {
        arrangeSession();
        when(encoder.matches("old-password", "old-hash")).thenReturn(true);
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("old-password", "old-password")));
        assertEquals("PASSWORD_UNCHANGED", error.getCode());
        verify(users, never()).save(any());
        verifyNoInteractions(tokens);
    }

    @Test
    void googleAccountWithoutKnownLocalPasswordGetsActionableError() {
        arrangeSession();
        when(identities.existsByUserIdAndProvider(user.getId(), "GOOGLE")).thenReturn(true);
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("unknown-password", "new-password")));
        assertEquals("PASSWORD_CHANGE_UNAVAILABLE", error.getCode());
        verify(users, never()).save(any());
    }

    @Test
    void rejectsPasswordsExceedingBcryptUtf8ByteLimit() {
        authenticate();
        ApiException error = assertThrows(ApiException.class,
                () -> service.changePassword(new ChangePasswordRequest("old-password", "\u1ea1".repeat(25))));
        assertEquals("PASSWORD_TOO_LONG", error.getCode());
        verifyNoInteractions(users, encoder, devices, tokens);
    }

    @Test
    void savesHashAndInvalidatesAllDeviceBindingsAndRefreshTokens() {
        authenticate();
        DeviceEntity other = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        other.bind(user);
        long binding = device.getBindingVersion();
        long otherBinding = other.getBindingVersion();
        RefreshTokenEntity token = new RefreshTokenEntity(UUID.randomUUID(), user, device, UUID.randomUUID(), null,
                "token-hash", Instant.now().plusSeconds(3600));
        when(users.findByIdForUpdate(user.getId())).thenReturn(Optional.of(user));
        when(devices.findByUserIdForUpdate(user.getId())).thenReturn(List.of(device, other));
        when(encoder.matches("old-password", "old-hash")).thenReturn(true);
        when(encoder.encode("new-password")).thenReturn("new-hash");
        when(tokens.findUnrevokedByUserIdForUpdate(user.getId())).thenReturn(List.of(token));
        service.changePassword(new ChangePasswordRequest("old-password", "new-password"));
        assertEquals("new-hash", user.getPasswordHash());
        assertNull(device.getUser());
        assertNull(other.getUser());
        assertEquals(binding + 1, device.getBindingVersion());
        assertEquals(otherBinding + 1, other.getBindingVersion());
        assertNotNull(token.getRevokedAt());
        verify(users).save(user);
        verify(devices).save(device);
        verify(devices).save(other);
        verify(tokens).save(token);
    }
}
