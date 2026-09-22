CREATE TABLE app_users (
    id uuid PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name varchar(100) NOT NULL,
    phone varchar(32),
    friend_code varchar(32) NOT NULL UNIQUE,
    avatar_media_id uuid,
    status varchar(16) NOT NULL DEFAULT 'ACTIVE',
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_email_lower CHECK (email = lower(btrim(email)) AND length(email) > 3),
    CONSTRAINT ck_users_display_name CHECK (length(btrim(display_name)) > 0),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE TABLE user_devices (
    id uuid PRIMARY KEY,
    installation_id uuid NOT NULL UNIQUE,
    user_id uuid REFERENCES app_users(id),
    binding_version bigint NOT NULL DEFAULT 1,
    fcm_token text UNIQUE,
    push_enabled boolean NOT NULL DEFAULT false,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_devices_binding_version CHECK (binding_version > 0),
    CONSTRAINT ck_devices_unbound_push CHECK (
        user_id IS NOT NULL OR (fcm_token IS NULL AND push_enabled = false)
    )
);

CREATE INDEX ix_devices_user ON user_devices(user_id);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_users(id),
    device_id uuid NOT NULL REFERENCES user_devices(id),
    family_id uuid NOT NULL,
    parent_token_id uuid UNIQUE REFERENCES refresh_tokens(id),
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_refresh_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_refresh_parent CHECK (parent_token_id IS NULL OR parent_token_id <> id)
);

CREATE INDEX ix_refresh_family ON refresh_tokens(family_id);
CREATE INDEX ix_refresh_user_device ON refresh_tokens(user_id, device_id);

CREATE TABLE pending_registrations (
    id uuid PRIMARY KEY,
    email varchar(254) NOT NULL,
    password_hash text NOT NULL,
    display_name varchar(100) NOT NULL,
    phone varchar(32) NOT NULL,
    installation_id uuid NOT NULL,
    otp_hash varchar(64) NOT NULL,
    otp_expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    resend_available_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_pending_email_lower CHECK (email = lower(btrim(email))),
    CONSTRAINT ck_pending_attempts CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX ux_pending_registration_active_email
    ON pending_registrations(email)
    WHERE used_at IS NULL;

CREATE INDEX ix_pending_registration_expiry ON pending_registrations(otp_expires_at);

CREATE TABLE auth_identities (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_users(id),
    provider varchar(32) NOT NULL,
    provider_subject varchar(255) NOT NULL,
    provider_email varchar(254),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_subject),
    UNIQUE (user_id, provider)
);

CREATE INDEX ix_auth_identities_user ON auth_identities(user_id);
