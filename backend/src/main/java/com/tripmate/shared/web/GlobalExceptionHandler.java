package com.tripmate.shared.web;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiErrorResponse> handleApiException(
            ApiException exception, HttpServletRequest request) {
        return response(
                exception.getStatus(),
                exception.getCode(),
                exception.getMessage(),
                exception.getDetails(),
                exception.getContext(),
                request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<ErrorDetailResponse> details =
                exception.getBindingResult().getFieldErrors().stream().map(this::toDetail).toList();
        return response(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "Request chứa dữ liệu không hợp lệ.",
                details,
                Map.of(),
                request);
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class
    })
    ResponseEntity<ApiErrorResponse> handleMalformedRequest(
            Exception exception, HttpServletRequest request) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof tools.jackson.databind.exc.UnrecognizedPropertyException unknown) {
                return response(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "VALIDATION_ERROR",
                        "Thuộc tính không được hỗ trợ.",
                        List.of(
                                new ErrorDetailResponse(
                                        unknown.getPropertyName(),
                                        "UNKNOWN_FIELD",
                                        "Thuộc tính không được hỗ trợ.")),
                        Map.of(),
                        request);
            }
        }
        return response(
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST",
                "Request không đúng định dạng.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException exception, HttpServletRequest request) {
        return response(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_MEDIA_TYPE",
                "Content-Type is not supported.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleUnsupportedMethod(
            HttpRequestMethodNotSupportedException exception, HttpServletRequest request) {
        var result =
                response(
                        HttpStatus.METHOD_NOT_ALLOWED,
                        "INVALID_REQUEST",
                        "HTTP method is not supported.",
                        List.of(),
                        Map.of(),
                        request);
        var headers = new HttpHeaders();
        headers.putAll(result.getHeaders());
        if (exception.getSupportedHttpMethods() != null)
            headers.setAllow(exception.getSupportedHttpMethods());
        return new ResponseEntity<>(result.getBody(), headers, result.getStatusCode());
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiErrorResponse> handleUploadSize(HttpServletRequest request) {
        return response(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "FILE_TOO_LARGE",
                "Ảnh tối đa 10 MB.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ApiErrorResponse> handleRateLimit(
            RateLimitExceededException exception, HttpServletRequest request) {
        UUID requestId = requestId(request);
        ApiErrorResponse body =
                new ApiErrorResponse(
                        requestId,
                        new ApiErrorResponse.ApiError(
                                "RATE_LIMITED",
                                "Too many requests.",
                                List.of(),
                                Map.of("retryAfterSeconds", exception.getRetryAfterSeconds())));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(RequestIdFilter.REQUEST_ID_HEADER, requestId.toString())
                .header("Retry-After", Long.toString(exception.getRetryAfterSeconds()))
                .body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiErrorResponse> handleAccessDenied(HttpServletRequest request) {
        return response(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(AuthenticationServiceException.class)
    ResponseEntity<ApiErrorResponse> handleAuthentication(
            AuthenticationServiceException exception, HttpServletRequest request) {
        return response(
                HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED",
                "Phiên đăng nhập không hợp lệ.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException exception, HttpServletRequest request) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
                return response(
                        HttpStatus.CONFLICT,
                        "DATA_CONFLICT",
                        "Dữ liệu đang xung đột.",
                        List.of(),
                        Map.of(),
                        request);
            }
        }
        // Driver messages can include submitted values; log only safe diagnostic metadata.
        log.error(
                "Unexpected integrity failure: method={}, path={}, requestId={}, type={}",
                request.getMethod(),
                request.getRequestURI(),
                requestId(request),
                exception.getClass().getName());
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Đã xảy ra lỗi không mong muốn.",
                List.of(),
                Map.of(),
                request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpected(
            Exception exception, HttpServletRequest request) {
        log.error(
                "Unhandled request failure: method={}, path={}, requestId={}",
                request.getMethod(),
                request.getRequestURI(),
                requestId(request),
                exception);
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Đã xảy ra lỗi không mong muốn.",
                List.of(),
                Map.of(),
                request);
    }

    private ErrorDetailResponse toDetail(FieldError error) {
        String code = error.getCode() == null ? "INVALID_VALUE" : error.getCode();
        String message =
                error.getDefaultMessage() == null
                        ? "Giá trị không hợp lệ."
                        : error.getDefaultMessage();
        return new ErrorDetailResponse(error.getField(), code, message);
    }

    private ResponseEntity<ApiErrorResponse> response(
            HttpStatus status,
            String code,
            String message,
            List<ErrorDetailResponse> details,
            Map<String, Object> context,
            HttpServletRequest request) {
        UUID requestId = requestId(request);
        ApiErrorResponse body =
                new ApiErrorResponse(
                        requestId, new ApiErrorResponse.ApiError(code, message, details, context));
        return ResponseEntity.status(status)
                .header(RequestIdFilter.REQUEST_ID_HEADER, requestId.toString())
                .body(body);
    }

    private UUID requestId(HttpServletRequest request) {
        return RequestIds.from(request);
    }
}
