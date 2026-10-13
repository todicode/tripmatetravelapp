package com.tripmate.social.web;

import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import com.tripmate.social.application.SocialService;
import com.tripmate.social.application.SocialService.Direction;
import com.tripmate.social.application.SocialService.FriendRequestView;
import com.tripmate.social.application.SocialService.FriendshipView;
import com.tripmate.social.application.SocialService.PageResult;
import com.tripmate.social.domain.FriendRequestStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class SocialController {
    private final SocialService social;
    public SocialController(SocialService social) { this.social = social; }

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<PageResult<FriendshipView>>> friends(
            @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "20") int limit,
            HttpServletRequest request) {
        return response(social.friends(cursor, limit), request);
    }

    @DeleteMapping("/friends/{userId}")
    public ResponseEntity<Void> removeFriend(@PathVariable UUID userId, HttpServletRequest request) {
        social.removeFriend(userId);
        return ResponseEntity.noContent().header(RequestIdFilter.REQUEST_ID_HEADER, requestId(request).toString()).build();
    }

    @GetMapping("/friend-requests")
    public ResponseEntity<ApiResponse<PageResult<FriendRequestView>>> requests(
            @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "20") int limit,
            @RequestParam Direction direction, @RequestParam(defaultValue = "PENDING") FriendRequestStatus status,
            HttpServletRequest request) {
        return response(social.requests(cursor, limit, direction, status), request);
    }

    @PostMapping(value = "/friend-requests", consumes = "application/json")
    public ResponseEntity<ApiResponse<Object>> send(@Valid @RequestBody SendRequest body, HttpServletRequest request) {
        return response(social.send(body.recipientId(), body.message()), request);
    }

    @PostMapping("/friend-requests/{requestId}/accept")
    public ResponseEntity<ApiResponse<FriendRequestView>> accept(@PathVariable UUID requestId, HttpServletRequest request) {
        return response(social.accept(requestId), request);
    }

    @PostMapping("/friend-requests/{requestId}/reject")
    public ResponseEntity<ApiResponse<FriendRequestView>> reject(@PathVariable UUID requestId, HttpServletRequest request) {
        return response(social.reject(requestId), request);
    }

    @PostMapping("/friend-requests/{requestId}/cancel")
    public ResponseEntity<ApiResponse<FriendRequestView>> cancel(@PathVariable UUID requestId, HttpServletRequest request) {
        return response(social.cancel(requestId), request);
    }

    private <T> ResponseEntity<ApiResponse<T>> response(T data, HttpServletRequest request) {
        UUID requestId = requestId(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .header(RequestIdFilter.REQUEST_ID_HEADER, requestId.toString())
                .body(new ApiResponse<>(data, requestId));
    }

    private UUID requestId(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return value instanceof UUID uuid ? uuid : UUID.randomUUID();
    }

    public record SendRequest(@NotNull UUID recipientId, @Size(max = 500) String message) {}
}
