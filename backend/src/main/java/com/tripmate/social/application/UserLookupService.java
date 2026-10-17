package com.tripmate.social.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.shared.security.CurrentActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.social.api.RelationshipLookup;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserLookupService {
    private final UserDirectory users;
    private final RelationshipLookup relationships;

    public UserLookupService(UserDirectory users, RelationshipLookup relationships) {
        this.users = users;
        this.relationships = relationships;
    }

    @Transactional(readOnly = true)
    public LookupResult byPhone(String phone) {
        UUID actorId = actorId();
        return result(users.byPhone(phone), actorId);
    }

    @Transactional(readOnly = true)
    public LookupResult byFriendCode(String friendCode) {
        UUID actorId = actorId();
        return result(users.byFriendCode(friendCode), actorId);
    }

    @Transactional(readOnly = true)
    public FriendCodeResult ownFriendCode() {
        String code = users.friendCode(actorId());
        return new FriendCodeResult(code, "tripmate://friend/" + code);
    }

    private LookupResult result(UserDirectory.UserSummary user, UUID actorId) {
        if (!user.active()) throw notFound();
        var relationship = relationships.between(actorId, user.id());
        return new LookupResult(
                new UserSummary(user.id(), user.displayName(), user.avatarMediaId()),
                relationship.status(),
                relationship.pendingRequestId());
    }

    private UUID actorId() {
        return CurrentActor.userId();
    }

    private ApiException notFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    public record UserSummary(UUID id, String displayName, UUID avatarMediaId) {}

    public record LookupResult(UserSummary user, String relationship, UUID pendingRequestId) {}

    public record FriendCodeResult(String friendCode, String qrPayload) {}
}
