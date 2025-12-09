# Phase 1 Action Plan: Critical Foundation Issues
**Created:** 2025-12-08  
**Status:** IN PROGRESS  
**Phases:** A (Authentication), B (Database), C (Error Handling)

---

## 📊 AUDIT FINDINGS

### Phase 1A: Authentication & Security Issues

#### 🔴 CRITICAL ISSUES FOUND:

1. **Duplicate Authentication Modules**
   - `services/core/auth.py` - Full JWT implementation with sessions
   - `services/core/security.py` - Duplicate JWT implementation (older?)
   - Result: **INCONSISTENT auth across endpoints**

2. **Mixed Usage Across Codebase:**
   ```
   Using auth.py (preferred):
   - routers/auth.py
   - routers/drops.py
   - routers/signals.py
   - routers/stores.py
   
   Using security.py (legacy):
   - routers/shop.py
   - routers/releases.py
   - routers/subscriptions.py
   - routers/posts.py
   - routers/feed_v2.py
   - routers/users.py
   - seed.py
   ```

3. **Key Differences:**
   - `auth.py`: Has UserSession tracking, device fingerprinting, refresh tokens
   - `security.py`: Basic JWT, no session management, uses SessionLocal directly (anti-pattern)

4. **Security Gaps:**
   - No CSRF protection middleware
   - Development secret key warning only in logs
   - CORS allows all origins in development (okay for dev, needs docs)
   - Missing rate limiting configuration documentation

---

### Phase 1B: Database Migration Issues

#### Migration Files Found:
```
services/alembic/versions/
├── 001_auth_enhancements.py
├── 002_sprint1_models.py
├── 003_add_heat_map_tiles.py
├── 004_feed_v2_models.py
├── 072ea76d6afd_add_missing_columns_to_users_table.py
├── 0c591489b784_merge_migration_heads.py
├── ab16ff12cacf_add_missing_columns_to_laces_ledger_table.py
├── b23d7f450244_add_hyperlocal_features.py
├── b53bb8a48bc7_add_missing_columns_to_posts_table.py
└── e3c11fbeb6ab_implement_sprint_1_models.py
```

#### 🔴 ISSUES IDENTIFIED:

1. **Migration Naming Inconsistency**
   - Mix of numbered (001, 002, 003) and hash-based names
   - Potential ordering issues

2. **From IMPLEMENTATION.md:**
   - Missing `balance_after` column in LACES ledger
   - Missing `POST_REWARD` and `CHECKIN_REWARD` transaction types
   - Migration needs to be created and run

3. **Need to Check:**
   - Current migration status
   - Which migrations are applied
   - Any pending migrations
   - Schema drift between models and database

---

### Phase 1C: Error Handling & Logging Issues

#### Current State:

1. **Logging:**
   - ✅ Basic logging configured in main.py
   - ✅ Sentry integration present (optional via env)
   - ❌ No structured logging (JSON logs)
   - ❌ No request ID tracking
   - ❌ No log correlation across services

2. **Error Handling:**
   - ❌ No global exception handler
   - ❌ Inconsistent error responses
   - ❌ Database errors not caught gracefully
   - ❌ No error tracking for background tasks
   - ❌ Missing HTTP exception handlers

3. **Monitoring Gaps:**
   - ✅ Prometheus metrics endpoint exists
   - ❌ No custom business metrics
   - ❌ No error rate tracking
   - ❌ No performance monitoring

---

## 🎯 ACTION ITEMS

### Phase 1A: Authentication & Security
**Priority:** HIGH | **Effort:** 4-6 hours | **Risk:** Medium

#### Step 1: Consolidate Auth Modules
- [ ] **A1.1** - Audit all `security.py` usage
- [ ] **A1.2** - Create migration guide from security.py → auth.py
- [ ] **A1.3** - Update all routers to use `services.core.auth`
- [ ] **A1.4** - Keep only password hashing in security.py, deprecate rest
- [ ] **A1.5** - Add deprecation warnings to security.py functions
- [ ] **A1.6** - Update imports across codebase

#### Step 2: Strengthen Security
- [ ] **A2.1** - Add security configuration documentation
- [ ] **A2.2** - Create `.env.example` with security settings
- [ ] **A2.3** - Add CSRF token middleware
- [ ] **A2.4** - Document CORS configuration for production
- [ ] **A2.5** - Add security headers validation

#### Step 3: Testing
- [ ] **A3.1** - Add auth integration tests
- [ ] **A3.2** - Test session management
- [ ] **A3.3** - Test token refresh flow
- [ ] **A3.4** - Test expired token handling

---

### Phase 1B: Database Migrations
**Priority:** CRITICAL | **Effort:** 2-3 hours | **Risk:** Medium-High

#### Step 1: Migration Audit
- [ ] **B1.1** - Check current migration status (`alembic current`)
- [ ] **B1.2** - List all available migrations (`alembic history`)
- [ ] **B1.3** - Identify unapplied migrations
- [ ] **B1.4** - Document migration dependency tree

#### Step 2: Fix Migration Issues
- [ ] **B2.1** - Standardize migration naming convention
- [ ] **B2.2** - Create missing LACES schema migration
- [ ] **B2.3** - Add `balance_after` column
- [ ] **B2.4** - Add missing transaction types to enum
- [ ] **B2.5** - Verify foreign key constraints

