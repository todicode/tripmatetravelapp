package com.tripmate.trips.infrastructure;

import com.tripmate.trips.application.TripModels.Snapshot;
import com.tripmate.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Component
public class PhotonClient {
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final ObjectMapper json;
    private final String endpoint;
    public PhotonClient(ObjectMapper json,@Value("${tripmate.places.photon-url:https://photon.komoot.io/api/}") String endpoint) {this.json=json;this.endpoint=endpoint;}
    public List<Snapshot> search(String query,Double lat,Double lng,int limit) {
        String bias=lat==null||lng==null?"":"&lat="+lat+"&lon="+lng;
        var request=HttpRequest.newBuilder(URI.create(endpoint+"?q="+URLEncoder.encode(query,StandardCharsets.UTF_8)+"&limit="+limit+bias))
                .timeout(Duration.ofSeconds(6)).header("User-Agent","TripMate/1.0").GET().build();
        try {
            var response=http.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200) throw new java.io.IOException("Provider unavailable");
            var items=new ArrayList<Snapshot>();
            for(var feature:json.readTree(response.body()).path("features")) {
                var p=feature.path("properties");var coordinates=feature.path("geometry").path("coordinates");
                if(!p.hasNonNull("name")||!p.hasNonNull("osm_id")||!p.hasNonNull("osm_type")||coordinates.size()<2) continue;
                double longitude=coordinates.get(0).asDouble(),latitude=coordinates.get(1).asDouble();
                if(!Double.isFinite(latitude)||!Double.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) continue;
                items.add(new Snapshot(p.path("name").asText(),"OSM",p.path("osm_type").asText()+":"+p.path("osm_id").asText(),latitude,longitude,
                        String.join(", ",List.of(p.path("street").asText(""),p.path("city").asText(""),p.path("state").asText("")).stream().filter(s->!s.isBlank()).toList())));
                if(items.size()==limit) break;
            }
            return items;
        } catch(InterruptedException e) {Thread.currentThread().interrupt();throw unavailable();}
        catch(java.io.IOException | RuntimeException e) {throw unavailable();}
    }
    private ApiException unavailable() {return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"PLACES_UNAVAILABLE","Không tìm được địa điểm. Bạn vẫn có thể nhập thủ công.");}
}
