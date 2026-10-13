package com.tripmate.trips;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import com.tripmate.shared.web.ApiException;
import com.tripmate.trips.infrastructure.PhotonClient;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

class PhotonClientTest {
    @Test
    void preservesOsmIdentityCoordinatesAndSkipsIncompleteResults() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/api/",
                exchange -> {
                    assertTrue(exchange.getRequestURI().getQuery().contains("lat=11.9"));
                    byte[] bytes =
                            """
                            {"features":[{"properties":{"name":"Cafe","osm_id":123,"osm_type":"N","city":"Dalat"},"geometry":{"coordinates":[108.4,11.9]}},
                            {"properties":{"name":"Missing identity"},"geometry":{"coordinates":[108,11]}}]}
                            """
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, bytes.length);
                    exchange.getResponseBody().write(bytes);
                    exchange.close();
                });
        server.start();
        try {
            var client =
                    new PhotonClient(
                            JsonMapper.builder().build(),
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/api/");
            var found = client.search("Cafe", 11.9, 108.4, 5);
            assertEquals(1, found.size());
            assertEquals("N:123", found.getFirst().providerPlaceId());
            assertEquals(11.9, found.getFirst().lat());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void mapsProviderFailureToServiceUnavailable() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/",
                exchange -> {
                    exchange.sendResponseHeaders(429, -1);
                    exchange.close();
                });
        server.start();
        try {
            var client =
                    new PhotonClient(
                            JsonMapper.builder().build(),
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/");
            assertEquals(
                    "PLACES_UNAVAILABLE",
                    assertThrows(ApiException.class, () -> client.search("Cafe", null, null, 5))
                            .getCode());
        } finally {
            server.stop(0);
        }
    }
}