#### Step 3: Migration Safety
- [ ] **B3.1** - Add migration testing script
- [ ] **B3.2** - Create database backup procedure
- [ ] **B3.3** - Add rollback documentation
- [ ] **B3.4** - Test migrations on fresh database

#### Step 4: Apply Migrations
- [ ] **B4.1** - Backup current database
- [ ] **B4.2** - Run pending migrations
- [ ] **B4.3** - Verify schema matches models
- [ ] **B4.4** - Update IMPLEMENTATION.md status

---

### Phase 1C: Error Handling & Logging
**Priority:** HIGH | **Effort:** 3-4 hours | **Risk:** Low

#### Step 1: Structured Logging
- [ ] **C1.1** - Add `python-json-logger` dependency
- [ ] **C1.2** - Create structured logging configuration
- [ ] **C1.3** - Add request ID middleware
- [ ] **C1.4** - Add correlation ID to logs
- [ ] **C1.5** - Configure log levels per environment

#### Step 2: Global Exception Handling
- [ ] **C2.1** - Create custom exception classes
- [ ] **C2.2** - Add global exception handler
- [ ] **C2.3** - Standardize error response format
- [ ] **C2.4** - Add database error handling
- [ ] **C2.5** - Add validation error handling
- [ ] **C2.6** - Add 404 and 500 handlers

#### Step 3: Monitoring & Alerting
- [ ] **C3.1** - Add custom Prometheus metrics
- [ ] **C3.2** - Track error rates by endpoint
- [ ] **C3.3** - Add latency tracking
- [ ] **C3.4** - Create error rate dashboard
- [ ] **C3.5** - Configure Sentry DSN in docs

#### Step 4: Worker Error Handling
- [ ] **C4.1** - Add Celery error handlers
- [ ] **C4.2** - Track failed tasks
- [ ] **C4.3** - Add retry policies
- [ ] **C4.4** - Log task failures to Sentry

---

## 📁 FILES TO MODIFY

### Phase 1A - Authentication
```
TO UPDATE:
- services/routers/shop.py
- services/routers/releases.py
- services/routers/subscriptions.py
- services/routers/posts.py
- services/routers/feed_v2.py
- services/routers/users.py
- services/seed.py

TO DEPRECATE:
- services/core/security.py (keep only password hashing)

TO DOCUMENT:
- docs/SECURITY.md (new)
- .env.example
```

### Phase 1B - Database
```
TO CHECK:
- services/alembic/versions/* (all migrations)

TO CREATE:
- services/alembic/versions/005_laces_schema_updates.py (new)

TO UPDATE:
- services/models/laces.py (verify enums)
- IMPLEMENTATION.md (update status)
```

### Phase 1C - Error Handling
```
TO CREATE:
- services/core/exceptions.py (new)
- services/middleware/error_handler.py (new)
- services/core/logging_config.py (new)

TO UPDATE:
- services/main.py (add exception handlers)
- worker/tasks.py (add error handlers)
- requirements.txt (add dependencies)

TO DOCUMENT:
- docs/LOGGING.md (new)
- docs/MONITORING.md (new)
```

---

## 🚀 EXECUTION PLAN

### Week 1: Foundation
**Day 1-2:** Phase 1B (Database Migrations) - CRITICAL
- Audit migrations
- Create missing migrations
- Apply and verify

**Day 3:** Phase 1C Part 1 (Logging Setup)
- Structured logging
- Request ID tracking

**Day 4-5:** Phase 1A (Authentication Consolidation)
- Migrate all endpoints to auth.py
- Add security tests

### Week 2: Hardening
**Day 1-2:** Phase 1C Part 2 (Error Handling)
- Global exception handlers
- Error monitoring

**Day 3:** Testing & Documentation
- Integration tests
- Update documentation

**Day 4:** Review & Deploy
- Code review
- Staging deployment
- Smoke tests

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Breaking Changes in Auth Consolidation
**Mitigation:**
- Update all endpoints at once
- Comprehensive testing before merge
- Keep old code temporarily for rollback

### Risk 2: Migration Failures
**Mitigation:**
- Always backup database before migrations
- Test on fresh database first
- Have rollback scripts ready

### Risk 3: Performance Impact from Logging
**Mitigation:**
- Use async logging
- Configure appropriate log levels
- Test performance impact

---

## 📈 SUCCESS METRICS

### Phase 1A - Authentication
- [ ] Single source of truth for authentication
- [ ] All endpoints use consistent auth
- [ ] 100% test coverage for auth flows
- [ ] Security documentation complete

### Phase 1B - Database
- [ ] All migrations applied successfully
- [ ] Schema matches models 100%
- [ ] No foreign key violations
- [ ] Migration documentation complete

### Phase 1C - Error Handling
- [ ] All errors logged with context
- [ ] Error rate tracking active
- [ ] 404/500 handlers in place
- [ ] Sentry capturing errors

---

## 📝 NEXT STEPS

1. Review this plan with team
2. Get approval to proceed
3. Create backup of production data
4. Start with Phase 1B (migrations) - CRITICAL PATH
5. Progress through phases methodically
6. Update this document as we complete items

---

**Last Updated:** 2025-12-08 22:50 EST  
**Next Review:** After Phase 1B completion
