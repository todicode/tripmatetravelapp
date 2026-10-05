-- Groups and history survive changing/removing the optional trip link.
CREATE TABLE group_conversations (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES app_users(id),
    name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
    trip_id uuid REFERENCES trips(id),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    last_seq bigint NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
    archived_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE INDEX ix_group_conversations_order ON group_conversations(updated_at DESC, id DESC);
CREATE INDEX ix_group_conversations_trip ON group_conversations(trip_id) WHERE trip_id IS NOT NULL;

CREATE TABLE group_members (
    conversation_id uuid NOT NULL REFERENCES group_conversations(id),
    user_id uuid NOT NULL REFERENCES app_users(id),
    status varchar(16) NOT NULL CHECK (status IN ('ACTIVE','LEFT','REMOVED')),
    read_seq bigint NOT NULL DEFAULT 0 CHECK (read_seq >= 0),
    joined_at timestamptz NOT NULL,
    ended_at timestamptz,
    PRIMARY KEY (conversation_id, user_id),
    CHECK ((status = 'ACTIVE') = (ended_at IS NULL))
);
CREATE INDEX ix_group_members_user ON group_members(user_id, status, conversation_id);
ALTER TABLE group_conversations ADD CONSTRAINT fk_group_owner_membership
    FOREIGN KEY (id, owner_id) REFERENCES group_members(conversation_id, user_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE group_messages (
    id uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES group_conversations(id),
    sender_id uuid NOT NULL,
    client_message_id uuid NOT NULL,
    seq bigint NOT NULL CHECK (seq > 0),
    body varchar(4000) NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
    created_at timestamptz NOT NULL,
    FOREIGN KEY (conversation_id, sender_id) REFERENCES group_members(conversation_id, user_id),
    UNIQUE (conversation_id, seq),
    UNIQUE (conversation_id, sender_id, client_message_id)
);
CREATE INDEX ix_group_messages_unread ON group_messages(conversation_id, seq, sender_id);
