package com.tripmate.shared.scheduling;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration(proxyBeanMethods = false)
public class SchedulingConfiguration {
    @Bean
    ThreadPoolTaskScheduler taskScheduler() {
        return scheduler("application-schedule-", 2);
    }

    @Bean
    ThreadPoolTaskScheduler mediaCleanupScheduler() {
        // Object storage timeouts must not delay session revocation and presence expiry.
        return scheduler("media-cleanup-", 1);
    }

    private ThreadPoolTaskScheduler scheduler(String prefix, int size) {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setThreadNamePrefix(prefix);
        scheduler.setPoolSize(size);
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
