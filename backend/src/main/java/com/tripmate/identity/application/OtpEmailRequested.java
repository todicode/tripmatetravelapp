package com.tripmate.identity.application;

import java.time.Instant;
import java.util.UUID;

public record OtpEmailRequested(
        UUID verificationId, String recipient, String otp, Instant expiresAt) {}
