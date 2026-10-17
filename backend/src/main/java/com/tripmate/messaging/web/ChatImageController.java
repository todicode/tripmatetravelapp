package com.tripmate.messaging.web;

import com.tripmate.media.api.ChatMedia;
import com.tripmate.messaging.application.ChatImageService;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ChatImageController {
    private final ChatImageService images;

    public ChatImageController(ChatImageService images) {
        this.images = images;
    }

    @GetMapping("/chat/avatars/{mediaId}")
    public ResponseEntity<InputStreamResource> avatar(@PathVariable UUID mediaId) {
        return binary(images.avatar(mediaId));
    }

    @GetMapping("/direct-conversations/{id}/messages/{messageId}/image")
    public ResponseEntity<InputStreamResource> direct(
            @PathVariable UUID id,
            @PathVariable UUID messageId,
            @RequestParam(defaultValue = "true") boolean thumbnail) {
        return binary(images.image(id, messageId, false, thumbnail));
    }

    @GetMapping("/group-conversations/{id}/messages/{messageId}/image")
    public ResponseEntity<InputStreamResource> group(
            @PathVariable UUID id,
            @PathVariable UUID messageId,
            @RequestParam(defaultValue = "true") boolean thumbnail) {
        return binary(images.image(id, messageId, true, thumbnail));
    }

    private ResponseEntity<InputStreamResource> binary(ChatMedia.Content content) {
        return ResponseEntity.ok()
                .header("Cache-Control", "private, no-store")
                .header("Content-Type", "image/jpeg")
                .header("Content-Disposition", "inline; filename=\"image.jpg\"")
                .contentLength(content.length())
                .body(new InputStreamResource(content.stream()));
    }
}
