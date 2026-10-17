package com.tripmate.messaging;

import static org.junit.jupiter.api.Assertions.*;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.*;

@EnabledIfEnvironmentVariable(
        named = "MESSAGING_TEST_DATABASE_URL",
        matches = "jdbc:postgresql://.*/tripmate_messaging_test")
class ChatImageMigrationTest {
    @Test
    void upgradeFromV10KeepsTextHistoryAndRejectsEmptyMessagesWithoutAttachments() {
        String schema = "chat_image_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        var data =
                new DriverManagerDataSource(
                        System.getenv("MESSAGING_TEST_DATABASE_URL") + "?currentSchema=" + schema,
                        "tripmate",
                        System.getenv("MESSAGING_TEST_DATABASE_PASSWORD"));
        Flyway.configure()
                .dataSource(data)
                .schemas(schema)
                .defaultSchema(schema)
                .target("10")
                .load()
                .migrate();
        var jdbc = new JdbcTemplate(data);
        var ids = new ArrayList<>(List.of(UUID.randomUUID(), UUID.randomUUID()));
        ids.sort(Comparator.comparing(UUID::toString));
        UUID low = ids.getFirst(), high = ids.getLast(), conversation = UUID.randomUUID();
        for (UUID user : ids)
            jdbc.update(
                    "INSERT INTO app_users(id,email,password_hash,display_name,friend_code) VALUES"
                            + " (?,?,'hash','Kept',?)",
                    user,
                    user + "@example.test",
                    user.toString().substring(0, 20));
        jdbc.update(
                "INSERT INTO"
                    + " direct_conversations(id,user_low_id,user_high_id,last_seq,created_at,updated_at)"
                    + " VALUES (?,?,?,1,now(),now())",
                conversation,
                low,
                high);
        jdbc.update(
                "INSERT INTO"
                    + " direct_messages(id,conversation_id,sender_id,client_message_id,seq,body,created_at)"
                    + " VALUES (?,?,?,?,1,'Original text',now())",
                UUID.randomUUID(),
                conversation,
                low,
                UUID.randomUUID());
        var latest =
                Flyway.configure().dataSource(data).schemas(schema).defaultSchema(schema).load();
        assertEquals(1, latest.migrate().migrationsExecuted);
        latest.validate();
        assertEquals(0, latest.migrate().migrationsExecuted);
        assertEquals(
                "Original text",
                jdbc.queryForObject(
                        "SELECT body FROM direct_messages WHERE conversation_id=?",
                        String.class,
                        conversation));
        assertThrows(
                org.springframework.dao.DataIntegrityViolationException.class,
                () ->
                        jdbc.update(
                                "INSERT INTO"
                                    + " direct_messages(id,conversation_id,sender_id,client_message_id,seq,body,created_at)"
                                    + " VALUES (?,?,?,?,2,'',now())",
                                UUID.randomUUID(),
                                conversation,
                                low,
                                UUID.randomUUID()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM direct_messages", Integer.class));
    }
}
