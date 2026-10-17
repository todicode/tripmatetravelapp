package com.tripmate.messaging;

import static org.junit.jupiter.api.Assertions.*;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.web.AuthRequests.LoginRequest;
import com.tripmate.media.domain.ObjectStorage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

import javax.imageio.ImageIO;

@EnabledIfEnvironmentVariable(
        named = "MESSAGING_TEST_DATABASE_URL",
        matches = "jdbc:postgresql://.*/tripmate_messaging_test")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=${MESSAGING_TEST_DATABASE_URL}",
                    "spring.datasource.username=tripmate",
            "spring.datasource.password=${MESSAGING_TEST_DATABASE_PASSWORD}",
                    "tripmate.email.mode=log"
        })
@Import(ChatMediaPersistenceTest.StorageConfiguration.class)
class ChatMediaPersistenceTest {
    @TestConfiguration
    static class StorageConfiguration {
        @Bean
        @Primary
        ObjectStorage chatStorage() {
            return new ObjectStorage() {
                final Map<String, byte[]> files = new ConcurrentHashMap<>();

                public void put(String key, byte[] bytes) {
                    files.put(key, bytes);
                }

                public InputStream open(String key) {
                    return new ByteArrayInputStream(Objects.requireNonNull(files.get(key)));
                }

                public void delete(String key) {
                    files.remove(key);
                }
            };
        }
    }

    @Value("${local.server.port}")
    int port;

    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired IdentityService identity;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    final HttpClient http = HttpClient.newHttpClient();

    record Person(UUID id, String token) {}

    Person person() {
        UUID id = UUID.randomUUID();
        var user =
                users.saveAndFlush(
                        new UserEntity(
                                id,
                                id + "@example.test",
                                passwords.encode("ChatMedia123!"),
                                "QA " + id.toString().substring(0, 6),
                                null,
                                id.toString().substring(0, 20),
                                Instant.now()));
        return new Person(
                id,
                identity.login(
                                new LoginRequest(
                                        user.getEmail(), "ChatMedia123!", UUID.randomUUID()))
                        .accessToken());
    }

