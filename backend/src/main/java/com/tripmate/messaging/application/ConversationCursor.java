package com.tripmate.messaging.application;

import com.tripmate.shared.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Component
public class ConversationCursor {
    private final byte[] secret;
    public ConversationCursor(@Value("${tripmate.security.jwt-secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }
    public String encode(UUID actor, int limit, Instant time, UUID id) {
        String payload = "direct-conversations:v1:" + actor + ":" + limit + ":" + time.getEpochSecond()
                + ":" + time.getNano() + ":" + id;
        return base64(payload.getBytes(StandardCharsets.UTF_8)) + "." + base64(sign(payload));
    }
    public Position decode(String cursor, UUID actor, int limit) {
        try {
            if (cursor.length() > 2048) throw new IllegalArgumentException();
            String[] parts = cursor.split("\\.", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(sign(payload), Base64.getUrlDecoder().decode(parts[1])))
                throw new IllegalArgumentException();
            String[] fields = payload.split(":", -1);
            if (fields.length != 7 || !fields[0].equals("direct-conversations") || !fields[1].equals("v1")
                    || !fields[2].equals(actor.toString()) || Integer.parseInt(fields[3]) != limit)
                throw new IllegalArgumentException();
            return new Position(Instant.ofEpochSecond(Long.parseLong(fields[4]), Long.parseLong(fields[5])),
                    UUID.fromString(fields[6]));
        } catch (RuntimeException error) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Cursor không hợp lệ.");
        }
    }
    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException error) { throw new IllegalStateException(error); }
    }
    private String base64(byte[] bytes) { return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public record Position(Instant time, UUID id) {}
}
