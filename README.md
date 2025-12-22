# 🔥 Dharma (Night Market)
## *The Underground Network for Sneaker Culture*

[![Python Version](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![Java Version](https://img.shields.io/badge/java-21-orange.svg)](https://jdk.java.net/21/)
[![CI](https://github.com/myspacecornelius/Night_Market/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/myspacecornelius/Night_Market/actions/workflows/ci-cd.yml)

## 🌟 The Vision

**Dharma** is the foundation for a new kind of sneaker community—one that rewards authenticity, celebrates local culture, and puts power back in the hands of real enthusiasts.

### What We're Building

- **🗺️ Hyperlocal Heatmaps**: Real-time signals from sneakerheads in your city
- **🛍️ High-Performance Marketplace**: Fast, idempotent order processing backed by Java 21
- **🪙 LACES Token Economy**: Earn rewards for contributing to the community
- **🎯 Drop Zones**: Coordinate releases, share intel, build together
- **🤝 Community-First**: No gatekeeping, no backdoors—just pure sneaker culture

---

## 🏗️ Architecture

Dharma uses a hybrid microservices architecture to leverage the best tools for each job:

### 🎨 Frontend (`/frontend`)
- **Stack**: React 18, Vite, Tailwind CSS, TypeScript
- **Role**: Responsive, mobile-first PWA for users.

### ☕ Core Backend (`/backend-java`)
- **Stack**: Java 21, Spring Boot 3, Hibernate
- **Role**: High-performance transaction processing, Marketplace Search, Feed generation, Idempotency.
- **Status**: **New!** Phase 2 Upgrade.

### 🐍 Data Services (`/services`)
- **Stack**: Python 3.11, FastAPI, SQLAlchemy, Celery
- **Role**: Legacy API, geospatial heavy-lifting (H3), background workers, data seeding.

### 🐳 Infrastructure
- **PostgreSQL 15**: Primary data store with PostGIS.
- **Redis**: Caching and message broker.
- **Grafana + Prometheus**: Observability stack.

---

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** (essential for running the full stack)
- **Java 21 JDK** (for backend development)
- **Node.js 18+** (for frontend development)
- **Python 3.11** (for services development)

### The 1-Command Launch

To start the entire platform (Frontend + Java Backend + Python Services + Databases) using Docker:

```bash
make up
```

- **Frontend**: http://localhost:5173
- **Java API**: http://localhost:8080 (Swagger: http://localhost:8080/swagger-ui.html)
- **Python API**: http://localhost:8000 (Docs: http://localhost:8000/docs)
- **Grafana**: http://localhost:3000

To stop everything:
```bash
make down
```

---

## 🛠️ Development Guides

We have detailed guides for each component of the stack:

### 👉 [Frontend Guide](frontend/README.md)
*React, Vite, Components, State Management*

### 👉 [Java Backend Guide](backend-java/README.md)
*Spring Boot, Marketplace Logic, Search, Idempotency*

### 👉 [Python Services Guide](services/README.md)
*FastAPI, Celery, Geospatial Logic, Seeding*

---

## 🔧 Common Tasks

### Seeding Data
Populate the database with realistic demo data (users, listings, heatmaps):

```bash
# Run the python seed script inside the api container
docker compose run --rm api python seed_listings.py 100
```

### Running Tests
```bash
# Frontend Tests
cd frontend && npm test

# Java Backend Tests
cd backend-java && ./mvnw test

# Python Services Tests
cd services && pytest
```

---

## 🌍 The Community

### How to Contribute
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a PR

### License
MIT License. Built with ❤️ by the sneaker community.
