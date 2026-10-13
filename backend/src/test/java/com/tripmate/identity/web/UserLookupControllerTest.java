package com.tripmate.identity.web;

import com.tripmate.identity.application.UserLookupService;
import com.tripmate.identity.application.UserLookupService.LookupResult;
import com.tripmate.identity.application.UserLookupService.UserSummary;
import com.tripmate.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserLookupControllerTest {
    @Test void returnsLimitedProfileAndRequiresLookupParameter() throws Exception {
        UserLookupService lookup = mock(UserLookupService.class);
        UUID userId = UUID.randomUUID();
        when(lookup.byPhone("0901234567")).thenReturn(new LookupResult(
                new UserSummary(userId, "An", null), "NONE", null));
        var mvc = MockMvcBuilders.standaloneSetup(new UserLookupController(lookup))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(get("/api/v1/users/lookup-by-phone").param("phone", "0901234567"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.id").value(userId.toString()))
                .andExpect(jsonPath("$.data.user.email").doesNotExist())
                .andExpect(jsonPath("$.data.user.phone").doesNotExist());
        mvc.perform(get("/api/v1/users/lookup-by-phone")).andExpect(status().isBadRequest());
        verify(lookup).byPhone("0901234567");
    }
}
