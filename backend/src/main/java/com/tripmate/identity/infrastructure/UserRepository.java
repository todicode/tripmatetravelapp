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

    Optional<UserEntity> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from UserEntity user where user.email = :email")
    Optional<UserEntity> findByEmailForUpdate(@Param("email") String email);

    boolean existsByEmail(String email);

    boolean existsByFriendCode(String friendCode);
}
