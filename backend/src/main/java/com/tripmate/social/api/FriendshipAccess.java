package com.tripmate.social.api;

import com.tripmate.identity.api.UserDirectory.UserPair;
import java.util.UUID;

/** Pair locks join the caller's transaction to serialize messaging with social mutations. */
public interface FriendshipAccess {
    UserPair lockFriends(UUID firstId, UUID secondId);
    boolean areFriends(UUID firstId, UUID secondId);
}
