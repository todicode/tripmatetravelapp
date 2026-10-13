package com.tripmate.identity.application;

import com.tripmate.identity.api.UserDirectory;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class UserDirectoryService implements UserDirectory {
    private final UserRepository users;
    public UserDirectoryService(UserRepository users) { this.users = users; }

    @Override @Transactional(readOnly = true)
    public UserSummary find(UUID userId) {
        return summary(users.findById(userId).orElseThrow(this::notFound));
    }
    @Override @Transactional
    public UserPair lockActivePair(UUID firstId, UUID secondId) {
        if (firstId.equals(secondId)) throw new IllegalArgumentException("Two users required");
        UUID lowId = firstId.toString().compareTo(secondId.toString()) < 0 ? firstId : secondId;
        UUID highId = lowId.equals(firstId) ? secondId : firstId;
        UserEntity low = users.findByIdForUpdate(lowId).orElseThrow(this::notFound);
        UserEntity high = users.findByIdForUpdate(highId).orElseThrow(this::notFound);
        if (low.getStatus() != UserStatus.ACTIVE || high.getStatus() != UserStatus.ACTIVE) throw notFound();
        return new UserPair(summary(low), summary(high));
    }
    private UserSummary summary(UserEntity user) {
        return new UserSummary(user.getId(), user.getDisplayName(), user.getAvatarMediaId(), user.getStatus() == UserStatus.ACTIVE);
    }
    private ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."); }
}
