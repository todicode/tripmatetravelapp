package com.tripmate.shared.scheduling;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.scheduling.TaskScheduler;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

class SchedulingConfigurationTest {
    @Test
    void blockedMediaCleanupDoesNotDelayApplicationJobs() throws Exception {
        var release = new CountDownLatch(1);
        try (var context = new AnnotationConfigApplicationContext(SchedulingConfiguration.class)) {
            var media = context.getBean("mediaCleanupScheduler", TaskScheduler.class);
            var application = context.getBean("taskScheduler", TaskScheduler.class);
            var blocked = new CountDownLatch(1);
            var completed = new CountDownLatch(1);
            media.schedule(
                    () -> {
                        blocked.countDown();
                        try {
                            release.await(5, TimeUnit.SECONDS);
                        } catch (InterruptedException error) {
                            Thread.currentThread().interrupt();
                        }
                    },
                    Instant.now());
            assertTrue(blocked.await(2, TimeUnit.SECONDS));
            application.schedule(completed::countDown, Instant.now());
            try {
                assertTrue(completed.await(2, TimeUnit.SECONDS));
            } finally {
                release.countDown();
            }
        } finally {
            release.countDown();
        }
    }
}
