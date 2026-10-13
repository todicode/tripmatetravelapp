package com.tripmate.trips.infrastructure;

import com.tripmate.trips.application.TripModels.*;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class TripRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public TripRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public String serialize(Object body) {
        return json.writeValueAsString(body);
    }

    public List<City> cities() {
        return jdbc.query("select * from cities where enabled order by name", (r, n) -> city(r));
    }

    private City city(ResultSet r) throws SQLException {
        return new City(
                r.getString("code"),
                r.getString("name"),
                "VN",
                "Asia/Ho_Chi_Minh",
                r.getString("frontend_key"),
                (Double) r.getObject("latitude"),
                (Double) r.getObject("longitude"));
    }

    public boolean cityExists(String code) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "select exists(select 1 from cities where code=? and enabled)",
                        Boolean.class,
                        code));
    }

    public void lockCreate(UUID actor, UUID request) {
        jdbc.queryForList(
                "select pg_advisory_xact_lock(hashtextextended(?,0))", actor + ":" + request);
    }

    public record Receipt(UUID tripId, boolean matches) {}

    public Optional<Receipt> receipt(UUID actor, UUID request, String body) {
        return jdbc
                .query(
                        "select trip_id,request_body=cast(? as jsonb) as matches from"
                            + " trip_create_requests where user_id=? and client_request_id=?",
                        (r, n) -> new Receipt(r.getObject(1, UUID.class), r.getBoolean(2)),
                        body,
                        actor,
                        request)
                .stream()
                .findFirst();
    }

    public void remember(UUID actor, UUID request, UUID trip, String body) {
        jdbc.update(
                "insert into trip_create_requests values(?,?,?,cast(? as jsonb))",
                actor,
                request,
                trip,
                body);
    }

    public void create(UUID id, UUID owner, Create body) {
        jdbc.update(
                """
                insert into trips(id,owner_id,city_code,title,description,date_mode,duration_days,start_date,end_date,budget_vnd)
                values(?,?,?,?,?,?,?,?,?,?)
                """,
                id,
                owner,
                body.cityCode(),
                body.title().trim(),
                body.description(),
                body.dateMode(),
                body.durationDays(),
                body.startDate(),
                body.endDate(),
                com.tripmate.trips.application.TripRules.number(body.budgetVnd()));
        jdbc.update("insert into trip_members(trip_id,user_id) values(?,?)", id, owner);
        jdbc.update("insert into itineraries(trip_id,updated_by) values(?,?)", id, owner);
        resize(id, body.durationDays());
    }

    public Optional<Trip> find(UUID id, UUID actor, boolean lock) {
        if (lock) jdbc.queryForList("select id from trips where id=? for update", id);
        return jdbc
                .query(
                        """
                        select t.*,c.code,c.name,c.frontend_key,c.latitude,c.longitude,i.version as itinerary_version,
                        (select count(*) from trip_members where trip_id=t.id and status='ACTIVE') as member_count
                        from trips t join cities c on c.code=t.city_code join itineraries i on i.trip_id=t.id
                        join trip_members m on m.trip_id=t.id and m.user_id=? and m.status='ACTIVE'
                        where t.id=? and t.deleted_at is null
                        """,
                        (r, n) -> trip(r, actor),
                        actor,
                        id)
                .stream()
                .findFirst();
    }

    private Trip trip(ResultSet r, UUID actor) throws SQLException {
        LocalDate start = r.getObject("start_date", LocalDate.class),
                end = r.getObject("end_date", LocalDate.class);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String phase =
                start == null
                        ? "UNSCHEDULED"
                        : today.isBefore(start)
                                ? "UPCOMING"
                                : today.isAfter(end) ? "PAST" : "ONGOING";
        UUID owner = r.getObject("owner_id", UUID.class);
        return new Trip(
                r.getObject("id", UUID.class),
                owner,
                r.getString("title"),
                r.getString("description"),
                city(r),
                r.getString("date_mode"),
                r.getInt("duration_days"),
                start,
                end,
                r.getString("budget_vnd"),
                "Asia/Ho_Chi_Minh",
                r.getString("status"),
                phase,
                r.getString("version"),
                r.getString("itinerary_version"),
                r.getString("last_chat_seq"),
                r.getInt("member_count"),
                owner.equals(actor) ? "OWNER" : "MEMBER",
                r.getTimestamp("created_at").toInstant(),
                r.getTimestamp("updated_at").toInstant());
    }

    public List<UUID> list(UUID actor, Instant before, UUID beforeId, int count) {
        return jdbc.query(
                """
                select t.id from trips t join trip_members m on m.trip_id=t.id
                where m.user_id=? and m.status='ACTIVE' and t.deleted_at is null
                and (cast(? as timestamptz) is null or (t.created_at,t.id)<(?,?))
                order by t.created_at desc,t.id desc limit ?
                """,
                (r, n) -> r.getObject(1, UUID.class),
                actor,
                before == null ? null : Timestamp.from(before),
                before == null ? null : Timestamp.from(before),
                beforeId,
                count);
    }

    public void update(Trip t) {
        jdbc.update(
                """
                update trips set title=?,description=?,city_code=?,date_mode=?,duration_days=?,start_date=?,end_date=?,
                budget_vnd=?,status=?,version=version+1,updated_at=now() where id=?
                """,
                t.title(),
                t.description(),
                t.city().code(),
                t.dateMode(),
                t.durationDays(),
                t.startDate(),
                t.endDate(),
                t.budgetVnd() == null ? null : Long.valueOf(t.budgetVnd()),
                t.status(),
                t.id());
    }

    public boolean hasItemsAfter(UUID id, int day) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "select exists(select 1 from itinerary_items i join itinerary_days d on"
                            + " d.id=i.day_id where d.trip_id=? and d.day_number>?)",
                        Boolean.class,
                        id,
                        day));
    }

    public void resize(UUID id, int count) {
        jdbc.update("delete from itinerary_days where trip_id=? and day_number>?", id, count);
        for (int day = 1; day <= count; day++)
            jdbc.update(
                    "insert into itinerary_days(id,trip_id,day_number) values(?,?,?) on"
                        + " conflict(trip_id,day_number) do nothing",
                    UUID.randomUUID(),
                    id,
                    day);
    }

    public void delete(UUID id) {
        jdbc.update(
                "update trips set deleted_at=now(),updated_at=now(),version=version+1 where id=?",
                id);
    }

    private String time(ResultSet r, String field) throws SQLException {
        var value = r.getObject(field, LocalTime.class);
        return value == null ? null : value.toString().substring(0, 5);
    }

    public Itinerary itinerary(Trip trip) {
        Map<UUID, List<Item>> items = new HashMap<>();
        jdbc.query(
                "select i.* from itinerary_items i join itinerary_days d on d.id=i.day_id where"
                    + " d.trip_id=? order by d.day_number,i.position",
                r -> {
                    String snapshot = r.getString("place_snapshot");
                    items.computeIfAbsent(r.getObject("day_id", UUID.class), k -> new ArrayList<>())
                            .add(
                                    new Item(
                                            r.getObject("id", UUID.class),
                                            r.getString("kind"),
                                            r.getObject("place_id", UUID.class),
                                            r.getString("custom_title"),
                                            r.getInt("position"),
                                            time(r, "start_time"),
                                            time(r, "end_time"),
                                            r.getString("note"),
                                            r.getString("estimated_cost_vnd"),
                                            r.getString("cost_source"),
                                            r.getString("origin"),
                                            r.getString("status"),
                                            snapshot == null
                                                    ? null
                                                    : json.readValue(snapshot, Snapshot.class)));
                },
                trip.id());
        var days =
                jdbc.query(
                        "select * from itinerary_days where trip_id=? order by day_number",
                        (r, n) -> {
                            UUID id = r.getObject("id", UUID.class);
                            int day = r.getInt("day_number");
                            return new Day(
                                    id,
                                    day,
                                    trip.startDate() == null
                                            ? null
                                            : trip.startDate().plusDays(day - 1),
                                    r.getString("transport_mode"),
                                    r.getString("note"),
                                    items.getOrDefault(id, List.of()));
                        },
                        trip.id());
        return jdbc.queryForObject(
                "select * from itineraries where trip_id=?",
                (r, n) ->
                        new Itinerary(
                                trip.id(),
                                r.getString("version"),
                                trip.version(),
                                trip.timezone(),
                                days,
                                r.getObject("updated_by", UUID.class),
                                r.getTimestamp("updated_at").toInstant()),
                trip.id());
    }

    public Optional<Snapshot> place(UUID id) {
        return jdbc
                .query(
                        "select snapshot from places where id=?",
                        (r, n) ->
                                r.getString(1) == null
                                        ? new Snapshot(
                                                "Địa điểm", "CATALOG", null, null, null, null)
                                        : json.readValue(r.getString(1), Snapshot.class),
                        id)
                .stream()
                .findFirst();
    }

    public UUID savePlace(Snapshot s) {
        UUID id = UUID.randomUUID();
        String providerId = s.providerPlaceId() == null ? id.toString() : s.providerPlaceId();
        return jdbc.queryForObject(
                "insert into places(id,provider,provider_place_id,snapshot) values(?,?,?,cast(? as"
                    + " jsonb)) on conflict(provider,provider_place_id) do update set"
                    + " provider_place_id=excluded.provider_place_id returning id",
                UUID.class,
                id,
                s.provider(),
                providerId,
                serialize(s));
    }

    public void writeDays(UUID trip, UUID actor, List<DayInput> input, Itinerary old) {
        Map<UUID, Item> previous = new HashMap<>();
        old.days().forEach(d -> d.items().forEach(i -> previous.put(i.id(), i)));
        Set<UUID> retained = new HashSet<>();
        input.forEach(
                d ->
                        d.items()
                                .forEach(
                                        i -> {
                                            if (i.id() != null) retained.add(i.id());
                                        }));
        for (UUID id : previous.keySet())
            if (!retained.contains(id)) jdbc.update("delete from itinerary_items where id=?", id);
        for (DayInput d : input) {
            UUID day = old.days().get(d.dayNumber() - 1).id();
            jdbc.update(
                    "update itinerary_days set transport_mode=?,note=? where id=?",
                    d.transportMode(),
                    d.note(),
                    day);
            int position = 0;
            for (ItemInput item : d.items()) {
                Item prior = item.id() == null ? null : previous.get(item.id());
                Snapshot snapshot =
                        item.placeSnapshot() != null
                                ? item.placeSnapshot()
                                : item.placeId() != null
                                        ? place(item.placeId()).orElseThrow()
                                        : null;
                UUID place =
                        item.placeId() != null
                                ? item.placeId()
                                : snapshot == null ? null : savePlace(snapshot);
                jdbc.update(
                        """
                        insert into itinerary_items(id,day_id,place_id,kind,custom_title,position,start_time,end_time,note,
                        estimated_cost_vnd,cost_source,origin,created_by,updated_by,status,place_snapshot)
                        values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,cast(? as jsonb))
                        on conflict(id) do update set day_id=excluded.day_id,place_id=excluded.place_id,kind=excluded.kind,
                        custom_title=excluded.custom_title,position=excluded.position,start_time=excluded.start_time,
                        end_time=excluded.end_time,note=excluded.note,estimated_cost_vnd=excluded.estimated_cost_vnd,
                        cost_source=excluded.cost_source,updated_by=excluded.updated_by,updated_at=now(),place_snapshot=excluded.place_snapshot
                        """,
                        item.id() == null ? UUID.randomUUID() : item.id(),
                        day,
                        place,
                        item.kind(),
                        item.customTitle() != null
                                ? item.customTitle()
                                : snapshot == null ? null : snapshot.name(),
                        position++,
                        item.startTime() == null ? null : Time.valueOf(item.startTime() + ":00"),
                        item.endTime() == null ? null : Time.valueOf(item.endTime() + ":00"),
                        item.note(),
                        com.tripmate.trips.application.TripRules.number(item.estimatedCostVnd()),
                        item.estimatedCostVnd() == null ? "UNKNOWN" : "USER",
                        prior == null ? "MANUAL" : prior.origin(),
                        actor,
                        actor,
                        prior == null ? "PENDING" : prior.status(),
                        snapshot == null ? null : serialize(snapshot));
            }
        }
    }

    public void bumpItinerary(UUID id, UUID actor) {
        jdbc.update(
                "update itineraries set version=version+1,updated_by=?,updated_at=now() where"
                    + " trip_id=?",
                actor,
                id);
    }

    public void progress(UUID trip, UUID item, String status, UUID actor) {
        if (status.equals("ACTIVE"))
            jdbc.update(
                    "update itinerary_items set status='COMPLETED',updated_by=?,updated_at=now()"
                        + " where status='ACTIVE' and id<>? and day_id in(select id from"
                        + " itinerary_days where trip_id=?)",
                    actor,
                    item,
                    trip);
        jdbc.update(
                "update itinerary_items set status=?,updated_by=?,updated_at=now() where id=?",
                status,
                actor,
                item);
    }

    public void recomputeStatus(UUID id) {
        jdbc.update(
                """
                update trips set status=case when exists(select 1 from itinerary_items i join itinerary_days d on d.id=i.day_id where d.trip_id=trips.id)
                and not exists(select 1 from itinerary_items i join itinerary_days d on d.id=i.day_id where d.trip_id=trips.id and i.status<>'COMPLETED')
                then 'COMPLETED' else 'UPCOMING' end, version=version+1,updated_at=now() where id=? and status<>'CANCELLED'
                """,
                id);
    }
}
