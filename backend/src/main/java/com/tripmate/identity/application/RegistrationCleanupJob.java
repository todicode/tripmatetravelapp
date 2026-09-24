package com.tripmate.identity.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RegistrationCleanupJob {

    private final IdentityService identityService;

    public RegistrationCleanupJob(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Scheduled(fixedDelayString = "${tripmate.email.cleanup-delay:60000}")
    public void cleanup() {
        identityService.cleanupExpiredRegistrations();
    }
}
