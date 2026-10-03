package com.tripmate.messaging.infrastructure;

import com.tripmate.messaging.domain.DirectConversationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface DirectConversationRepository extends JpaRepository<DirectConversationEntity, UUID> {
    Optional<DirectConversationEntity> findByLowUserIdAndHighUserId(UUID lowId, UUID highId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from DirectConversationEntity c where c.id = :id")
    Optional<DirectConversationEntity> findByIdForUpdate(@Param("id") UUID id);

    // Scalar projection avoids loading a stale managed conversation before the pair locks.
    @Query("select c.lowUserId as lowId, c.highUserId as highId from DirectConversationEntity c where c.id = :id")
    Optional<Participants> participants(@Param("id") UUID id);

    @Query("select c from DirectConversationEntity c where c.lowUserId = :actor or c.highUserId = :actor "
            + "order by c.updatedAt desc, c.id desc")
    List<DirectConversationEntity> firstPage(@Param("actor") UUID actor, Pageable pageable);

    @Query("select c from DirectConversationEntity c where (c.lowUserId = :actor or c.highUserId = :actor) "
            + "and (c.updatedAt < :time or (c.updatedAt = :time and c.id < :id)) order by c.updatedAt desc, c.id desc")
    List<DirectConversationEntity> nextPage(@Param("actor") UUID actor, @Param("time") Instant time,
                                           @Param("id") UUID id, Pageable pageable);

    interface Participants { UUID getLowId(); UUID getHighId(); }
}
