package com.tripmate.identity.infrastructure;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.tripmate.identity.application.GoogleIdentityVerifier;
import com.tripmate.shared.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GoogleApiIdentityVerifier implements GoogleIdentityVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleApiIdentityVerifier(@Value("${tripmate.google.web-client-id:}") String webClientId) {
        if (webClientId == null || webClientId.isBlank()) {
            verifier = null;
        } else {
            verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(List.of(webClientId))
                    .build();
        }
    }

    @Override
    public GoogleProfile verify(String idToken) {
        if (verifier == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_NOT_CONFIGURED",
                    "Đăng nhập Google chưa được cấu hình.");
        }
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null || token.getPayload().getSubject() == null) {
                throw invalidToken();
            }
            GoogleIdToken.Payload payload = token.getPayload();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            if (!emailVerified || payload.getEmail() == null || payload.getEmail().isBlank()) {
                throw invalidToken();
            }
            String displayName = payload.get("name") instanceof String name && !name.isBlank()
                    ? name : payload.getEmail().split("@", 2)[0];
            return new GoogleProfile(payload.getSubject(), payload.getEmail(), true, displayName);
        } catch (ApiException exception) {
            throw exception;
        } catch (java.io.IOException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_PROVIDER_UNAVAILABLE",
                    "Google provider is temporarily unavailable.");
        } catch (Exception exception) {
            throw invalidToken();
        }
    }

    private ApiException invalidToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN",
                "Google token không hợp lệ hoặc đã hết hạn.");
    }
}
