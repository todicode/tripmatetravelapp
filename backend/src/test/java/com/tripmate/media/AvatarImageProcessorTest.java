package com.tripmate.media;

import static org.junit.jupiter.api.Assertions.*;

import com.tripmate.media.application.AvatarImageProcessor;
import com.tripmate.shared.web.ApiException;

import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

class AvatarImageProcessorTest {
    private final AvatarImageProcessor processor = new AvatarImageProcessor();

    @Test
    void chatImagesKeepTheirAspectRatioAndHaveBoundedPreviews() throws Exception {
        var input = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3200, 800, BufferedImage.TYPE_INT_RGB), "png", input);
        var result = processor.processChat(input.toByteArray());
        assertEquals(1600, result.width());
        assertEquals(400, result.height());
        var thumbnail = ImageIO.read(new ByteArrayInputStream(result.thumbnail()));
        assertEquals(400, thumbnail.getWidth());
        assertEquals(100, thumbnail.getHeight());
        assertEquals(0xff, result.content()[0] & 255);
    }

    @Test
    void decodesWebpAndRejectsExcessivePixelDimensionsBeforeDecode() throws Exception {
        byte[] webp =
                java.util.Base64.getDecoder()
                        .decode(
                                "UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoIAAgAAUAmJaACdLoB+AADsAD+9bh//sHfzgPzgP6YP/z8y+W/fGYA");
        assertEquals(8, processor.process(webp).width());
        var png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", png);
        byte[] oversized = png.toByteArray();
        java.nio.ByteBuffer.wrap(oversized).putInt(16, 100000).putInt(20, 100000);
        var crc = new java.util.zip.CRC32();
        crc.update(oversized, 12, 17);
        java.nio.ByteBuffer.wrap(oversized).putInt(29, (int) crc.getValue());
        assertEquals(
                "VALIDATION_ERROR",
                assertThrows(ApiException.class, () -> processor.process(oversized)).getCode());
    }

    @Test
    void normalizesJpegAndPngIntoSquareJpegAndThumbnail() throws Exception {
        for (String type : new String[] {"jpeg", "png"}) {
            var input = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(1600, 1200, BufferedImage.TYPE_INT_RGB), type, input);
            var result = processor.process(input.toByteArray());
            assertEquals(1024, result.width());
            assertEquals(1024, ImageIO.read(new ByteArrayInputStream(result.content())).getWidth());
            assertEquals(
                    256, ImageIO.read(new ByteArrayInputStream(result.thumbnail())).getHeight());
            assertEquals(0xff, result.content()[0] & 255);
        }
    }

    @Test
    void rejectsEmptyCorruptUnsupportedAndOversizedInputs() throws Exception {
        assertThrows(ApiException.class, () -> processor.process(new byte[0]));
        assertThrows(ApiException.class, () -> processor.process("not an image".getBytes()));
        assertEquals(
                "FILE_TOO_LARGE",
                assertThrows(ApiException.class, () -> processor.process(new byte[10_000_001]))
                        .getCode());
        var gif = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB), "gif", gif);
        assertEquals(
                "UNSUPPORTED_MEDIA_TYPE",
                assertThrows(ApiException.class, () -> processor.process(gif.toByteArray()))
                        .getCode());
    }
}
