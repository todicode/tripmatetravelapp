package com.tripmate.media.application;

import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;

@Component
public class AvatarImageProcessor {
    public record AvatarImage(byte[] content, byte[] thumbnail, int width, int height) {}
    public AvatarImage process(byte[] bytes) {
        if (bytes.length == 0) throw invalid("Ảnh không được rỗng.");
        if (bytes.length > 10_000_000) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Ảnh tối đa 10 MB.");
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw unsupported();
            ImageReader reader = readers.next();
            try {
                if (!Set.of("jpeg", "jpg", "png", "webp").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw unsupported();
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 40_000_000) throw invalid("Ảnh tối đa 40 triệu pixel.");
                var parameters = reader.getDefaultReadParam();
                int sample = Math.max(1, Math.max(width, height) / 2048);
                parameters.setSourceSubsampling(sample, sample, 0, 0);
                BufferedImage decoded = reader.read(0, parameters);
                int size = Math.min(1024, Math.min(decoded.getWidth(), decoded.getHeight()));
                return new AvatarImage(square(decoded, size), square(decoded, Math.min(256, size)), size, size);
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException exception) { throw invalid("Không đọc được ảnh. Hãy chọn ảnh khác."); }
    }
    private byte[] square(BufferedImage source, int size) throws IOException {
        BufferedImage target = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        var graphics = target.createGraphics();
        int side = Math.min(source.getWidth(), source.getHeight());
        int left = (source.getWidth() - side) / 2, top = (source.getHeight() - side) / 2;
        try {
            graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, size, size);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(source, 0, 0, size, size, left, top, left + side, top + side, null);
        } finally { graphics.dispose(); }
        var output = new ByteArrayOutputStream();
        if (!ImageIO.write(target, "jpeg", output)) throw new IOException("JPEG encoder unavailable");
        return output.toByteArray(); // Re-encoding strips source metadata and non-image payloads.
    }
    private ApiException unsupported() { return new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", "Chỉ nhận ảnh JPEG, PNG hoặc WebP."); }
    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", message,
                java.util.List.of(new com.tripmate.shared.web.ErrorDetailResponse("file", "INVALID_VALUE", message)), java.util.Map.of());
    }
}
