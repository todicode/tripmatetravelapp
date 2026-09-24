package com.tripmate.identity.application;

import java.util.UUID;
import java.time.Instant;

public record OtpEmailRequested(UUID verificationId, String recipient, String otp, Instant expiresAt) {
}
