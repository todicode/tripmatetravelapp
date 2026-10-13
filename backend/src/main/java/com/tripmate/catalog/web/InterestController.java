package com.tripmate.catalog.web;

import com.tripmate.catalog.api.InterestCatalog;
import com.tripmate.shared.web.ApiResponse;
import com.tripmate.shared.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;

@RestController
public class InterestController {
    private final InterestCatalog interests;
    public InterestController(InterestCatalog interests) { this.interests = interests; }
    public record InterestList(List<InterestCatalog.Interest> items) {}
    @GetMapping("/api/v1/interests")
    public ApiResponse<InterestList> list(HttpServletRequest request) {
        return new ApiResponse<>(new InterestList(interests.list()), (UUID) request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE));
    }
}
