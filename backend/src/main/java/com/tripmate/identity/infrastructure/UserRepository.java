package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.UserEntity;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    @Query(
            "select u.id as id, u.displayName as displayName, u.avatarMediaId as avatarMediaId,"
                    + " u.status as status from UserEntity u where u.id in :ids")
    java.util.List<PublicProfile> findSummaries(@Param("ids") java.util.Collection<UUID> ids);

    interface PublicProfile {
        UUID getId();

        String getDisplayName();

        UUID getAvatarMediaId();

        com.tripmate.identity.domain.UserStatus getStatus();
    }

    Optional<UserEntity> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from UserEntity user where user.id = :id")
    Optional<UserEntity> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from UserEntity user where user.email = :email")
    Optional<UserEntity> findByEmailForUpdate(@Param("email") String email);

    boolean existsByEmail(String email);

    boolean existsByFriendCode(String friendCode);

    Optional<UserEntity> findByFriendCode(String friendCode);

    Optional<UserEntity> findByPhoneLookup(String phoneLookup);

    boolean existsByPhoneLookup(String phoneLookup);
}
