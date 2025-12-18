package com.nightmarket.core.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nightmarket.core.domain.IdempotencyKey;
import com.nightmarket.core.domain.Listing;
import com.nightmarket.core.domain.Order;
import com.nightmarket.core.dto.CreateOrderRequest;
import com.nightmarket.core.service.IdempotencyService;
import com.nightmarket.core.service.MarketplaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @GetMapping("/listings/search")
    public ResponseEntity<List<Listing>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID sellerId,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Instant cursorCreatedAt,
            @RequestParam(required = false) UUID cursorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        List<Listing> listings = marketplaceService.searchListings(
                status,
                sellerId,
                minPrice,
                maxPrice,
                q,
                cursorCreatedAt,
                cursorId,
                limit
        );
        return ResponseEntity.ok(listings);
    }

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(
            Authentication authentication,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        
        String requestBody = "";
        if (idempotencyKey != null) {
            try {
                requestBody = objectMapper.writeValueAsString(request);
            } catch (Exception e) {
                // Ignore
            }
            
            Optional<IdempotencyKey> existing = idempotencyService.getKey(idempotencyKey, userId, requestBody);
            if (existing.isPresent()) {
                try {
                    Order savedOrder = objectMapper.readValue(existing.get().getResponseBody(), Order.class);
                    return ResponseEntity.ok(savedOrder);
                } catch (Exception e) {
                    throw new IllegalStateException("Failed to deserialize idempotent response", e);
                }
            }
        }
        
        Order order = marketplaceService.createOrder(userId, request.listingId());
        
        if (idempotencyKey != null) {
            idempotencyService.saveKey(idempotencyKey, userId, requestBody, 200, order);
        }
        
        return ResponseEntity.ok(order);
    }
}
