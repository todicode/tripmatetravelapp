ALTER TABLE media_assets DROP CONSTRAINT media_assets_purpose_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_purpose_check
    CHECK (purpose IN ('AVATAR', 'CHAT_IMAGE'));

ALTER TABLE direct_messages DROP CONSTRAINT direct_messages_body_check;
ALTER TABLE direct_messages ADD CONSTRAINT direct_messages_body_check CHECK (length(body) <= 4000);
ALTER TABLE group_messages DROP CONSTRAINT group_messages_body_check;
ALTER TABLE group_messages ADD CONSTRAINT group_messages_body_check CHECK (length(body) <= 4000);

-- One upload belongs to one message; text and attachment are committed together by messaging.
CREATE TABLE chat_message_images (
    media_id uuid PRIMARY KEY REFERENCES media_assets(id),
    direct_message_id uuid UNIQUE REFERENCES direct_messages(id),
    group_message_id uuid UNIQUE REFERENCES group_messages(id),
    CHECK ((direct_message_id IS NOT NULL)::integer + (group_message_id IS NOT NULL)::integer = 1)
);

CREATE FUNCTION require_chat_image_for_empty_body() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.body = '' AND NOT EXISTS (
        SELECT 1 FROM chat_message_images i
        WHERE (TG_TABLE_NAME = 'direct_messages' AND i.direct_message_id = NEW.id)
           OR (TG_TABLE_NAME = 'group_messages' AND i.group_message_id = NEW.id)
    ) THEN
        RAISE EXCEPTION 'Empty chat message requires an image' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER direct_message_content AFTER INSERT OR UPDATE ON direct_messages
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_chat_image_for_empty_body();
CREATE CONSTRAINT TRIGGER group_message_content AFTER INSERT OR UPDATE ON group_messages
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_chat_image_for_empty_body();
