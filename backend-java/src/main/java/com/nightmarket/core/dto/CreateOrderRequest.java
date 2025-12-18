package com.nightmarket.core.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull UUID listingId
) {}
