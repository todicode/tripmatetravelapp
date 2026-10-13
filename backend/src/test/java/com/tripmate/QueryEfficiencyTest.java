package com.tripmate;

import static org.junit.jupiter.api.Assertions.*;

import com.tripmate.identity.domain.UserEntity;
import com.tripmate.identity.infrastructure.UserRepository;
import com.tripmate.identity.security.AuthenticatedUser;
import com.tripmate.messaging.application.DirectMessagingService;
import com.tripmate.messaging.application.GroupMessagingService;
import com.tripmate.social.application.SocialService;
import com.tripmate.trips.api.GroupTripSharing;
import com.tripmate.trips.application.TripModels.*;
import com.tripmate.trips.application.TripService;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.*;
import java.sql.Connection;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;

import javax.sql.DataSource;

@EnabledIfEnvironmentVariable(
        named = "GROUP_TEST_DATABASE_URL",
        matches = "jdbc:postgresql://.*/tripmate_group_test")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "spring.datasource.url=${GROUP_TEST_DATABASE_URL}",
                    "spring.datasource.username=tripmate",
            "spring.datasource.password=${GROUP_TEST_DATABASE_PASSWORD}", "tripmate.email.mode=log"
        })
@Import(QueryEfficiencyTest.CountingConfiguration.class)
class QueryEfficiencyTest {
    private static final ThreadLocal<Integer> QUERIES = new ThreadLocal<>();
    @Autowired UserRepository users;
    @Autowired SocialService social;
    @Autowired DirectMessagingService direct;
    @Autowired GroupMessagingService groups;
    @Autowired TripService trips;
    @Autowired GroupTripSharing sharing;

    @TestConfiguration
    static class CountingConfiguration {
        @Bean
        static BeanPostProcessor countStatements() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String name) {
                    if (!(bean instanceof DataSource source)) return bean;
                    return new DelegatingDataSource(source) {
                        @Override
                        public Connection getConnection() throws java.sql.SQLException {
                            return counted(super.getConnection());
                        }

                        @Override
                        public Connection getConnection(String user, String password)
                                throws java.sql.SQLException {
                            return counted(super.getConnection(user, password));
                        }
                    };
                }
            };
        }
    }

    private static Connection counted(Connection connection) {
        return (Connection)
                Proxy.newProxyInstance(
                        Connection.class.getClassLoader(),
                        new Class<?>[] {Connection.class},
                        (proxy, method, args) -> {
                            if (method.getName().equals("prepareStatement")
                                    && QUERIES.get() != null) QUERIES.set(QUERIES.get() + 1);
                            try {
                                return method.invoke(connection, args);
                            } catch (InvocationTargetException error) {
                                throw error.getCause();
                            }
                        });
    }

    private <T> T withQueries(int expected, Supplier<T> action) {
        QUERIES.set(0);
        try {
            T result = action.get();
            assertEquals(
                    expected,
                    QUERIES.get(),
                    "Database statements must stay bounded by the page, not its rows");
            return result;
        } finally {
            QUERIES.remove();
        }
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
        QUERIES.remove();
    }

    @Test
    void listQueriesStayConstantAsPagesGrowAndKeepUnreadAndSenderData() {
        UUID owner = user();
        for (int index = 0; index < 10; index++) {
            UUID peer = user();
            auth(owner);
            UUID request = ((SocialService.PendingResult) social.send(peer, null)).request().id();
            auth(peer);
            social.accept(request);
            UUID conversation = direct.open(owner).id();
            direct.send(conversation, UUID.randomUUID(), "Peer message");
            auth(owner);
            UUID group = groups.create("Group " + index, List.of(peer), null).id();
            trips.create(body(1));
            auth(peer);
            groups.send(group, UUID.randomUUID(), "Group peer message");
        }
        auth(owner);
        for (int limit : List.of(2, 8)) {
            assertEquals(limit, withQueries(3, () -> social.friends(null, limit)).items().size());
            var privateChats = withQueries(5, () -> direct.list(null, limit));
            assertEquals(limit, privateChats.items().size());
            assertTrue(
                    privateChats.items().stream()
                            .allMatch(
                                    c ->
                                            c.unreadCount().equals("1")
                                                    && c.canSend()
                                                    && c.lastMessage().body().equals("Peer message")
                                                    && !c.lastMessage()
                                                            .sender()
                                                            .id()
                                                            .equals(owner)));
            var groupChats = withQueries(4, () -> groups.list(null, limit));
            assertEquals(limit, groupChats.items().size());
            assertTrue(
                    groupChats.items().stream()
                            .allMatch(
                                    c ->
                                            c.unreadCount().equals("1")
                                                    && c.memberCount() == 2
                                                    && c.lastMessage()
                                                            .body()
                                                            .equals("Group peer message")));
            assertEquals(limit, withQueries(1, () -> trips.list(null, limit)).items().size());
        }
    }

    @Test
    void sharedItineraryQueryCountDoesNotGrowWithDays() {
        UUID owner = user();
        auth(owner);
        for (int count : List.of(1, 30)) {
            Trip trip = trips.create(body(count));
            var result = withQueries(4, () -> sharing.viewOwned(trip.id(), owner));
            assertEquals(count, result.itinerary().days().size());
            assertNull(result.itinerary().days().getFirst().date());
            assertEquals("Meet", result.itinerary().days().getFirst().items().getFirst().title());
            assertNull(result.itinerary().days().getFirst().items().getFirst().startTime());
        }
    }

    private Create body(int count) {
        var days = new ArrayList<DayInput>();
        for (int day = 1; day <= count; day++)
            days.add(
                    new DayInput(
                            day,
                            "WALK",
                            null,
                            day == 1
                                    ? List.of(
                                            new ItemInput(
                                                    null, "NOTE", null, "Meet", null, null, null,
                                                    null, null))
                                    : List.of()));
        return new Create(
                UUID.randomUUID(),
                "Trip",
                "HANOI",
                null,
                "FLEXIBLE",
                count,
                null,
                null,
                null,
                days);
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        return users.saveAndFlush(
                        new UserEntity(
                                id,
                                id + "@example.test",
                                "hash",
                                "Public name",
                                null,
                                "TM-" + id.toString().substring(0, 8),
                                Instant.now()))
                .getId();
    }

    private void auth(UUID id) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                new AuthenticatedUser(id, UUID.randomUUID(), 1), null, List.of()));
    }
}
