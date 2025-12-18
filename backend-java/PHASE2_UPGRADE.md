# Night Market Phase 2 Upgrade Plan

## Overview
This document outlines the Phase 2 upgrades for the Night Market backend.

## 1. OpenAPI + Typed Error Model

### Dependencies (pom.xml)
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

### Error Response Schema
```java
// com.nightmarket.core.web.error.ApiError
public record ApiError(
    String code,
    String message,
    String requestId,
    Instant timestamp,
    List<FieldError> fieldErrors
) {
    public record FieldError(String field, String message) {}
}
```

### GlobalExceptionHandler
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex);
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAuth(AccessDeniedException ex);
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex);
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleConflict(DataIntegrityViolationException ex);
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex);
}
```

## 2. Marketplace Search v1

### Migration V2
```sql
-- Indexes for search
CREATE INDEX idx_listings_title_trgm ON listings USING gin (title gin_trgm_ops);
CREATE INDEX idx_listings_price ON listings(price_cents);
CREATE INDEX idx_listings_status_created ON listings(status, created_at DESC, id DESC);
```

### Search Query (Native SQL)
```sql
SELECT l.* FROM listings l
WHERE (:status IS NULL OR l.status = :status)
  AND (:sellerId IS NULL OR l.seller_id = :sellerId)
  AND (:minPrice IS NULL OR l.price_cents >= :minPrice)
  AND (:maxPrice IS NULL OR l.price_cents <= :maxPrice)
  AND (:q IS NULL OR l.title ILIKE '%' || :q || '%')
  AND (
    :cursorCreatedAt IS NULL 
    OR (l.created_at < :cursorCreatedAt) 
    OR (l.created_at = :cursorCreatedAt AND l.id < :cursorId)
  )
ORDER BY l.created_at DESC, l.id DESC
LIMIT :limit
```

## 3. Feed Enrichment

### Enriched Feed Query
```sql
SELECT 
    p.id, p.body, p.created_at,
    u.id as author_id, u.username as author_username,
    COALESCE(lc.like_count, 0) as like_count,
    COALESCE(cc.comment_count, 0) as comment_count,
    EXISTS(SELECT 1 FROM likes WHERE user_id = :viewerId AND post_id = p.id) as viewer_has_liked
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN follows f ON p.author_id = f.followee_id AND f.follower_id = :viewerId
LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM likes GROUP BY post_id) lc ON lc.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) cc ON cc.post_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM blocks b 
    WHERE (b.blocker_id = :viewerId AND b.blocked_id = p.author_id)
       OR (b.blocker_id = p.author_id AND b.blocked_id = :viewerId)
)
AND (:cursorCreatedAt IS NULL OR p.created_at < :cursorCreatedAt OR (p.created_at = :cursorCreatedAt AND p.id < :cursorId))
ORDER BY p.created_at DESC, p.id DESC
LIMIT :limit
```

## 4. Idempotency for Orders

### Migration V3
```sql
CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key TEXT NOT NULL UNIQUE,
    request_hash TEXT NOT NULL,
    response_body JSONB,
    response_status INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);
CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

## 5. Observability

### RequestId Filter
```java
@Component
public class RequestIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) {
        String requestId = Optional.ofNullable(request.getHeader("X-Request-Id"))
            .orElse(UUID.randomUUID().toString());
        MDC.put("requestId", requestId);
        response.setHeader("X-Request-Id", requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

### application.properties additions
```properties
management.endpoints.web.exposure.include=health,metrics,info
logging.pattern.console={"timestamp":"%d","level":"%p","requestId":"%X{requestId}","logger":"%c","message":"%m"}%n
```

## Rollout Notes

### Backward Compatibility
- All new endpoints are additive
- Existing feed endpoint should be versioned or deprecated gracefully
- Idempotency header is optional; requests without it behave as before

### Data Backfills
- No backfill required for idempotency_keys (starts empty)
- pg_trgm extension must be enabled before V2 migration

### Safe Deploy Order
1. Apply V2 migration (search indexes)
2. Deploy code with search endpoint disabled
3. Enable search endpoint
4. Apply V3 migration (idempotency)
5. Deploy idempotency support
6. Monitor and enable enriched feed
