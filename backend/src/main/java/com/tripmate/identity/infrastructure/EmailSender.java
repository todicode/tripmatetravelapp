package com.tripmate.identity.infrastructure;

import java.time.Instant;

public interface EmailSender {

    void sendVerificationCode(String recipient, String otp, Instant expiresAt);
}
