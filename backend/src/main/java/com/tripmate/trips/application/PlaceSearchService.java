package com.tripmate.trips.application;

import com.tripmate.trips.infrastructure.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

@Service
public class PlaceSearchService {
    private final PhotonClient photon;
    private final TripRepository trips;
    private final TripService access;
    private final TransactionTemplate transactions;

    public PlaceSearchService(
            PhotonClient photon,
            TripRepository trips,
            TripService access,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.photon = photon;
        this.trips = trips;
        this.access = access;
        this.transactions = new TransactionTemplate(manager);
    }

    public Map<String, Object> search(String code, String query, int limit, String cursor) {
        access.actor();
        TripRules.text(query, 200);
        if (limit < 1 || limit > 20 || cursor != null)
            throw TripRules.invalid("Tìm kiếm hỗ trợ tối đa 20 kết quả, không có cursor.");
        var city =
                trips.cities().stream()
                        .filter(c -> c.code().equals(code))
                        .findFirst()
                        .orElseThrow(() -> TripRules.invalid("Điểm đến chưa được hỗ trợ."));
        // No database transaction is held during the network request.
        var found = photon.search(query, city.latitude(), city.longitude(), limit);
        return transactions.execute(
                tx -> {
                    var items = new ArrayList<Map<String, Object>>();
                    for (var snapshot : found) {
                        var result = new LinkedHashMap<String, Object>();
                        result.put("id", trips.savePlace(snapshot));
                        result.put("provider", snapshot.provider());
                        result.put("providerPlaceId", snapshot.providerPlaceId());
                        result.put("cityCode", code);
                        result.put("displayName", snapshot.name());
                        result.put("formattedAddress", snapshot.address());
                        result.put(
                                "coordinates",
                                Map.of("latitude", snapshot.lat(), "longitude", snapshot.lng()));
                        result.put("rating", null);
                        result.put("openingHours", null);
                        result.put("availability", "AVAILABLE");
                        result.put(
                                "attributions",
                                List.of(
                                        Map.of(
                                                "text",
                                                "© OpenStreetMap contributors",
                                                "url",
                                                "https://www.openstreetmap.org/copyright")));
                        items.add(result);
                    }
                    return Map.of("items", items, "pageInfo", new TripModels.PageInfo(null, false));
                });
    }
}
