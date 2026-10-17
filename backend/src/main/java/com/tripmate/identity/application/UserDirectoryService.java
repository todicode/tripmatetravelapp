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

    public UserDirectoryService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummary find(UUID userId) {
        return summary(users.findById(userId).orElseThrow(this::notFound));
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<UUID, UserSummary> findAll(java.util.Collection<UUID> userIds) {
        if (userIds.isEmpty()) return java.util.Map.of();
        var summaries = new java.util.HashMap<UUID, UserSummary>();
        for (var user : users.findSummaries(userIds)) {
            summaries.put(
                    user.getId(),
                    new UserSummary(
                            user.getId(),
                            user.getDisplayName(),
                            user.getAvatarMediaId(),
                            user.getStatus() == UserStatus.ACTIVE));
        }
        if (!summaries.keySet().containsAll(userIds)) throw notFound();
        return java.util.Map.copyOf(summaries);
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummary byPhone(String phone) {
        return active(users.findByPhoneLookup(PhoneNumber.key(phone)).orElseThrow(this::notFound));
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummary byFriendCode(String friendCode) {
        String code =
                friendCode == null ? "" : friendCode.trim().toUpperCase(java.util.Locale.ROOT);
        if (code.isEmpty() || code.length() > 32)
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "VALIDATION_ERROR",
                    "Mã kết bạn không hợp lệ.");
        return active(users.findByFriendCode(code).orElseThrow(this::notFound));
    }

    @Override
    @Transactional(readOnly = true)
    public String friendCode(UUID userId) {
        var user = users.findById(userId).orElseThrow(this::notFound);
        active(user);
        return user.getFriendCode();
    }

    private UserSummary active(UserEntity user) {
        if (user.getStatus() != UserStatus.ACTIVE) throw notFound();
        return summary(user);
    }

    @Override
    @Transactional
    public UserPair lockActivePair(UUID firstId, UUID secondId) {
        if (firstId.equals(secondId)) throw new IllegalArgumentException("Two users required");
        UUID lowId = firstId.toString().compareTo(secondId.toString()) < 0 ? firstId : secondId;
        UUID highId = lowId.equals(firstId) ? secondId : firstId;
        UserEntity low = users.findByIdForUpdate(lowId).orElseThrow(this::notFound);
        UserEntity high = users.findByIdForUpdate(highId).orElseThrow(this::notFound);
        if (low.getStatus() != UserStatus.ACTIVE || high.getStatus() != UserStatus.ACTIVE)
            throw notFound();
        return new UserPair(summary(low), summary(high));
    }

    private UserSummary summary(UserEntity user) {
        return new UserSummary(
                user.getId(),
                user.getDisplayName(),
                user.getAvatarMediaId(),
                user.getStatus() == UserStatus.ACTIVE);
    }

    private ApiException notFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    }
}
