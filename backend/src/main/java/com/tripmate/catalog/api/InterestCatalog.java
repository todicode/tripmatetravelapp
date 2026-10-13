package com.tripmate.catalog.api;

import java.util.List;

public interface InterestCatalog {
    record Interest(String code, String label) {}
    List<Interest> list();
    void validate(List<String> codes);
}
