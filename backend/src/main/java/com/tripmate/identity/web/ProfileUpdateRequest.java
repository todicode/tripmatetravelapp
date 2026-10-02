package com.tripmate.identity.web;

import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ErrorDetailResponse;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Validates supported profile fields before any persistence. */
public record ProfileUpdateRequest(String displayName, boolean hasAvatar, UUID avatarMediaId, List<String> interestCodes) {
    public static ProfileUpdateRequest parse(Object body) {
        if (!(body instanceof Map<?, ?> fields)) throw invalid("body", "Hồ sơ phải là một object.");
        for (Object field : fields.keySet()) {
            if (!"displayName".equals(field) && !"avatarMediaId".equals(field) && !"interestCodes".equals(field)) throw invalid(String.valueOf(field), "Trường này chưa được hỗ trợ.");
        }
        if (fields.isEmpty()) throw invalid("body", "Cần ít nhất một trường cập nhật.");
        List<String> codes = null;
        if (fields.containsKey("interestCodes")) {
            if (!(fields.get("interestCodes") instanceof List<?> values) || values.size() > 50) {
                throw invalid("interestCodes", "Chọn tối đa 50 sở thích bằng danh sách mã.");
            }
            var unique = new java.util.LinkedHashSet<String>();
            for (Object value : values) {
                if (!(value instanceof String code) || code.isBlank() || code.codePointCount(0, code.length()) > 32 || !unique.add(code)) {
                    throw invalid("interestCodes", "Mã sở thích phải hợp lệ và không trùng nhau.");
                }
            }
            codes = List.copyOf(unique);
        }
        boolean hasAvatar = fields.containsKey("avatarMediaId");
        UUID avatarId = null;
        if (hasAvatar && fields.get("avatarMediaId") != null) {
            Object raw = fields.get("avatarMediaId");
            if (!(raw instanceof String value) || !value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
                throw invalid("avatarMediaId", "Mã ảnh không hợp lệ.");
            }
            avatarId = UUID.fromString(value);
        }
        if (!fields.containsKey("displayName")) return new ProfileUpdateRequest(null, hasAvatar, avatarId, codes);
        if (!(fields.get("displayName") instanceof String name)) {
            throw invalid("displayName", "Tên hiển thị phải là chuỗi.");
        }
        // Match ECMAScript trim, including non-breaking spaces and the BOM.
        String normalized = name.replaceAll("^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
        if (normalized.isEmpty() || normalized.codePointCount(0, normalized.length()) > 100) {
            throw invalid("displayName", "Tên hiển thị cần từ 1 đến 100 ký tự.");
        }
        return new ProfileUpdateRequest(normalized, hasAvatar, avatarId, codes);
    }
    private static ApiException invalid(String field, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message,
                List.of(new ErrorDetailResponse(field, "INVALID_VALUE", message)), Map.of());
    }
}
