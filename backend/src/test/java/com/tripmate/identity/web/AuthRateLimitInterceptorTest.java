package com.tripmate.identity.web;

import com.tripmate.shared.web.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthRateLimitInterceptorTest {

    @Test
    void limitsGeneralAuthRequestsAndProvidesRetryWindow() throws Exception {
        AuthRateLimitInterceptor interceptor = new AuthRateLimitInterceptor(Duration.ofMinutes(1), 2, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");

        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        RateLimitExceededException exception = assertThrows(RateLimitExceededException.class,
                () -> interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));

        assertTrue(exception.getRetryAfterSeconds() >= 1);
    }

    @Test
    void limitsPasswordResetRequestsAndConfirmations() throws Exception {
        AuthRateLimitInterceptor interceptor = new AuthRateLimitInterceptor(Duration.ofMinutes(1), 1, 1);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/v1/auth/password-reset/request",
                "/api/v1/auth/password-reset/request", "/api/v1/auth/password-reset/confirm",
                "/api/v1/auth/password-reset/confirm");

        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(RateLimitExceededException.class,
                () -> interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertTrue(interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
        assertThrows(RateLimitExceededException.class,
                () -> interceptor.preHandle(request, mock(HttpServletResponse.class), new Object()));
    }
}
