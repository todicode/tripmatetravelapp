-- Additive migration. Roll back application code while retaining conversation history.
CREATE TABLE direct_conversations (
    id uuid PRIMARY KEY,
    user_low_id uuid NOT NULL REFERENCES app_users(id),
    user_high_id uuid NOT NULL REFERENCES app_users(id),
    last_seq bigint NOT NULL DEFAULT 0,
    low_read_seq bigint NOT NULL DEFAULT 0,
    high_read_seq bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT uq_direct_conversation_pair UNIQUE (user_low_id, user_high_id),
    CONSTRAINT ck_direct_conversation_order CHECK (user_low_id < user_high_id),
    CONSTRAINT ck_direct_read_seq CHECK (last_seq >= 0 AND low_read_seq BETWEEN 0 AND last_seq
        AND high_read_seq BETWEEN 0 AND last_seq)
);
CREATE INDEX ix_direct_conversations_low ON direct_conversations(user_low_id, updated_at DESC, id DESC);
CREATE INDEX ix_direct_conversations_high ON direct_conversations(user_high_id, updated_at DESC, id DESC);

CREATE TABLE direct_messages (
    id uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES direct_conversations(id),
    sender_id uuid NOT NULL REFERENCES app_users(id),
    client_message_id uuid NOT NULL,
    seq bigint NOT NULL CHECK (seq > 0),
    body varchar(4000) NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
    created_at timestamptz NOT NULL,
    CONSTRAINT uq_direct_message_seq UNIQUE (conversation_id, seq),
    CONSTRAINT uq_direct_message_retry UNIQUE (conversation_id, sender_id, client_message_id)
);
CREATE INDEX ix_direct_messages_unread ON direct_messages(conversation_id, sender_id, seq);
