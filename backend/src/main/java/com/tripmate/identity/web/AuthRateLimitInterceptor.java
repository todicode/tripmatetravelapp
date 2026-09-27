package com.tripmate.identity.web;

import com.tripmate.shared.web.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimitInterceptor implements HandlerInterceptor {

    private final Duration window;
    private final int generalLimit;
    private final int otpLimit;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AuthRateLimitInterceptor(
            @Value("${tripmate.security.auth-rate-limit-window}") Duration window,
            @Value("${tripmate.security.auth-rate-limit-per-window}") int generalLimit,
            @Value("${tripmate.security.otp-rate-limit-per-window}") int otpLimit) {
        if (window.isZero() || window.isNegative() || generalLimit < 1 || otpLimit < 1) {
            throw new IllegalArgumentException("Auth rate limit configuration must be positive");
        }
        this.window = window;
        this.generalLimit = generalLimit;
        this.otpLimit = otpLimit;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String category = category(request.getRequestURI());
        if (category == null) {
            return true;
        }
        int limit = "otp".equals(category) ? otpLimit : generalLimit;
        String key = category + '|' + request.getRemoteAddr();
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket());
        long now = System.nanoTime();
        synchronized (bucket) {
            if (bucket.windowStartedNanos == 0 || now - bucket.windowStartedNanos >= window.toNanos()) {
                bucket.windowStartedNanos = now;
                bucket.count = 0;
            }
            if (bucket.count >= limit) {
                long elapsed = now - bucket.windowStartedNanos;
                long remainingNanos = Math.max(1, window.toNanos() - elapsed);
                long retryAfter = Math.max(1, (remainingNanos + 999_999_999L) / 1_000_000_000L);
                throw new RateLimitExceededException(retryAfter);
            }
            bucket.count++;
        }
        return true;
    }

    private String category(String uri) {
        if (!uri.startsWith("/api/v1/auth/")) {
            return null;
        }
        if (uri.endsWith("/register/verify") || uri.endsWith("/register/resend")
                || uri.endsWith("/password-reset/confirm")) {
            return "otp";
        }
        if (uri.endsWith("/register") || uri.endsWith("/login")
                || uri.endsWith("/password-reset/request") || uri.endsWith("/change-password")
                || uri.endsWith("/google") || uri.endsWith("/refresh")) {
            return "general";
        }
        return null;
    }

    private static final class Bucket {
        private long windowStartedNanos;
        private int count;
    }
}
