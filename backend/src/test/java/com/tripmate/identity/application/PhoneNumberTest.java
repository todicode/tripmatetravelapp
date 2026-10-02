package com.tripmate.identity.application;

import com.tripmate.shared.web.ApiException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNumberTest {
    @Test void formattingAndVietnamCountryCodeResolveToSameLookupKey() {
        assertEquals("0901234567", PhoneNumber.key("+84 901 234 567"));
        assertEquals("0901234567", PhoneNumber.key("0901-234-567"));
        assertEquals("0901234567", PhoneNumber.key("84901234567"));
    }

    @Test void rejectsMalformedPhone() {
        for (String phone : new String[]{"", "-------", "123456", "+84+901234567", "1".repeat(16)}) {
            assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class,
                    () -> PhoneNumber.key(phone)).getCode());
        }
    }
}
