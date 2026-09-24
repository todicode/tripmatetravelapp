package com.tripmate.identity.application;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.PasswordResetChallengeEntity;
import com.tripmate.identity.domain.RefreshTokenEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.PasswordResetChallengeRepository;
import com.tripmate.identity.infrastructure.RefreshTokenRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.web.AuthRequests.ConfirmPasswordResetRequest;
import com.tripmate.identity.web.AuthRequests.RequestPasswordResetRequest;
import com.tripmate.identity.web.AuthResponses.PasswordResetChallengeResponse;
import com.tripmate.shared.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.security.SecureRandom;

@Service
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetChallengeRepository challengeRepository;
    private final DeviceRepository deviceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final Duration verificationTtl;
    private final Duration resendCooldown;
    private final int maxOtpAttempts;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetChallengeRepository challengeRepository,
                                DeviceRepository deviceRepository, RefreshTokenRepository refreshTokenRepository,
                                PasswordEncoder passwordEncoder, ApplicationEventPublisher eventPublisher,
                                @Value("${tripmate.email.verification-ttl}") Duration verificationTtl,
                                @Value("${tripmate.email.resend-cooldown}") Duration resendCooldown,
                                @Value("${tripmate.email.max-attempts}") int maxOtpAttempts) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.deviceRepository = deviceRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
        this.verificationTtl = verificationTtl;
        this.resendCooldown = resendCooldown;
        this.maxOtpAttempts = maxOtpAttempts;
    }

    @Transactional
    public PasswordResetChallengeResponse requestReset(RequestPasswordResetRequest request) {
        String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        UserEntity user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EMAIL_NOT_FOUND",
                        "Không tìm thấy tài khoản với email này."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getEmailVerifiedAt() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PASSWORD_RESET_UNAVAILABLE",
                    "Tài khoản này không thể đặt lại mật khẩu.");
        }

        Instant now = Instant.now();
        PasswordResetChallengeEntity existing = challengeRepository.findActiveByUserIdForUpdate(user.getId())
                .orElse(null);
        if (existing != null) {
            if (existing.getResendAvailableAt().isAfter(now)) {
                long retryAfter = Math.max(1, Duration.between(now, existing.getResendAvailableAt()).toSeconds());
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON",
                        "Bạn cần chờ trước khi gửi lại mã.", List.of(), Map.of("retryAfterSeconds", retryAfter));
            }
            challengeRepository.delete(existing);
            challengeRepository.flush();
        }

        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        Instant expiresAt = now.plus(verificationTtl);
        PasswordResetChallengeEntity challenge = new PasswordResetChallengeEntity(UUID.randomUUID(), user,
                passwordEncoder.encode(otp), expiresAt, now.plus(resendCooldown));
        challengeRepository.save(challenge);
        eventPublisher.publishEvent(new PasswordResetEmailRequested(challenge.getId(), email, otp, expiresAt));
        return new PasswordResetChallengeResponse(challenge.getId(), expiresAt, challenge.getResendAvailableAt());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void confirmReset(ConfirmPasswordResetRequest request) {
        PasswordResetChallengeEntity challenge = challengeRepository.findByIdForUpdate(request.resetId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RESET_NOT_FOUND",
                        "Không tìm thấy yêu cầu đặt lại mật khẩu."));
        Instant now = Instant.now();
        if (challenge.getUsedAt() != null) {
            throw new ApiException(HttpStatus.GONE, "RESET_ALREADY_USED", "Mã này đã được sử dụng.");
        }
        if (!challenge.getOtpExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.GONE, "OTP_EXPIRED", "Mã OTP đã hết hạn.");
        }
        if (challenge.getAttempts() >= maxOtpAttempts) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPTS_EXCEEDED",
                    "Bạn đã nhập sai OTP quá số lần cho phép.");
        }
        if (!passwordEncoder.matches(request.otp(), challenge.getOtpHash())) {
            challenge.incrementAttempts();
            challengeRepository.save(challenge);
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP_INVALID", "Mã OTP không đúng.");
        }

        UserEntity user = challenge.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PASSWORD_RESET_UNAVAILABLE",
                    "Tài khoản này không thể đặt lại mật khẩu.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        challenge.markUsed();
        challengeRepository.save(challenge);
        for (DeviceEntity device : deviceRepository.findByUserIdForUpdate(user.getId())) {
            device.unbind();
            deviceRepository.save(device);
        }
        for (RefreshTokenEntity token : refreshTokenRepository.findUnrevokedByUserIdForUpdate(user.getId())) {
            token.revoke();
            refreshTokenRepository.save(token);
        }
    }

    @Transactional
    public void cleanupExpiredResets() {
        challengeRepository.deleteByOtpExpiresAtBefore(Instant.now());
    }
}
