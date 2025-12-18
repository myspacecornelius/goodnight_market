package com.nightmarket.core.repository;

import com.nightmarket.core.domain.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ListingRepository extends JpaRepository<Listing, UUID> {

    @Query(value = """
        SELECT * FROM listings l
        WHERE (:status IS NULL OR l.status = :status)
          AND (cast(:sellerId as uuid) IS NULL OR l.seller_id = :sellerId)
          AND (:minPrice IS NULL OR l.price_cents >= :minPrice)
          AND (:maxPrice IS NULL OR l.price_cents <= :maxPrice)
          AND (:q IS NULL OR l.title ILIKE '%' || :q || '%')
          AND (
            cast(:cursorCreatedAt as timestamp with time zone) IS NULL 
            OR (l.created_at < :cursorCreatedAt) 
            OR (l.created_at = :cursorCreatedAt AND l.id < :cursorId)
          )
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Listing> search(
        @Param("status") String status,
        @Param("sellerId") UUID sellerId,
        @Param("minPrice") Integer minPrice,
        @Param("maxPrice") Integer maxPrice,
        @Param("q") String q,
        @Param("cursorCreatedAt") Instant cursorCreatedAt,
        @Param("cursorId") UUID cursorId,
        @Param("limit") int limit
    );
}
