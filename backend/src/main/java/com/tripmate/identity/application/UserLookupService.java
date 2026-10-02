package com.tripmate.identity.application;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.RelationshipLookup;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class UserLookupService {
    private final UserRepository users;
    private final RelationshipLookup relationships;

    public UserLookupService(UserRepository users, RelationshipLookup relationships) {
        this.users = users; this.relationships = relationships;
    }

    @Transactional(readOnly = true)
    public LookupResult byPhone(String phone) {
        UUID actorId = actorId();
        return result(users.findByPhoneLookup(PhoneNumber.key(phone)).orElseThrow(this::notFound), actorId);
    }

    @Transactional(readOnly = true)
    public LookupResult byFriendCode(String friendCode) {
        UUID actorId = actorId();
        String normalized = friendCode == null ? "" : friendCode.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty() || normalized.length() > 32) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Mã kết bạn không hợp lệ.");
        }
        return result(users.findByFriendCode(normalized).orElseThrow(this::notFound), actorId);
    }

    @Transactional(readOnly = true)
    public FriendCodeResult ownFriendCode() {
        UserEntity user = users.findById(actorId()).orElseThrow(this::notFound);
        if (user.getStatus() != UserStatus.ACTIVE) throw notFound();
        return new FriendCodeResult(user.getFriendCode(), "tripmate://friend/" + user.getFriendCode());
    }

    private LookupResult result(UserEntity user, UUID actorId) {
        if (user.getStatus() != UserStatus.ACTIVE) throw notFound();
        var relationship = relationships.between(actorId, user.getId());
        return new LookupResult(new UserSummary(user.getId(), user.getDisplayName(), user.getAvatarMediaId()),
                relationship.status(), relationship.pendingRequestId());
    }

    private UUID actorId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedActor actor)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        }
        return actor.userId();
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    public record UserSummary(UUID id, String displayName, UUID avatarMediaId) {}
    public record LookupResult(UserSummary user, String relationship, UUID pendingRequestId) {}
    public record FriendCodeResult(String friendCode, String qrPayload) {}
}
