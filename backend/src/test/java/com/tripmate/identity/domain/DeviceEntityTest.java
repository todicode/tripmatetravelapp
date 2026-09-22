package com.tripmate.identity.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

class DeviceEntityTest {

    @Test
    void firstBindingKeepsInitialVersionAndSameUserIsIdempotent() {
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        UserEntity user = user("one@example.test");

        device.bind(user);
        device.bind(user);

        assertEquals(1L, device.getBindingVersion());
        assertEquals(user, device.getUser());
    }

    @Test
    void rebindingOrUnbindingInvalidatesExistingTokens() {
        DeviceEntity device = new DeviceEntity(UUID.randomUUID(), UUID.randomUUID());
        UserEntity first = user("one@example.test");
        UserEntity second = user("two@example.test");

        device.bind(first);
        device.bind(second);
        assertEquals(2L, device.getBindingVersion());

        device.unbind();
        assertEquals(3L, device.getBindingVersion());
        assertNull(device.getUser());
        assertFalse(device.isPushEnabled());
    }

    private static UserEntity user(String email) {
        return new UserEntity(UUID.randomUUID(), email, "hash", "Name", "+84901234567", "TM-TEST", Instant.now());
    }
}
