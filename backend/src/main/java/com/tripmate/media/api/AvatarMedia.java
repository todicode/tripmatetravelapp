package com.tripmate.media.api;

import java.util.UUID;

public interface AvatarMedia {
    /** Runs inside the caller's profile transaction, after locking the user row. */
    void replace(UUID userId, UUID previousId, UUID nextId);
}
