package com.tripmate.identity.web;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final IdentityService identityService;

    public UserController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(HttpServletRequest request) {
        Object requestId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        UUID id = requestId instanceof UUID uuid ? uuid : UUID.randomUUID();
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(new ApiResponse<>(identityService.getCurrentProfile(), id));
    }
}
