package com.tripmate.identity.application;

import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;

/** The same lookup key is used for registration, profile completion, and search. */
public final class PhoneNumber {
    private PhoneNumber() {}

    public static String key(String value) {
        if (value == null || !value.trim().matches("\\+?[0-9 ()-]{7,32}")) {
            throw invalid();
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() < 7 || digits.length() > 15) throw invalid();
        return digits.length() == 11 && digits.startsWith("84") ? "0" + digits.substring(2) : digits;
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Số điện thoại không hợp lệ.");
    }
}
