package com.tripmate.identity.web;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.tripmate.shared.web.RateLimitExceededException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;

import java.time.Duration;

class AuthRateLimitInterceptorTest {
    @Test
    void concurrentRequestsCannotBypassThePerSubjectLimit() throws Exception {
        var interceptor = new AuthRateLimitInterceptor(Duration.ofMinutes(1), 10, 5);
        var request =
                new org.springframework.mock.web.MockHttpServletRequest(
                        "POST", "/api/v1/auth/login");
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(20)) {
            var attempts = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int i = 0; i < 20; i++)
                attempts.add(
                        pool.submit(
                                () -> {
                                    start.await();
                                    try {
                                        return interceptor.preHandle(
                                                request,
                                                new org.springframework.mock.web
                                                        .MockHttpServletResponse(),
                                                new Object());
                                    } catch (RateLimitExceededException limited) {
                                        return false;
                                    }
                                }));
            start.countDown();
            int accepted = 0;
            for (var attempt : attempts)
                if (attempt.get(5, java.util.concurrent.TimeUnit.SECONDS)) accepted++;
            org.junit.jupiter.api.Assertions.assertEquals(10, accepted);
        }
    }

    @Test
    void limitsPasswordChangeAttempts() {
        AuthRateLimitInterceptor interceptor =
                new AuthRateLimitInterceptor(Duration.ofMinutes(1), 1, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/v1/auth/change-password");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(
                RateLimitExceededException.class,
                () ->
                        interceptor.preHandle(
                                request, mock(HttpServletResponse.class), new Object()));
    }

    @Test
    void limitsGeneralAuthRequestsAndProvidesRetryWindow() throws Exception {
        AuthRateLimitInterceptor interceptor =
                new AuthRateLimitInterceptor(Duration.ofMinutes(1), 2, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");

        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        RateLimitExceededException exception =
                assertThrows(
                        RateLimitExceededException.class,
                        () ->
                                interceptor.preHandle(
                                        request, mock(HttpServletResponse.class), new Object()));

        assertTrue(exception.getRetryAfterSeconds() >= 1);
    }

    @Test
    void limitsPasswordResetRequestsAndConfirmations() throws Exception {
        AuthRateLimitInterceptor interceptor =
                new AuthRateLimitInterceptor(Duration.ofMinutes(1), 1, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getRequestURI())
                .thenReturn(
                        "/api/v1/auth/password-reset/request",
                        "/api/v1/auth/password-reset/request",
                        "/api/v1/auth/password-reset/confirm",
                        "/api/v1/auth/password-reset/confirm");

        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(
                RateLimitExceededException.class,
                () ->
                        interceptor.preHandle(
                                request, mock(HttpServletResponse.class), new Object()));
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(
                RateLimitExceededException.class,
                () ->
                        interceptor.preHandle(
                                request, mock(HttpServletResponse.class), new Object()));
    }

    @Test
    void limitsLookupRequests() {
        AuthRateLimitInterceptor interceptor =
                new AuthRateLimitInterceptor(Duration.ofMinutes(1), 1, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/v1/users/lookup-by-phone");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(
                RateLimitExceededException.class,
                () ->
                        interceptor.preHandle(
                                request, mock(HttpServletResponse.class), new Object()));
    }

    @Test
    void limitsFriendRequestCreation() {
        AuthRateLimitInterceptor interceptor =
                new AuthRateLimitInterceptor(Duration.ofMinutes(1), 1, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/v1/friend-requests");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(
                RateLimitExceededException.class,
                () ->
                        interceptor.preHandle(
                                request, mock(HttpServletResponse.class), new Object()));
    }
}
