package com.tripmate.identity.web;

import com.tripmate.identity.application.IdentityService;
import com.tripmate.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {
    @Test void rejectsMalformedAndInvalidBodiesBeforeCallingService() throws Exception {
        IdentityService service = mock(IdentityService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new UserController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(patch("/api/v1/users/me").contentType("application/json").content("{"))
                .andExpect(status().isBadRequest());
        for (String body : new String[]{"null", "[]", "{}", "{\"displayName\":123}",
                "{\"displayName\":\"An\",\"avatarMediaId\":null}", "{\"userId\":\"other\"}"}) {
            mvc.perform(patch("/api/v1/users/me").contentType("application/json").content(body))
                    .andExpect(status().isUnprocessableEntity());
        }
        verifyNoInteractions(service);
    }
}
