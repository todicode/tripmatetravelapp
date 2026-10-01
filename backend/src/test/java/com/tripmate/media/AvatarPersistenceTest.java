package com.tripmate.media;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.web.AuthRequests.LoginRequest;
import com.tripmate.media.application.MediaService;
import com.tripmate.media.domain.ObjectStorage;
import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "PROFILE_TEST_DATABASE_URL", matches = ".*/tripmate_profile_test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=${PROFILE_TEST_DATABASE_URL}", "spring.datasource.username=postgres", "spring.datasource.password=",
    "spring.flyway.enabled=true", "tripmate.email.mode=log", "tripmate.media.cleanup-delay-ms=3600000"
})
@Import(AvatarPersistenceTest.StorageConfiguration.class)
class AvatarPersistenceTest {
    @TestConfiguration static class StorageConfiguration {
        @Bean @Primary TestStorage avatarStorage() { return new TestStorage(); }
    }
    static class TestStorage implements ObjectStorage {
        final Map<String, byte[]> files = new ConcurrentHashMap<>();
        boolean failPut, failDelete;
        public void put(String key, byte[] bytes) {
            files.put(key, bytes);
            if (failPut) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE", "Test storage unavailable");
        }
        public InputStream open(String key) { return new ByteArrayInputStream(Objects.requireNonNull(files.get(key))); }
        public void delete(String key) { if (failDelete) throw new IllegalStateException("Test failure"); files.remove(key); }
    }
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired IdentityService identity;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired MediaService media;
    @Autowired TestStorage storage;
    private final HttpClient http = HttpClient.newHttpClient();
    private String token() {
        UUID id = UUID.randomUUID();
        var user = users.saveAndFlush(new UserEntity(id, id + "@example.test", passwords.encode("TestAvatar123!"), "Original", null, id.toString().substring(0, 20), Instant.now()));
        return identity.login(new LoginRequest(user.getEmail(), "TestAvatar123!", UUID.randomUUID())).accessToken();
    }
    private HttpResponse<byte[]> send(String method, String path, String token, byte[] body, String contentType) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1" + path));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.header("Content-Type", contentType).method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
    }
    private JsonNode call(String method, String path, String token, Object body, int status) throws Exception {
        var response = send(method, path, token, body == null ? null : json.writeValueAsBytes(body), "application/json");
        assertEquals(status, response.statusCode());
        return response.body().length == 0 ? null : json.readTree(response.body());
    }
    private String upload(String token, int status) throws Exception {
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(50, 40, BufferedImage.TYPE_INT_RGB), "png", png);
        var body = new ByteArrayOutputStream();
        body.write("--avatar-boundary\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\nAVATAR\r\n--avatar-boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"avatar.png\"\r\nContent-Type: image/png\r\n\r\n".getBytes(StandardCharsets.UTF_8));
        body.write(png.toByteArray()); body.write("\r\n--avatar-boundary--\r\n".getBytes(StandardCharsets.UTF_8));
        var response = send("POST", "/media", token, body.toByteArray(), "multipart/form-data; boundary=avatar-boundary");
        assertEquals(status, response.statusCode());
        return status == 201 ? json.readTree(response.body()).get("data").get("id").asText() : null;
    }
    @Test void uploadsAttachesReplacesAndDeletesWithOwnershipAndAtomicProfileUpdates() throws Exception {
        String owner = token(), other = token();
        String first = upload(owner, 201);
        call("GET", "/media/" + first, null, null, 401);
        call("GET", "/media/" + first, other, null, 404);
        call("PATCH", "/users/me", other, Map.of("displayName", "Should rollback", "avatarMediaId", first), 404);
        assertEquals("Original", call("GET", "/users/me", other, null, 200).get("data").get("displayName").asText());
        var attached = call("PATCH", "/users/me", owner, Map.of("displayName", "New name", "avatarMediaId", first), 200);
        assertEquals(first, attached.get("data").get("avatarMediaId").asText());
        call("PATCH", "/users/me", owner, Map.of("avatarMediaId", first), 200);
        var content = send("GET", "/media/" + first + "/thumbnail", owner, null, "application/json");
        assertEquals(200, content.statusCode()); assertNotNull(ImageIO.read(new ByteArrayInputStream(content.body())));
        assertEquals("private, no-store", content.headers().firstValue("Cache-Control").orElseThrow());
        call("DELETE", "/media/" + first, owner, null, 409);
        String next = upload(owner, 201);
        call("PATCH", "/users/me", owner, Map.of("avatarMediaId", next), 200);
        call("GET", "/media/" + first + "/content", owner, null, 410);
        Map<String, Object> remove = new HashMap<>(); remove.put("avatarMediaId", null);
        assertTrue(call("PATCH", "/users/me", owner, remove, 200).get("data").get("avatarMediaId").isNull());
        media.cleanup();
        assertEquals(0L, jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1", Long.class));
        assertTrue(storage.files.isEmpty());
    }
    @Test void retainsQuotaUntilFailedObjectsArePurgedAndRetriesCleanup() throws Exception {
        String owner = token();
        storage.failPut = true;
        try { upload(owner, 503); } finally { storage.failPut = false; }
        assertTrue(jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1", Long.class) > 0);
        storage.failDelete = true;
        try { media.cleanup(); } finally { storage.failDelete = false; }
        assertTrue(jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1", Long.class) > 0);
        media.cleanup();
        assertEquals(0L, jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1", Long.class));
        assertTrue(storage.files.isEmpty());
    }
    @Test void expiresOrphansAndEnforcesQuotaWithoutUploading() throws Exception {
        String owner = token();
        String id = upload(owner, 201);
        jdbc.update("UPDATE media_assets SET orphan_expires_at=now()-interval '1 second' WHERE id=?", UUID.fromString(id));
        call("PATCH", "/users/me", owner, Map.of("avatarMediaId", id), 409);
        media.cleanup();
        jdbc.update("UPDATE media_storage_quota SET reserved_bytes=2000000000 WHERE id=1");
        try { upload(owner, 503); } finally { jdbc.update("UPDATE media_storage_quota SET reserved_bytes=0 WHERE id=1"); }
        assertTrue(storage.files.isEmpty());
    }

    @Test void concurrentUploadsCannotExceedGlobalQuota() throws Exception {
        String owner = token();
        UUID userId = UUID.fromString(call("GET", "/users/me", owner, null, 200).get("data").get("id").asText());
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(50, 40, BufferedImage.TYPE_INT_RGB), "png", png);
        var normalized = new com.tripmate.media.application.AvatarImageProcessor().process(png.toByteArray());
        long bytes = (long) normalized.content().length + normalized.thumbnail().length;
        jdbc.update("UPDATE media_storage_quota SET reserved_bytes=? WHERE id=1", 2_000_000_000L - bytes);
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Boolean> upload = () -> {
                start.await();
                try { media.upload(userId, png.toByteArray(), "parallel.png"); return true; }
                catch (ApiException error) { assertEquals("STORAGE_QUOTA_EXCEEDED", error.getCode()); return false; }
            };
            var first = executor.submit(upload); var second = executor.submit(upload); start.countDown();
            assertNotEquals(first.get(), second.get());
            assertEquals(2_000_000_000L, jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1", Long.class));
        } finally {
            jdbc.update("UPDATE media_assets SET orphan_expires_at=now()-interval '1 second' WHERE uploader_id=? AND status='READY'", userId);
            media.cleanup();
            jdbc.update("UPDATE media_storage_quota SET reserved_bytes=0 WHERE id=1");
        }
        assertTrue(storage.files.isEmpty());
    }
}
