-- V2: Search indexes for marketplace search
-- Requires pg_trgm extension for fuzzy text search

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for title search (supports ILIKE with wildcards)
CREATE INDEX idx_listings_title_trgm ON listings USING gin (title gin_trgm_ops);

-- B-tree index for price range queries
CREATE INDEX idx_listings_price ON listings(price_cents);

-- Composite index for status + cursor pagination
CREATE INDEX idx_listings_status_created ON listings(status, created_at DESC, id DESC);

-- Index for seller filtering
CREATE INDEX idx_listings_seller ON listings(seller_id);
