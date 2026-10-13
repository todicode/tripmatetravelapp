package com.tripmate.social.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.identity.api.UserDirectory.UserPair;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.FriendshipAccess;
import com.tripmate.social.domain.FriendshipKey;
import com.tripmate.social.infrastructure.FriendshipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class FriendshipAccessService implements FriendshipAccess {
    private final UserDirectory users;
    private final FriendshipRepository friendships;
    public FriendshipAccessService(UserDirectory users, FriendshipRepository friendships) {
        this.users = users; this.friendships = friendships;
    }
    @Override @Transactional
    public UserPair lockFriends(UUID firstId, UUID secondId) {
        UserPair pair = users.lockActivePair(firstId, secondId);
        if (!areFriends(firstId, secondId))
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_FRIENDS", "Chỉ có thể nhắn tin với bạn bè hiện tại.");
        return pair;
    }
    @Override @Transactional(readOnly = true)
    public boolean areFriends(UUID firstId, UUID secondId) {
        return !firstId.equals(secondId) && friendships.existsById(new FriendshipKey(firstId, secondId));
    }
}
