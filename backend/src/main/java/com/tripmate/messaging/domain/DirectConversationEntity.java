package com.tripmate.messaging.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "direct_conversations")
public class DirectConversationEntity {
    @Id private UUID id;
    @Column(name = "user_low_id", nullable = false, updatable = false) private UUID lowUserId;
    @Column(name = "user_high_id", nullable = false, updatable = false) private UUID highUserId;
    @Column(name = "last_seq", nullable = false) private long lastSeq;
    @Column(name = "low_read_seq", nullable = false) private long lowReadSeq;
    @Column(name = "high_read_seq", nullable = false) private long highReadSeq;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected DirectConversationEntity() {}
    public DirectConversationEntity(UUID id, UUID lowUserId, UUID highUserId) {
        if (lowUserId.toString().compareTo(highUserId.toString()) >= 0) throw new IllegalArgumentException("Unordered user pair");
        this.id = id; this.lowUserId = lowUserId; this.highUserId = highUserId;
        this.createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        this.updatedAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getLowUserId() { return lowUserId; }
    public UUID getHighUserId() { return highUserId; }
    public long getLastSeq() { return lastSeq; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public boolean includes(UUID userId) {
        return lowUserId.equals(userId) || highUserId.equals(userId);
    }
    public UUID otherId(UUID userId) {
        requireParticipant(userId);
        return lowUserId.equals(userId) ? highUserId : lowUserId;
    }
    public long readSeq(UUID userId) {
        requireParticipant(userId);
        return lowUserId.equals(userId) ? lowReadSeq : highReadSeq;
    }
    public void markRead(UUID userId, long seq) {
        requireParticipant(userId);
        if (seq < 0 || seq > lastSeq) throw new IllegalArgumentException("Invalid read sequence");
        if (lowUserId.equals(userId)) lowReadSeq = Math.max(lowReadSeq, seq);
        else highReadSeq = Math.max(highReadSeq, seq);
    }
    public long nextSeq() {
        lastSeq = Math.incrementExact(lastSeq);
        updatedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        return lastSeq;
    }
    private void requireParticipant(UUID userId) {
        if (!includes(userId)) throw new IllegalArgumentException("Not a participant");
    }
}
