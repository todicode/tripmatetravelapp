package com.tripmate.identity.security;

import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.shared.web.RequestIdFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    BearerTokenFilter bearerTokenFilter(JwtTokenService jwtTokenService, DeviceRepository deviceRepository,
                                        UserRepository userRepository, SecurityErrorHandler errorHandler) {
        return new BearerTokenFilter(jwtTokenService, deviceRepository, userRepository, errorHandler);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, BearerTokenFilter bearerTokenFilter,
                                            SecurityErrorHandler errorHandler) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/register/verify",
                                "/api/v1/auth/register/resend", "/api/v1/auth/register/cancel",
                                "/api/v1/auth/login", "/api/v1/auth/google",
                                "/api/v1/auth/refresh", "/api/v1/health", "/actuator/health").permitAll()
                        .requestMatchers("/api/v1/auth/logout").authenticated()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler))
                .addFilterBefore(new RequestIdFilter(), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(bearerTokenFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
