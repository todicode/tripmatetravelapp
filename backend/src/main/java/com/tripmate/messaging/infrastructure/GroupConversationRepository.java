package com.tripmate.messaging.infrastructure;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class GroupConversationRepository {
    public record Group(UUID id, UUID ownerId, String name, UUID tripId, long version, long lastSeq,
                        Instant archivedAt, Instant createdAt, Instant updatedAt) {}
    public record Member(UUID userId, String status, long readSeq, Instant joinedAt) {}
    public record Message(UUID id, UUID conversationId, UUID senderId, UUID clientMessageId,
                          long seq, String body, Instant createdAt) {}
    private final NamedParameterJdbcTemplate jdbc;
    public GroupConversationRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final RowMapper<Group> GROUP = (r, n) -> new Group(r.getObject("id", UUID.class), r.getObject("owner_id", UUID.class),
            r.getString("name"), r.getObject("trip_id", UUID.class), r.getLong("version"), r.getLong("last_seq"),
            r.getTimestamp("archived_at") == null ? null : r.getTimestamp("archived_at").toInstant(),
            r.getTimestamp("created_at").toInstant(), r.getTimestamp("updated_at").toInstant());
    private static final RowMapper<Member> MEMBER = (r, n) -> new Member(r.getObject("user_id", UUID.class), r.getString("status"),
            r.getLong("read_seq"), r.getTimestamp("joined_at").toInstant());
    private static final RowMapper<Message> MESSAGE = (r, n) -> new Message(r.getObject("id", UUID.class), r.getObject("conversation_id", UUID.class),
            r.getObject("sender_id", UUID.class), r.getObject("client_message_id", UUID.class), r.getLong("seq"), r.getString("body"), r.getTimestamp("created_at").toInstant());
    public Optional<Group> find(UUID id, boolean lock) {
        return jdbc.query("select * from group_conversations where id=:id" + (lock ? " for update" : ""), Map.of("id", id), GROUP).stream().findFirst();
    }
    public void insert(Group g) {
        jdbc.update("insert into group_conversations(id,owner_id,name,trip_id,version,last_seq,created_at,updated_at) "
                + "values(:id,:owner,:name,:trip,:version,:seq,:created,:updated)", parameters(g));
    }
    public void save(Group g) {
        jdbc.update("update group_conversations set owner_id=:owner,name=:name,trip_id=:trip,version=:version,last_seq=:seq,"
                + "archived_at=:archived,updated_at=:updated where id=:id", parameters(g));
    }
    private Map<String, Object> parameters(Group g) {
        var p = new HashMap<String, Object>(); p.put("id", g.id()); p.put("owner", g.ownerId()); p.put("name", g.name());
        p.put("trip", g.tripId()); p.put("version", g.version()); p.put("seq", g.lastSeq());
        p.put("created", Timestamp.from(g.createdAt())); p.put("updated", Timestamp.from(g.updatedAt()));
        p.put("archived", g.archivedAt() == null ? null : Timestamp.from(g.archivedAt())); return p;
    }
    public List<Group> list(UUID actor, Instant before, UUID id, int limit) {
        var p = new HashMap<String, Object>(); p.put("actor", actor); p.put("limit", limit);
        String keyset = "";
        if (before != null) { p.put("before", Timestamp.from(before)); p.put("id", id);
            keyset = " and (g.updated_at<:before or (g.updated_at=:before and g.id<:id))"; }
        return jdbc.query("select g.* from group_conversations g join group_members m on m.conversation_id=g.id "
                + "where m.user_id=:actor and m.status='ACTIVE'" + keyset + " order by g.updated_at desc,g.id desc limit :limit", p, GROUP);
    }
    public Optional<Member> member(UUID group, UUID user) {
        return jdbc.query("select * from group_members where conversation_id=:g and user_id=:u", Map.of("g", group, "u", user), MEMBER).stream().findFirst();
    }
    public List<Member> members(UUID group) {
        return jdbc.query("select * from group_members where conversation_id=:g and status='ACTIVE' order by joined_at,user_id", Map.of("g", group), MEMBER);
    }
    public void join(UUID group, UUID user, long seq, Instant now) {
        jdbc.update("insert into group_members(conversation_id,user_id,status,read_seq,joined_at) values(:g,:u,'ACTIVE',:seq,:now) "
                + "on conflict(conversation_id,user_id) do update set status='ACTIVE',read_seq=:seq,joined_at=:now,ended_at=null",
                Map.of("g", group, "u", user, "seq", seq, "now", Timestamp.from(now)));
    }
    public void end(UUID group, UUID user, String status, Instant now) {
        jdbc.update("update group_members set status=:status,ended_at=:now where conversation_id=:g and user_id=:u",
                Map.of("g", group, "u", user, "status", status, "now", Timestamp.from(now)));
    }
    public void read(UUID group, UUID user, long seq) {
        jdbc.update("update group_members set read_seq=greatest(read_seq,:seq) where conversation_id=:g and user_id=:u", Map.of("g", group, "u", user, "seq", seq));
    }
    public Optional<Message> retry(UUID group, UUID sender, UUID client) {
        return jdbc.query("select * from group_messages where conversation_id=:g and sender_id=:u and client_message_id=:client",
                Map.of("g", group, "u", sender, "client", client), MESSAGE).stream().findFirst();
    }
    public void insertMessage(Message m) {
        jdbc.update("insert into group_messages(id,conversation_id,sender_id,client_message_id,seq,body,created_at) values(:id,:g,:u,:client,:seq,:body,:now)",
                Map.of("id", m.id(), "g", m.conversationId(), "u", m.senderId(), "client", m.clientMessageId(), "seq", m.seq(), "body", m.body(), "now", Timestamp.from(m.createdAt())));
    }
    public Optional<Message> last(UUID group) {
        return jdbc.query("select * from group_messages where conversation_id=:g order by seq desc limit 1", Map.of("g", group), MESSAGE).stream().findFirst();
    }
    public long unread(UUID group, UUID actor, long readSeq) {
        return jdbc.queryForObject("select count(*) from group_messages where conversation_id=:g and seq>:seq and sender_id<>:u",
                Map.of("g", group, "seq", readSeq, "u", actor), Long.class);
    }
    public List<Message> history(UUID group, Long before, Long after, int limit) {
        var p = new HashMap<String, Object>(); p.put("g", group); p.put("limit", limit);
        String boundary = "";
        if (before != null) { p.put("seq", before); boundary = " and seq<:seq"; }
        if (after != null) { p.put("seq", after); boundary = " and seq>:seq"; }
        return jdbc.query("select * from group_messages where conversation_id=:g" + boundary
                + " order by seq " + (after == null ? "desc" : "asc") + " limit :limit", p, MESSAGE);
    }
}
