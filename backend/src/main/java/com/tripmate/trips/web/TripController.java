package com.tripmate.trips.web;

import com.tripmate.trips.application.TripService;
import com.tripmate.trips.application.TripModels.*;
import com.tripmate.shared.web.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class TripController {
    private final TripService trips;
    public TripController(TripService trips) {this.trips=trips;}
    @GetMapping("/cities") public ResponseEntity<?> cities(HttpServletRequest r) {return response(Map.of("items",trips.cities()),r,200);}
    @GetMapping("/trips") public ResponseEntity<?> list(@RequestParam(required=false) String cursor,@RequestParam(defaultValue="20") int limit,HttpServletRequest r) {return response(trips.list(cursor,limit),r,200);}
    @PostMapping(value="/trips",consumes="application/json") public ResponseEntity<?> create(@Valid @RequestBody Create b,HttpServletRequest r) {return response(trips.create(b),r,201);}
    @GetMapping("/trips/{id}") public ResponseEntity<?> get(@PathVariable UUID id,HttpServletRequest r) {return response(trips.get(id),r,200);}
    @PatchMapping(value="/trips/{id}",consumes="application/json") public ResponseEntity<?> update(@PathVariable UUID id,@RequestBody Map<String,Object> b,HttpServletRequest r) {return response(trips.update(id,b),r,200);}
    @DeleteMapping("/trips/{id}") public ResponseEntity<?> delete(@PathVariable UUID id,@RequestParam String expectedTripVersion,HttpServletRequest r) {trips.delete(id,expectedTripVersion);return ResponseEntity.noContent().header("Cache-Control","private, no-store").build();}
    @GetMapping("/trips/{id}/itinerary") public ResponseEntity<?> itinerary(@PathVariable UUID id,HttpServletRequest r) {return response(trips.itinerary(id),r,200);}
    @PutMapping(value="/trips/{id}/itinerary",consumes="application/json") public ResponseEntity<?> replace(@PathVariable UUID id,@Valid @RequestBody Replace b,HttpServletRequest r) {return response(trips.replace(id,b),r,200);}
    @PatchMapping(value="/trips/{id}/itinerary/items/{item}/status",consumes="application/json") public ResponseEntity<?> progress(@PathVariable UUID id,@PathVariable UUID item,@Valid @RequestBody Progress b,HttpServletRequest r) {return response(trips.progress(id,item,b),r,200);}
    static <T> ResponseEntity<ApiResponse<T>> response(T value,HttpServletRequest r,int status) {
        UUID requestId=(UUID)r.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return ResponseEntity.status(status).header("Cache-Control","private, no-store").body(new ApiResponse<>(value,requestId));
    }
}
