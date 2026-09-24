package com.tripmate.identity.security;

import com.tripmate.identity.domain.DeviceEntity;
import com.tripmate.identity.domain.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final Duration accessTokenTtl;

    public JwtTokenService(JwtEncoder jwtEncoder, JwtDecoder jwtDecoder,
                           @Value("${tripmate.security.access-token-ttl}") Duration accessTokenTtl) {
        this.jwtEncoder = jwtEncoder;
        this.jwtDecoder = jwtDecoder;
        this.accessTokenTtl = accessTokenTtl;
    }

    public String issue(UserEntity user, DeviceEntity device) {
        Instant issuedAt = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("tripmate")
                .subject(user.getId().toString())
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(accessTokenTtl))
                .claim("deviceId", device.getId().toString())
                .claim("bindingVersion", device.getBindingVersion())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public AuthenticatedUser parse(String token) {
        var jwt = jwtDecoder.decode(token);
        if (!"tripmate".equals(jwt.getClaimAsString("iss"))) {
            throw new IllegalArgumentException("Invalid token issuer");
        }
        UUID userId = UUID.fromString(jwt.getSubject());
        UUID deviceId = UUID.fromString(jwt.getClaimAsString("deviceId"));
        Number bindingVersion = jwt.getClaim("bindingVersion");
        if (bindingVersion == null || bindingVersion.longValue() < 1) {
            throw new IllegalArgumentException("Invalid token binding");
        }
        return new AuthenticatedUser(userId, deviceId, bindingVersion.longValue());
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }
}
