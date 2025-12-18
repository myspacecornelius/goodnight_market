package com.nightmarket.core.dto;

import java.util.UUID;

public record UserCountDto(
    UUID userId,
    String username,
    Long count
) {}
