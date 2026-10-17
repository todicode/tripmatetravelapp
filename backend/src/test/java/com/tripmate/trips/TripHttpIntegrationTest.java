package com.tripmate.trips;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.tripmate.identity.api.AccessTokenVerifier;
import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import tools.jackson.databind.*;

import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

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
class TripHttpIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean AccessTokenVerifier tokens;
    @MockitoBean com.tripmate.trips.infrastructure.PhotonClient photon;
    UUID owner, outsider;
    final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void identities() {
        owner = user();
        outsider = user();
        for (UUID id : List.of(owner, outsider))
            when(tokens.verify(id.toString()))
                    .thenReturn(
                            new UsernamePasswordAuthenticationToken(
                                    new AuthenticatedUser(id, UUID.randomUUID(), 1),
                                    null,
                                    AuthorityUtils.NO_AUTHORITIES));
    }

    UUID user() {
        UUID id = UUID.randomUUID();
        users.saveAndFlush(
                new UserEntity(
                        id,
                        id + "@example.test",
                        "hash",
                        "Trip tester",
                        null,
                        "TM-" + id.toString().substring(0, 8),
                        Instant.now()));
        return id;
    }

    record Result(int status, JsonNode body) {
        JsonNode data() {
            return body.path("data");
        }
    }

    Result call(UUID actor, String method, String path, Object body) throws Exception {
        var request =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                        .header("Authorization", "Bearer " + actor)
                        .header("Content-Type", "application/json")
                        .method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(
                                                json.writeValueAsString(body)))
                        .build();
        var result = http.send(request, HttpResponse.BodyHandlers.ofString());
        return new Result(
                result.statusCode(),
                result.body().isEmpty() ? json.createObjectNode() : json.readTree(result.body()));
    }

    Map<String, Object> item() {
        var i = new LinkedHashMap<String, Object>();
        i.put("kind", "PLACE");
        i.put("placeId", null);
        i.put("customTitle", null);
        i.put("startTime", null);
        i.put("endTime", null);
        i.put("note", null);
        i.put("estimatedCostVnd", null);
        i.put("placeSnapshot", Map.of("name", "Điểm nhập tay", "provider", "MANUAL"));
        return i;
    }

    Map<String, Object> createBody(int count) {
        var days = new ArrayList<Object>();
        for (int day = 1; day <= count; day++)
            days.add(
                    Map.of(
                            "dayNumber",
                            day,
                            "transportMode",
                            "WALK",
                            "items",
                            day == 1 ? List.of(item()) : List.of()));
        return new LinkedHashMap<>(
                Map.of(
                        "clientRequestId",
                        UUID.randomUUID().toString(),
                        "title",
                        "Chuyến thử",
                        "cityCode",
                        "DALAT",
                        "dateMode",
                        "FLEXIBLE",
                        "durationDays",
                        count,
                        "days",
                        days));
    }

    @Test
    void persistsFlexibleTripIdempotencyAndPermissions() throws Exception {
        var body = createBody(30);
        var first = call(owner, "POST", "/trips", body);
        assertEquals(201, first.status(), first.body().toString());
        String id = first.data().path("id").asText();
        assertEquals(id, call(owner, "POST", "/trips", body).data().path("id").asText());
        body.put("title", "Changed");
        assertEquals(409, call(owner, "POST", "/trips", body).status());
        assertEquals(404, call(outsider, "GET", "/trips/" + id, null).status());
        var schedule = call(owner, "GET", "/trips/" + id + "/itinerary", null).data();
        assertEquals(30, schedule.path("days").size());
        assertTrue(schedule.path("days").get(0).path("date").isNull());
        assertEquals(
                "Điểm nhập tay",
                schedule.path("days")
                        .get(0)
                        .path("items")
                        .get(0)
                        .path("placeSnapshot")
                        .path("name")
                        .asText());
        assertEquals(
                409,
                call(
                                owner,
                                "PATCH",
                                "/trips/" + id,
                                Map.of("expectedTripVersion", "9", "title", "Stale"))
                        .status());
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                "/trips/" + id,
                                Map.of("expectedTripVersion", "0", "durationDays", 1))
                        .status());
        var deleted = call(owner, "DELETE", "/trips/" + id + "?expectedTripVersion=1", null);
        assertEquals(204, deleted.status());
        assertEquals(404, call(owner, "GET", "/trips/" + id, null).status());
    }

    @Test
    void validatesDurationDatesAndAtomicRollback() throws Exception {
        for (int count : List.of(0, 31))
            assertEquals(422, call(owner, "POST", "/trips", createBody(count)).status());
        var body = createBody(1);
        body.put("dateMode", "SPECIFIC");
        body.put("startDate", "2030-01-01");
        body.put("endDate", "2030-01-01");
        assertEquals(201, call(owner, "POST", "/trips", body).status());
        body.put("clientRequestId", UUID.randomUUID().toString());
        body.put("endDate", "2030-01-02");
        assertEquals(422, call(owner, "POST", "/trips", body).status());
        assertEquals(
                1,
                jdbc.queryForObject(
                        "select count(*) from trips where owner_id=?", Integer.class, owner));
    }

    @Test
    void progressCancellationRestorationAndStaleWrites() throws Exception {
        var created = call(owner, "POST", "/trips", createBody(1)).data();
        String path = "/trips/" + created.path("id").asText();
        String item =
                call(owner, "GET", path + "/itinerary", null)
                        .data()
                        .path("days")
                        .get(0)
                        .path("items")
                        .get(0)
                        .path("id")
                        .asText();
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + item + "/status",
                                Map.of("expectedVersion", "0", "status", "COMPLETED"))
                        .status());
        assertEquals("COMPLETED", call(owner, "GET", path, null).data().path("status").asText());
        assertEquals(
                409,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + item + "/status",
                                Map.of("expectedVersion", "0", "status", "PENDING"))
                        .status());
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                path,
                                Map.of("expectedTripVersion", "1", "status", "CANCELLED"))
                        .status());
        assertEquals(
                409,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + item + "/status",
                                Map.of("expectedVersion", "1", "status", "PENDING"))
                        .status());
        assertEquals(
                200,
                call(owner, "PATCH", path, Map.of("expectedTripVersion", "2", "status", "UPCOMING"))
                        .status());
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + item + "/status",
                                Map.of("expectedVersion", "1", "status", "PENDING"))
                        .status());
        assertEquals("UPCOMING", call(owner, "GET", path, null).data().path("status").asText());
    }

    @Test
    void concurrentCreateRetriesReturnOneTrip() throws Exception {
        var body = createBody(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> call(owner, "POST", "/trips", body));
            var b = pool.submit(() -> call(owner, "POST", "/trips", body));
            var first = a.get();
            var second = b.get();
            assertEquals(201, first.status(), first.body().toString());
            assertEquals(201, second.status());
            assertEquals(first.data().path("id"), second.data().path("id"));
        }
        assertEquals(
                1,
                jdbc.queryForObject(
                        "select count(*) from trips where owner_id=?", Integer.class, owner));
    }

    Map<String, Object> input(JsonNode i) {
        var result = new LinkedHashMap<String, Object>();
        for (String key :
                List.of(
                        "id",
                        "kind",
                        "placeId",
                        "customTitle",
                        "startTime",
                        "endTime",
                        "note",
                        "estimatedCostVnd"))
            result.put(key, i.path(key).isNull() ? null : i.path(key).asText());
        return result;
    }

    @Test
    void replacesMovesAndReordersWithStableIdentityAndRollsBackInvalidItem() throws Exception {
        String path =
                "/trips/" + call(owner, "POST", "/trips", createBody(2)).data().path("id").asText();
        var old = call(owner, "GET", path + "/itinerary", null).data();
        var item = input(old.path("days").get(0).path("items").get(0));
        List<Object> days =
                List.of(
                        Map.of("dayNumber", 1, "transportMode", "WALK", "items", List.of()),
                        Map.of(
                                "dayNumber",
                                2,
                                "transportMode",
                                "DRIVE",
                                "items",
                                List.of(item, item())));
        var result =
                call(
                        owner,
                        "PUT",
                        path + "/itinerary",
                        Map.of("expectedVersion", "0", "days", days));
        assertEquals(200, result.status(), result.body().toString());
        assertEquals(
                item.get("id"),
                result.data().path("days").get(1).path("items").get(0).path("id").asText());
        assertEquals(2, result.data().path("days").get(1).path("items").size());
        assertEquals(
                409,
                call(owner, "PATCH", path, Map.of("expectedTripVersion", "1", "durationDays", 1))
                        .status());
        assertEquals(
                409,
                call(
                                owner,
                                "PUT",
                                path + "/itinerary",
                                Map.of("expectedVersion", "0", "days", days))
                        .status());
        assertEquals(
                404,
                call(
                                outsider,
                                "PUT",
                                path + "/itinerary",
                                Map.of("expectedVersion", "1", "days", days))
                        .status());
        item.put("id", UUID.randomUUID().toString());
        assertEquals(
                422,
                call(
                                owner,
                                "PUT",
                                path + "/itinerary",
                                Map.of("expectedVersion", "1", "days", days))
                        .status());
        assertEquals(
                "1", call(owner, "GET", path + "/itinerary", null).data().path("version").asText());
    }

    @Test
    void rejectsMoreThanFiftyInvalidCoordinatesAndUnknownFields() throws Exception {
        var body = createBody(1);
        var many = new ArrayList<Object>();
        for (int i = 0; i < 51; i++) many.add(item());
        body.put("days", List.of(Map.of("dayNumber", 1, "transportMode", "WALK", "items", many)));
        assertEquals(422, call(owner, "POST", "/trips", body).status());
        body = createBody(1);
        body.put("ownerId", outsider.toString());
        assertEquals(422, call(owner, "POST", "/trips", body).status());
        body = createBody(1);
        body.put("budgetVnd", 50000);
        assertEquals(422, call(owner, "POST", "/trips", body).status());
        var invalid = item();
        invalid.put(
                "placeSnapshot",
                Map.of("name", "Invalid", "provider", "MANUAL", "lat", 91, "lng", 100));
        body = createBody(1);
        body.put(
                "days",
                List.of(
                        Map.of(
                                "dayNumber",
                                1,
                                "transportMode",
                                "WALK",
                                "items",
                                List.of(invalid))));
        assertEquals(422, call(owner, "POST", "/trips", body).status());
        assertEquals(
                0,
                jdbc.queryForObject(
                        "select count(*) from trips where owner_id=?", Integer.class, owner));
    }

    @Test
    void onlyOneActiveStopAndConcurrentVersionsHaveOneWinner() throws Exception {
        var body = createBody(1);
        body.put(
                "days",
                List.of(
                        Map.of(
                                "dayNumber",
                                1,
                                "transportMode",
                                "WALK",
                                "items",
                                List.of(item(), item()))));
        String path = "/trips/" + call(owner, "POST", "/trips", body).data().path("id").asText();
        var items =
                call(owner, "GET", path + "/itinerary", null)
                        .data()
                        .path("days")
                        .get(0)
                        .path("items");
        String a = items.get(0).path("id").asText(), b = items.get(1).path("id").asText();
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + a + "/status",
                                Map.of("expectedVersion", "0", "status", "ACTIVE"))
                        .status());
        assertEquals(
                200,
                call(
                                owner,
                                "PATCH",
                                path + "/itinerary/items/" + b + "/status",
                                Map.of("expectedVersion", "1", "status", "ACTIVE"))
                        .status());
        var changed =
                call(owner, "GET", path + "/itinerary", null)
                        .data()
                        .path("days")
                        .get(0)
                        .path("items");
        assertEquals("COMPLETED", changed.get(0).path("status").asText());
        assertEquals("ACTIVE", changed.get(1).path("status").asText());
        try (var pool = Executors.newFixedThreadPool(2)) {
            var x =
                    pool.submit(
                            () ->
                                    call(
                                            owner,
                                            "PATCH",
                                            path,
                                            Map.of("expectedTripVersion", "2", "title", "One")));
            var y =
                    pool.submit(
                            () ->
                                    call(
                                            owner,
                                            "PATCH",
                                            path,
                                            Map.of("expectedTripVersion", "2", "title", "Two")));
            assertEquals(Set.of(200, 409), Set.of(x.get().status(), y.get().status()));
        }
    }

    @Test
    void paginationIsBoundToUserAndProviderFailureIsVisible() throws Exception {
        for (int i = 0; i < 3; i++)
            assertEquals(201, call(owner, "POST", "/trips", createBody(1)).status());
        var page = call(owner, "GET", "/trips?limit=2", null).data();
        assertEquals(2, page.path("items").size());
        String cursor = page.path("pageInfo").path("nextCursor").asText();
        assertEquals(
                1,
                call(owner, "GET", "/trips?limit=2&cursor=" + cursor, null)
                        .data()
                        .path("items")
                        .size());
        assertEquals(400, call(outsider, "GET", "/trips?limit=2&cursor=" + cursor, null).status());
        when(photon.search(eq("Cafe"), any(), any(), eq(5)))
                .thenReturn(
                        List.of(
                                new com.tripmate.trips.application.TripModels.Snapshot(
                                        "Cafe", "OSM", "N:123", 11.9, 108.4, "Address")));
        var found = call(owner, "GET", "/places/search?cityCode=DALAT&q=Cafe", null);
        assertEquals(200, found.status());
        assertEquals("N:123", found.data().path("items").get(0).path("providerPlaceId").asText());
        when(photon.search(eq("Cafe"), any(), any(), eq(5)))
                .thenThrow(
                        new com.tripmate.shared.web.ApiException(
                                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                                "PLACES_UNAVAILABLE",
                                "Unavailable"));
        assertEquals(
                503, call(owner, "GET", "/places/search?cityCode=DALAT&q=Cafe", null).status());
    }

    @Test
    void groupSharingReadsFlexibleDatesButCannotReadDeletedTrip() throws Exception {
        String id = call(owner, "POST", "/trips", createBody(1)).data().path("id").asText();
        var pair = new ArrayList<>(List.of(owner, outsider));
        pair.sort(Comparator.comparing(UUID::toString));
        jdbc.update(
                "insert into friendships(user_low_id,user_high_id) values(?,?)",
                pair.get(0),
                pair.get(1));
        var group =
                call(
                        owner,
                        "POST",
                        "/group-conversations",
                        Map.of(
                                "name",
                                "Read-only sharing",
                                "memberIds",
                                List.of(outsider),
                                "tripId",
                                id));
        assertEquals(201, group.status(), group.body().toString());
        String path = "/group-conversations/" + group.data().path("id").asText() + "/trip";
        var shared = call(owner, "GET", path, null);
        assertEquals(200, shared.status(), shared.body().toString());
        assertTrue(shared.data().path("startDate").isNull());
        assertTrue(shared.data().path("itinerary").path("days").get(0).path("date").isNull());
        assertEquals(200, call(outsider, "GET", path, null).status());
        assertEquals(404, call(outsider, "GET", "/trips/" + id, null).status());
        assertEquals(
                404,
                call(
                                outsider,
                                "PATCH",
                                "/trips/" + id,
                                Map.of("expectedTripVersion", "0", "title", "Unauthorized"))
                        .status());
        assertEquals(
                204,
                call(owner, "DELETE", "/trips/" + id + "?expectedTripVersion=0", null).status());
        assertEquals(404, call(owner, "GET", path, null).status());
    }

    @Test
    void storageFailureAfterTripInsertRollsBackTripMembershipItineraryAndReceipt()
            throws Exception {
        String marker = "reject_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.execute(
                "alter table itinerary_items add constraint "
                        + marker
                        + " check(custom_title<>'"
                        + marker
                        + "')");
        try {
            var body = createBody(1);
            var stop = item();
            stop.put("customTitle", marker);
            body.put(
                    "days",
                    List.of(
                            Map.of(
                                    "dayNumber",
                                    1,
                                    "transportMode",
                                    "WALK",
                                    "items",
                                    List.of(stop))));
            assertTrue(call(owner, "POST", "/trips", body).status() >= 400);
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "select count(*) from trips where owner_id=?", Integer.class, owner));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "select count(*) from trip_members where user_id=?",
                            Integer.class,
                            owner));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "select count(*) from itineraries where updated_by=?",
                            Integer.class,
                            owner));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "select count(*) from trip_create_requests where user_id=?",
                            Integer.class,
                            owner));
        } finally {
            jdbc.execute("alter table itinerary_items drop constraint " + marker);
        }
    }
}
