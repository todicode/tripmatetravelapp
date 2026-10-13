package com.tripmate.catalog.application;

import com.tripmate.catalog.api.InterestCatalog;
import com.tripmate.catalog.infrastructure.InterestRepository;
import com.tripmate.shared.web.ApiException;
import com.tripmate.shared.web.ErrorDetailResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InterestService implements InterestCatalog {
    private final InterestRepository interests;
    public InterestService(InterestRepository interests) { this.interests = interests; }
    @Override public List<Interest> list() { return interests.findAll(); }
    @Override public void validate(List<String> codes) {
        var allowed = list().stream().map(Interest::code).collect(Collectors.toSet());
        if (!allowed.containsAll(codes)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR",
                "Sở thích không còn hợp lệ. Vui lòng tải lại danh mục.",
                List.of(new ErrorDetailResponse("interestCodes", "INVALID_VALUE", "Mã sở thích không tồn tại.")), Map.of());
    }
}
