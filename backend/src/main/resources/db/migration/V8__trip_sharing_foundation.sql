-- Additive foundation from the planned schema for owner-verified group trip sharing.
-- Trip creation/edit APIs remain a separate feature. Roll back code, retain data.
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

CREATE TABLE places (
 id uuid PRIMARY KEY,
 provider varchar(16) NOT NULL DEFAULT 'GOOGLE' CHECK (provider = 'GOOGLE'),
 provider_place_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (provider,provider_place_id)
);

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
