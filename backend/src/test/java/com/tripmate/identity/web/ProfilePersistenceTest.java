package com.tripmate.identity.web;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in: run only against a dedicated disposable PostgreSQL database. */
@EnabledIfEnvironmentVariable(named = "PROFILE_TEST_DATABASE_URL", matches = ".*/tripmate_profile_test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=${PROFILE_TEST_DATABASE_URL}", "spring.datasource.username=postgres",
        "spring.datasource.password=", "spring.flyway.enabled=true", "tripmate.email.mode=log",
        "tripmate.security.auth-rate-limit-per-window=100"
})
class ProfilePersistenceTest {
    @Value("${local.server.port}") private int port;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder passwords;
    @Autowired private ObjectMapper json;
    private final HttpClient http = HttpClient.newHttpClient();
    private static final String PASSWORD = "ProfileTest123!";

    private UserEntity createUser(String name) {
        UUID id = UUID.randomUUID();
        return users.saveAndFlush(new UserEntity(id, id + "@example.test", passwords.encode(PASSWORD),
                name, "+84901234567", "TM-" + id.toString().substring(0, 8), Instant.now()));
    }
    private JsonNode login(UserEntity user, UUID installation) throws Exception {
        return call("POST", "/auth/login", null, Map.of("email", user.getEmail(), "password", PASSWORD,
                "installationId", installation.toString()), 200).get("data");
    }
    private JsonNode call(String method, String path, String token, Object body, int expectedStatus) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(expectedStatus, response.statusCode());
        JsonNode result = json.readTree(response.body());
        assertEquals(response.headers().firstValue("X-Request-Id").orElseThrow(), result.get("requestId").asText());
        return result;
    }

    @Test void persistsAcrossReadsRefreshAndLoginOnAnotherInstallationWithoutChangingOtherUser() throws Exception {
        UserEntity user = createUser("An"), other = createUser("Other");
        UUID installation = UUID.randomUUID();
        JsonNode first = login(user, installation), second = login(user, UUID.randomUUID());
        String token = first.get("accessToken").asText();
        JsonNode updated = call("PATCH", "/users/me", token, Map.of("displayName", "  Nguyễn Bình  "), 200).get("data");
        assertEquals("Nguyễn Bình", updated.get("displayName").asText());
        assertEquals(user.getEmail(), updated.get("email").asText());
        assertEquals(user.getPhone(), updated.get("phone").asText());
        assertTrue(updated.get("avatarMediaId").isNull());
        assertEquals("Nguyễn Bình", users.findById(user.getId()).orElseThrow().getDisplayName());
        assertEquals("Other", users.findById(other.getId()).orElseThrow().getDisplayName());
        assertEquals("Nguyễn Bình", call("GET", "/users/me", second.get("accessToken").asText(), null, 200)
                .get("data").get("displayName").asText());
        assertEquals("Nguyễn Bình", call("POST", "/auth/refresh", null,
                Map.of("refreshToken", first.get("refreshToken").asText()), 200)
                .get("data").get("user").get("displayName").asText());
        assertEquals("Nguyễn Bình", login(user, installation).get("user").get("displayName").asText());
    }

    @Test void interestsPersistClearAndValidateAtomicallyAcrossAccounts() throws Exception {
        UserEntity user = createUser("Interests"), other = createUser("Other interests");
        String token = login(user, UUID.randomUUID()).get("accessToken").asText();
        call("GET", "/interests", null, null, 401);
        var catalog = call("GET", "/interests", token, null, 200).get("data").get("items");
        assertEquals(7, catalog.size());
        assertTrue(catalog.toString().contains("FOOD"));
        var selected = call("PATCH", "/users/me", token, Map.of("interestCodes", java.util.List.of("NATURE", "FOOD")), 200).get("data");
        assertEquals("FOOD", selected.get("interestCodes").get(0).asText());
        assertEquals(2, selected.get("interestCodes").size());
        String nextToken = login(user, UUID.randomUUID()).get("accessToken").asText();
        assertEquals(2, call("GET", "/users/me", nextToken, null, 200).get("data").get("interestCodes").size());
        assertEquals(0, call("GET", "/users/me", login(other, UUID.randomUUID()).get("accessToken").asText(), null, 200).get("data").get("interestCodes").size());
        call("PATCH", "/users/me", token, Map.of("displayName", "Renamed"), 200);
        assertEquals(2, call("GET", "/users/me", token, null, 200).get("data").get("interestCodes").size());
        var nullPayload = new java.util.HashMap<String,Object>();
        nullPayload.put("displayName", "Must not save"); nullPayload.put("interestCodes", null);
        call("PATCH", "/users/me", token, nullPayload, 422);
        for (Object codes : new Object[]{"FOOD", java.util.List.of(12), java.util.List.of(""), java.util.List.of("x".repeat(33)),
                java.util.List.of("FOOD", "FOOD"), java.util.List.of("UNKNOWN"),
                java.util.stream.IntStream.range(0,51).mapToObj(i -> "CODE" + i).toList()}) {
            var error = call("PATCH", "/users/me", token, Map.of("displayName", "Must not save", "interestCodes", codes), 422);
            assertEquals("interestCodes", error.get("error").get("details").get(0).get("field").asText());
        }
        var unchanged = call("GET", "/users/me", token, null, 200).get("data");
        assertEquals("Renamed", unchanged.get("displayName").asText());
        assertEquals(2, unchanged.get("interestCodes").size());
        // A later failure in the avatar part must not partially change name or interests.
        call("PATCH", "/users/me", token, Map.of("displayName", "Must not save", "interestCodes", java.util.List.of("CULTURE"),
                "avatarMediaId", UUID.randomUUID().toString()), 404);
        assertEquals(2, call("GET", "/users/me", token, null, 200).get("data").get("interestCodes").size());
        assertEquals(0, call("PATCH", "/users/me", token, Map.of("interestCodes", java.util.List.of()), 200).get("data").get("interestCodes").size());
        assertEquals(0, call("GET", "/users/me", nextToken, null, 200).get("data").get("interestCodes").size());
    }

    @Test void missingPhoneCanBeCompletedAndCannotBeChanged() throws Exception {
        UUID id = UUID.randomUUID();
        UserEntity user = users.saveAndFlush(new UserEntity(id, id + "@example.test", passwords.encode(PASSWORD),
                "Google user", null, "TM-" + id.toString().substring(0, 8), Instant.now()));
        String token = login(user, UUID.randomUUID()).get("accessToken").asText();
        assertTrue(call("GET", "/users/me", token, null, 200).get("data").get("phone").isNull());
        assertEquals("+84901234567", call("PATCH", "/users/me", token,
                Map.of("phone", " +84901234567 "), 200).get("data").get("phone").asText());
        assertEquals("+84901234567", users.findById(id).orElseThrow().getPhone());
        assertEquals("+84901234567", call("PATCH", "/users/me", token,
                Map.of("phone", "+84901234567"), 200).get("data").get("phone").asText());
        assertEquals("PHONE_ALREADY_SET", call("PATCH", "/users/me", token,
                Map.of("phone", "+84907654321"), 409).get("error").get("code").asText());
        assertEquals("+84901234567", login(user, UUID.randomUUID()).get("user").get("phone").asText());
    }

    @Test void rejectsInvalidWritesAtomicallyAndRequiresAuthentication() throws Exception {
        UserEntity user = createUser("Original");
        String token = login(user, UUID.randomUUID()).get("accessToken").asText();
        call("PATCH", "/users/me", null, Map.of("displayName", "Intruder"), 401);
        call("PATCH", "/users/me", "invalid", Map.of("displayName", "Intruder"), 401);
        for (Object body : new Object[]{Map.of("displayName", " "), Map.of("displayName", "😀".repeat(101)),
                Map.of("displayName", "Wrong", "interestCodes", new String[]{"UNKNOWN"}),
                Map.of("displayName", "Wrong", "userId", UUID.randomUUID().toString())}) {
            assertEquals("VALIDATION_ERROR", call("PATCH", "/users/me", token, body, 422).get("error").get("code").asText());
        }
        assertEquals("Original", users.findById(user.getId()).orElseThrow().getDisplayName());
        assertEquals("😀".repeat(100), call("PATCH", "/users/me", token,
                Map.of("displayName", "😀".repeat(100)), 200).get("data").get("displayName").asText());
    }
}
