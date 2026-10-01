package com.tripmate.identity.web;

import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ErrorDetailResponse;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.Map;

/** Validates the supported name-only slice before any persistence. */
public record ProfileUpdateRequest(String displayName) {
    public static ProfileUpdateRequest parse(Object body) {
        if (!(body instanceof Map<?, ?> fields)) throw invalid("body", "Hồ sơ phải là một object.");
        for (Object field : fields.keySet()) {
            if (!"displayName".equals(field)) throw invalid(String.valueOf(field), "Trường này chưa được hỗ trợ.");
        }
        if (!(fields.get("displayName") instanceof String name)) {
            throw invalid("displayName", "Tên hiển thị phải là chuỗi.");
        }
        // Match ECMAScript trim, including non-breaking spaces and the BOM.
        String normalized = name.replaceAll("^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
        if (normalized.isEmpty() || normalized.codePointCount(0, normalized.length()) > 100) {
            throw invalid("displayName", "Tên hiển thị cần từ 1 đến 100 ký tự.");
        }
        return new ProfileUpdateRequest(normalized);
    }
    private static ApiException invalid(String field, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message,
                List.of(new ErrorDetailResponse(field, "INVALID_VALUE", message)), Map.of());
    }
}
