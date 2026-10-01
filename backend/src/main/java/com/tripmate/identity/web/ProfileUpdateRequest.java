package com.tripmate.identity.web;

import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ErrorDetailResponse;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Validates supported profile fields before any persistence. */
public record ProfileUpdateRequest(String displayName, boolean hasAvatar, UUID avatarMediaId) {
    public static ProfileUpdateRequest parse(Object body) {
        if (!(body instanceof Map<?, ?> fields)) throw invalid("body", "Hồ sơ phải là một object.");
        for (Object field : fields.keySet()) {
            if (!"displayName".equals(field) && !"avatarMediaId".equals(field)) throw invalid(String.valueOf(field), "Trường này chưa được hỗ trợ.");
        }
        if (fields.isEmpty()) throw invalid("body", "Cần ít nhất một trường cập nhật.");
        boolean hasAvatar = fields.containsKey("avatarMediaId");
        UUID avatarId = null;
        if (hasAvatar && fields.get("avatarMediaId") != null) {
            Object raw = fields.get("avatarMediaId");
            if (!(raw instanceof String value) || !value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
                throw invalid("avatarMediaId", "Mã ảnh không hợp lệ.");
            }
            avatarId = UUID.fromString(value);
        }
        if (!fields.containsKey("displayName")) return new ProfileUpdateRequest(null, hasAvatar, avatarId);
        if (!(fields.get("displayName") instanceof String name)) {
            throw invalid("displayName", "Tên hiển thị phải là chuỗi.");
        }
        // Match ECMAScript trim, including non-breaking spaces and the BOM.
        String normalized = name.replaceAll("^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
        if (normalized.isEmpty() || normalized.codePointCount(0, normalized.length()) > 100) {
            throw invalid("displayName", "Tên hiển thị cần từ 1 đến 100 ký tự.");
        }
        return new ProfileUpdateRequest(normalized, hasAvatar, avatarId);
    }
    private static ApiException invalid(String field, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message,
                List.of(new ErrorDetailResponse(field, "INVALID_VALUE", message)), Map.of());
    }
}
