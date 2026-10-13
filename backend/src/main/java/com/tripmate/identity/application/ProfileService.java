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
    private final com.tripmate.catalog.api.InterestCatalog interests;
    public ProfileService(UserRepository users, AvatarMedia media, IdentityService identity, com.tripmate.catalog.api.InterestCatalog interests) {
        this.users = users; this.media = media; this.identity = identity; this.interests = interests;
    }
    @Transactional
    public ProfileResponse update(ProfileUpdateRequest update) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedActor actor)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        }
        var user = users.findByIdForUpdate(actor.userId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        if (user.getStatus() != UserStatus.ACTIVE) throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa.");
        if (update.phone() != null && user.getPhone() != null && !user.getPhone().equals(update.phone())) {
            throw new ApiException(HttpStatus.CONFLICT, "PHONE_ALREADY_SET", "Số điện thoại đã được lưu. Không thể thay đổi tại bước này.");
        }
        if (update.phone() != null && user.getPhone() == null
                && users.existsByPhoneLookup(PhoneNumber.key(update.phone()))) {
            throw new ApiException(HttpStatus.CONFLICT, "PHONE_ALREADY_REGISTERED", "Số điện thoại này đã được sử dụng bởi tài khoản khác.");
        }
        if (update.interestCodes() != null) interests.validate(update.interestCodes());
        if (update.hasAvatar()) {
            media.replace(user.getId(), user.getAvatarMediaId(), update.avatarMediaId());
            user.setAvatarMediaId(update.avatarMediaId());
        }
        if (update.displayName() != null) user.setDisplayName(update.displayName());
        if (update.phone() != null && user.getPhone() == null) user.setPhone(update.phone());
        if (update.interestCodes() != null) user.setInterestCodes(update.interestCodes());
        users.saveAndFlush(user);
        return identity.getCurrentProfile();
    }
}
