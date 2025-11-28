# Troubleshooting Dharma Development

This document provides solutions to common problems you might encounter while developing with Dharma.

## Port Conflicts

**Problem:** A service fails to start, and the logs indicate a "port is already allocated" or "address already in use" error.

**Common ports:**
- `5177` - Frontend dev server (Vite)
- `8000` - Backend API (FastAPI)
- `5432` - PostgreSQL database
- `6379` - Redis cache
- `3001` - Grafana monitoring
- `9090` - Prometheus metrics

**Solution:**

1. **Check for running processes:**
   ```bash
   # For frontend port
   lsof -i :5173

   # For backend port
   lsof -i :8000
   ```

2. **Stop the conflicting process:**
   ```bash
   kill -9 <process_id>
   ```

3. **Restart the services:**
   ```bash
   make down
   make up
   ```

## Database Migration Errors

**Problem:** The API service fails to start with database migration errors (e.g., "relation already exists," "column does not exist").

**Solution:**

1. **Run migrations manually:**
   ```bash
   # Make sure services are running
   make up

   # Run migrations
   make migrate
   ```

2. **Reset the database (if migrations fail):**
   ```bash
   # Stop all services
   make down

   # Clean up volumes
   make clean

   # Restart fresh
   make up

   # Run migrations
   make migrate

   # Seed demo data (optional)
   make seed
   ```

3. **Check migration status:**
   ```bash
   docker compose exec api alembic current
   docker compose exec api alembic history
   ```

## Frontend Build Issues

**Problem:** The frontend fails to build or start, with errors related to dependencies or build scripts.

**Solution:**

1. **Reinstall dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check environment variables:**
   ```bash
   # Make sure frontend/.env exists with:
   cat frontend/.env
   ```

   Should contain:
   ```bash
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   VITE_ENV=development
   ```

3. **Clear Vite cache:**
   ```bash
   cd frontend
   rm -rf dist node_modules/.vite
   npm run dev
   ```

## Backend API Not Responding

**Problem:** Frontend can't connect to backend API at `http://localhost:8000`.

**Solution:**

1. **Check if API is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check Docker containers:**
   ```bash
   docker compose ps
   ```

3. **View API logs:**
   ```bash
   make logs
   # or specifically for API:
   docker compose logs api -f
   ```

4. **Restart API service:**
   ```bash
   docker compose restart api
   ```

## Redis Connection Issues

**Problem:** Rate limiting or caching not working, Redis connection errors in logs.

**Solution:**

1. **Check Redis status:**
   ```bash
   docker compose ps redis
   ```

2. **Test Redis connection:**
   ```bash
   docker compose exec redis redis-cli ping
   # Should return: PONG
   ```

3. **Restart Redis:**
   ```bash
   docker compose restart redis
   ```

## Missing Environment Variables

**Problem:** Application starts but features don't work correctly.

**Solution:**

1. **Check root .env file:**
   ```bash
   cat .env
   ```

   Should include:
   ```bash
   POSTGRES_USER=dharma
   POSTGRES_PASSWORD=dharma_dev_password_change_in_production
   POSTGRES_DB=dharma
   DATABASE_URL=postgresql://dharma:dharma_dev_password_change_in_production@postgres:5432/dharma
   REDIS_URL=redis://redis:6379/0
   ENVIRONMENT=development
   ```

2. **Check frontend .env file:**
   ```bash
   cat frontend/.env
   ```

   Should include:
   ```bash
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   VITE_ENV=development
   ```

3. **Copy from example if missing:**
   ```bash
   cp .env.example .env
   cd frontend
   echo "VITE_API_URL=http://localhost:8000" > .env
   echo "VITE_WS_URL=ws://localhost:8000" >> .env
   echo "VITE_ENV=development" >> .env
   ```

## Docker Issues

**Problem:** Docker containers won't start or keep restarting.

**Solution:**

1. **Clean Docker system:**
   ```bash
   make clean
   docker system prune -a
   ```

2. **Check Docker resources:**
   - Ensure Docker Desktop has enough memory (4GB+ recommended)
   - Ensure enough disk space available

3. **Full reset:**
   ```bash
   make reset
   make up
   ```

## Need More Help?

If you're still experiencing issues:

1. Check the logs: `make logs`
2. Review the [API Documentation](docs/API.md)
3. Review the [Implementation Status](IMPLEMENTATION.md)
4. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Your environment (OS, Docker version, etc.)
