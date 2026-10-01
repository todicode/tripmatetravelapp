package com.tripmate.identity.application;

import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;
import com.tripmate.identity.web.ProfileUpdateRequest;
import com.tripmate.media.api.AvatarMedia;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final UserRepository users;
    private final AvatarMedia media;
    private final IdentityService identity;
    public ProfileService(UserRepository users, AvatarMedia media, IdentityService identity) {
        this.users = users; this.media = media; this.identity = identity;
    }
    @Transactional
    public ProfileResponse update(ProfileUpdateRequest update) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedActor actor)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        }
        var user = users.findByIdForUpdate(actor.userId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        if (user.getStatus() != UserStatus.ACTIVE) throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa.");
        if (update.hasAvatar()) {
            media.replace(user.getId(), user.getAvatarMediaId(), update.avatarMediaId());
            user.setAvatarMediaId(update.avatarMediaId());
        }
        if (update.displayName() != null) user.setDisplayName(update.displayName());
        users.saveAndFlush(user);
        return identity.getCurrentProfile();
    }
}
