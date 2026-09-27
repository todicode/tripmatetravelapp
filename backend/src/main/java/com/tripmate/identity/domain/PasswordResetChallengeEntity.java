package com.tripmate.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_reset_challenges")
public class PasswordResetChallengeEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

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

    protected PasswordResetChallengeEntity() {
    }

    public PasswordResetChallengeEntity(UUID id, UserEntity user, String otpHash,
                                        Instant otpExpiresAt, Instant resendAvailableAt) {
        this.id = id;
        this.user = user;
        this.otpHash = otpHash;
        this.otpExpiresAt = otpExpiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UserEntity getUser() { return user; }
    public String getOtpHash() { return otpHash; }
    public Instant getOtpExpiresAt() { return otpExpiresAt; }
    public int getAttempts() { return attempts; }
    public Instant getResendAvailableAt() { return resendAvailableAt; }
    public Instant getUsedAt() { return usedAt; }

    public void incrementAttempts() { attempts++; }
    public void markUsed() { usedAt = Instant.now(); }
}
