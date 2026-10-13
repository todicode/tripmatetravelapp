package com.tripmate.identity.application;

import com.tripmate.identity.web.AuthRequests.GoogleAuthRequest;
import com.tripmate.identity.web.AuthResponses.SessionResponse;

import org.springframework.stereotype.Service;

@Service
public class GoogleLoginService {
    private final GoogleIdentityVerifier google;
    private final IdentityService identity;

    public GoogleLoginService(GoogleIdentityVerifier google, IdentityService identity) {
        this.google = google;
        this.identity = identity;
    }

    public SessionResponse authenticate(GoogleAuthRequest request) {
        // Certificate retrieval can perform network I/O before the database transaction begins.
        var profile = google.verify(request.idToken());
        return identity.completeGoogleLogin(request.installationId(), profile);
    }
}
