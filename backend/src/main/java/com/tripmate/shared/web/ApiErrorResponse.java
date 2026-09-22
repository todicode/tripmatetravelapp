package com.tripmate.shared.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApiErrorResponse(UUID requestId, ApiError error) {

    public record ApiError(String code, String message, List<ErrorDetailResponse> details,
                           Map<String, Object> context) {
    }
}
