package com.tripmate.identity.application;

import java.time.Instant;
import java.util.UUID;

public record PasswordResetEmailRequested(UUID resetId, String recipient, String otp, Instant expiresAt) {
}
