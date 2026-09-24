package com.tripmate.identity.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@ConditionalOnProperty(name = "tripmate.email.mode", havingValue = "log", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void sendVerificationCode(String recipient, String otp, Instant expiresAt) {
        log.info("Development email verification recipient={} otp={} expiresAt={}", recipient, otp, expiresAt);
    }

    @Override
    public void sendPasswordResetCode(String recipient, String otp, Instant expiresAt) {
        log.info("Development password reset recipient={} otp={} expiresAt={}", recipient, otp, expiresAt);
    }
}
