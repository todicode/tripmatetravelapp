package com.tripmate.identity.api;

import java.util.UUID;

/** Limited user data and transaction-scoped pair locks for other application modules. */
public interface UserDirectory {
    UserSummary find(UUID userId);
    UserPair lockActivePair(UUID firstId, UUID secondId);

    record UserSummary(UUID id, String displayName, UUID avatarMediaId, boolean active) {}
    record UserPair(UserSummary low, UserSummary high) {
        public UserSummary user(UUID id) {
            if (low.id().equals(id)) return low;
            if (high.id().equals(id)) return high;
            throw new IllegalArgumentException("Not a participant");
        }
    }
}
