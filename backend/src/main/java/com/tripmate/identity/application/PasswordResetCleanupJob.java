package com.tripmate.identity.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetCleanupJob {

    private final PasswordResetService passwordResetService;

    public PasswordResetCleanupJob(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @Scheduled(fixedDelayString = "${tripmate.email.cleanup-delay:60000}")
    public void cleanup() {
        passwordResetService.cleanupExpiredResets();
    }
}
