-- V3: Idempotency keys for order creation

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key TEXT NOT NULL UNIQUE,
    request_hash TEXT NOT NULL,
    response_body JSONB,
    response_status INT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Fast lookup by key
CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key);

-- For cleanup job to purge expired entries
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- For user-scoped lookups
CREATE INDEX idx_idempotency_user ON idempotency_keys(user_id);
