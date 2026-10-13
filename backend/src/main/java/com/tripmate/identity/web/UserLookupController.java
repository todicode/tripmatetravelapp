package com.tripmate.identity.web;

import com.tripmate.identity.application.UserLookupService;
import com.tripmate.identity.application.UserLookupService.FriendCodeResult;
import com.tripmate.identity.application.UserLookupService.LookupResult;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserLookupController {
    private final UserLookupService lookup;

    public UserLookupController(UserLookupService lookup) { this.lookup = lookup; }

    @GetMapping("/lookup-by-phone")
    public ResponseEntity<ApiResponse<LookupResult>> byPhone(@RequestParam String phone, HttpServletRequest request) {
        return response(lookup.byPhone(phone), request);
    }

    @GetMapping("/lookup")
    public ResponseEntity<ApiResponse<LookupResult>> byFriendCode(@RequestParam String friendCode, HttpServletRequest request) {
        return response(lookup.byFriendCode(friendCode), request);
    }

    @GetMapping("/me/friend-code")
    public ResponseEntity<ApiResponse<FriendCodeResult>> ownFriendCode(HttpServletRequest request) {
        return response(lookup.ownFriendCode(), request);
    }

    private <T> ResponseEntity<ApiResponse<T>> response(T data, HttpServletRequest request) {
        Object requestId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        UUID id = requestId instanceof UUID uuid ? uuid : UUID.randomUUID();
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(new ApiResponse<>(data, id));
    }
}
