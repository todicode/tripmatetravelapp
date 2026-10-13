package com.tripmate.social.infrastructure;

import com.tripmate.social.domain.FriendshipEntity;
import com.tripmate.social.domain.FriendshipKey;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<FriendshipEntity, FriendshipKey> {
    @Query("select f from FriendshipEntity f where f.id.userLowId = :userId or f.id.userHighId = :userId")
    Page<FriendshipEntity> forUser(@Param("userId") UUID userId, Pageable page);
}
