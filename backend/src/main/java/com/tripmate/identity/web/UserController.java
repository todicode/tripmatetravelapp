package com.tripmate.identity.web;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.identity.application.ProfileService;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIds;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final IdentityService identityService;
    private final ProfileService profileService;

    public UserController(IdentityService identityService, ProfileService profileService) {
        this.identityService = identityService;
        this.profileService = profileService;
    }

    @PatchMapping(consumes = "application/json")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        ProfileUpdateRequest update = ProfileUpdateRequest.parse(body);
        UUID id = RequestIds.from(request);
        return ResponseEntity.ok()
                .header("Cache-Control", "private, no-store")
                .body(new ApiResponse<>(profileService.update(update), id));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(HttpServletRequest request) {
        UUID id = RequestIds.from(request);
        return ResponseEntity.ok()
                .header("Cache-Control", "private, no-store")
                .body(new ApiResponse<>(identityService.getCurrentProfile(), id));
    }
}
