package com.tripmate.media.api;

import java.io.InputStream;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Messaging checks its resource permissions before opening streams through this facade. */
public interface ChatMedia {
    record Image(UUID id, int width, int height) {}

    record Content(InputStream stream, long length) {}

    void attachImage(UUID mediaId, UUID actor, UUID messageId, boolean group);

    Map<UUID, Image> images(Collection<UUID> messageIds);

    Content messageImage(UUID messageId, boolean thumbnail);

    UUID avatarOwner(UUID mediaId);

    Content avatarThumbnail(UUID mediaId);
}
