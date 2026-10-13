package com.tripmate.identity.application;

import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyTest {
    @Test
    void acceptsBcryptBoundaryIncludingVietnamese() {
        String password = "ệ".repeat(24);
        assertDoesNotThrow(() -> PasswordPolicy.validate(password));
        var encoder = new BCryptPasswordEncoder(4);
        assertTrue(encoder.matches(password, encoder.encode(password)));
        assertDoesNotThrow(() -> PasswordPolicy.validate("a".repeat(72)));
    }

    @Test
    void rejectsPasswordsExceedingUtf8ByteLimit() {
        for (String password : new String[]{"a".repeat(73), "ệ".repeat(25)}) {
            assertEquals("PASSWORD_TOO_LONG", assertThrows(ApiException.class,
                    () -> PasswordPolicy.validate(password)).getCode());
        }
    }
}
