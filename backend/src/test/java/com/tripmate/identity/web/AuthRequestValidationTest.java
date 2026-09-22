package com.tripmate.identity.web;

import com.tripmate.identity.web.AuthRequests.RegisterRequest;
import com.tripmate.identity.web.AuthRequests.VerifyRegistrationRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validator = null;
    }

    @Test
    void manualRegistrationRequiresEmailPasswordNamePhoneAndInstallation() {
        RegisterRequest valid = new RegisterRequest("an@example.test", "secret-password",
                UUID.randomUUID(), "Nguyen An", "+84901234567");
        RegisterRequest invalid = new RegisterRequest("bad", "short", null, " ", "abc");

        assertTrue(validator.validate(valid).isEmpty());
        assertFalse(validator.validate(invalid).isEmpty());
    }

    @Test
    void otpMustContainExactlySixDigits() {
        VerifyRegistrationRequest valid = new VerifyRegistrationRequest(UUID.randomUUID(), "123456");
        VerifyRegistrationRequest invalid = new VerifyRegistrationRequest(UUID.randomUUID(), "12ab");

        assertTrue(validator.validate(valid).isEmpty());
        assertFalse(validator.validate(invalid).isEmpty());
    }
}
