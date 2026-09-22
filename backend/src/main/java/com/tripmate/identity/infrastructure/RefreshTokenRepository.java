package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.RefreshTokenEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from RefreshTokenEntity token join fetch token.user join fetch token.device where token.tokenHash = :tokenHash")
    Optional<RefreshTokenEntity> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from RefreshTokenEntity token where token.familyId = :familyId")
    List<RefreshTokenEntity> findFamilyForUpdate(@Param("familyId") UUID familyId);

    @Query("select token from RefreshTokenEntity token where token.user.id = :userId and token.device.id = :deviceId and token.revokedAt is null")
    List<RefreshTokenEntity> findActiveByUserAndDevice(@Param("userId") UUID userId, @Param("deviceId") UUID deviceId);
}
