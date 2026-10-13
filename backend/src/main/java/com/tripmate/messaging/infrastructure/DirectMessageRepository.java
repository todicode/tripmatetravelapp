package com.tripmate.messaging.infrastructure;

import com.tripmate.messaging.domain.DirectMessageEntity;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface DirectMessageRepository extends JpaRepository<DirectMessageEntity, UUID> {
    @Query(
            "select m from DirectMessageEntity m join fetch m.conversation c where c.id in :ids and"
                    + " m.seq=c.lastSeq")
    List<DirectMessageEntity> lastMessages(@Param("ids") Collection<UUID> ids);

    @Query(
            "select c.id as conversationId, count(m) as unreadCount from DirectMessageEntity m join"
                + " m.conversation c where c.id in :ids and m.senderId <> :actor and m.seq > case"
                + " when c.lowUserId = :actor then c.lowReadSeq else c.highReadSeq end group by"
                + " c.id")
    List<UnreadCount> unreadCounts(@Param("ids") Collection<UUID> ids, @Param("actor") UUID actor);

    interface UnreadCount {
        UUID getConversationId();

        long getUnreadCount();
    }

    Optional<DirectMessageEntity> findByConversationIdAndSenderIdAndClientMessageId(
            UUID conversationId, UUID senderId, UUID clientMessageId);

    Optional<DirectMessageEntity> findByConversationIdAndSeq(UUID conversationId, long seq);

    long countByConversationIdAndSenderIdAndSeqGreaterThan(
            UUID conversationId, UUID senderId, long seq);

    @Query(
            "select m from DirectMessageEntity m where m.conversation.id = :id and m.seq < :before"
                    + " order by m.seq desc")
    List<DirectMessageEntity> before(
            @Param("id") UUID id, @Param("before") long before, Pageable pageable);

    @Query("select m from DirectMessageEntity m where m.conversation.id = :id order by m.seq desc")
    List<DirectMessageEntity> latest(@Param("id") UUID id, Pageable pageable);

    @Query(
            "select m from DirectMessageEntity m where m.conversation.id = :id and m.seq > :after"
                    + " order by m.seq asc")
    List<DirectMessageEntity> after(
            @Param("id") UUID id, @Param("after") long after, Pageable pageable);
}
