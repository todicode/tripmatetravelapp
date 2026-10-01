package com.tripmate.shared.security;

import java.util.UUID;

/** Minimal authenticated identity shared by module boundaries. */
public interface AuthenticatedActor {
    UUID userId();
}
