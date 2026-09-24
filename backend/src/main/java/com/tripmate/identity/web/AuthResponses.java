package com.tripmate.identity.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AuthResponses {

    private AuthResponses() {
    }

    public record RegistrationChallengeResponse(UUID verificationId, Instant expiresAt,
                                                Instant resendAvailableAt) {
    }

    public record SessionResponse(String accessToken, String tokenType, long expiresIn,
                                  String refreshToken, Instant refreshExpiresAt,
                                  UUID deviceId, ProfileResponse user) {
    }

    public record ProfileResponse(UUID id, String displayName, UUID avatarMediaId,
                                  String email, String phone, List<String> interestCodes,
                                  Instant createdAt, Instant updatedAt) {
    }
}
