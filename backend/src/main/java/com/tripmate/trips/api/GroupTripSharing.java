package com.tripmate.trips.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A group link grants a read-only view, never trip membership or edit permission. */
public interface GroupTripSharing {
    void requireOwned(UUID tripId, UUID ownerId);
    TripView viewOwned(UUID tripId, UUID ownerId);
    record TripView(UUID id, UUID ownerId, String title, String description, String cityCode, String cityName,
                    LocalDate startDate, LocalDate endDate, String budgetVnd, String version, ItineraryView itinerary) {}
    record ItineraryView(String version, List<DayView> days) {}
    record DayView(UUID id, int dayNumber, LocalDate date, String transportMode, String note, List<ItemView> items) {}
    record ItemView(UUID id, String kind, UUID placeId, String title, String startTime, String endTime,
                    String note, String estimatedCostVnd, String costSource, String origin) {}
}
