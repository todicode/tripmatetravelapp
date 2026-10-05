package com.tripmate.messaging;

import com.tripmate.messaging.application.DirectMessagingService;
import com.tripmate.messaging.application.DirectMessagingService.*;
import com.tripmate.messaging.web.DirectMessagingController;
import com.tripmate.shared.web.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DirectMessagingControllerTest {
    private final DirectMessagingService service = mock(DirectMessagingService.class);
    private final UUID conversation = UUID.randomUUID(), clientId = UUID.randomUUID(), recipient = UUID.randomUUID();
    private final org.springframework.test.web.servlet.MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new DirectMessagingController(service, org.mockito.Mockito.mock(com.tripmate.messaging.web.DirectPresence.class))).setControllerAdvice(new GlobalExceptionHandler())
            .addFilters(new RequestIdFilter()).build();

    @Test void exposesAllFiveRoutesWithStandardEnvelopeAndPrivateHeaders() throws Exception {
        var user = new UserSummary(recipient, "Recipient", null);
        var message = new MessageView(UUID.randomUUID(), conversation, "9007199254740993", user, clientId, " hello ", Instant.now());
        var view = new ConversationView(conversation, user, message, "9007199254740993", "0", "1", true, Instant.now(), Instant.now());
        when(service.open(recipient)).thenReturn(view);
        when(service.list(null, 20)).thenReturn(new ConversationPage(List.of(view), new PageInfo(null, false)));
        when(service.send(conversation, clientId, " hello ")).thenReturn(message);
        when(service.history(conversation, null, null, 50)).thenReturn(new MessagePage(List.of(message), new MessagePageInfo(false, "9007199254740993", "9007199254740993")));
        when(service.markRead(conversation, "9007199254740993")).thenReturn(new ReadView(conversation, "9007199254740993", "0"));
        mvc.perform(post("/api/v1/direct-conversations").contentType("application/json")
                .content("{\"recipientId\":\"" + recipient + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(conversation.toString()));
        mvc.perform(get("/api/v1/direct-conversations"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].unreadCount").value("1"));
        mvc.perform(post("/api/v1/direct-conversations/{id}/messages", conversation).contentType("application/json")
                .content("{\"clientMessageId\":\"" + clientId + "\",\"body\":\" hello \"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().exists("X-Request-Id")).andExpect(jsonPath("$.requestId").isString())
                .andExpect(jsonPath("$.data.body").value(" hello "))
                .andExpect(jsonPath("$.data.seq").value("9007199254740993"))
                .andExpect(jsonPath("$.data.sender.email").doesNotExist());
        mvc.perform(get("/api/v1/direct-conversations/{id}/messages", conversation))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].seq").isString());
        mvc.perform(put("/api/v1/direct-conversations/{id}/read", conversation).contentType("application/json")
                .content("{\"lastReadSeq\":\"9007199254740993\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.lastReadSeq").isString());
    }
    @Test void rejectsMissingNullAndWrongTypedBodiesBeforeService() throws Exception {
        mvc.perform(post("/api/v1/direct-conversations").contentType("application/json").content("{}"))
                .andExpect(status().isUnprocessableEntity());
        for (String body : List.of("{}", "{\"clientMessageId\":\"" + clientId + "\",\"body\":null}",
                "{\"clientMessageId\":\"" + clientId + "\",\"body\":123}"))
            mvc.perform(post("/api/v1/direct-conversations/{id}/messages", conversation).contentType("application/json").content(body))
                    .andExpect(status().isUnprocessableEntity());
        for (String body : List.of("{}", "{\"lastReadSeq\":null}", "{\"lastReadSeq\":1}", "{\"lastReadSeq\":true}"))
            mvc.perform(put("/api/v1/direct-conversations/{id}/read", conversation).contentType("application/json").content(body))
                    .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }
    @Test void forwardsPaginationAndBusinessErrors() throws Exception {
        when(service.history(conversation, "10", null, 2)).thenReturn(new MessagePage(List.of(), new MessagePageInfo(false, null, "0")));
        mvc.perform(get("/api/v1/direct-conversations/{id}/messages", conversation).param("beforeSeq", "10").param("limit", "2"))
                .andExpect(status().isOk());
        verify(service).history(conversation, "10", null, 2);
        when(service.send(eq(conversation), any(), any())).thenThrow(new ApiException(HttpStatus.FORBIDDEN, "NOT_FRIENDS", "Not friends"));
        mvc.perform(post("/api/v1/direct-conversations/{id}/messages", conversation).contentType("application/json")
                .content("{\"clientMessageId\":\"" + clientId + "\",\"body\":\"hello\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("NOT_FRIENDS"));
        mvc.perform(get("/api/v1/direct-conversations/{id}/messages", conversation).param("limit", "wrong"))
                .andExpect(status().isBadRequest());
    }
}
