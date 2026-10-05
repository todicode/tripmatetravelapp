package com.tripmate.messaging;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** An isolated schema in the dedicated test DB proves V7 -> V9 preserves old data. */
@EnabledIfEnvironmentVariable(named = "GROUP_TEST_DATABASE_URL", matches = "jdbc:postgresql://.*/tripmate_group_test")
class GroupSchemaMigrationTest {
    @Test void additiveUpgradeRetainsIdentityFriendsAndDirectChatAndCanBeRevalidated() {
        String schema = "group_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        var data = new DriverManagerDataSource(System.getenv("GROUP_TEST_DATABASE_URL") + "?currentSchema=" + schema,
                "tripmate", System.getenv("GROUP_TEST_DATABASE_PASSWORD"));
        Flyway.configure().dataSource(data).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").target("7").load().migrate();
        var jdbc = new JdbcTemplate(data);
        var ids = new ArrayList<>(List.of(UUID.randomUUID(), UUID.randomUUID())); ids.sort(Comparator.comparing(UUID::toString));
        UUID low = ids.getFirst(), high = ids.getLast(), conversation = UUID.randomUUID();
        for (UUID user : ids) jdbc.update("insert into app_users(id,email,password_hash,display_name,friend_code) values(?,?,'hash','Kept',?)",
                user, user + "@example.test", "TM-" + user.toString().substring(0, 8));
        jdbc.update("insert into friendships(user_low_id,user_high_id) values(?,?)", low, high);
        jdbc.update("insert into direct_conversations(id,user_low_id,user_high_id,last_seq,created_at,updated_at) values(?,?,?,1,now(),now())", conversation, low, high);
        jdbc.update("insert into direct_messages(id,conversation_id,sender_id,client_message_id,seq,body,created_at) values(?,?,?,?,1,'Original history',now())",
                UUID.randomUUID(), conversation, low, UUID.randomUUID());
        var latest = Flyway.configure().dataSource(data).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load();
        assertEquals(2, latest.migrate().migrationsExecuted); latest.validate(); assertEquals(0, latest.migrate().migrationsExecuted);
        assertEquals("Original history", jdbc.queryForObject("select body from direct_messages where conversation_id=?", String.class, conversation));
        assertEquals(2, jdbc.queryForObject("select count(*) from app_users", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from friendships", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from group_conversations", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from trips", Integer.class));
    }
}
