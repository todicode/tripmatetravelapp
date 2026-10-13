package com.tripmate.social;

import com.tripmate.shared.web.GlobalExceptionHandler;
import com.tripmate.social.application.SocialService;
import com.tripmate.social.application.SocialService.*;
import com.tripmate.social.domain.FriendRequestStatus;
import com.tripmate.social.web.SocialController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SocialControllerTest {
    @Test void acceptsMessageAndReturnsPendingRequestEnvelope() throws Exception {
        SocialService social = mock(SocialService.class);
        UUID recipientId = UUID.randomUUID(), senderId = UUID.randomUUID(), requestId = UUID.randomUUID();
        when(social.send(recipientId, "Hello")).thenReturn(new PendingResult("PENDING", new FriendRequestView(
                requestId, new UserSummary(senderId, "Sender", null), new UserSummary(recipientId, "Recipient", null),
                "Hello", FriendRequestStatus.PENDING, Instant.parse("2026-10-02T00:00:00Z"), null)));
        var mvc = MockMvcBuilders.standaloneSetup(new SocialController(social))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/v1/friend-requests").contentType("application/json")
                        .content("{\"recipientId\":\"" + recipientId + "\",\"message\":\"Hello\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.outcome").value("PENDING"))
                .andExpect(jsonPath("$.data.request.message").value("Hello"))
                .andExpect(jsonPath("$.data.request.sender.email").doesNotExist());
        mvc.perform(post("/api/v1/friend-requests").contentType("application/json").content("{}"))
                .andExpect(status().isUnprocessableEntity());
        verify(social).send(recipientId, "Hello");
    }

    @Test void requiresDirectionForRequestList() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new SocialController(mock(SocialService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/v1/friend-requests")).andExpect(status().isBadRequest());
    }
}