    HttpResponse<byte[]> send(String method, String path, Person person, byte[] body, String mime)
            throws Exception {
        var request =
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1" + path))
                        .header("Authorization", "Bearer " + person.token())
                        .header("Content-Type", mime)
                        .method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofByteArray(body))
                        .build();
        return http.send(request, HttpResponse.BodyHandlers.ofByteArray());
    }

    JsonNode call(String method, String path, Person person, Object body, int status)
            throws Exception {
        var result =
                send(
                        method,
                        path,
                        person,
                        body == null ? null : json.writeValueAsBytes(body),
                        "application/json");
        assertEquals(
                status,
                result.statusCode(),
                () -> new String(result.body(), StandardCharsets.UTF_8));
        return result.body().length == 0 ? null : json.readTree(result.body());
    }

    void friends(Person a, Person b) throws Exception {
        var request = call("POST", "/friend-requests", a, Map.of("recipientId", b.id()), 200);
        String id = request.path("data").path("request").path("id").asText();
        call("POST", "/friend-requests/" + id + "/accept", b, Map.of(), 200);
    }

    String direct(Person a, Person b) throws Exception {
        friends(a, b);
        return call("POST", "/direct-conversations", a, Map.of("recipientId", b.id()), 200)
                .path("data")
                .path("id")
                .asText();
    }

    String upload(Person person, String purpose) throws Exception {
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(80, 40, BufferedImage.TYPE_INT_RGB), "png", png);
        var body = new ByteArrayOutputStream();
        body.write(
                ("--chat-boundary\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\n"
                                + purpose
                                + "\r\n"
                                + "--chat-boundary\r\n"
                                + "Content-Disposition: form-data; name=\"file\";"
                                + " filename=\"photo.png\"\r\n"
                                + "Content-Type: image/png\r\n\r\n")
                        .getBytes(StandardCharsets.UTF_8));
        body.write(png.toByteArray());
        body.write("\r\n--chat-boundary--\r\n".getBytes(StandardCharsets.UTF_8));
        var response =
                send(
                        "POST",
                        "/media",
                        person,
                        body.toByteArray(),
                        "multipart/form-data; boundary=chat-boundary");
        assertEquals(201, response.statusCode());
        return json.readTree(response.body()).path("data").path("id").asText();
    }

    JsonNode group(Person owner, Person peer) throws Exception {
        friends(owner, peer);
        return call(
                        "POST",
                        "/group-conversations",
                        owner,
                        Map.of("name", "Image QA", "memberIds", List.of(peer.id())),
                        201)
                .path("data");
    }

    @Test
    void directImageIsAtomicIdempotentAndPrivateWithPreservedAspectRatio() throws Exception {
        var a = person();
        var b = person();
        var outsider = person();
        String id = direct(a, b), image = upload(a, "CHAT_IMAGE");
        var input = Map.of("clientMessageId", UUID.randomUUID(), "body", "", "mediaId", image);
        var message =
                call("POST", "/direct-conversations/" + id + "/messages", a, input, 200)
                        .path("data");
        assertEquals(image, message.path("image").path("id").asText());
        assertEquals(80, message.path("image").path("width").asInt());
        assertEquals(40, message.path("image").path("height").asInt());
        assertEquals(
                message.path("id"),
                call("POST", "/direct-conversations/" + id + "/messages", a, input, 200)
                        .path("data")
                        .path("id"));
        call(
                "POST",
                "/direct-conversations/" + id + "/messages",
                a,
                Map.of("clientMessageId", input.get("clientMessageId"), "body", "changed"),
                409);
        String path =
                "/direct-conversations/"
                        + id
                        + "/messages/"
                        + message.path("id").asText()
                        + "/image?thumbnail=false";
        var content = send("GET", path, b, null, "application/json");
        assertEquals(200, content.statusCode());
        assertEquals(
                "private, no-store", content.headers().firstValue("Cache-Control").orElseThrow());
        var decoded = ImageIO.read(new ByteArrayInputStream(content.body()));
        assertEquals(80, decoded.getWidth());
        assertEquals(40, decoded.getHeight());
        assertEquals(404, send("GET", path, outsider, null, "application/json").statusCode());
        call("DELETE", "/media/" + image, a, null, 409);
        call("PATCH", "/users/me", a, Map.of("displayName", "QA", "avatarMediaId", image), 409);
        assertEquals(
                image,
                call("GET", "/direct-conversations/" + id + "/messages", b, null, 200)
                        .path("data")
                        .path("items")
                        .get(0)
                        .path("image")
                        .path("id")
                        .asText());
    }

    @Test
    void foreignOrExpiredUploadCannotCreatePartialMessage() throws Exception {
        var a = person();
        var b = person();
        String id = direct(a, b), foreign = upload(b, "CHAT_IMAGE");
        call(
                "POST",
                "/direct-conversations/" + id + "/messages",
                a,
                Map.of("clientMessageId", UUID.randomUUID(), "body", "", "mediaId", foreign),
                404);
        String own = upload(a, "CHAT_IMAGE");
        jdbc.update(
                "UPDATE media_assets SET orphan_expires_at=now()-interval '1 second' WHERE id=?",
                UUID.fromString(own));
        call(
                "POST",
                "/direct-conversations/" + id + "/messages",
                a,
                Map.of("clientMessageId", UUID.randomUUID(), "body", "", "mediaId", own),
                409);
        call(
                "POST",
                "/direct-conversations/" + id + "/messages",
                a,
                Map.of("clientMessageId", UUID.randomUUID(), "body", ""),
                422);
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT count(*) FROM direct_messages WHERE conversation_id=?",
                        Integer.class,
                        UUID.fromString(id)));
        assertEquals(
                0L,
                jdbc.queryForObject(
                        "SELECT last_seq FROM direct_conversations WHERE id=?",
                        Long.class,
                        UUID.fromString(id)));
    }

    @Test
    void groupImagesLoseAccessOnRemovalAndCannotBeSentAfterArchive() throws Exception {
        var a = person();
        var b = person();
        var g = group(a, b);
        String id = g.path("id").asText(), image = upload(a, "CHAT_IMAGE");
        var m =
                call(
                                "POST",
                                "/group-conversations/" + id + "/messages",
                                a,
                                Map.of(
                                        "clientMessageId",
                                        UUID.randomUUID(),
                                        "body",
                                        "caption",
                                        "mediaId",
                                        image),
                                200)
                        .path("data");
        String path =
                "/group-conversations/" + id + "/messages/" + m.path("id").asText() + "/image";
        assertEquals(200, send("GET", path, b, null, "application/json").statusCode());
        call(
                "DELETE",
                "/group-conversations/"
                        + id
                        + "/members/"
                        + b.id()
                        + "?expectedVersion="
                        + g.path("version").asText(),
                a,
                null,
                204);
        assertEquals(404, send("GET", path, b, null, "application/json").statusCode());
        var current = call("GET", "/group-conversations/" + id, a, null, 200).path("data");
        call(
                "DELETE",
                "/group-conversations/"
                        + id
                        + "?expectedVersion="
                        + current.path("version").asText(),
                a,
                null,
                200);
        String unsent = upload(a, "CHAT_IMAGE");
        call(
                "POST",
                "/group-conversations/" + id + "/messages",
                a,
                Map.of("clientMessageId", UUID.randomUUID(), "body", "", "mediaId", unsent),
                409);
        assertEquals(
                "READY",
                jdbc.queryForObject(
                        "SELECT status FROM media_assets WHERE id=?",
                        String.class,
                        UUID.fromString(unsent)));
    }

    @Test
    void avatarAudienceAllowsCurrentFriendsAndGroupPeersButNotOutsidersOrOldImages()
            throws Exception {
        var a = person();
        var b = person();
        var outsider = person();
        friends(a, b);
        String image = upload(a, "AVATAR");
        call("PATCH", "/users/me", a, Map.of("displayName", "QA", "avatarMediaId", image), 200);
        assertEquals(
                200,
                send("GET", "/chat/avatars/" + image, b, null, "application/json").statusCode());
        assertEquals(
                404,
                send("GET", "/chat/avatars/" + image, outsider, null, "application/json")
                        .statusCode());
        assertEquals(
                404,
                send("GET", "/media/" + image + "/thumbnail", b, null, "application/json")
                        .statusCode());
        var g = group(a, outsider);
        String id = g.path("id").asText();
        call("DELETE", "/friends/" + outsider.id(), a, null, 204);
        assertEquals(
                200,
                send("GET", "/chat/avatars/" + image, outsider, null, "application/json")
                        .statusCode());
        call(
                "DELETE",
                "/group-conversations/"
                        + id
                        + "/members/"
                        + outsider.id()
                        + "?expectedVersion="
                        + g.path("version").asText(),
                a,
                null,
                204);
        assertEquals(
                404,
                send("GET", "/chat/avatars/" + image, outsider, null, "application/json")
                        .statusCode());
        String next = upload(a, "AVATAR");
        call("PATCH", "/users/me", a, Map.of("displayName", "QA", "avatarMediaId", next), 200);
        assertEquals(
                404,
                send("GET", "/chat/avatars/" + image, b, null, "application/json").statusCode());
    }

    @Test
    void readSnapshotIsScopedAndOneImageCannotAttachToTwoConcurrentMessages() throws Exception {
        var a = person();
        var b = person();
        var c = person();
        String first = direct(a, b), second = direct(a, c), image = upload(a, "CHAT_IMAGE");
        var pool = Executors.newFixedThreadPool(2);
        try {
            var requests =
                    List.of(first, second).stream()
                            .map(
                                    id ->
                                            pool.submit(
                                                    () ->
                                                            send(
                                                                            "POST",
                                                                            "/direct-conversations/"
                                                                                    + id
                                                                                    + "/messages",
                                                                            a,
                                                                            json.writeValueAsBytes(
                                                                                    Map.of(
                                                                                            "clientMessageId",
                                                                                            UUID
                                                                                                    .randomUUID(),
                                                                                            "body",
                                                                                            "",
                                                                                            "mediaId",
                                                                                            image)),
                                                                            "application/json")
                                                                    .statusCode()))
                            .toList();
            var statuses = new ArrayList<Integer>();
            for (var f : requests) statuses.add(f.get(15, TimeUnit.SECONDS));
            Collections.sort(statuses);
            assertEquals(List.of(200, 409), statuses);
        } finally {
            pool.shutdownNow();
        }
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT count(*) FROM chat_message_images WHERE media_id=?",
                        Integer.class,
                        UUID.fromString(image)));
        call("GET", "/direct-conversations/" + first + "/readers", c, null, 404);
        var m =
                call(
                                "POST",
                                "/direct-conversations/" + first + "/messages",
                                a,
                                Map.of("clientMessageId", UUID.randomUUID(), "body", "read me"),
                                200)
                        .path("data");
        call(
                "PUT",
                "/direct-conversations/" + first + "/read",
                b,
                Map.of("lastReadSeq", m.path("seq").asText()),
                200);
        var readers =
                call("GET", "/direct-conversations/" + first + "/readers", a, null, 200)
                        .path("data");
        for (var reader : readers)
            if (reader.path("user").path("id").asText().equals(b.id().toString()))
                assertEquals(m.path("seq").asText(), reader.path("lastReadSeq").asText());
    }
}
