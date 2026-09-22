package com.tripmate.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_devices")
public class DeviceEntity {

    @Id
    private UUID id;

    @Column(name = "installation_id", nullable = false, unique = true)
    private UUID installationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "binding_version", nullable = false)
    private long bindingVersion = 1L;

    @Column(name = "fcm_token", unique = true)
    private String fcmToken;

    @Column(name = "push_enabled", nullable = false)
    private boolean pushEnabled;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DeviceEntity() {
    }

    public DeviceEntity(UUID id, UUID installationId) {
        this.id = id;
        this.installationId = installationId;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        lastSeenAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getInstallationId() {
        return installationId;
    }

    public UserEntity getUser() {
        return user;
    }

    public long getBindingVersion() {
        return bindingVersion;
    }

    public String getFcmToken() {
        return fcmToken;
    }

    public boolean isPushEnabled() {
        return pushEnabled;
    }

    public void bind(UserEntity user) {
        if (this.user != null && !this.user.getId().equals(user.getId())) {
            bindingVersion++;
        }
        this.user = user;
        this.lastSeenAt = Instant.now();
    }

    public void unbind() {
        this.user = null;
        this.fcmToken = null;
        this.pushEnabled = false;
        this.bindingVersion++;
        this.lastSeenAt = Instant.now();
    }
}
