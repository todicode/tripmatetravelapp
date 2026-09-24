package com.tripmate.identity.application;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.PasswordResetChallengeEntity;
import com.tripmate.identity.domain.RefreshTokenEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.PasswordResetChallengeRepository;
import com.tripmate.identity.infrastructure.RefreshTokenRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.web.AuthRequests.ConfirmPasswordResetRequest;
import com.tripmate.identity.web.AuthRequests.RequestPasswordResetRequest;
import com.tripmate.identity.web.AuthResponses.PasswordResetChallengeResponse;
import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordResetChallengeRepository challengeRepository;
    @Mock DeviceRepository deviceRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock ApplicationEventPublisher eventPublisher;

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(userRepository, challengeRepository, deviceRepository,
                refreshTokenRepository, passwordEncoder, eventPublisher,
                Duration.ofMinutes(3), Duration.ofSeconds(60), 5);
    }

    @Test
    void unknownEmailDoesNotSendCode() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.requestReset(new RequestPasswordResetRequest("missing@example.test")));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("EMAIL_NOT_FOUND", error.getCode());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void requestStoresHashedOtpAndEmailsExistingAccount() {
        UserEntity user = user();
        when(userRepository.findByEmailForUpdate("an@example.test")).thenReturn(Optional.of(user));
        when(challengeRepository.findActiveByUserIdForUpdate(user.getId())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("otp-hash");

        PasswordResetChallengeResponse response = service.requestReset(
                new RequestPasswordResetRequest(" An@Example.Test "));

        ArgumentCaptor<PasswordResetChallengeEntity> saved = ArgumentCaptor.forClass(PasswordResetChallengeEntity.class);
        ArgumentCaptor<PasswordResetEmailRequested> event = ArgumentCaptor.forClass(PasswordResetEmailRequested.class);
        verify(challengeRepository).save(saved.capture());
        verify(eventPublisher).publishEvent(event.capture());
        assertEquals(user, saved.getValue().getUser());
        assertEquals("otp-hash", saved.getValue().getOtpHash());
        assertEquals(response.resetId(), event.getValue().resetId());
        assertEquals("an@example.test", event.getValue().recipient());
        assertTrue(event.getValue().otp().matches("\\d{6}"));
    }

    @Test
    void resendBeforeCooldownDoesNotReplaceChallenge() {
        UserEntity user = user();
        PasswordResetChallengeEntity existing = challenge(user, Instant.now().plusSeconds(120),
                Instant.now().plusSeconds(30));
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(challengeRepository.findActiveByUserIdForUpdate(user.getId())).thenReturn(Optional.of(existing));

        ApiException error = assertThrows(ApiException.class,
                () -> service.requestReset(new RequestPasswordResetRequest(user.getEmail())));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(challengeRepository, never()).delete(existing);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void resendAfterCooldownReplacesOldCode() {
        UserEntity user = user();
        PasswordResetChallengeEntity existing = challenge(user, Instant.now().plusSeconds(120),
                Instant.now().minusSeconds(1));
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(challengeRepository.findActiveByUserIdForUpdate(user.getId())).thenReturn(Optional.of(existing));
        when(passwordEncoder.encode(any())).thenReturn("next-otp-hash");

        PasswordResetChallengeResponse response = service.requestReset(
                new RequestPasswordResetRequest(user.getEmail()));

        verify(challengeRepository).delete(existing);
        verify(challengeRepository).flush();
        assertTrue(!response.resetId().equals(existing.getId()));
    }

    @Test
    void invalidOtpCountsAttemptAndPreservesPassword() {
        UserEntity user = user();
        PasswordResetChallengeEntity challenge = challenge(user, Instant.now().plusSeconds(120),
                Instant.now().minusSeconds(1));
        when(challengeRepository.findByIdForUpdate(challenge.getId())).thenReturn(Optional.of(challenge));
        when(passwordEncoder.matches("000000", "otp-hash")).thenReturn(false);

        ApiException error = assertThrows(ApiException.class, () -> service.confirmReset(
                new ConfirmPasswordResetRequest(challenge.getId(), "000000", "new-password")));

        assertEquals("OTP_INVALID", error.getCode());
        assertEquals(1, challenge.getAttempts());
        assertEquals("old-hash", user.getPasswordHash());
        verify(userRepository, never()).save(any());
    }

    @Test
    void fiveWrongCodesLockChallenge() {
        UserEntity user = user();
        PasswordResetChallengeEntity challenge = challenge(user, Instant.now().plusSeconds(120),
                Instant.now().minusSeconds(1));
        when(challengeRepository.findByIdForUpdate(challenge.getId())).thenReturn(Optional.of(challenge));
        when(passwordEncoder.matches("000000", "otp-hash")).thenReturn(false);
        ConfirmPasswordResetRequest request = new ConfirmPasswordResetRequest(
                challenge.getId(), "000000", "new-password");

        for (int attempt = 0; attempt < 5; attempt++) {
            assertEquals("OTP_INVALID", assertThrows(ApiException.class,
                    () -> service.confirmReset(request)).getCode());
        }
        assertEquals("OTP_ATTEMPTS_EXCEEDED", assertThrows(ApiException.class,
                () -> service.confirmReset(request)).getCode());
        assertEquals(5, challenge.getAttempts());
        verify(userRepository, never()).save(any());
    }

    @Test
    void validOtpUpdatesPasswordOnceAndRevokesAllSessions() {
        UserEntity user = user();
        PasswordResetChallengeEntity challenge = challenge(user, Instant.now().plusSeconds(120),
                Instant.now().minusSeconds(1));
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        device.bind(user);
        RefreshTokenEntity token = new RefreshTokenEntity(UUID.randomUUID(), user, device, UUID.randomUUID(),
                null, "refresh-hash", Instant.now().plusSeconds(3600));
        when(challengeRepository.findByIdForUpdate(challenge.getId())).thenReturn(Optional.of(challenge));
        when(passwordEncoder.matches("123456", "otp-hash")).thenReturn(true);
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");
        when(deviceRepository.findByUserIdForUpdate(user.getId())).thenReturn(List.of(device));
        when(refreshTokenRepository.findUnrevokedByUserIdForUpdate(user.getId())).thenReturn(List.of(token));

        service.confirmReset(new ConfirmPasswordResetRequest(challenge.getId(), "123456", "new-password"));

        assertEquals("new-hash", user.getPasswordHash());
        assertNotNull(challenge.getUsedAt());
        assertNull(device.getUser());
        assertNotNull(token.getRevokedAt());
        verify(userRepository).save(user);
        verify(deviceRepository).save(device);
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void expiredOrUsedCodeCannotChangePassword() {
        UserEntity user = user();
        PasswordResetChallengeEntity expired = challenge(user, Instant.now().minusSeconds(1),
                Instant.now().minusSeconds(60));
        when(challengeRepository.findByIdForUpdate(expired.getId())).thenReturn(Optional.of(expired));

        ApiException expiredError = assertThrows(ApiException.class, () -> service.confirmReset(
                new ConfirmPasswordResetRequest(expired.getId(), "123456", "new-password")));
        assertEquals("OTP_EXPIRED", expiredError.getCode());

        expired.markUsed();
        ApiException usedError = assertThrows(ApiException.class, () -> service.confirmReset(
                new ConfirmPasswordResetRequest(expired.getId(), "123456", "new-password")));
        assertEquals("RESET_ALREADY_USED", usedError.getCode());
        verify(userRepository, never()).save(any());
    }

    private UserEntity user() {
        return new UserEntity(UUID.randomUUID(), "an@example.test", "old-hash", "Nguyen An",
                "+84901234567", "TM-RESET", Instant.now());
    }

    private PasswordResetChallengeEntity challenge(UserEntity user, Instant expiresAt, Instant resendAt) {
        return new PasswordResetChallengeEntity(UUID.randomUUID(), user, "otp-hash", expiresAt, resendAt);
    }
}
