package com.tripmate.identity.security;

import com.tripmate.identity.api.AccessTokenVerifier;
import com.tripmate.identity.domain.UserStatus;
import com.tripmate.identity.infrastructure.DeviceRepository;
import com.tripmate.identity.infrastructure.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenVerificationService implements AccessTokenVerifier {
    private final JwtTokenService tokens;
    private final DeviceRepository devices;
    private final UserRepository users;

    public AccessTokenVerificationService(JwtTokenService tokens, DeviceRepository devices, UserRepository users) {
        this.tokens = tokens; this.devices = devices; this.users = users;
    }

    @Override
    public Authentication verify(String token) {
        var actor = tokens.parse(token);
        var device = devices.findById(actor.deviceId()).orElseThrow();
        var user = users.findById(actor.userId()).orElseThrow();
        if (device.getUser() == null || !device.getUser().getId().equals(user.getId())
                || device.getBindingVersion() != actor.bindingVersion() || user.getStatus() != UserStatus.ACTIVE)
            throw new IllegalArgumentException("Token binding is no longer valid");
        return new UsernamePasswordAuthenticationToken(actor, null, AuthorityUtils.NO_AUTHORITIES);
    }
}
