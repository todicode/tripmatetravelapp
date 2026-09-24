package com.tripmate.identity.security;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class BearerTokenFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public BearerTokenFilter(JwtTokenService jwtTokenService, DeviceRepository deviceRepository,
                             UserRepository userRepository, AuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtTokenService = jwtTokenService;
        this.deviceRepository = deviceRepository;
        this.userRepository = userRepository;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            AuthenticatedUser authenticatedUser = jwtTokenService.parse(header.substring(7));
            DeviceEntity device = deviceRepository.findById(authenticatedUser.deviceId()).orElseThrow();
            UserEntity user = userRepository.findById(authenticatedUser.userId()).orElseThrow();
            if (device.getUser() == null
                    || !device.getUser().getId().equals(user.getId())
                    || device.getBindingVersion() != authenticatedUser.bindingVersion()
                    || user.getStatus() != UserStatus.ACTIVE) {
                throw new IllegalArgumentException("Token binding is no longer valid");
            }
            var authentication = new UsernamePasswordAuthenticationToken(
                    authenticatedUser, null, AuthorityUtils.NO_AUTHORITIES);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(request, response,
                    new org.springframework.security.authentication.BadCredentialsException("Invalid bearer token", exception));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
