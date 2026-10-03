package com.tripmate.messaging.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "direct_messages")
public class DirectMessageEntity {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id") private DirectConversationEntity conversation;
    @Column(name = "sender_id", nullable = false, updatable = false) private UUID senderId;
    @Column(name = "client_message_id", nullable = false) private UUID clientMessageId;
    @Column(nullable = false) private long seq;
    @Column(nullable = false, length = 4000) private String body;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected DirectMessageEntity() {}
    public DirectMessageEntity(UUID id, DirectConversationEntity conversation, UUID senderId,
                               UUID clientMessageId, long seq, String body) {
        if (!conversation.includes(senderId)) throw new IllegalArgumentException("Not a participant");
        this.id = id; this.conversation = conversation; this.senderId = senderId;
        this.clientMessageId = clientMessageId; this.seq = seq; this.body = body;
        this.createdAt = conversation.getUpdatedAt();
    }
    public UUID getId() { return id; }
    public DirectConversationEntity getConversation() { return conversation; }
    public UUID getSenderId() { return senderId; }
    public UUID getClientMessageId() { return clientMessageId; }
    public long getSeq() { return seq; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
