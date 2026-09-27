package com.tripmate.identity.application;

import com.tripmate.identity.infrastructure.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OtpEmailListener {

    private static final Logger log = LoggerFactory.getLogger(OtpEmailListener.class);

    private final EmailSender emailSender;

    public OtpEmailListener(EmailSender emailSender) {
        this.emailSender = emailSender;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendOtp(OtpEmailRequested event) {
        try {
            emailSender.sendVerificationCode(event.recipient(), event.otp(), event.expiresAt());
        } catch (RuntimeException exception) {
            log.error("Could not send verification email for challenge {}", event.verificationId(), exception);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendPasswordResetOtp(PasswordResetEmailRequested event) {
        try {
            emailSender.sendPasswordResetCode(event.recipient(), event.otp(), event.expiresAt());
        } catch (RuntimeException exception) {
            log.error("Could not send password reset email for challenge {}", event.resetId(), exception);
        }
    }
}
