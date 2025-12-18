package com.nightmarket.core.web.error;

import java.time.Instant;
import java.util.List;

public record ApiError(
    String code,
    String message,
    String requestId,
    Instant timestamp,
    List<FieldError> fieldErrors
) {
    public record FieldError(String field, String message) {}
}
