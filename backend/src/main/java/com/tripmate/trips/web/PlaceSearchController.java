package com.tripmate.trips.web;

import com.tripmate.trips.application.PlaceSearchService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/places")
public class PlaceSearchController {
    private final PlaceSearchService places;

    public PlaceSearchController(PlaceSearchService places) {
        this.places = places;
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String cityCode,
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = false) String cursor,
            HttpServletRequest request) {
        return TripController.response(places.search(cityCode, q, limit, cursor), request, 200);
    }
}
