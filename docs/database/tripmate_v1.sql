-- TripMate ERD v1 | 2026-09-13 | PostgreSQL reference schema.
-- Design only; not an installed Flyway migration. Application invariants are in TRIPMATE_ERD_V1.md.
BEGIN;

CREATE TABLE app_users (
 id uuid PRIMARY KEY,
 email varchar(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) > 3),
 password_hash text NOT NULL,
 display_name varchar(100) NOT NULL CHECK (length(btrim(display_name)) > 0),
 friend_code varchar(32) NOT NULL UNIQUE,
 avatar_media_id uuid,
 status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_devices (
 id uuid PRIMARY KEY,
 installation_id uuid NOT NULL UNIQUE,
 user_id uuid REFERENCES app_users(id),
 binding_version bigint NOT NULL DEFAULT 1 CHECK (binding_version > 0),
 fcm_token text UNIQUE,
 push_enabled boolean NOT NULL DEFAULT false,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (user_id IS NOT NULL OR (fcm_token IS NULL AND push_enabled = false))
);

CREATE INDEX ix_devices_user ON user_devices(user_id);

CREATE TABLE refresh_tokens (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_users(id),
 device_id uuid NOT NULL REFERENCES user_devices(id),
 family_id uuid NOT NULL,
 parent_token_id uuid UNIQUE REFERENCES refresh_tokens(id),
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at > created_at),
 CHECK (parent_token_id IS NULL OR parent_token_id <> id)
);

CREATE INDEX ix_refresh_user_device ON refresh_tokens(user_id,device_id);
CREATE INDEX ix_refresh_family ON refresh_tokens(family_id);
CREATE INDEX ix_refresh_expiry ON refresh_tokens(expires_at);

CREATE TABLE interests (
 code varchar(32) PRIMARY KEY,
 label varchar(80) NOT NULL
);

CREATE TABLE user_interests (
 user_id uuid NOT NULL REFERENCES app_users(id),
 interest_code varchar(32) NOT NULL REFERENCES interests(code),
 PRIMARY KEY (user_id,interest_code)
);

CREATE TABLE friend_requests (
 id uuid PRIMARY KEY,
 sender_id uuid NOT NULL REFERENCES app_users(id),
 recipient_id uuid NOT NULL REFERENCES app_users(id),
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 CHECK (sender_id <> recipient_id),
 CHECK ((status = 'PENDING') = (resolved_at IS NULL))
);

CREATE UNIQUE INDEX uq_friend_pending_pair ON friend_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id)) WHERE status = 'PENDING';

CREATE INDEX ix_friend_requests_inbox ON friend_requests(recipient_id,status,created_at DESC);

CREATE INDEX ix_friend_requests_sent ON friend_requests(sender_id,status,created_at DESC);

CREATE TABLE friendships (
 user_low_id uuid NOT NULL REFERENCES app_users(id),
 user_high_id uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_low_id,user_high_id),
 CHECK (user_low_id < user_high_id)
);

CREATE INDEX ix_friendships_high ON friendships(user_high_id);

