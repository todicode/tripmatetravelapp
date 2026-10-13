-- Preserve V8/V9 data; new clients can plan without fixed dates.
ALTER TABLE trips DROP CONSTRAINT trips_check;
ALTER TABLE trips ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE trips ADD COLUMN date_mode varchar(16) NOT NULL DEFAULT 'SPECIFIC';
ALTER TABLE trips ADD COLUMN duration_days smallint;
UPDATE trips SET duration_days = end_date - start_date + 1;
ALTER TABLE trips ALTER COLUMN duration_days SET NOT NULL;
-- Existing integrations inserting fixed-date trips can omit duration_days.
CREATE FUNCTION derive_trip_duration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.date_mode = 'SPECIFIC' THEN NEW.duration_days := NEW.end_date - NEW.start_date + 1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER derive_trip_duration BEFORE INSERT OR UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION derive_trip_duration();
ALTER TABLE trips ADD COLUMN status varchar(16) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING','COMPLETED','CANCELLED'));
ALTER TABLE trips ADD CONSTRAINT trip_schedule CHECK (
 duration_days BETWEEN 1 AND 30 AND
 ((date_mode='SPECIFIC' AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date-start_date+1=duration_days)
 OR (date_mode='FLEXIBLE' AND start_date IS NULL AND end_date IS NULL)));
ALTER TABLE itinerary_days DROP CONSTRAINT itinerary_days_day_number_check;
ALTER TABLE itinerary_days ADD CONSTRAINT itinerary_days_day_number_check CHECK (day_number BETWEEN 1 AND 30);
ALTER TABLE itinerary_items ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE itinerary_items ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE itinerary_items ADD COLUMN status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','COMPLETED'));
ALTER TABLE itinerary_items ADD COLUMN place_snapshot jsonb;
ALTER TABLE places DROP CONSTRAINT places_provider_check;
ALTER TABLE places ADD CONSTRAINT places_provider_check CHECK (provider IN ('GOOGLE','OSM','CATALOG','MANUAL'));
ALTER TABLE places ADD COLUMN snapshot jsonb;
ALTER TABLE cities ADD COLUMN latitude double precision;
ALTER TABLE cities ADD COLUMN longitude double precision;
ALTER TABLE cities ADD COLUMN frontend_key varchar(64);
CREATE TABLE trip_create_requests (
 user_id uuid NOT NULL REFERENCES app_users(id),
 client_request_id uuid NOT NULL,
 trip_id uuid NOT NULL REFERENCES trips(id),
 request_body jsonb NOT NULL,
 PRIMARY KEY (user_id,client_request_id)
);
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('DALAT','Đà Lạt',11.9404,108.4583,'dalat') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('NINHBINH','Ninh Bình',20.2506,105.9745,'ninhbinh') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('DANANG','Đà Nẵng',16.0544,108.2022,'danang') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('PHUQUOC','Phú Quốc',10.2289,103.9572,'phuquoc') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('SAPA','Sa Pa',22.3364,103.8438,'sapa') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('HOIAN','Hội An',15.8801,108.338,'hoian') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('NHATRANG','Nha Trang',12.2388,109.1967,'nhatrang') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('HUE','Huế',16.4637,107.5909,'hue') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('HANOI','Hà Nội',21.0285,105.8542,'hanoi') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('SAIGON','TP. Hồ Chí Minh',10.8231,106.6297,'saigon') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
INSERT INTO cities(code,name,latitude,longitude,frontend_key) VALUES ('HAGIANG','Hà Giang',22.8233,104.9839,'hagiang') ON CONFLICT(code) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,frontend_key=EXCLUDED.frontend_key;
