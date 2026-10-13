package com.tripmate.trips;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="GROUP_TEST_DATABASE_URL", matches="jdbc:postgresql://.*/tripmate_group_test")
class TripMigrationTest {
    @Test void upgradesExistingFixedDateTripAndAcceptsThirtyFlexibleDays() {
        String schema="trip_upgrade_"+UUID.randomUUID().toString().replace("-", "");
        var ds=new DriverManagerDataSource(System.getenv("GROUP_TEST_DATABASE_URL")+"?currentSchema="+schema,
                "tripmate",System.getenv("GROUP_TEST_DATABASE_PASSWORD"));
        var config=Flyway.configure().dataSource(ds).schemas(schema).defaultSchema(schema).locations("classpath:db/migration");
        config.target("9").load().migrate();
        var jdbc=new JdbcTemplate(ds);
        UUID user=UUID.randomUUID(), trip=UUID.randomUUID();
        // A single SQL statement keeps the deferred owner FK inside one transaction.
        jdbc.update("""
            with u as (insert into app_users(id,email,password_hash,display_name,friend_code)
              values (?,?,'hash','Owner',?) returning id),
            c as (insert into cities(code,name) values ('DANANG','Existing name') returning code),
            t as (insert into trips(id,owner_id,city_code,title,start_date,end_date)
              select ?,u.id,c.code,'Keep me','2027-01-01','2027-01-02' from u,c returning id,owner_id)
            insert into trip_members(trip_id,user_id) select id,owner_id from t
            """,user,user+"@example.test",user.toString().replace("-", ""),trip);
        config.target("latest").load().migrate();
        assertEquals(2,jdbc.queryForObject("select duration_days from trips where id=?",Integer.class,trip));
        assertEquals("Existing name",jdbc.queryForObject("select name from cities where code='DANANG'",String.class));
        jdbc.update("update trips set date_mode='FLEXIBLE',start_date=null,end_date=null,duration_days=30 where id=?",trip);
        assertEquals(30,jdbc.queryForObject("select duration_days from trips where id=?",Integer.class,trip));
        assertThrows(Exception.class,()->jdbc.update("update trips set duration_days=31 where id=?",trip));
        config.load().validate();
    }
}
