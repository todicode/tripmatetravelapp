package com.tripmate.trips.application;

import com.tripmate.trips.api.GroupTripSharing;
import com.tripmate.trips.infrastructure.GroupTripSharingRepository;
import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@Transactional
public class GroupTripSharingService implements GroupTripSharing {
    private final GroupTripSharingRepository trips;
    public GroupTripSharingService(GroupTripSharingRepository trips) { this.trips = trips; }
    private TripView owned(UUID tripId, UUID ownerId) {
        return trips.findOwned(tripId, ownerId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi thuộc trưởng nhóm."));
    }
    @Override public void requireOwned(UUID tripId, UUID ownerId) { owned(tripId, ownerId); }
    @Override public TripView viewOwned(UUID tripId, UUID ownerId) {
        var trip = owned(tripId, ownerId);
        return new TripView(trip.id(), trip.ownerId(), trip.title(), trip.description(), trip.cityCode(), trip.cityName(),
                trip.startDate(), trip.endDate(), trip.budgetVnd(), trip.version(), trips.itinerary(trip));
    }
}
