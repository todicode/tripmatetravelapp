package com.tripmate.media.application;

import com.tripmate.media.api.AvatarMedia;
import com.tripmate.media.domain.ObjectStorage;
import com.tripmate.shared.web.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Service
public class MediaService implements AvatarMedia {
    private static final Logger log = LoggerFactory.getLogger(MediaService.class);
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ObjectStorage storage;
    private final AvatarImageProcessor processor;
    public MediaService(JdbcTemplate jdbc, PlatformTransactionManager manager, ObjectStorage storage, AvatarImageProcessor processor) {
        this.jdbc = jdbc; this.transactions = new TransactionTemplate(manager); this.storage = storage; this.processor = processor;
    }
    public record MediaView(UUID id, UUID uploaderId, UUID tripId, String purpose, String status,
                            String originalFilename, String mimeType, String sizeBytes, int width, int height,
                            boolean hasThumbnail, Instant createdAt, Instant orphanExpiresAt, Instant deletedAt) {}
    public record Content(InputStream stream, long length) {}
    private record Asset(MediaView view, String objectKey, String thumbnailKey, long thumbnailBytes, long reservedBytes) {}

    public MediaView upload(UUID userId, byte[] bytes, String filename) {
        var image = processor.process(bytes);
        String safeName = filename == null ? "avatar.jpg" : filename.replace('\\', '/');
        safeName = safeName.substring(safeName.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        final String originalFilename = safeName.isBlank() ? "avatar.jpg" : safeName.substring(0, safeName.offsetByCodePoints(0, Math.min(255, safeName.codePointCount(0, safeName.length()))));
        UUID id = UUID.randomUUID();
        String key = "avatars/" + id + ".jpg", thumbnail = "avatars/" + id + "-thumb.jpg";
        long reserved = (long) image.content().length + image.thumbnail().length;
        transactions.executeWithoutResult(status -> {
            long used = Objects.requireNonNull(jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1 FOR UPDATE", Long.class));
            if (used + reserved > 2_000_000_000L) throw error(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_QUOTA_EXCEEDED", "Kho ảnh đã đầy.");
            jdbc.update("UPDATE media_storage_quota SET reserved_bytes=reserved_bytes+? WHERE id=1", reserved);
            jdbc.update("""
                INSERT INTO media_assets(id,uploader_id,purpose,status,object_key,thumbnail_key,original_filename,
                  mime_type,size_bytes,thumbnail_size_bytes,reserved_bytes,width,height,orphan_expires_at)
                VALUES (?,?,'AVATAR','PENDING',?,?,?,'image/jpeg',?,?,?,?,?,now()+interval '24 hours')
                """, id, userId, key, thumbnail, originalFilename, image.content().length, image.thumbnail().length, reserved, image.width(), image.height());
        });
        try {
            storage.put(key, image.content());
            storage.put(thumbnail, image.thumbnail());
            jdbc.update("UPDATE media_assets SET status='READY',updated_at=now() WHERE id=? AND status='PENDING'", id);
            return own(id, userId, false).view();
        } catch (RuntimeException exception) {
            // Persist cleanup intent; reserve is retained until both objects are removed.
            jdbc.update("UPDATE media_assets SET status='FAILED',updated_at=now() WHERE id=? AND status='PENDING'", id);
            throw exception;
        }
    }
    public MediaView metadata(UUID id, UUID userId) { return readable(id, userId).view(); }
    public Content content(UUID id, UUID userId, boolean thumbnail) {
        Asset asset = readable(id, userId);
        if ("DELETED".equals(asset.view.status())) throw error(HttpStatus.GONE, "MEDIA_DELETED", "Ảnh đã bị xóa.");
        return new Content(storage.open(thumbnail ? asset.thumbnailKey : asset.objectKey),
                thumbnail ? asset.thumbnailBytes : Long.parseLong(asset.view.sizeBytes()));
    }
    private Asset readable(UUID id, UUID userId) {
        Asset asset = own(id, userId, false);
        if (!java.util.Set.of("READY", "ATTACHED", "DELETED").contains(asset.view.status())) throw notFound();
        return asset;
    }
    @Override @Transactional
    public void replace(UUID userId, UUID previousId, UUID nextId) {
        if (Objects.equals(previousId, nextId)) return;
        if (nextId != null) {
            Asset next = own(nextId, userId, true);
            if (!"READY".equals(next.view.status()) || !next.view.orphanExpiresAt().isAfter(Instant.now())) {
                throw error(HttpStatus.CONFLICT, "MEDIA_NOT_READY", "Ảnh không còn sẵn sàng. Hãy chọn lại ảnh.");
            }
            jdbc.update("UPDATE media_assets SET status='ATTACHED',attached_at=now(),updated_at=now() WHERE id=?", nextId);
        }
        if (previousId != null) {
            own(previousId, userId, true);
            tombstone(previousId, userId);
        }
    }
    @Transactional
    public void delete(UUID id, UUID userId) {
        Asset asset = own(id, userId, true);
        if ("ATTACHED".equals(asset.view.status())) throw error(HttpStatus.CONFLICT, "MEDIA_ALREADY_ATTACHED", "Hãy xóa ảnh đại diện qua hồ sơ.");
        if ("PENDING".equals(asset.view.status())) throw error(HttpStatus.CONFLICT, "MEDIA_NOT_READY", "Ảnh đang được xử lý.");
        if (!"DELETED".equals(asset.view.status())) tombstone(id, userId);
    }
    private void tombstone(UUID id, UUID userId) {
        jdbc.update("UPDATE media_assets SET status='DELETED',deleted_at=now(),deleted_by=?,updated_at=now() WHERE id=?", userId, id);
    }
    @Scheduled(fixedDelayString = "${tripmate.media.cleanup-delay-ms:60000}", initialDelay = 60000)
    public void cleanup() {
        var ids = jdbc.queryForList("""
            SELECT id FROM media_assets WHERE purged_at IS NULL AND
            (status IN ('DELETED','FAILED') OR (status IN ('READY','PENDING') AND orphan_expires_at < now()))
            ORDER BY created_at LIMIT 50
            """, UUID.class);
        for (UUID id : ids) {
            try { purge(id); }
            catch (RuntimeException exception) { log.warn("Media cleanup will retry mediaId={}", id); }
        }
    }
    private void purge(UUID id) {
        Asset asset = transactions.execute(status -> {
            Asset current = find(id, true);
            if (current == null || current.reservedBytes == 0 || "ATTACHED".equals(current.view.status())) return null;
            if (java.util.Set.of("READY", "PENDING").contains(current.view.status())) {
                if (current.view.orphanExpiresAt().isAfter(Instant.now())) return null;
                jdbc.update("UPDATE media_assets SET status='FAILED',updated_at=now() WHERE id=?", id);
            }
            return current;
        });
        if (asset == null) return;
        storage.delete(asset.objectKey); storage.delete(asset.thumbnailKey);
        transactions.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT reserved_bytes FROM media_storage_quota WHERE id=1 FOR UPDATE", Long.class);
            Asset current = find(id, true);
            if (current.reservedBytes == 0) return;
            jdbc.update("UPDATE media_storage_quota SET reserved_bytes=reserved_bytes-? WHERE id=1", current.reservedBytes);
            jdbc.update("UPDATE media_assets SET reserved_bytes=0,purged_at=now(),updated_at=now() WHERE id=?", id);
        });
    }
    private Asset own(UUID id, UUID userId, boolean lock) {
        Asset asset = find(id, lock);
        if (asset == null || !asset.view.uploaderId().equals(userId)) throw notFound();
        return asset;
    }
    private Asset find(UUID id, boolean lock) {
        var result = jdbc.query("SELECT * FROM media_assets WHERE id=?" + (lock ? " FOR UPDATE" : ""), this::map, id);
        return result.isEmpty() ? null : result.getFirst();
    }
    private Asset map(ResultSet row, int index) throws SQLException {
        var deleted = row.getTimestamp("deleted_at");
        String state = row.getString("status");
        var view = new MediaView(row.getObject("id", UUID.class), row.getObject("uploader_id", UUID.class), null,
                "AVATAR", state, row.getString("original_filename"), row.getString("mime_type"),
                Long.toString(row.getLong("size_bytes")), row.getInt("width"), row.getInt("height"), true,
                row.getTimestamp("created_at").toInstant(), "ATTACHED".equals(state) ? null : row.getTimestamp("orphan_expires_at").toInstant(),
                deleted == null ? null : deleted.toInstant());
        return new Asset(view, row.getString("object_key"), row.getString("thumbnail_key"), row.getLong("thumbnail_size_bytes"), row.getLong("reserved_bytes"));
    }
    private ApiException notFound() { return error(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy ảnh."); }
    private ApiException error(HttpStatus status, String code, String message) { return new ApiException(status, code, message); }
}
