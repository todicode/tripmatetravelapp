package com.tripmate.messaging.application;

import com.tripmate.shared.persistence.SignedCursor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Compatibility adapter for existing messaging pagination. */
@Component
public class ConversationCursor extends SignedCursor {
    public ConversationCursor(@Value("${tripmate.security.jwt-secret}") String secret) { super(secret); }
}
