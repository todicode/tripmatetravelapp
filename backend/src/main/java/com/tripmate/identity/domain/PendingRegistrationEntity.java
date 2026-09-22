package com.tripmate.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pending_registrations")
public class PendingRegistrationEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(nullable = false, length = 32)
    private String phone;

    @Column(name = "installation_id", nullable = false)
    private UUID installationId;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "otp_expires_at", nullable = false)
    private Instant otpExpiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "resend_available_at", nullable = false)
    private Instant resendAvailableAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PendingRegistrationEntity() {
    }

    public PendingRegistrationEntity(UUID id, String email, String passwordHash, String displayName,
                                     String phone, UUID installationId, String otpHash,
                                     Instant otpExpiresAt, Instant resendAvailableAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.phone = phone;
        this.installationId = installationId;
        this.otpHash = otpHash;
        this.otpExpiresAt = otpExpiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getPhone() {
        return phone;
    }

    public UUID getInstallationId() {
        return installationId;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public Instant getResendAvailableAt() {
        return resendAvailableAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void incrementAttempts() {
        attempts++;
    }

    public void rotateOtp(String otpHash, Instant expiresAt, Instant resendAvailableAt) {
        this.otpHash = otpHash;
        this.otpExpiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
        this.attempts = 0;
    }

    public void markUsed() {
        usedAt = Instant.now();
    }
}
