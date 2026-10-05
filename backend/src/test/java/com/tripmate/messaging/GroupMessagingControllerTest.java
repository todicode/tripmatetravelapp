package com.tripmate.messaging;

import com.tripmate.messaging.application.GroupMessagingService;
import com.tripmate.messaging.application.GroupMessagingService.*;
import com.tripmate.messaging.web.GroupMessagingController;
import com.tripmate.shared.web.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GroupMessagingControllerTest {
    private final GroupMessagingService groups = mock(GroupMessagingService.class);
    private final UUID id = UUID.randomUUID(), owner = UUID.randomUUID(), peer = UUID.randomUUID();
    private final String path = "/api/v1/group-conversations/" + id;
    private final org.springframework.test.web.servlet.MockMvc mvc = MockMvcBuilders.standaloneSetup(new GroupMessagingController(groups))
            .setControllerAdvice(new GlobalExceptionHandler()).addFilters(new RequestIdFilter()).build();
    private GroupView group() { return new GroupView(id, "Team", owner, null, "0", 2, null, "0", "0", "0", false, true, Instant.now(), Instant.now()); }
    @Test void createListDetailAndMembersUseEnvelopesAndPrivateHeaders() throws Exception {
        when(groups.create("Team", List.of(peer), null)).thenReturn(group());
        mvc.perform(post("/api/v1/group-conversations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Team\",\"memberIds\":[\"" + peer + "\"]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.tripId").isEmpty())
                .andExpect(jsonPath("$.data.version").value("0")).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().exists("X-Request-Id"));
        when(groups.list(null, 20)).thenReturn(new GroupPage(List.of(group()), new PageInfo(null, false)));
        mvc.perform(get("/api/v1/group-conversations")).andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].id").value(id.toString()));
        when(groups.get(id)).thenReturn(group()); mvc.perform(get(path)).andExpect(status().isOk());
        when(groups.members(id)).thenReturn(List.of(new MemberView(new UserSummary(peer, "Peer", null), "MEMBER", "0", Instant.now())));
        mvc.perform(get(path + "/members")).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].role").value("MEMBER"));
    }
    @Test void patchDistinguishesOmittedTripFromNullAndRejectsForgedFields() throws Exception {
        when(groups.update(any(), any(), any(), anyBoolean(), any())).thenReturn(group());
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersion\":\"0\",\"name\":\"Renamed\"}"))
                .andExpect(status().isOk()); verify(groups).update(id, "0", "Renamed", false, null);
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersion\":\"0\",\"tripId\":null}"))
                .andExpect(status().isOk()); verify(groups).update(id, "0", null, true, null);
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersion\":\"0\",\"ownerId\":\"" + peer + "\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersion\":0,\"name\":\"Name\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(patch(path).contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersion\":\"0\",\"tripId\":\"bad\"}"))
                .andExpect(status().isUnprocessableEntity());
    }
    @Test void managementAndStaticLeaveRouteReachCorrectMethods() throws Exception {
        mvc.perform(post(path + "/members").contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"" + peer + "\",\"expectedVersion\":\"0\"}"))
                .andExpect(status().isOk()); verify(groups).add(id, peer, "0");
        mvc.perform(delete(path + "/members/" + peer).param("expectedVersion", "0"))
                .andExpect(status().isNoContent()).andExpect(content().string("")); verify(groups).remove(id, peer, "0");
        mvc.perform(delete(path + "/members/me")).andExpect(status().isNoContent()); verify(groups).leave(id);
        mvc.perform(put(path + "/owner").contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"" + peer + "\",\"expectedVersion\":\"1\"}"))
                .andExpect(status().isOk()); verify(groups).transfer(id, peer, "1");
        mvc.perform(delete(path).param("expectedVersion", "2")).andExpect(status().isOk()); verify(groups).archive(id, "2");
        mvc.perform(get(path + "/trip")).andExpect(status().isOk()); verify(groups).trip(id);
    }
    @Test void historySendAndReadPreserveBodyAndBigintStringsAndValidateTypes() throws Exception {
        UUID client = UUID.randomUUID();
        when(groups.history(id, null, "9007199254740993", 50)).thenReturn(new MessagePage(List.of(), new MessagePageInfo(false, null, "9007199254740993")));
        mvc.perform(get(path + "/messages").param("afterSeq", "9007199254740993"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.pageInfo.nextAfterSeq").value("9007199254740993"));
        mvc.perform(post(path + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"clientMessageId\":\"" + client + "\",\"body\":\"  hello\\n\"}"))
                .andExpect(status().isOk()); verify(groups).send(id, client, "  hello\n");
        mvc.perform(put(path + "/read").contentType(MediaType.APPLICATION_JSON).content("{\"lastReadSeq\":\"1\"}"))
                .andExpect(status().isOk()); verify(groups).read(id, "1");
        mvc.perform(put(path + "/read").contentType(MediaType.APPLICATION_JSON).content("{\"lastReadSeq\":1}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post(path + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"clientMessageId\":\"" + client + "\",\"body\":5}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/group-conversations").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Team\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/group-conversations").contentType(MediaType.APPLICATION_JSON).content("{\"name\":5,\"memberIds\":[]}"))
                .andExpect(status().isUnprocessableEntity());
    }
}
