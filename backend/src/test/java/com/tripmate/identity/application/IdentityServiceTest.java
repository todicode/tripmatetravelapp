package com.tripmate.identity.application;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.PendingRegistrationEntity;
import com.tripmate.identity.domain.RefreshTokenEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.AuthIdentityRepository;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.PendingRegistrationRepository;
import com.tripmate.identity.infrastructure.RefreshTokenRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.identity.security.JwtTokenService;
import com.tripmate.identity.web.AuthRequests.GoogleAuthRequest;
import com.tripmate.identity.web.AuthRequests.LoginRequest;
import com.tripmate.identity.web.AuthRequests.RegisterRequest;
import com.tripmate.identity.web.AuthRequests.RefreshRequest;
import com.tripmate.identity.web.AuthRequests.VerifyRegistrationRequest;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;
import com.tripmate.identity.web.AuthResponses.RegistrationChallengeResponse;
import com.tripmate.identity.web.AuthResponses.SessionResponse;
import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IdentityServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PendingRegistrationRepository pendingRegistrationRepository;
    @Mock
    private AuthIdentityRepository authIdentityRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private GoogleIdentityVerifier googleIdentityVerifier;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private IdentityService service;

    @BeforeEach
    void setUp() {
        service = new IdentityService(userRepository, deviceRepository, refreshTokenRepository,
                pendingRegistrationRepository, authIdentityRepository, passwordEncoder, jwtTokenService,
                googleIdentityVerifier, eventPublisher, Duration.ofMinutes(10), Duration.ofSeconds(60),
                Duration.ofDays(30), 5);
    }

    @Test
    void startRegistrationStoresPasswordHashAndPublishesOtpWithoutReturningCode() {
        UUID installationId = UUID.randomUUID();
        when(userRepository.existsByEmail("an@example.test")).thenReturn(false);
        when(pendingRegistrationRepository.findByEmailAndUsedAtIsNull("an@example.test"))
                .thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret-password")).thenReturn("bcrypt-hash");

        RegistrationChallengeResponse response = service.startRegistration(new RegisterRequest(
                " An@Example.Test ", "secret-password", installationId, " Nguyen An ", "+84901234567"));

        assertNotNull(response.verificationId());
        assertTrue(response.expiresAt().isAfter(Instant.now()));
        assertTrue(response.resendAvailableAt().isBefore(response.expiresAt()));
        ArgumentCaptor<PendingRegistrationEntity> pendingCaptor = ArgumentCaptor.forClass(PendingRegistrationEntity.class);
        verify(pendingRegistrationRepository).save(pendingCaptor.capture());
        assertEquals("an@example.test", pendingCaptor.getValue().getEmail());
        assertEquals("bcrypt-hash", pendingCaptor.getValue().getPasswordHash());
        ArgumentCaptor<OtpEmailRequested> eventCaptor = ArgumentCaptor.forClass(OtpEmailRequested.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(response.verificationId(), eventCaptor.getValue().verificationId());
        assertEquals(response.expiresAt(), eventCaptor.getValue().expiresAt());
        assertTrue(eventCaptor.getValue().otp().matches("\\d{6}"));
    }

    @Test
    void invalidOtpIncrementsAttemptsAndDoesNotCreateUser() {
        UUID verificationId = UUID.randomUUID();
        PendingRegistrationEntity pending = pending(verificationId, "123456", Instant.now().plus(Duration.ofMinutes(5)));
        when(pendingRegistrationRepository.findByIdForUpdate(verificationId)).thenReturn(Optional.of(pending));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.verifyRegistration(new VerifyRegistrationRequest(verificationId, "000000")));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, exception.getStatus());
        assertEquals("OTP_INVALID", exception.getCode());
        assertEquals(1, pending.getAttempts());
        verify(pendingRegistrationRepository).save(pending);
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void correctOtpCreatesUserDeviceAndSession() {
        UUID verificationId = UUID.randomUUID();
        UUID installationId = UUID.randomUUID();
        PendingRegistrationEntity pending = new PendingRegistrationEntity(verificationId, "an@example.test",
                "bcrypt-hash", "Nguyen An", "+84901234567", installationId, sha256("123456"),
                Instant.now().plus(Duration.ofMinutes(5)), Instant.now().minusSeconds(1));
        when(pendingRegistrationRepository.findByIdForUpdate(verificationId)).thenReturn(Optional.of(pending));
        when(userRepository.existsByEmail("an@example.test")).thenReturn(false);
        when(userRepository.existsByFriendCode(anyString())).thenReturn(false);
        when(deviceRepository.findByInstallationId(installationId)).thenReturn(Optional.empty());
        when(deviceRepository.save(any(DeviceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenService.issue(any(UserEntity.class), any(DeviceEntity.class))).thenReturn("access-token");
        when(jwtTokenService.accessTokenTtlSeconds()).thenReturn(900L);

        SessionResponse response = service.verifyRegistration(
                new VerifyRegistrationRequest(verificationId, "123456"));

        assertEquals("access-token", response.accessToken());
        assertEquals("+84901234567", response.user().phone());
        assertEquals(verificationId, pending.getId());
        assertNotNull(pending.getUsedAt());
        verify(userRepository).save(any(UserEntity.class));
        verify(refreshTokenRepository).save(any());
    }


    @Test
    void googleIdentityDoesNotAutoLinkExistingManualEmail() {
        when(googleIdentityVerifier.verify("google-id-token"))
                .thenReturn(new GoogleIdentityVerifier.GoogleProfile(
                        "google-subject", "an@example.test", true, "Nguyen An"));
        when(authIdentityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmail("an@example.test")).thenReturn(true);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.authenticateWithGoogle(new GoogleAuthRequest("google-id-token", UUID.randomUUID())));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals("AUTH_METHOD_CONFLICT", exception.getCode());
        verify(authIdentityRepository, never()).save(any());
    }

    @Test
    void refreshTokenReuseRevokesItsWholeFamily() {
        UserEntity user = new UserEntity(UUID.randomUUID(), "an@example.test", "hash", "Nguyen An",
                "+84901234567", "TM-TEST", Instant.now());
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        RefreshTokenEntity reused = new RefreshTokenEntity(UUID.randomUUID(), user, device, UUID.randomUUID(),
                null, sha256("refresh-token"), Instant.now().plus(Duration.ofDays(1)));
        reused.consume();
        when(refreshTokenRepository.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(reused));
        when(refreshTokenRepository.findFamilyForUpdate(reused.getFamilyId())).thenReturn(java.util.List.of(reused));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.refresh(new RefreshRequest("refresh-token")));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("REFRESH_TOKEN_REUSE", exception.getCode());
        assertNotNull(reused.getRevokedAt());
    }

    @Test
    void refreshTokenFromPreviousUserIsRejectedAfterDeviceRebind() {
        UserEntity previousUser = new UserEntity(UUID.randomUUID(), "old@example.test", "hash", "Old",
                "+84901234567", "TM-OLD", Instant.now());
        UserEntity currentUser = new UserEntity(UUID.randomUUID(), "new@example.test", "hash", "New",
                "+84907654321", "TM-NEW", Instant.now());
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        device.bind(currentUser);
        RefreshTokenEntity oldToken = new RefreshTokenEntity(UUID.randomUUID(), previousUser, device,
                UUID.randomUUID(), null, sha256("old-refresh"), Instant.now().plus(Duration.ofDays(1)));
        when(refreshTokenRepository.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(oldToken));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.refresh(new RefreshRequest("old-refresh")));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("INVALID_REFRESH_TOKEN", exception.getCode());
    }

    @Test
    void loginBindsInstallationAndReturnsSession() {
        UUID installationId = UUID.randomUUID();
        UserEntity user = new UserEntity(UUID.randomUUID(), "an@example.test", "bcrypt-hash",
                "Nguyen An", "+84901234567", "TM-LOGIN", Instant.now());
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), installationId);
        when(userRepository.findByEmail("an@example.test")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret-password", "bcrypt-hash")).thenReturn(true);
        when(deviceRepository.findByInstallationId(installationId)).thenReturn(Optional.of(device));
        when(deviceRepository.save(any(DeviceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenService.issue(any(UserEntity.class), any(DeviceEntity.class))).thenReturn("access-token");
        when(jwtTokenService.accessTokenTtlSeconds()).thenReturn(900L);

        SessionResponse response = service.login(new LoginRequest(
                "an@example.test", "secret-password", installationId));

        assertEquals("access-token", response.accessToken());
        assertEquals(user.getId(), response.user().id());
        verify(deviceRepository).save(device);
    }


    @Test
    void logoutRevokesDeviceTokensAndUnbindsDevice() {
        UUID userId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();
        UserEntity user = new UserEntity(userId, "an@example.test", "bcrypt-hash",
                "Nguyen An", "+84901234567", "TM-LOGOUT", Instant.now());
        DeviceEntity device = new DeviceEntity(deviceId, UUID.randomUUID());
        device.bind(user);
        RefreshTokenEntity token = new RefreshTokenEntity(UUID.randomUUID(), user, device,
                UUID.randomUUID(), null, sha256("refresh-token"), Instant.now().plus(Duration.ofDays(1)));
        when(deviceRepository.findByIdForUpdate(deviceId)).thenReturn(Optional.of(device));
        when(refreshTokenRepository.findActiveByUserAndDevice(userId, deviceId))
                .thenReturn(List.of(token));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, deviceId, device.getBindingVersion()),
                null, AuthorityUtils.NO_AUTHORITIES));

        try {
            service.logout();
        } finally {
            SecurityContextHolder.clearContext();
        }

        assertNull(device.getUser());
        assertNotNull(token.getRevokedAt());
        verify(deviceRepository).save(device);
    }


    @Test
    void currentProfileReturnsPublicUserFields() {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity(userId, "an@example.test", "bcrypt-hash",
                "Nguyen An", "+84901234567", "TM-PROFILE", Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, UUID.randomUUID(), 1L),
                null, AuthorityUtils.NO_AUTHORITIES));

        try {
            ProfileResponse response = service.getCurrentProfile();
            assertEquals(userId, response.id());
            assertEquals("an@example.test", response.email());
            assertEquals("+84901234567", response.phone());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private PendingRegistrationEntity pending(UUID id, String otp, Instant expiresAt) {
        return new PendingRegistrationEntity(id, "an@example.test", "bcrypt-hash", "Nguyen An",
                "+84901234567", UUID.randomUUID(), sha256(otp), expiresAt, Instant.now().minusSeconds(1));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
