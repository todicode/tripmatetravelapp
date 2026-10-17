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
    @Query(
            "select case when f.id.userLowId = :actor then f.id.userHighId else f.id.userLowId end"
                + " from FriendshipEntity f where (f.id.userLowId = :actor and f.id.userHighId in"
                + " :candidates) or (f.id.userHighId = :actor and f.id.userLowId in :candidates)")
    java.util.List<UUID> friendsWithin(
            @Param("actor") UUID actor, @Param("candidates") java.util.Collection<UUID> candidates);

    @Query(
            "select f from FriendshipEntity f where f.id.userLowId = :userId or f.id.userHighId ="
                    + " :userId")
    Page<FriendshipEntity> forUser(@Param("userId") UUID userId, Pageable page);
}
