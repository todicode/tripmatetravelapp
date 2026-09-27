CREATE TABLE password_reset_challenges (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_users(id),
    otp_hash varchar(64) NOT NULL,
    otp_expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    resend_available_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_password_reset_attempts CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX ux_password_reset_active_user
    ON password_reset_challenges(user_id) WHERE used_at IS NULL;
CREATE INDEX ix_password_reset_expiry ON password_reset_challenges(otp_expires_at);
