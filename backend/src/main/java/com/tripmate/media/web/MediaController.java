package com.tripmate.media.web;

import com.tripmate.media.application.MediaService;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {
    private final MediaService service;
    public MediaController(MediaService service) { this.service = service; }
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<MediaService.MediaView>> upload(MultipartHttpServletRequest request, Authentication authentication) throws IOException {
        UUID actor = actor(authentication);
        if (!"AVATAR".equals(request.getParameter("purpose")) || request.getParameterValues("purpose").length != 1
                || request.getParameterMap().keySet().stream().anyMatch(key -> !key.equals("purpose"))
                || request.getMultiFileMap().size() != 1 || request.getFiles("file").size() != 1) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Cần đúng một file và purpose=AVATAR.",
                    java.util.List.of(new com.tripmate.shared.web.ErrorDetailResponse("file", "INVALID_VALUE", "Không hỗ trợ scope hoặc field được gửi.")), java.util.Map.of());
        }
        var file = request.getFiles("file").getFirst();
        if (file.getSize() > 10_000_000) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Ảnh tối đa 10 MB.");
        return ResponseEntity.status(201).header("Cache-Control", "private, no-store")
                .body(new ApiResponse<>(service.upload(actor, file.getBytes(), file.getOriginalFilename()), requestId(request)));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaService.MediaView>> metadata(@PathVariable UUID id, Authentication auth, HttpServletRequest request) {
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(new ApiResponse<>(service.metadata(id, actor(auth)), requestId(request)));
    }
    @GetMapping({"/{id}/content", "/{id}/thumbnail"})
    public ResponseEntity<InputStreamResource> content(@PathVariable UUID id, Authentication auth, HttpServletRequest request) {
        var content = service.content(id, actor(auth), request.getRequestURI().endsWith("/thumbnail"));
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .header("Content-Type", "image/jpeg").header("Content-Disposition", "inline; filename=\"avatar.jpg\"")
                .contentLength(content.length()).body(new InputStreamResource(content.stream()));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        service.delete(id, actor(auth)); return ResponseEntity.noContent().build();
    }
    private UUID actor(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedActor actor)) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Cần đăng nhập.");
        return actor.userId();
    }
    private UUID requestId(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return value instanceof UUID id ? id : UUID.randomUUID();
    }
}
