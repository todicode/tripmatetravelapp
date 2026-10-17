package com.tripmate.shared.web;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;

class GlobalExceptionHandlerTest {
    @RestController
    static class Failures {
        @GetMapping("/duplicate")
        void duplicate() {
            throw new DataIntegrityViolationException(
                    "hidden", new SQLException("secret value", "23505"));
        }

        @GetMapping("/invalid")
        void invalid() {
            throw new DataIntegrityViolationException(
                    "hidden", new SQLException("secret value", "23514"));
        }
    }

    @Test
    void unsupportedMethodsReturn405WithAllowAndAnErrorEnvelope() throws Exception {
        var mvc =
                MockMvcBuilders.standaloneSetup(new HealthController())
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        mvc.perform(post("/api/v1/health"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "GET"))
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"))
                .andExpect(
                        result ->
                                assertEquals(
                                        result.getResponse().getHeader("X-Request-Id"),
                                        tools.jackson.databind.json.JsonMapper.builder()
                                                .build()
                                                .readTree(result.getResponse().getContentAsString())
                                                .path("requestId")
                                                .asText()));
    }

    @Test
    void onlyUniqueViolationsAreReportedAsConflicts() throws Exception {
        var mvc =
                MockMvcBuilders.standaloneSetup(new Failures())
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        mvc.perform(get("/duplicate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("DATA_CONFLICT"));
        mvc.perform(get("/invalid"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(
                        content()
                                .string(
                                        org.hamcrest.Matchers.not(
                                                org.hamcrest.Matchers.containsString(
                                                        "secret value"))));
    }
}
