package com.tripmate.shared.web;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<ErrorDetailResponse> details;
    private final Map<String, Object> context;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of(), Map.of());
    }

    public ApiException(HttpStatus status, String code, String message,
                        List<ErrorDetailResponse> details, Map<String, Object> context) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.context = context;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public List<ErrorDetailResponse> getDetails() {
        return details;
    }

    public Map<String, Object> getContext() {
        return context;
    }
}