CREATE TABLE cities (
 code varchar(32) PRIMARY KEY,
 name varchar(100) NOT NULL,
 country_code char(2) NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
 timezone varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' CHECK (timezone = 'Asia/Ho_Chi_Minh'),
 enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE trips (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES app_users(id),
 city_code varchar(32) NOT NULL REFERENCES cities(code),
 title varchar(160) NOT NULL CHECK (length(btrim(title)) > 0),
 description text,
 start_date date NOT NULL,
 end_date date NOT NULL,
 budget_vnd bigint CHECK (budget_vnd >= 0),
 version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
 last_chat_seq bigint NOT NULL DEFAULT 0 CHECK (last_chat_seq >= 0),
 deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (end_date - start_date BETWEEN 0 AND 4)
);

CREATE INDEX ix_trips_owner ON trips(owner_id);
CREATE INDEX ix_trips_city ON trips(city_code);

CREATE TABLE trip_members (
 trip_id uuid NOT NULL REFERENCES trips(id),
 user_id uuid NOT NULL REFERENCES app_users(id),
 status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LEFT','REMOVED')),
 membership_version bigint NOT NULL DEFAULT 1 CHECK (membership_version > 0),
 chat_push_enabled boolean NOT NULL DEFAULT true,
 itinerary_push_enabled boolean NOT NULL DEFAULT true,
 joined_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (trip_id,user_id),
 CHECK ((status = 'ACTIVE') = (ended_at IS NULL))
);

CREATE INDEX ix_trip_members_user ON trip_members(user_id,status,trip_id);
-- Existence checked at COMMIT; ACTIVE owner and the 10-member cap need a service transaction.
ALTER TABLE trips ADD CONSTRAINT fk_trip_owner_membership FOREIGN KEY (id,owner_id) REFERENCES trip_members(trip_id,user_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE trip_invitations (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES trips(id),
 inviter_id uuid NOT NULL REFERENCES app_users(id),
 invitee_id uuid NOT NULL REFERENCES app_users(id),
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
 expires_at timestamptz NOT NULL,
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (inviter_id <> invitee_id),
 CHECK (expires_at > created_at),
 CHECK ((status = 'PENDING') = (resolved_at IS NULL))
);

CREATE UNIQUE INDEX uq_trip_invitation_pending ON trip_invitations(trip_id,invitee_id) WHERE status = 'PENDING';

CREATE INDEX ix_trip_invitations_inbox ON trip_invitations(invitee_id,status,created_at DESC);

CREATE TABLE trip_join_codes (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES trips(id),
 code_digest char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX uq_trip_unrevoked_code ON trip_join_codes(trip_id) WHERE revoked_at IS NULL;

CREATE TABLE places (
 id uuid PRIMARY KEY,
 provider varchar(16) NOT NULL DEFAULT 'GOOGLE' CHECK (provider = 'GOOGLE'),
 provider_place_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (provider,provider_place_id)
);

CREATE TABLE trip_saved_places (
 trip_id uuid NOT NULL REFERENCES trips(id),
 place_id uuid NOT NULL REFERENCES places(id),
 added_by uuid NOT NULL REFERENCES app_users(id),
 note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (trip_id,place_id),
 FOREIGN KEY (trip_id,added_by) REFERENCES trip_members(trip_id,user_id)
);
CREATE INDEX ix_saved_place_reverse ON trip_saved_places(place_id);


CREATE TABLE itineraries (
 trip_id uuid PRIMARY KEY REFERENCES trips(id),
 version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
 updated_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (trip_id,updated_by) REFERENCES trip_members(trip_id,user_id)
);

CREATE TABLE itinerary_days (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES itineraries(trip_id),
 day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 5),
 transport_mode varchar(16) NOT NULL DEFAULT 'DRIVE' CHECK (transport_mode IN ('WALK','DRIVE')),
 note text,
 UNIQUE (trip_id,day_number)
);

CREATE TABLE itinerary_items (
 id uuid PRIMARY KEY,
 day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
 place_id uuid REFERENCES places(id),
 kind varchar(16) NOT NULL CHECK (kind IN ('PLACE','NOTE')),
 custom_title varchar(160),
 position integer NOT NULL CHECK (position >= 0),
 start_time time NOT NULL,
 end_time time NOT NULL,
 note text,
 estimated_cost_vnd bigint CHECK (estimated_cost_vnd >= 0),
 cost_source varchar(16) NOT NULL DEFAULT 'UNKNOWN' CHECK (cost_source IN ('UNKNOWN','USER')),
 origin varchar(16) NOT NULL DEFAULT 'MANUAL' CHECK (origin IN ('MANUAL','AI')),
 created_by uuid NOT NULL REFERENCES app_users(id),
 updated_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uq_item_position UNIQUE (day_id,position) DEFERRABLE INITIALLY DEFERRED,
 CHECK (end_time > start_time),
 CHECK ((kind = 'PLACE' AND place_id IS NOT NULL) OR (kind = 'NOTE' AND place_id IS NULL AND custom_title IS NOT NULL AND length(btrim(custom_title)) > 0)),
 CHECK ((cost_source = 'UNKNOWN' AND estimated_cost_vnd IS NULL) OR (cost_source = 'USER' AND estimated_cost_vnd IS NOT NULL))
);

CREATE INDEX ix_itinerary_items_place ON itinerary_items(place_id);

CREATE TABLE ai_itinerary_drafts (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES itineraries(trip_id),
 requested_by uuid NOT NULL REFERENCES app_users(id),
 client_request_id uuid NOT NULL,
 base_itinerary_version bigint NOT NULL CHECK (base_itinerary_version >= 0),
 base_trip_version bigint NOT NULL CHECK (base_trip_version >= 0),
 status varchar(16) NOT NULL DEFAULT 'GENERATING' CHECK (status IN ('GENERATING','READY','FAILED','APPLIED','EXPIRED')),
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
 candidate_place_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(candidate_place_ids) = 'array'),
 result jsonb CHECK (jsonb_typeof(result) = 'object'),
 provider varchar(32) NOT NULL,
 model varchar(120) NOT NULL,
 error_code varchar(64),
 expires_at timestamptz NOT NULL,
 applied_at timestamptz,
 applied_by uuid REFERENCES app_users(id),
 applied_itinerary_version bigint,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (trip_id,requested_by,client_request_id),
 FOREIGN KEY (trip_id,requested_by) REFERENCES trip_members(trip_id,user_id),
 CHECK (expires_at > created_at),
 CHECK (status NOT IN ('READY','APPLIED') OR result IS NOT NULL),
 CHECK ((status = 'APPLIED' AND applied_at IS NOT NULL AND applied_by IS NOT NULL AND applied_itinerary_version IS NOT NULL) OR (status <> 'APPLIED' AND applied_at IS NULL AND applied_by IS NULL AND applied_itinerary_version IS NULL))
);
CREATE INDEX ix_ai_drafts_trip ON ai_itinerary_drafts(trip_id,created_at DESC);
CREATE INDEX ix_ai_drafts_expiry ON ai_itinerary_drafts(expires_at) WHERE status IN ('GENERATING','READY');

CREATE TABLE media_assets (
 id uuid PRIMARY KEY,
 uploader_id uuid NOT NULL REFERENCES app_users(id),
 trip_id uuid REFERENCES trips(id),
 purpose varchar(16) NOT NULL CHECK (purpose IN ('AVATAR','CHAT')),
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','READY','ATTACHED','FAILED','DELETED')),
 object_key text NOT NULL UNIQUE,
 thumbnail_key text UNIQUE,
 original_filename varchar(255) NOT NULL,
 mime_type varchar(64) NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
 size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10000000),
 thumbnail_size_bytes bigint NOT NULL DEFAULT 0 CHECK (thumbnail_size_bytes >= 0),
 reserved_bytes bigint NOT NULL CHECK (reserved_bytes >= 0),
 sha256 char(64),
 width integer CHECK (width > 0),
 height integer CHECK (height > 0),
 attached_at timestamptz,
 orphan_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
 deleted_at timestamptz,
 deleted_by uuid REFERENCES app_users(id),
 purged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id,uploader_id),
 UNIQUE (id,trip_id,uploader_id),
 FOREIGN KEY (trip_id,uploader_id) REFERENCES trip_members(trip_id,user_id),
 CHECK ((purpose = 'AVATAR' AND trip_id IS NULL AND mime_type <> 'application/pdf') OR (purpose = 'CHAT' AND trip_id IS NOT NULL)),
 CHECK ((status = 'DELETED') = (deleted_at IS NOT NULL)),
 CHECK (status <> 'ATTACHED' OR attached_at IS NOT NULL),
 CHECK (purged_at IS NULL OR status IN ('DELETED','FAILED')),
 CHECK ((purged_at IS NOT NULL AND reserved_bytes = 0) OR (purged_at IS NULL AND reserved_bytes >= size_bytes + thumbnail_size_bytes))
);
CREATE INDEX ix_media_uploader ON media_assets(uploader_id);
CREATE INDEX ix_media_trip ON media_assets(trip_id);
CREATE INDEX ix_media_orphans ON media_assets(orphan_expires_at) WHERE status IN ('PENDING','READY','FAILED');
ALTER TABLE app_users ADD CONSTRAINT fk_user_avatar_owner FOREIGN KEY (avatar_media_id,id) REFERENCES media_assets(id,uploader_id);

