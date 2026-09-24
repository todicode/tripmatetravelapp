package com.tripmate.identity.infrastructure;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@ConditionalOnProperty(name = "tripmate.email.mode", havingValue = "smtp")
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final String from;
    private final Duration verificationTtl;

    public SmtpEmailSender(JavaMailSender mailSender, @Value("${tripmate.email.from}") String from,
                           @Value("${tripmate.email.verification-ttl}") Duration verificationTtl) {
        this.mailSender = mailSender;
        this.from = from;
        this.verificationTtl = verificationTtl;
    }

    @Override
    public void sendVerificationCode(String recipient, String otp, Instant expiresAt) {
        long minutes = verificationTtl.toMinutes();
        String plainText = """
                TRIPMATE | XÁC MINH EMAIL

                Mã xác minh của bạn: %s

                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không yêu cầu đăng ký TripMate, hãy bỏ qua email này.
                """.formatted(otp, minutes);
        String html = """
                <!doctype html>
                <html lang="vi">
                <body style="margin:0;padding:24px;background:#f5f5f7;font-family:Arial,sans-serif;color:#1d1d1f;">
                  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0;border-radius:16px;overflow:hidden;">
                    <div style="background:#0066cc;color:#ffffff;padding:20px 28px;font-size:18px;font-weight:700;">TripMate</div>
                    <div style="padding:28px;">
                      <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;">Xác minh địa chỉ email</h1>
                      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Nhập mã sau vào ứng dụng để hoàn tất đăng ký:</p>
                      <div style="background:#eaf2ff;border:1px solid #b9d4f8;border-radius:12px;padding:18px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#0066cc;">{OTP}</div>
                      <p style="font-size:14px;line-height:1.6;margin:20px 0 0;">Mã có hiệu lực trong <strong>{MINUTES} phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
                      <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:16px 0 0;">Nếu bạn không yêu cầu đăng ký TripMate, hãy bỏ qua email này.</p>
                    </div>
                  </div>
                </body>
                </html>
                """.replace("{OTP}", otp).replace("{MINUTES}", Long.toString(minutes));
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(recipient);
            helper.setSubject("TripMate | Mã xác minh đăng ký");
            helper.setText(plainText, html);
            mailSender.send(message);
        } catch (MessagingException exception) {
            throw new IllegalStateException("Could not prepare OTP email", exception);
        }
    }
}
