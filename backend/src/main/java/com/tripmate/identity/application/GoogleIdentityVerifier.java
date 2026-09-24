package com.tripmate.identity.application;

public interface GoogleIdentityVerifier {

    GoogleProfile verify(String idToken);

    record GoogleProfile(String subject, String email, boolean emailVerified, String displayName) {
    }
}
