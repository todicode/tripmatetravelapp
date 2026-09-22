package com.tripmate.identity.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class IdentityWebConfiguration implements WebMvcConfigurer {

    private final AuthRateLimitInterceptor authRateLimitInterceptor;

    public IdentityWebConfiguration(AuthRateLimitInterceptor authRateLimitInterceptor) {
        this.authRateLimitInterceptor = authRateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authRateLimitInterceptor);
    }
}
