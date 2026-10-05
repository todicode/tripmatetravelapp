package com.tripmate.trips.infrastructure;

import com.tripmate.trips.api.GroupTripSharing.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Repository
public class GroupTripSharingRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public GroupTripSharingRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<TripView> findOwned(UUID tripId, UUID ownerId) {
        return jdbc.query("select t.*, c.name as city_name from trips t join cities c on c.code=t.city_code "
                + "where t.id=:trip and t.owner_id=:owner and t.deleted_at is null for share of t",
                Map.of("trip", tripId, "owner", ownerId), (r, n) -> new TripView(tripId, ownerId,
                        r.getString("title"), r.getString("description"), r.getString("city_code"), r.getString("city_name"),
                        r.getDate("start_date").toLocalDate(), r.getDate("end_date").toLocalDate(),
                        r.getString("budget_vnd"), r.getString("version"), null)).stream().findFirst();
    }
    public ItineraryView itinerary(TripView trip) {
        var params = Map.of("trip", trip.id());
        String version = jdbc.query("select version from itineraries where trip_id=:trip for share", params,
                (r, n) -> r.getString(1)).stream().findFirst().orElse("0");
        var days = jdbc.query("select * from itinerary_days where trip_id=:trip order by day_number", params,
                (r, n) -> {
                    UUID day = r.getObject("id", UUID.class);
                    var items = jdbc.query("select * from itinerary_items where day_id=:day order by position", Map.of("day", day),
                            (i, k) -> new ItemView(i.getObject("id", UUID.class), i.getString("kind"), i.getObject("place_id", UUID.class),
                                    i.getString("custom_title"), i.getTime("start_time").toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")),
                                    i.getTime("end_time").toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")), i.getString("note"),
                                    i.getString("estimated_cost_vnd"), i.getString("cost_source"), i.getString("origin")));
                    int number = r.getInt("day_number");
                    return new DayView(day, number, trip.startDate().plusDays(number - 1), r.getString("transport_mode"), r.getString("note"), items);
                });
        return new ItineraryView(version, days);
    }
}
