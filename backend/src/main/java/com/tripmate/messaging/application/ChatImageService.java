package com.tripmate.messaging.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.media.api.ChatMedia;
import com.tripmate.messaging.infrastructure.GroupConversationRepository;
import com.tripmate.shared.security.CurrentActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ChatImageService {
    private final ChatMedia media;
    private final UserDirectory users;
    private final FriendshipAccess friends;
    private final GroupConversationRepository groups;
    private final DirectMessagingService direct;
    private final GroupMessagingService group;

    public ChatImageService(
            ChatMedia media,
            UserDirectory users,
            FriendshipAccess friends,
            GroupConversationRepository groups,
            DirectMessagingService direct,
            GroupMessagingService group) {
        this.media = media;
        this.users = users;
        this.friends = friends;
        this.groups = groups;
        this.direct = direct;
        this.group = group;
    }

    public ChatMedia.Content avatar(UUID mediaId) {
        UUID owner = media.avatarOwner(mediaId), actor = CurrentActor.userId();
        var profile = users.find(owner);
        if (!profile.active()
                || !mediaId.equals(profile.avatarMediaId())
                || !(owner.equals(actor)
                        || friends.areFriends(actor, owner)
                        || groups.shareActiveGroup(actor, owner)))
            throw new ApiException(
                    HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy ảnh.");
        return media.avatarThumbnail(mediaId);
    }

    public ChatMedia.Content image(
            UUID conversationId, UUID messageId, boolean isGroup, boolean thumbnail) {
        if (isGroup) group.requireMessageAccess(conversationId, messageId);
        else direct.requireMessageAccess(conversationId, messageId);
        // Permission queries finish before opening an external storage stream.
        return media.messageImage(messageId, thumbnail);
    }
}
