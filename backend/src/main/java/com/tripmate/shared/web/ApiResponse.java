package com.tripmate.shared.web;

import java.util.UUID;

public record ApiResponse<T>(T data, UUID requestId) {
}
