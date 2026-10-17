package com.tripmate.identity.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.tripmate.identity.api.AccessTokenVerifier;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;

class BearerTokenFilterTest {
    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void downstreamFailureKeepsItsMeaningAndClearsSecurityContext() {
        var authentication = new UsernamePasswordAuthenticationToken("actor", null);
        AccessTokenVerifier verifier = token -> authentication;
        AuthenticationEntryPoint errors = mock(AuthenticationEntryPoint.class);
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test");
        var failure = new IllegalStateException("downstream failure");
        assertSame(
                failure,
                assertThrows(
                        IllegalStateException.class,
                        () ->
                                new BearerTokenFilter(verifier, errors)
                                        .doFilter(
                                                request,
                                                new MockHttpServletResponse(),
                                                (req, res) -> {
                                                    assertSame(
                                                            authentication,
                                                            SecurityContextHolder.getContext()
                                                                    .getAuthentication());
                                                    throw failure;
                                                })));
        verifyNoInteractions(errors);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void invalidTokenStopsBeforeTheApplication() throws Exception {
        AccessTokenVerifier verifier =
                token -> {
                    throw new IllegalArgumentException("invalid token");
                };
        var response = new MockHttpServletResponse();
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid");
        new BearerTokenFilter(verifier, (req, res, error) -> res.setStatus(401))
                .doFilter(request, response, (req, res) -> fail("Application must not run"));
        assertEquals(401, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
