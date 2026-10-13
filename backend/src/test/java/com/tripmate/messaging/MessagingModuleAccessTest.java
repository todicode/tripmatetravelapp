package com.tripmate.messaging;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.identity.application.UserDirectoryService;
import com.tripmate.identity.domain.*;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.application.FriendshipAccessService;
import com.tripmate.social.domain.FriendshipKey;
import com.tripmate.social.infrastructure.FriendshipRepository;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MessagingModuleAccessTest {
    @Test void identityFacadeLocksCanonicalPairAndReturnsLimitedData() {
        UserRepository users = mock(UserRepository.class);
        var low = user("00000000-0000-4000-8000-000000000001");
        var high = user("ffffffff-ffff-4fff-8fff-ffffffffffff");
        when(users.findByIdForUpdate(low.getId())).thenReturn(Optional.of(low));
        when(users.findByIdForUpdate(high.getId())).thenReturn(Optional.of(high));
        var directory = new UserDirectoryService(users);
        var pair = directory.lockActivePair(high.getId(), low.getId());
        assertEquals(low.getId(), pair.low().id());
        assertEquals(high.getId(), pair.high().id());
        var order = inOrder(users);
        order.verify(users).findByIdForUpdate(low.getId());
        order.verify(users).findByIdForUpdate(high.getId());
        high.setStatus(UserStatus.DISABLED);
        assertEquals("USER_NOT_FOUND", assertThrows(ApiException.class,
                () -> directory.lockActivePair(low.getId(), high.getId())).getCode());
        when(users.findById(high.getId())).thenReturn(Optional.of(high));
        assertFalse(directory.find(high.getId()).active());
    }
    @Test void socialFacadeChecksFriendshipAfterPairLock() {
        UserDirectory users = mock(UserDirectory.class);
        FriendshipRepository friends = mock(FriendshipRepository.class);
        var low = UUID.fromString("00000000-0000-4000-8000-000000000001");
        var high = UUID.fromString("ffffffff-ffff-4fff-8fff-ffffffffffff");
        var pair = new UserDirectory.UserPair(new UserDirectory.UserSummary(low, "A", null, true),
                new UserDirectory.UserSummary(high, "B", null, true));
        when(users.lockActivePair(high, low)).thenReturn(pair);
        when(friends.existsById(new FriendshipKey(low, high))).thenReturn(true);
        var access = new FriendshipAccessService(users, friends);
        assertEquals(pair, access.lockFriends(high, low));
        var order = inOrder(users, friends);
        order.verify(users).lockActivePair(high, low);
        order.verify(friends).existsById(new FriendshipKey(low, high));
        when(friends.existsById(any())).thenReturn(false);
        assertEquals("NOT_FRIENDS", assertThrows(ApiException.class, () -> access.lockFriends(high, low)).getCode());
    }
    private UserEntity user(String id) {
        return new UserEntity(UUID.fromString(id), id + "@example.test", "hash", "User", "+84901234567", "TM-ABC12345", Instant.now());
    }
}
