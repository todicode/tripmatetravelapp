package com.tripmate.trips.application;

import java.time.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class TripModels {
    private TripModels() {}
    public record Snapshot(@NotBlank @Size(max=160) String name, @NotNull String provider,
                           @Size(max=200) String providerPlaceId, Double lat, Double lng, @Size(max=500) String address) {}
    public record ItemInput(UUID id, @NotNull String kind, UUID placeId, @Size(max=160) String customTitle,
                            String startTime, String endTime, @Size(max=2000) String note,
                            Object estimatedCostVnd, @Valid Snapshot placeSnapshot) {}
    public record DayInput(@Min(1) @Max(30) int dayNumber, @NotNull String transportMode,
                           @Size(max=2000) String note, @NotNull @Size(max=50) List<@NotNull @Valid ItemInput> items) {}
    public record Create(@NotNull UUID clientRequestId, @NotBlank @Size(max=160) String title,
                         @NotBlank @Size(max=32) String cityCode, @Size(max=2000) String description,
                         @NotNull String dateMode, @Min(1) @Max(30) int durationDays,
                         LocalDate startDate, LocalDate endDate, Object budgetVnd,
                         @NotNull @Size(min=1,max=30) List<@NotNull @Valid DayInput> days) {}
    public record Replace(@NotNull Object expectedVersion, @NotNull @Size(min=1,max=30) List<@NotNull @Valid DayInput> days) {}
    public record Progress(@NotNull Object expectedVersion, @NotNull String status) {}
    public record City(String code, String name, String countryCode, String timezone,
                       String frontendKey, Double latitude, Double longitude) {}
    public record Trip(UUID id, UUID ownerId, String title, String description, City city,
                       String dateMode, int durationDays, LocalDate startDate, LocalDate endDate,
                       String budgetVnd, String timezone, String status, String phase, String version,
                       String itineraryVersion, String lastChatSeq, int memberCount, String myRole,
                       Instant createdAt, Instant updatedAt) {}
    public record Item(UUID id, String kind, UUID placeId, String customTitle, int position,
                       String startTime, String endTime, String note, String estimatedCostVnd,
                       String costSource, String origin, String status, Snapshot placeSnapshot) {}
    public record Day(UUID id, int dayNumber, LocalDate date, String transportMode, String note, List<Item> items) {}
    public record Itinerary(UUID tripId, String version, String tripVersion, String timezone,
                            List<Day> days, UUID updatedBy, Instant updatedAt) {}
    public record PageInfo(String nextCursor, boolean hasMore) {}
    public record Page(List<Trip> items, PageInfo pageInfo) {}
}
