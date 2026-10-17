package com.tripmate.shared.security;

import com.tripmate.shared.web.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class CurrentActor {
    private CurrentActor() {}

    public static AuthenticatedActor require() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AuthenticatedActor actor)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        }
        return actor;
    }

    public static UUID userId() {
        return require().userId();
    }
}
