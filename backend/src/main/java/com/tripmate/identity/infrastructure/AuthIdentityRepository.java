package com.tripmate.identity.infrastructure;

import com.tripmate.identity.domain.AuthIdentityEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentityEntity, UUID> {

    Optional<AuthIdentityEntity> findByProviderAndProviderSubject(String provider, String providerSubject);

    boolean existsByUserIdAndProvider(UUID userId, String provider);
}
