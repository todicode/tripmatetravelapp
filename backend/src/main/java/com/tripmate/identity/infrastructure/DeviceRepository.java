package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.DeviceEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface DeviceRepository extends JpaRepository<DeviceEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DeviceEntity> findByInstallationId(UUID installationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select device from DeviceEntity device left join fetch device.user where device.id = :id")
    Optional<DeviceEntity> findByIdForUpdate(@Param("id") UUID id);
}
