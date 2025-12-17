# Dharma Refactoring & Improvement Plan

This document outlines technical debt and architectural improvements identified during the initial analysis. These items have been deferred to prioritize frontend feature development but are critical for production readiness and long-term scalability.

## 1. Security & Reliability

### Authentication Hardening
- [ ] **Strict JWT Validation:** Enforce rigorous JWT validation across all endpoints, ensuring expiration and signature checks are fail-safe.
- [ ] **Refresh Token Rotation:** Implement a secure refresh token rotation strategy to handle session management without forcing frequent logins.
- [ ] **Role-Based Access Control (RBAC):** Replace ad-hoc user checks with a formal permission system (e.g., User, Admin, Moderator scopes).

### Rate Limiting
- [ ] **Granular Policies:** Move beyond basic IP-based limiting to per-endpoint and per-user limits (e.g., strict limits on sensitive endpoints like `/auth` or `/payment`).
- [ ] **Frontend Integration:** Ensure the frontend handles HTTP 429 "Too Many Requests" responses gracefully with user-friendly "cooldown" messages.

### Input Validation
- [ ] **Geospatial Validation:** strictly validate all lat/long inputs to prevent coordinate spoofing or invalid ranges.
- [ ] **File Upload Security:** Implement strict file type checking (magic numbers), size limits, and malware scanning for user uploads (images).

## 2. Performance & Scalability

### Database Optimization
- [ ] **Indexing:** Add missing indexes on frequently queried columns:
    - `LacesLedger.user_id`
    - `Post.timestamp`
    - `Listing.status`
- [ ] **Connection Pooling:** Tune SQLAlchemy engine settings for high-concurrency environments (pool size, overflow, timeout).

### Caching Strategy
- [ ] **Expanded Redis Coverage:** Cache user profiles and other semi-static data to reduce database load.
- [ ] **Stale-While-Revalidate:** Implement SWR patterns for feed data to serve cached content instantly while fetching updates in the background.

### Worker Efficiency
- [ ] **Queue Segmentation:** Separate Celery queues for tasks with different priorities:
    - `high_priority`: Checkout, Payments, Emails
    - `default`: General background tasks
    - `low_priority`: Analytics, cleanup, heavy data processing

## 3. Feature Completeness (Backend)

### LACES Economy
- [ ] **Spending Mechanics:** Implement the "spend" side of the ledger (e.g., purchasing boosts, marketplace fees, raffle tickets).
- [ ] **Transaction Integrity:** Ensure all LACES transactions run within database transactions to prevent race conditions.

### Notifications
- [ ] **System Architecture:** Build a unified notification service that can dispatch to multiple channels (WebSocket, Push, Email, SMS).
- [ ] **Event Triggers:** Wire up backend events (Drop Zone active, Trade Match found) to the notification service.

## 4. Developer Experience & Observability

### Logging & Monitoring
- [ ] **Structured Logging:** Standardize log formats (JSON) across all services with correlation IDs for request tracing.
- [ ] **Grafana Dashboards:** Create a standard "Service Health" dashboard template for all microservices.

### Testing
- [ ] **Backend Coverage:** Increase unit test coverage for `worker` tasks and `core` logic.
- [ ] **E2E Testing:** Implement end-to-end tests for critical user flows (Sign Up -> Browse -> Check In).

---
*Created: December 15, 2025*
