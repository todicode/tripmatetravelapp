package com.tripmate.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> health(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        UUID requestId = value instanceof UUID uuid ? uuid : UUID.randomUUID();
        return ResponseEntity.ok(new ApiResponse<>(Map.of(
                "status", "UP",
                "contractVersion", "1.1.0"), requestId));
    }
}
