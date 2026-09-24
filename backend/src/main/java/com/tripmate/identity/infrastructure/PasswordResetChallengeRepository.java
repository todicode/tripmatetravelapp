package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.PasswordResetChallengeEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetChallengeRepository extends JpaRepository<PasswordResetChallengeEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select challenge from PasswordResetChallengeEntity challenge where challenge.user.id = :userId and challenge.usedAt is null")
    Optional<PasswordResetChallengeEntity> findActiveByUserIdForUpdate(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select challenge from PasswordResetChallengeEntity challenge join fetch challenge.user where challenge.id = :id")
    Optional<PasswordResetChallengeEntity> findByIdForUpdate(@Param("id") UUID id);

    long deleteByOtpExpiresAtBefore(Instant now);
}
