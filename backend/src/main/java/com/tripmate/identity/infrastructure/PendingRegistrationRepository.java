package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.PendingRegistrationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistrationEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PendingRegistrationEntity> findByEmailAndUsedAtIsNull(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select pending from PendingRegistrationEntity pending where pending.id = :id")
    Optional<PendingRegistrationEntity> findByIdForUpdate(@Param("id") UUID id);

    long deleteByOtpExpiresAtBefore(Instant now);
}
