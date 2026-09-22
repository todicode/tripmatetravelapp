package com.tripmate.identity.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@ConditionalOnProperty(name = "tripmate.email.mode", havingValue = "smtp")
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpEmailSender(JavaMailSender mailSender, @Value("${tripmate.email.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public void sendVerificationCode(String recipient, String otp, Instant expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("TripMate - mã xác minh email");
        message.setText("Mã xác minh TripMate của bạn là " + otp + ". Mã hết hạn lúc " + expiresAt + ".");
        mailSender.send(message);
    }
}
