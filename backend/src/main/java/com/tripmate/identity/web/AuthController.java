package com.tripmate.identity.web;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.identity.application.PasswordResetService;
import com.tripmate.identity.web.AuthRequests.ConfirmPasswordResetRequest;
import com.tripmate.identity.web.AuthRequests.RequestPasswordResetRequest;
import com.tripmate.identity.web.AuthResponses.PasswordResetChallengeResponse;
import com.tripmate.identity.web.AuthRequests.CancelRegistrationRequest;
import com.tripmate.identity.web.AuthRequests.GoogleAuthRequest;
import com.tripmate.identity.web.AuthRequests.LoginRequest;
import com.tripmate.identity.web.AuthRequests.RefreshRequest;
import com.tripmate.identity.web.AuthRequests.RegisterRequest;
import com.tripmate.identity.web.AuthRequests.ResendOtpRequest;
import com.tripmate.identity.web.AuthRequests.VerifyRegistrationRequest;
import com.tripmate.identity.web.AuthResponses.RegistrationChallengeResponse;
import com.tripmate.identity.web.AuthResponses.SessionResponse;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String NO_STORE = "private, no-store";

    private final IdentityService identityService;
    private final PasswordResetService passwordResetService;

    public AuthController(IdentityService identityService, PasswordResetService passwordResetService) {
        this.identityService = identityService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegistrationChallengeResponse>> register(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.startRegistration(request), requestId(httpRequest)));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResponse<SessionResponse>> verifyRegistration(
            @Valid @RequestBody VerifyRegistrationRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.verifyRegistration(request), requestId(httpRequest)));
    }

    @PostMapping("/register/resend")
    public ResponseEntity<ApiResponse<RegistrationChallengeResponse>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.resendOtp(request), requestId(httpRequest)));
    }

    @PostMapping("/register/cancel")
    public ResponseEntity<Void> cancelRegistration(
            @Valid @RequestBody CancelRegistrationRequest request, HttpServletRequest httpRequest) {
        identityService.cancelRegistration(request.verificationId());
        return ResponseEntity.noContent().header("Cache-Control", NO_STORE)
                .header(RequestIdFilter.REQUEST_ID_HEADER, requestId(httpRequest).toString()).build();
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<SessionResponse>> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok().header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.login(request), requestId(httpRequest)));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse<PasswordResetChallengeResponse>> requestPasswordReset(
            @Valid @RequestBody RequestPasswordResetRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(passwordResetService.requestReset(request), requestId(httpRequest)));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(
            @Valid @RequestBody ConfirmPasswordResetRequest request, HttpServletRequest httpRequest) {
        passwordResetService.confirmReset(request);
        return ResponseEntity.noContent().header("Cache-Control", NO_STORE)
                .header(RequestIdFilter.REQUEST_ID_HEADER, requestId(httpRequest).toString()).build();
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<SessionResponse>> google(
            @Valid @RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok().header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.authenticateWithGoogle(request), requestId(httpRequest)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<SessionResponse>> refresh(
            @Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok().header("Cache-Control", NO_STORE)
                .body(new ApiResponse<>(identityService.refresh(request), requestId(httpRequest)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        identityService.logout();
        return ResponseEntity.noContent().header("Cache-Control", NO_STORE)
                .header(RequestIdFilter.REQUEST_ID_HEADER,
                requestId(httpRequest).toString()).build();
    }

    private UUID requestId(HttpServletRequest request) {
        Object requestId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return requestId instanceof UUID uuid ? uuid : UUID.randomUUID();
    }
}
