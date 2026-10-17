package com.tripmate.trips;

import static org.junit.jupiter.api.Assertions.*;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import tools.jackson.databind.*;

import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;

/** Real password login, JWT verification, HTTP and PostgreSQL; no authentication doubles. */
@EnabledIfEnvironmentVariable(
        named = "GROUP_TEST_DATABASE_URL",
        matches = "jdbc:postgresql://.*/tripmate_group_test")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=${GROUP_TEST_DATABASE_URL}",
                    "spring.datasource.username=tripmate",
            "spring.datasource.password=${GROUP_TEST_DATABASE_PASSWORD}", "tripmate.email.mode=log"
        })
class TripAuthenticatedHttpTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    final HttpClient http = HttpClient.newHttpClient();

    JsonNode call(String method, String path, String token, Object body, int expected)
            throws Exception {
        var builder =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                        .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        var response =
                http.send(
                        builder.method(
                                        method,
                                        body == null
                                                ? HttpRequest.BodyPublishers.noBody()
                                                : HttpRequest.BodyPublishers.ofString(
                                                        json.writeValueAsString(body)))
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
        assertEquals(expected, response.statusCode());
        return response.body().isEmpty()
                ? json.createObjectNode()
                : json.readTree(response.body()).path("data");
    }

    @Test
    void savesAcrossNewLoginAndKeepsAnotherAccountIsolated() throws Exception {
        UUID owner = UUID.randomUUID(), other = UUID.randomUUID();
        String password = "TripTest123!";
        for (UUID id : List.of(owner, other))
            users.saveAndFlush(
                    new UserEntity(
                            id,
                            id + "@example.test",
                            passwords.encode(password),
                            "Trip owner",
                            null,
                            "TM-" + id.toString().substring(0, 8),
                            Instant.now()));
        String token =
                call(
                                "POST",
                                "/auth/login",
                                null,
                                Map.of(
                                        "email",
                                        owner + "@example.test",
                                        "password",
                                        password,
                                        "installationId",
                                        UUID.randomUUID()),
                                200)
                        .path("accessToken")
                        .asText();
        var item = new LinkedHashMap<String, Object>();
        item.put("kind", "NOTE");
        item.put("customTitle", "Meet at station");
        item.put("placeId", null);
        item.put("startTime", null);
        item.put("endTime", null);
        item.put("note", null);
        item.put("estimatedCostVnd", null);
        var body =
                Map.of(
                        "clientRequestId",
                        UUID.randomUUID(),
                        "title",
                        "Authenticated trip",
                        "cityCode",
                        "HANOI",
                        "dateMode",
                        "FLEXIBLE",
                        "durationDays",
                        1,
                        "days",
                        List.of(
                                Map.of(
                                        "dayNumber",
                                        1,
                                        "transportMode",
                                        "WALK",
                                        "items",
                                        List.of(item))));
        String id = call("POST", "/trips", token, body, 201).path("id").asText();
        call("GET", "/trips/" + id, null, null, 401);
        String next =
                call(
                                "POST",
                                "/auth/login",
                                null,
                                Map.of(
                                        "email",
                                        owner + "@example.test",
                                        "password",
                                        password,
                                        "installationId",
                                        UUID.randomUUID()),
                                200)
                        .path("accessToken")
                        .asText();
        assertEquals(
                "Authenticated trip",
                call("GET", "/trips/" + id, next, null, 200).path("title").asText());
        assertEquals(
                "Meet at station",
                call("GET", "/trips/" + id + "/itinerary", next, null, 200)
                        .path("days")
                        .get(0)
                        .path("items")
                        .get(0)
                        .path("customTitle")
                        .asText());
        String foreign =
                call(
                                "POST",
                                "/auth/login",
                                null,
                                Map.of(
                                        "email",
                                        other + "@example.test",
                                        "password",
                                        password,
                                        "installationId",
                                        UUID.randomUUID()),
                                200)
                        .path("accessToken")
                        .asText();
        call("GET", "/trips/" + id, foreign, null, 404);
        assertEquals(0, call("GET", "/trips", foreign, null, 200).path("items").size());
    }
}
