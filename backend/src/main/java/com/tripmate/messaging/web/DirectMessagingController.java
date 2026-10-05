package com.tripmate.messaging.web;

import com.tripmate.messaging.application.DirectMessagingService;
import com.tripmate.messaging.application.DirectMessagingService.*;
import com.tripmate.shared.web.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/direct-conversations")
public class DirectMessagingController {
    private final DirectMessagingService messaging;
    private final DirectPresence presence;
    public DirectMessagingController(DirectMessagingService messaging, DirectPresence presence) { this.messaging = messaging; this.presence = presence; }

    @GetMapping("/presence")
    public ResponseEntity<ApiResponse<java.util.List<DirectPresence.Status>>> presence(HttpServletRequest request) {
        return response(presence.snapshot(), request);
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<ApiResponse<ConversationView>> open(@Valid @RequestBody OpenRequest body, HttpServletRequest request) {
        return response(messaging.open(body.recipientId()), request);
    }
    @GetMapping
    public ResponseEntity<ApiResponse<ConversationPage>> list(@RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit, HttpServletRequest request) {
        return response(messaging.list(cursor, limit), request);
    }
    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<MessagePage>> history(@PathVariable UUID id,
            @RequestParam(required = false) String beforeSeq, @RequestParam(required = false) String afterSeq,
            @RequestParam(defaultValue = "50") int limit, HttpServletRequest request) {
        return response(messaging.history(id, beforeSeq, afterSeq, limit), request);
    }
    @PostMapping(value = "/{id}/messages", consumes = "application/json")
    public ResponseEntity<ApiResponse<MessageView>> send(@PathVariable UUID id,
            @Valid @RequestBody SendRequest body, HttpServletRequest request) {
        return response(messaging.send(id, body.clientMessageId(), string(body.body(), "body")), request);
    }
    @PutMapping(value = "/{id}/read", consumes = "application/json")
    public ResponseEntity<ApiResponse<ReadView>> read(@PathVariable UUID id,
            @Valid @RequestBody ReadRequest body, HttpServletRequest request) {
        return response(messaging.markRead(id, string(body.lastReadSeq(), "lastReadSeq")), request);
    }
    private String string(Object value, String field) {
        if (!(value instanceof String text))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", field + " phải là chuỗi.");
        return text;
    }
    private <T> ResponseEntity<ApiResponse<T>> response(T data, HttpServletRequest request) {
        Object attribute = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        UUID id = attribute instanceof UUID value ? value : UUID.randomUUID();
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .header(RequestIdFilter.REQUEST_ID_HEADER, id.toString()).body(new ApiResponse<>(data, id));
    }
    public record OpenRequest(@NotNull UUID recipientId) {}
    public record SendRequest(@NotNull UUID clientMessageId, @NotNull Object body) {}
    public record ReadRequest(@NotNull Object lastReadSeq) {}
}
