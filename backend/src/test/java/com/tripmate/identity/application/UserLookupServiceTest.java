package com.tripmate.identity.application;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserLookupServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final UserLookupService lookup = new UserLookupService(users);

    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test void looksUpByNormalizedPhoneAndCodeWithoutExposingPrivateFields() {
        authenticate(UUID.randomUUID());
        UserEntity target = user(UUID.randomUUID());
        when(users.findByPhoneLookup("0901234567")).thenReturn(Optional.of(target));
        when(users.findByFriendCode("TM-ABC12345")).thenReturn(Optional.of(target));

        var byPhone = lookup.byPhone("+84 901 234 567");
        var byCode = lookup.byFriendCode(" tm-abc12345 ");
        assertEquals(target.getId(), byPhone.user().id());
        assertEquals("NONE", byPhone.relationship());
        assertNull(byPhone.pendingRequestId());
        assertEquals(byPhone, byCode);
        assertEquals(3, byPhone.user().getClass().getRecordComponents().length);
    }

    @Test void marksSelfAndRejectsMissingOrDisabledUsers() {
        UserEntity target = user(UUID.randomUUID());
        authenticate(target.getId());
        when(users.findByFriendCode("TM-ABC12345")).thenReturn(Optional.of(target));
        assertEquals("SELF", lookup.byFriendCode("TM-ABC12345").relationship());
        target.setStatus(UserStatus.DISABLED);
        assertEquals("USER_NOT_FOUND", assertThrows(ApiException.class,
                () -> lookup.byFriendCode("TM-ABC12345")).getCode());
        assertEquals("USER_NOT_FOUND", assertThrows(ApiException.class,
                () -> lookup.byPhone("0907654321")).getCode());
    }

    @Test void returnsOwnCodeForQrAndRequiresAuthentication() {
        UserEntity owner = user(UUID.randomUUID());
        authenticate(owner.getId());
        when(users.findById(owner.getId())).thenReturn(Optional.of(owner));
        assertEquals("tripmate://friend/TM-ABC12345", lookup.ownFriendCode().qrPayload());
        SecurityContextHolder.clearContext();
        assertEquals("UNAUTHORIZED", assertThrows(ApiException.class,
                () -> lookup.byFriendCode("TM-ABC12345")).getCode());
    }

    private UserEntity user(UUID id) {
        return new UserEntity(id, "private@example.test", "hash", "Bạn An", "+84901234567",
                "TM-ABC12345", Instant.now());
    }

    private void authenticate(UUID id) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, UUID.randomUUID(), 1), null, AuthorityUtils.NO_AUTHORITIES));
    }
}
