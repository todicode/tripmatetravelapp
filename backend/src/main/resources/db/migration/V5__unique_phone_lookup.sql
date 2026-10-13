-- Rollback: DROP INDEX uq_app_users_phone_lookup; ALTER TABLE app_users DROP COLUMN phone_lookup;
-- Inspect duplicates with the normalization below before deploying to a database with existing users.
ALTER TABLE app_users ADD COLUMN phone_lookup varchar(15) GENERATED ALWAYS AS (
    CASE WHEN phone IS NULL THEN NULL
         WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
              AND left(regexp_replace(phone, '[^0-9]', '', 'g'), 2) = '84'
         THEN '0' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
         ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END
) STORED;

CREATE UNIQUE INDEX uq_app_users_phone_lookup ON app_users(phone_lookup) WHERE phone_lookup IS NOT NULL;
