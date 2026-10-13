package com.tripmate.identity.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.tripmate.identity.web.AuthRequests.GoogleAuthRequest;
import com.tripmate.shared.web.ApiException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

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
class GoogleLoginPersistenceTest {
    @Autowired GoogleLoginService login;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean GoogleIdentityVerifier google;

    @Test
    void providerVerificationRunsOutsideTransactionAndSessionWritesCommitTogether() {
        String id = UUID.randomUUID().toString();
        when(google.verify(id))
                .thenAnswer(
                        call -> {
                            assertFalse(
                                    TransactionSynchronizationManager.isActualTransactionActive());
                            return new GoogleIdentityVerifier.GoogleProfile(
                                    id, id + "@example.test", true, "Google user");
                        });
        var session = login.authenticate(new GoogleAuthRequest(id, UUID.randomUUID()));
        assertNotNull(session.accessToken());
        assertEquals(
                1,
                jdbc.queryForObject(
                        "select count(*) from auth_identities where user_id=?",
                        Integer.class,
                        session.user().id()));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "select count(*) from refresh_tokens where user_id=?",
                        Integer.class,
                        session.user().id()));
        assertEquals(
                session.user().id(),
                jdbc.queryForObject(
                        "select user_id from user_devices where id=?",
                        UUID.class,
                        session.deviceId()));
    }

    @Test
    void providerFailureLeavesNoIdentityOrDeviceWrites() {
        UUID installation = UUID.randomUUID();
        when(google.verify("provider-failure"))
                .thenAnswer(
                        call -> {
                            assertFalse(
                                    TransactionSynchronizationManager.isActualTransactionActive());
                            throw new ApiException(
                                    HttpStatus.SERVICE_UNAVAILABLE,
                                    "GOOGLE_PROVIDER_UNAVAILABLE",
                                    "Unavailable");
                        });
        assertEquals(
                "GOOGLE_PROVIDER_UNAVAILABLE",
                assertThrows(
                                ApiException.class,
                                () ->
                                        login.authenticate(
                                                new GoogleAuthRequest(
                                                        "provider-failure", installation)))
                        .getCode());
        assertEquals(
                0,
                jdbc.queryForObject(
                        "select count(*) from user_devices where installation_id=?",
                        Integer.class,
                        installation));
    }
}