CREATE TABLE chat_messages (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES trips(id),
 sender_id uuid NOT NULL REFERENCES app_users(id),
 seq bigint NOT NULL CHECK (seq > 0),
 client_message_id uuid NOT NULL,
 request_hash char(64) NOT NULL,
 kind varchar(16) NOT NULL CHECK (kind IN ('TEXT','IMAGE','PDF')),
 body text CHECK (length(body) <= 4000),
 media_id uuid UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (trip_id,seq),
 UNIQUE (trip_id,sender_id,client_message_id),
 FOREIGN KEY (trip_id,sender_id) REFERENCES trip_members(trip_id,user_id),
 FOREIGN KEY (media_id,trip_id,sender_id) REFERENCES media_assets(id,trip_id,uploader_id),
 CHECK ((kind = 'TEXT' AND media_id IS NULL AND body IS NOT NULL AND length(btrim(body)) > 0) OR (kind IN ('IMAGE','PDF') AND media_id IS NOT NULL))
);

CREATE TABLE notifications (
 id uuid PRIMARY KEY,
 event_key varchar(160) NOT NULL,
 recipient_id uuid NOT NULL REFERENCES app_users(id),
 actor_id uuid NOT NULL REFERENCES app_users(id),
 type varchar(32) NOT NULL CHECK (type IN ('FRIEND_REQUEST','FRIEND_ACCEPTED','TRIP_INVITATION','CHAT_MESSAGE','ITINERARY_UPDATED')),
 trip_id uuid REFERENCES trips(id),
 friend_request_id uuid REFERENCES friend_requests(id),
 trip_invitation_id uuid REFERENCES trip_invitations(id),
 chat_message_id uuid REFERENCES chat_messages(id),
 itinerary_version bigint,
 title varchar(160) NOT NULL,
 body varchar(300) NOT NULL,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (event_key,recipient_id),
 UNIQUE (id,recipient_id),
 CHECK (actor_id <> recipient_id),
 CHECK (
  (type IN ('FRIEND_REQUEST','FRIEND_ACCEPTED') AND friend_request_id IS NOT NULL AND trip_id IS NULL AND trip_invitation_id IS NULL AND chat_message_id IS NULL AND itinerary_version IS NULL)
  OR (type = 'TRIP_INVITATION' AND trip_id IS NOT NULL AND trip_invitation_id IS NOT NULL AND friend_request_id IS NULL AND chat_message_id IS NULL AND itinerary_version IS NULL)
  OR (type = 'CHAT_MESSAGE' AND trip_id IS NOT NULL AND chat_message_id IS NOT NULL AND friend_request_id IS NULL AND trip_invitation_id IS NULL AND itinerary_version IS NULL)
  OR (type = 'ITINERARY_UPDATED' AND trip_id IS NOT NULL AND itinerary_version IS NOT NULL AND itinerary_version > 0 AND friend_request_id IS NULL AND trip_invitation_id IS NULL AND chat_message_id IS NULL)
 )
);

