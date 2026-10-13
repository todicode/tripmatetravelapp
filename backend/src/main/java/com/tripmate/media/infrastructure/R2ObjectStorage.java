package com.tripmate.media.infrastructure;

import com.tripmate.media.domain.ObjectStorage;
import com.tripmate.shared.web.ApiException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

@Component
public class R2ObjectStorage implements ObjectStorage {
    private final String endpoint, bucket, accessKey, secretKey;
    private S3Client client;
    public R2ObjectStorage(@Value("${tripmate.media.endpoint}") String endpoint,
                           @Value("${tripmate.media.bucket}") String bucket,
                           @Value("${tripmate.media.access-key}") String accessKey,
                           @Value("${tripmate.media.secret-key}") String secretKey) {
        this.endpoint = endpoint; this.bucket = bucket; this.accessKey = accessKey; this.secretKey = secretKey;
    }
    private synchronized S3Client client() {
        if (client != null) return client;
        if (endpoint.isBlank() || bucket.isBlank() || accessKey.isBlank() || secretKey.isBlank()) throw unavailable();
        URI uri = URI.create(endpoint);
        if (!"https".equals(uri.getScheme()) || uri.getUserInfo() != null) throw unavailable();
        client = S3Client.builder().endpointOverride(uri).region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .serviceConfiguration(config -> config.chunkedEncodingEnabled(false))
                .requestChecksumCalculation(software.amazon.awssdk.core.checksums.RequestChecksumCalculation.WHEN_REQUIRED)
                .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(60))
                        .apiCallAttemptTimeout(Duration.ofSeconds(25))).build();
        return client;
    }
    @Override public void put(String key, byte[] content) {
        try { client().putObject(request -> request.bucket(bucket).key(key).contentType("image/jpeg"), RequestBody.fromBytes(content)); }
        catch (RuntimeException exception) { throw unavailable(); }
    }
    @Override public InputStream open(String key) {
        try { return client().getObject(request -> request.bucket(bucket).key(key)); }
        catch (RuntimeException exception) { throw unavailable(); }
    }
    @Override public void delete(String key) {
        try { client().deleteObject(request -> request.bucket(bucket).key(key)); }
        catch (RuntimeException exception) { throw unavailable(); }
    }
    @PreDestroy void close() { if (client != null) client.close(); }
    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE", "Dịch vụ lưu ảnh chưa sẵn sàng. Vui lòng thử lại sau.");
    }
}
