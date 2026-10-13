package com.tripmate.shared.web;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

public final class RequestIds {
    private RequestIds() {}

    public static UUID from(HttpServletRequest request) {
        if (request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE) instanceof UUID id)
            return id;
        UUID id = UUID.randomUUID();
        request.setAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE, id);
        return id;
    }
}
