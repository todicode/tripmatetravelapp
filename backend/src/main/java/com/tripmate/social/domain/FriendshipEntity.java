package com.tripmate.social.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "friendships")
public class FriendshipEntity {
    @EmbeddedId private FriendshipKey id;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected FriendshipEntity() {}
    public FriendshipEntity(FriendshipKey id) { this.id = id; }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public FriendshipKey getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
}
