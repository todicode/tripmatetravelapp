package com.tripmate.identity.infrastructure;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Duration;
import java.time.Instant;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpEmailSenderTest {

    @Test
    void sendsBrandedHtmlAndPlainTextOtpWithThreeMinuteExpiry() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);

        new SmtpEmailSender(mailSender, "tripmate.opt@gmail.com", Duration.ofMinutes(3))
                .sendVerificationCode("recipient@example.test", "123456", Instant.now().plusSeconds(180));

        verify(mailSender).send(message);
        assertEquals("TripMate | Mã xác minh đăng ký", message.getSubject());
        assertEquals("recipient@example.test", message.getAllRecipients()[0].toString());
        String content = collectText(message.getContent());
        assertTrue(content.contains("123456"));
        assertTrue(content.contains("3 phút"));
        assertTrue(content.contains("<html lang=\"vi\">"));
        assertTrue(content.contains("Nếu bạn không yêu cầu đăng ký"));
    }

    private String collectText(Object content) throws Exception {
        if (content instanceof Multipart multipart) {
            StringBuilder text = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                text.append(collectText(multipart.getBodyPart(index).getContent()));
            }
            return text.toString();
        }
        return content.toString();
    }
}