CREATE INDEX ix_notifications_feed ON notifications(recipient_id,created_at DESC,id DESC);
CREATE INDEX ix_notifications_unread ON notifications(recipient_id,created_at DESC) WHERE read_at IS NULL;

CREATE TABLE outbox_events (
 id uuid PRIMARY KEY,
 dedup_key varchar(200) NOT NULL UNIQUE,
 event_type varchar(48) NOT NULL,
 aggregate_id uuid NOT NULL,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DONE','DEAD')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_by varchar(100),
 claim_token uuid,
 locked_until timestamptz,
 last_error_code varchar(80),
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((status = 'PROCESSING' AND locked_by IS NOT NULL AND claim_token IS NOT NULL AND locked_until IS NOT NULL) OR (status <> 'PROCESSING' AND locked_by IS NULL AND claim_token IS NULL AND locked_until IS NULL))
);
CREATE INDEX ix_outbox_pending ON outbox_events(available_at,id) WHERE status = 'PENDING';
CREATE INDEX ix_outbox_lease ON outbox_events(locked_until) WHERE status = 'PROCESSING';

CREATE TABLE push_deliveries (
 id uuid PRIMARY KEY,
 notification_id uuid NOT NULL REFERENCES notifications(id),
 recipient_id uuid NOT NULL REFERENCES app_users(id),
 device_id uuid NOT NULL REFERENCES user_devices(id),
 device_binding_version bigint NOT NULL CHECK (device_binding_version > 0),
 trip_membership_version bigint,
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','SENT','SKIPPED','DEAD')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_by varchar(100),
 claim_token uuid,
 locked_until timestamptz,
 last_error_code varchar(80),
 fcm_message_id text,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (notification_id,device_id,device_binding_version),
 FOREIGN KEY (notification_id,recipient_id) REFERENCES notifications(id,recipient_id),
 CHECK ((status = 'PROCESSING' AND locked_by IS NOT NULL AND claim_token IS NOT NULL AND locked_until IS NOT NULL) OR (status <> 'PROCESSING' AND locked_by IS NULL AND claim_token IS NULL AND locked_until IS NULL)),
 CHECK (status <> 'SENT' OR sent_at IS NOT NULL)
);
CREATE INDEX ix_push_pending ON push_deliveries(available_at,id) WHERE status = 'PENDING';
CREATE INDEX ix_push_lease ON push_deliveries(locked_until) WHERE status = 'PROCESSING';
CREATE INDEX ix_push_device ON push_deliveries(device_id);
COMMIT;
