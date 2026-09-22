package com.tripmate.identity.security;

import tools.jackson.databind.ObjectMapper;
import com.tripmate.shared.web.ApiErrorResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public SecurityErrorHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        write(response, request, 401, "UNAUTHORIZED", "Cần đăng nhập để thực hiện thao tác này.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        write(response, request, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }

    private void write(HttpServletResponse response, HttpServletRequest request, int status,
                       String code, String message) throws IOException {
        UUID requestId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE) instanceof UUID id
                ? id : UUID.randomUUID();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader(RequestIdFilter.REQUEST_ID_HEADER, requestId.toString());
        ApiErrorResponse body = new ApiErrorResponse(requestId,
                new ApiErrorResponse.ApiError(code, message, List.of(), Map.of()));
        objectMapper.writeValue(response.getWriter(), body);
    }
}
