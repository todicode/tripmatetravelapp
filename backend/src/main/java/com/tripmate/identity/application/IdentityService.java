package com.tripmate.identity.application;

import com.tripmate.identity.domain.AuthIdentityEntity;
import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.PendingRegistrationEntity;
import com.tripmate.identity.domain.RefreshTokenEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.AuthIdentityRepository;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.PendingRegistrationRepository;
import com.tripmate.identity.infrastructure.RefreshTokenRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.identity.security.JwtTokenService;
import com.tripmate.identity.web.AuthRequests.GoogleAuthRequest;
import com.tripmate.identity.web.AuthRequests.LoginRequest;
import com.tripmate.identity.web.AuthRequests.RefreshRequest;
import com.tripmate.identity.web.AuthRequests.RegisterRequest;
import com.tripmate.identity.web.AuthRequests.ResendOtpRequest;
import com.tripmate.identity.web.AuthRequests.VerifyRegistrationRequest;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;
import com.tripmate.identity.web.AuthResponses.RegistrationChallengeResponse;
import com.tripmate.identity.web.AuthResponses.SessionResponse;
import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ErrorDetailResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class IdentityService {

    private static final String GOOGLE_PROVIDER = "GOOGLE";
    private static final int OTP_LENGTH = 6;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final ApplicationEventPublisher eventPublisher;
    private final Duration verificationTtl;
    private final Duration resendCooldown;
    private final Duration refreshTokenTtl;
    private final int maxOtpAttempts;

    public IdentityService(UserRepository userRepository, DeviceRepository deviceRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PendingRegistrationRepository pendingRegistrationRepository,
                           AuthIdentityRepository authIdentityRepository,
                           PasswordEncoder passwordEncoder, JwtTokenService jwtTokenService,
                           GoogleIdentityVerifier googleIdentityVerifier,
                           ApplicationEventPublisher eventPublisher,
                           @Value("${tripmate.email.verification-ttl}") Duration verificationTtl,
                           @Value("${tripmate.email.resend-cooldown}") Duration resendCooldown,
                           @Value("${tripmate.security.refresh-token-ttl}") Duration refreshTokenTtl,
                           @Value("${tripmate.email.max-attempts}") int maxOtpAttempts) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.googleIdentityVerifier = googleIdentityVerifier;
        this.eventPublisher = eventPublisher;
        this.verificationTtl = verificationTtl;
        this.resendCooldown = resendCooldown;
        this.refreshTokenTtl = refreshTokenTtl;
        this.maxOtpAttempts = maxOtpAttempts;
    }

    @Transactional
    public RegistrationChallengeResponse startRegistration(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED",
                    "Email này đã được đăng ký.");
        }

        Instant now = Instant.now();
        PendingRegistrationEntity existing = pendingRegistrationRepository
                .findByEmailAndUsedAtIsNull(email).orElse(null);
        if (existing != null && existing.getOtpExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_PENDING",
                    "Email này đang chờ xác minh OTP.", List.of(),
                    Map.of("verificationId", existing.getId().toString()));
        }
        if (existing != null) {
            existing.markUsed();
            pendingRegistrationRepository.save(existing);
        }

        String otp = generateOtp();
        Instant expiresAt = now.plus(verificationTtl);
        PendingRegistrationEntity pending = new PendingRegistrationEntity(
                UUID.randomUUID(), email, passwordEncoder.encode(request.password()),
                request.displayName().trim(), request.phone().trim(), request.installationId(),
                hash(otp), expiresAt, now.plus(resendCooldown));
        pendingRegistrationRepository.save(pending);
        eventPublisher.publishEvent(new OtpEmailRequested(pending.getId(), email, otp, expiresAt));
        return new RegistrationChallengeResponse(pending.getId(), expiresAt, pending.getResendAvailableAt());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public SessionResponse verifyRegistration(VerifyRegistrationRequest request) {
        PendingRegistrationEntity pending = pendingRegistrationRepository.findByIdForUpdate(request.verificationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "VERIFICATION_NOT_FOUND",
                        "Không tìm thấy yêu cầu xác minh."));
        Instant now = Instant.now();
        if (pending.getUsedAt() != null) {
            throw new ApiException(HttpStatus.GONE, "VERIFICATION_ALREADY_USED",
                    "Mã xác minh này đã được sử dụng.");
        }
        if (pending.getOtpExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.GONE, "OTP_EXPIRED", "Mã OTP đã hết hạn.");
        }
        if (pending.getAttempts() >= maxOtpAttempts) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPTS_EXCEEDED",
                    "Bạn đã nhập sai OTP quá số lần cho phép.");
        }
        if (!MessageDigest.isEqual(hash(request.otp()).getBytes(StandardCharsets.UTF_8),
                pending.getOtpHash().getBytes(StandardCharsets.UTF_8))) {
            pending.incrementAttempts();
            pendingRegistrationRepository.save(pending);
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP_INVALID", "Mã OTP không đúng.");
        }
        if (userRepository.existsByEmail(pending.getEmail())) {
            pending.markUsed();
            pendingRegistrationRepository.save(pending);
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED",
                    "Email này đã được đăng ký.");
        }

        UserEntity user = new UserEntity(UUID.randomUUID(), pending.getEmail(), pending.getPasswordHash(),
                pending.getDisplayName(), pending.getPhone(), generateFriendCode(), now);
        userRepository.save(user);
        pending.markUsed();
        pendingRegistrationRepository.save(pending);
        DeviceEntity device = bindDevice(pending.getInstallationId(), user);
        return issueSession(user, device, null, null);
    }

    @Transactional
    public RegistrationChallengeResponse resendOtp(ResendOtpRequest request) {
        PendingRegistrationEntity pending = pendingRegistrationRepository.findByIdForUpdate(request.verificationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "VERIFICATION_NOT_FOUND",
                        "Không tìm thấy yêu cầu xác minh."));
        if (pending.getUsedAt() != null) {
            throw new ApiException(HttpStatus.GONE, "VERIFICATION_ALREADY_USED",
                    "Mã xác minh này đã được sử dụng.");
        }
        Instant now = Instant.now();
        if (pending.getResendAvailableAt().isAfter(now)) {
            long retryAfter = Math.max(1, Duration.between(now, pending.getResendAvailableAt()).toSeconds());
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON",
                    "Bạn cần chờ trước khi gửi lại mã.", List.of(), Map.of("retryAfterSeconds", retryAfter));
        }
        String otp = generateOtp();
        Instant expiresAt = now.plus(verificationTtl);
        pending.rotateOtp(hash(otp), expiresAt, now.plus(resendCooldown));
        pendingRegistrationRepository.save(pending);
        eventPublisher.publishEvent(new OtpEmailRequested(pending.getId(), pending.getEmail(), otp, expiresAt));
        return new RegistrationChallengeResponse(pending.getId(), expiresAt, pending.getResendAvailableAt());
    }

    @Transactional
    public SessionResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> invalidCredentials());
        if (user.getStatus() != UserStatus.ACTIVE || user.getEmailVerifiedAt() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        DeviceEntity device = bindDevice(request.installationId(), user);
        return issueSession(user, device, null, null);
    }

    @Transactional
    public SessionResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleIdentityVerifier.GoogleProfile profile = googleIdentityVerifier.verify(request.idToken());
        String email = normalizeEmail(profile.email());
        AuthIdentityEntity identity = authIdentityRepository
                .findByProviderAndProviderSubject(GOOGLE_PROVIDER, profile.subject()).orElse(null);
        UserEntity user;
        if (identity != null) {
            user = identity.getUser();
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa.");
            }
        } else {
            if (userRepository.existsByEmail(email)) {
                throw new ApiException(HttpStatus.CONFLICT, "AUTH_METHOD_CONFLICT",
                        "Email này đã có tài khoản thủ công. Hãy đăng nhập bằng email và mật khẩu.");
            }
            String unusablePassword = passwordEncoder.encode(randomSecret());
            user = new UserEntity(UUID.randomUUID(), email, unusablePassword, profile.displayName(),
                    null, generateFriendCode(), Instant.now());
            userRepository.save(user);
            authIdentityRepository.save(new AuthIdentityEntity(UUID.randomUUID(), user, GOOGLE_PROVIDER,
                    profile.subject(), email));
        }
        DeviceEntity device = bindDevice(request.installationId(), user);
        return issueSession(user, device, null, null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public SessionResponse refresh(RefreshRequest request) {
        String tokenHash = hash(request.refreshToken());
        RefreshTokenEntity current = refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                        "Refresh token không hợp lệ."));
        Instant now = Instant.now();
        if (current.getConsumedAt() != null) {
            revokeFamily(current.getFamilyId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_REUSE",
                    "Refresh token đã được sử dụng lại; phiên đã bị thu hồi.");
        }
        if (current.getRevokedAt() != null || current.getExpiresAt().isBefore(now)
                || current.getDevice().getUser() == null
                || !current.getDevice().getUser().getId().equals(current.getUser().getId())
                || current.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                    "Refresh token không còn hợp lệ.");
        }
        current.consume();
        refreshTokenRepository.save(current);
        return issueSession(current.getUser(), current.getDevice(), current.getFamilyId(), current);
    }

    @Transactional
    public void logout() {
        AuthenticatedUser authenticatedUser = authenticatedUser();
        DeviceEntity device = deviceRepository.findByIdForUpdate(authenticatedUser.deviceId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEVICE_NOT_FOUND", "Không tìm thấy thiết bị."));
        if (device.getUser() == null || !device.getUser().getId().equals(authenticatedUser.userId())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Phiên đăng nhập không hợp lệ.");
        }
        refreshTokenRepository.findActiveByUserAndDevice(authenticatedUser.userId(), authenticatedUser.deviceId())
                .forEach(RefreshTokenEntity::revoke);
        device.unbind();
        deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile() {
        AuthenticatedUser authenticatedUser = authenticatedUser();
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        return toProfile(user);
    }

    @Transactional
    public void cleanupExpiredRegistrations() {
        pendingRegistrationRepository.deleteByOtpExpiresAtBefore(Instant.now().minus(Duration.ofHours(24)));
    }

    private SessionResponse issueSession(UserEntity user, DeviceEntity device, UUID familyId,
                                         RefreshTokenEntity parentToken) {
        String rawRefreshToken = randomSecret();
        UUID actualFamilyId = familyId == null ? UUID.randomUUID() : familyId;
        RefreshTokenEntity refreshToken = new RefreshTokenEntity(UUID.randomUUID(), user, device,
                actualFamilyId, parentToken, hash(rawRefreshToken), Instant.now().plus(refreshTokenTtl));
        refreshTokenRepository.save(refreshToken);
        return new SessionResponse(jwtTokenService.issue(user, device), "Bearer",
                jwtTokenService.accessTokenTtlSeconds(), rawRefreshToken, refreshToken.getExpiresAt(),
                device.getId(), toProfile(user));
    }

    private DeviceEntity bindDevice(UUID installationId, UserEntity user) {
        DeviceEntity device = deviceRepository.findByInstallationId(installationId)
                .orElseGet(() -> new DeviceEntity(UUID.randomUUID(), installationId));
        device.bind(user);
        return deviceRepository.save(device);
    }

    private void revokeFamily(UUID familyId) {
        refreshTokenRepository.findFamilyForUpdate(familyId).forEach(RefreshTokenEntity::revoke);
    }

    private ProfileResponse toProfile(UserEntity user) {
        return new ProfileResponse(user.getId(), user.getDisplayName(), user.getAvatarMediaId(),
                user.getEmail(), user.getPhone(), List.of(), user.getCreatedAt(), user.getUpdatedAt());
    }

    private AuthenticatedUser authenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication() == null
                ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        }
        return user;
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                "Email hoặc mật khẩu không đúng.");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String generateOtp() {
        return String.format("%0" + OTP_LENGTH + "d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String generateFriendCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder code = new StringBuilder("TM-");
            for (int index = 0; index < 8; index++) {
                code.append(alphabet.charAt(SECURE_RANDOM.nextInt(alphabet.length())));
            }
            if (!userRepository.existsByFriendCode(code.toString())) {
                return code.toString();
            }
        }
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "FRIEND_CODE_UNAVAILABLE",
                "Không thể tạo mã người dùng lúc này.");
    }

    private String randomSecret() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required", exception);
        }
    }
}
