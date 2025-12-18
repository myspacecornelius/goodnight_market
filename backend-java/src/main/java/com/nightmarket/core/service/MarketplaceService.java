package com.nightmarket.core.service;

import com.nightmarket.core.domain.Listing;
import com.nightmarket.core.domain.Order;
import com.nightmarket.core.domain.OrderItem;
import com.nightmarket.core.domain.User;
import com.nightmarket.core.repository.ListingRepository;
import com.nightmarket.core.repository.OrderRepository;
import com.nightmarket.core.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MarketplaceService {

    private final ListingRepository listingRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Listing> searchListings(
            String status,
            UUID sellerId,
            Integer minPrice,
            Integer maxPrice,
            String q,
            Instant cursorCreatedAt,
            UUID cursorId,
            int limit
    ) {
        // Enforce max limit
        if (limit > 50) {
            limit = 50;
        }
        if (limit < 1) {
            limit = 20;
        }

        return listingRepository.search(
            status,
            sellerId,
            minPrice,
            maxPrice,
            q,
            cursorCreatedAt,
            cursorId,
            limit
        );
    }

    @Transactional
    public Order createOrder(UUID buyerId, UUID listingId) {
        // Fetch listing
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new EntityNotFoundException("Listing not found"));
        
        // Check if active
        if (!"ACTIVE".equals(listing.getStatus())) {
            throw new IllegalStateException("Listing is not active");
        }
        
        // Fetch buyer
        User buyer = userRepository.getReferenceById(buyerId);
        
        // Create order
        Order order = new Order();
        order.setBuyer(buyer);
        order.setStatus("PENDING");
        order.setTotalCents(listing.getPriceCents());
        
        OrderItem item = new OrderItem();
        item.setListing(listing);
        item.setPriceCents(listing.getPriceCents());
        order.addItem(item);
        
        // Mark listing as SOLD
        listing.setStatus("SOLD");
        listingRepository.save(listing);
        
        return orderRepository.save(order);
    }
}
