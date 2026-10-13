package com.tripmate.social.domain;

import com.tripmate.identity.domain.UserEntity;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "friend_requests")
public class FriendRequestEntity {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sender_id") private UserEntity sender;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recipient_id") private UserEntity recipient;
    @Column(length = 500) private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private FriendRequestStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "resolved_at") private Instant resolvedAt;

    protected FriendRequestEntity() {}
    public FriendRequestEntity(UUID id, UserEntity sender, UserEntity recipient, String message) {
        this.id = id; this.sender = sender; this.recipient = recipient; this.message = message;
        this.status = FriendRequestStatus.PENDING;
    }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public UUID getId() { return id; }
    public UserEntity getSender() { return sender; }
    public UserEntity getRecipient() { return recipient; }
    public String getMessage() { return message; }
    public FriendRequestStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void resolve(FriendRequestStatus next) {
        if (status != FriendRequestStatus.PENDING || next == FriendRequestStatus.PENDING) throw new IllegalStateException();
        status = next; resolvedAt = Instant.now();
    }
}
