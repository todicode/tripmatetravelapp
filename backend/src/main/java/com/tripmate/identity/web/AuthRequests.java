package com.tripmate.identity.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthRequests {

    private AuthRequests() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotNull UUID installationId,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Pattern(regexp = "\\+?[0-9 ()-]{7,32}") @Size(max = 32) String phone) {
    }

    public record VerifyRegistrationRequest(
            @NotNull UUID verificationId,
            @NotBlank @Pattern(regexp = "\\d{6}") String otp) {
    }

    public record ResendOtpRequest(@NotNull UUID verificationId) {
    }

    public record CancelRegistrationRequest(@NotNull UUID verificationId) {
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotNull UUID installationId) {
    }

    public record GoogleAuthRequest(
            @NotBlank @Size(max = 8192) String idToken,
            @NotNull UUID installationId) {
    }

    public record RefreshRequest(@NotBlank @Size(max = 2048) String refreshToken) {
    }

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 128) String currentPassword,
            @NotBlank @Size(min = 8, max = 128) String newPassword) {
    }

    public record RequestPasswordResetRequest(@NotBlank @Email @Size(max = 254) String email) {
    }

    public record ConfirmPasswordResetRequest(
            @NotNull UUID resetId,
            @NotBlank @Pattern(regexp = "\\d{6}") String otp,
            @NotBlank @Size(min = 8, max = 128) String newPassword) {
    }
}
