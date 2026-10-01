package com.tripmate.identity.web;

import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ProfileUpdateRequestTest {
    @Test void normalizesNameAndCountsUnicodeCodePoints() {
        assertEquals("Nguyễn An", ProfileUpdateRequest.parse(Map.of("displayName", "\u00a0 Nguyễn An \uFEFF")).displayName());
        assertEquals("😀".repeat(100), ProfileUpdateRequest.parse(Map.of("displayName", "😀".repeat(100))).displayName());
    }
    @Test void rejectsInvalidNamesAndShapes() {
        for (Object body : List.of(Map.of(), List.of(), "An", Map.of("displayName", 123),
                Map.of("displayName", " \t\u00a0"), Map.of("displayName", "😀".repeat(101)))) {
            assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, assertThrows(ApiException.class,
                    () -> ProfileUpdateRequest.parse(body)).getStatus());
        }
        assertThrows(ApiException.class, () -> ProfileUpdateRequest.parse(null));
        Map<String, Object> nullName = new HashMap<>();
        nullName.put("displayName", null);
        assertThrows(ApiException.class, () -> ProfileUpdateRequest.parse(nullName));
    }
    @Test void rejectsUnsupportedAndUnknownFieldsEvenAlongsideValidName() {
        for (String field : List.of("interestCodes", "userId", "email")) {
            Map<String, Object> body = new HashMap<>();
            body.put("displayName", "An");
            body.put(field, null);
            ApiException error = assertThrows(ApiException.class, () -> ProfileUpdateRequest.parse(body));
            assertEquals("VALIDATION_ERROR", error.getCode());
            assertEquals(field, error.getDetails().getFirst().field());
        }
    }
}
