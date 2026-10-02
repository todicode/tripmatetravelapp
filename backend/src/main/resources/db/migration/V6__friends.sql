-- Rollback the application by deploying the previous version; retain these tables and their data.
-- Drop tables only after an explicit data export/retention decision.
CREATE TABLE friend_requests (
    id uuid PRIMARY KEY,
    sender_id uuid NOT NULL REFERENCES app_users(id),
    recipient_id uuid NOT NULL REFERENCES app_users(id),
    message varchar(500),
    status varchar(16) NOT NULL DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    CONSTRAINT ck_friend_request_distinct CHECK (sender_id <> recipient_id),
    CONSTRAINT ck_friend_request_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_friend_request_resolution CHECK ((status = 'PENDING') = (resolved_at IS NULL))
);
CREATE UNIQUE INDEX uq_friend_pending_pair ON friend_requests
    (least(sender_id, recipient_id), greatest(sender_id, recipient_id)) WHERE status = 'PENDING';
CREATE INDEX ix_friend_requests_inbox ON friend_requests(recipient_id, status, created_at DESC);
CREATE INDEX ix_friend_requests_sent ON friend_requests(sender_id, status, created_at DESC);

CREATE TABLE friendships (
    user_low_id uuid NOT NULL REFERENCES app_users(id),
    user_high_id uuid NOT NULL REFERENCES app_users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_low_id, user_high_id),
    CONSTRAINT ck_friendship_order CHECK (user_low_id < user_high_id)
);
CREATE INDEX ix_friendships_high ON friendships(user_high_id);
