package com.tripmate.messaging.web;

import com.tripmate.messaging.application.GroupMessagingService;
import com.tripmate.messaging.application.GroupMessagingService.*;
import com.tripmate.shared.web.*;
import com.tripmate.trips.api.GroupTripSharing;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/group-conversations")
public class GroupMessagingController {
    private final GroupMessagingService groups;
    public GroupMessagingController(GroupMessagingService groups) { this.groups = groups; }
    @PostMapping(consumes = "application/json")
    public ResponseEntity<ApiResponse<GroupView>> create(@Valid @RequestBody CreateRequest body, HttpServletRequest request) {
        return response(groups.create(string(body.name(), "name"), body.memberIds(), body.tripId()), request, HttpStatus.CREATED);
    }
    @GetMapping public ResponseEntity<ApiResponse<GroupPage>> list(@RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit, HttpServletRequest request) {
        return ok(groups.list(cursor, limit), request);
    }
    @GetMapping("/{id}") public ResponseEntity<ApiResponse<GroupView>> get(@PathVariable UUID id, HttpServletRequest request) {
        return ok(groups.get(id), request);
    }
    @PatchMapping(value = "/{id}", consumes = "application/json")
    public ResponseEntity<ApiResponse<GroupView>> update(@PathVariable UUID id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        if (!Set.of("expectedVersion", "name", "tripId").containsAll(body.keySet())) throw invalid("Thuộc tính không được hỗ trợ.");
        String name = body.containsKey("name") ? string(body.get("name"), "name") : null;
        UUID trip = null;
        if (body.get("tripId") != null) {
            try { trip = UUID.fromString(string(body.get("tripId"), "tripId")); }
            catch (IllegalArgumentException error) { throw invalid("tripId phải là UUID hoặc null."); }
        }
        return ok(groups.update(id, string(body.get("expectedVersion"), "expectedVersion"), name, body.containsKey("tripId"), trip), request);
    }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<GroupView>> archive(@PathVariable UUID id,
            @RequestParam String expectedVersion, HttpServletRequest request) { return ok(groups.archive(id, expectedVersion), request); }
    @GetMapping("/{id}/members") public ResponseEntity<ApiResponse<List<MemberView>>> members(@PathVariable UUID id, HttpServletRequest request) {
        return ok(groups.members(id), request);
    }
    @PostMapping(value = "/{id}/members", consumes = "application/json")
    public ResponseEntity<ApiResponse<MemberView>> add(@PathVariable UUID id, @Valid @RequestBody MemberRequest body, HttpServletRequest request) {
        return ok(groups.add(id, body.userId(), string(body.expectedVersion(), "expectedVersion")), request);
    }
    @DeleteMapping("/{id}/members/{userId}") public ResponseEntity<Void> remove(@PathVariable UUID id, @PathVariable UUID userId,
            @RequestParam String expectedVersion, HttpServletRequest request) {
        groups.remove(id, userId, expectedVersion); return noContent(request);
    }
    @DeleteMapping("/{id}/members/me") public ResponseEntity<Void> leave(@PathVariable UUID id, HttpServletRequest request) {
        groups.leave(id); return noContent(request);
    }
    @PutMapping(value = "/{id}/owner", consumes = "application/json")
    public ResponseEntity<ApiResponse<GroupView>> transfer(@PathVariable UUID id, @Valid @RequestBody MemberRequest body, HttpServletRequest request) {
        return ok(groups.transfer(id, body.userId(), string(body.expectedVersion(), "expectedVersion")), request);
    }
    @GetMapping("/{id}/trip") public ResponseEntity<ApiResponse<GroupTripSharing.TripView>> trip(@PathVariable UUID id, HttpServletRequest request) {
        return ok(groups.trip(id), request);
    }
    @GetMapping("/{id}/messages") public ResponseEntity<ApiResponse<MessagePage>> history(@PathVariable UUID id,
            @RequestParam(required = false) String beforeSeq, @RequestParam(required = false) String afterSeq,
            @RequestParam(defaultValue = "50") int limit, HttpServletRequest request) {
        return ok(groups.history(id, beforeSeq, afterSeq, limit), request);
    }
    @PostMapping(value = "/{id}/messages", consumes = "application/json")
    public ResponseEntity<ApiResponse<MessageView>> send(@PathVariable UUID id, @Valid @RequestBody SendRequest body, HttpServletRequest request) {
        return ok(groups.send(id, body.clientMessageId(), string(body.body(), "body")), request);
    }
    @PutMapping(value = "/{id}/read", consumes = "application/json")
    public ResponseEntity<ApiResponse<ReadView>> read(@PathVariable UUID id, @Valid @RequestBody ReadRequest body, HttpServletRequest request) {
        return ok(groups.read(id, string(body.lastReadSeq(), "lastReadSeq")), request);
    }
    private String string(Object value, String field) { if (!(value instanceof String text)) throw invalid(field + " phải là chuỗi."); return text; }
    private ApiException invalid(String message) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message); }
    private UUID requestId(HttpServletRequest request) {
        Object id = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE); return id instanceof UUID uuid ? uuid : UUID.randomUUID();
    }
    private <T> ResponseEntity<ApiResponse<T>> ok(T data, HttpServletRequest request) { return response(data, request, HttpStatus.OK); }
    private <T> ResponseEntity<ApiResponse<T>> response(T data, HttpServletRequest request, HttpStatus status) {
        UUID id = requestId(request); return ResponseEntity.status(status).header("Cache-Control", "private, no-store")
                .header(RequestIdFilter.REQUEST_ID_HEADER, id.toString()).body(new ApiResponse<>(data, id));
    }
    private ResponseEntity<Void> noContent(HttpServletRequest request) { return ResponseEntity.noContent().header("Cache-Control", "private, no-store")
            .header(RequestIdFilter.REQUEST_ID_HEADER, requestId(request).toString()).build(); }
    public record CreateRequest(@NotNull Object name, @NotNull List<@NotNull UUID> memberIds, UUID tripId) {}
    public record MemberRequest(@NotNull UUID userId, @NotNull Object expectedVersion) {}
    public record SendRequest(@NotNull UUID clientMessageId, @NotNull Object body) {}
    public record ReadRequest(@NotNull Object lastReadSeq) {}
}
