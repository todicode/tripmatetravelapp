package com.tripmate.social.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class FriendshipKey implements Serializable {
    @Column(name = "user_low_id") private UUID userLowId;
    @Column(name = "user_high_id") private UUID userHighId;
    protected FriendshipKey() {}
    public FriendshipKey(UUID first, UUID second) {
        if (first.equals(second)) throw new IllegalArgumentException("A friendship needs two users");
        if (first.toString().compareTo(second.toString()) < 0) { userLowId = first; userHighId = second; }
        else { userLowId = second; userHighId = first; }
    }
    public UUID getUserLowId() { return userLowId; }
    public UUID getUserHighId() { return userHighId; }
    @Override public boolean equals(Object other) {
        return other instanceof FriendshipKey key && Objects.equals(userLowId, key.userLowId)
                && Objects.equals(userHighId, key.userHighId);
    }
    @Override public int hashCode() { return Objects.hash(userLowId, userHighId); }
}
