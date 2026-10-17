package com.tripmate.identity.application;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.web.AuthResponses.ProfileResponse;

final class ProfileMapper {
    private ProfileMapper() {}

    static ProfileResponse toProfile(UserEntity user) {
        return new ProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getAvatarMediaId(),
                user.getEmail(),
                user.getPhone(),
                user.getInterestCodes(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
