package com.tripmate.social.infrastructure;

import com.tripmate.social.domain.FriendRequestEntity;
import com.tripmate.social.domain.FriendRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FriendRequestRepository extends JpaRepository<FriendRequestEntity, UUID> {
    @Query("select r from FriendRequestEntity r where r.status = :status and "
            + "((r.sender.id = :first and r.recipient.id = :second) or "
            + "(r.sender.id = :second and r.recipient.id = :first))")
    Optional<FriendRequestEntity> findPairByStatus(@Param("first") UUID first, @Param("second") UUID second,
                                                   @Param("status") FriendRequestStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from FriendRequestEntity r where r.id = :id")
    Optional<FriendRequestEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query("select r from FriendRequestEntity r where r.sender.id = :userId and r.status = :status")
    Page<FriendRequestEntity> outgoing(@Param("userId") UUID userId, @Param("status") FriendRequestStatus status,
                                       Pageable page);

    @Query("select r from FriendRequestEntity r where r.recipient.id = :userId and r.status = :status")
    Page<FriendRequestEntity> incoming(@Param("userId") UUID userId, @Param("status") FriendRequestStatus status,
                                       Pageable page);
}
