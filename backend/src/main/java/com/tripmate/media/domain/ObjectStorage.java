package com.tripmate.media.domain;

import java.io.InputStream;

public interface ObjectStorage {
    void put(String key, byte[] content);
    InputStream open(String key);
    void delete(String key);
}
