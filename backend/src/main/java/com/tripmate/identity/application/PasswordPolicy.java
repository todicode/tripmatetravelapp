package com.tripmate.identity.application;

import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;

final class PasswordPolicy {
    private PasswordPolicy() {}

    static void validate(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PASSWORD_TOO_LONG",
                    "Mật khẩu vượt quá giới hạn 72 byte UTF-8. Hãy dùng mật khẩu ngắn hơn.");
        }
    }
}
