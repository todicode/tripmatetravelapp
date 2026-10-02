package com.tripmate.catalog.infrastructure;

import com.tripmate.catalog.api.InterestCatalog.Interest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class InterestRepository {
    private final JdbcTemplate jdbc;
    public InterestRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Interest> findAll() {
        return jdbc.query("SELECT code,label FROM interests ORDER BY code", (row, index) -> new Interest(row.getString("code"), row.getString("label")));
    }
}
