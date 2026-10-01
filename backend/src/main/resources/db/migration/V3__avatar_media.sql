-- Avatar slice of the canonical media schema. Trip/chat constraints follow with those modules.
CREATE TABLE media_assets (
 id uuid PRIMARY KEY,
 uploader_id uuid NOT NULL REFERENCES app_users(id),
 trip_id uuid CHECK (trip_id IS NULL),
 purpose varchar(16) NOT NULL CHECK (purpose = 'AVATAR'),
 status varchar(16) NOT NULL CHECK (status IN ('PENDING','READY','ATTACHED','FAILED','DELETED')),
 object_key text NOT NULL UNIQUE,
 thumbnail_key text NOT NULL UNIQUE,
 original_filename varchar(255) NOT NULL,
 mime_type varchar(64) NOT NULL CHECK (mime_type = 'image/jpeg'),
 size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10000000),
 thumbnail_size_bytes bigint NOT NULL CHECK (thumbnail_size_bytes > 0),
 reserved_bytes bigint NOT NULL CHECK (reserved_bytes >= 0),
 width integer NOT NULL CHECK (width > 0),
 height integer NOT NULL CHECK (height > 0),
 attached_at timestamptz,
 orphan_expires_at timestamptz NOT NULL,
 deleted_at timestamptz,
 deleted_by uuid REFERENCES app_users(id),
 purged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,uploader_id),
 CHECK ((status = 'DELETED') = (deleted_at IS NOT NULL)),
 CHECK (status <> 'ATTACHED' OR attached_at IS NOT NULL),
 CHECK (purged_at IS NULL OR status IN ('DELETED','FAILED')),
 CHECK ((purged_at IS NOT NULL AND reserved_bytes = 0) OR
        (purged_at IS NULL AND reserved_bytes >= size_bytes + thumbnail_size_bytes))
);
CREATE INDEX ix_media_uploader ON media_assets(uploader_id);
CREATE INDEX ix_media_cleanup ON media_assets(status,orphan_expires_at) WHERE purged_at IS NULL;
ALTER TABLE app_users ADD CONSTRAINT fk_user_avatar_owner
 FOREIGN KEY (avatar_media_id,id) REFERENCES media_assets(id,uploader_id);

CREATE TABLE media_storage_quota (
 id integer PRIMARY KEY CHECK (id = 1),
 reserved_bytes bigint NOT NULL CHECK (reserved_bytes BETWEEN 0 AND 2000000000)
);
INSERT INTO media_storage_quota(id,reserved_bytes) VALUES (1,0);
