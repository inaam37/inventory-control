# PantryPilot Backend

Phase 20 hardening for testing, deployment, monitoring, and operations.

## Features added
- Complete API test coverage for current endpoints.
- Admin operational endpoints protected by `x-admin-token`.
- Request timing logs + lightweight in-memory caching.
- Optional Sentry integration for errors and traces.
- Production deployment descriptors (`Procfile`, `app.json`).
- Production DB setup script for Prisma migrations.

## Quick start

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

## Run tests
```bash
npm test
```

## Environment
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/pantrypilot"
PORT=4000
CACHE_TTL_SECONDS=30
ADMIN_TOKEN=dev-admin-token
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## API endpoints
- `GET /health`
- `GET /api/overview`
- `GET /api/items`
- `POST /api/items`
- `GET /api/admin/status` (requires `x-admin-token`)
- `POST /api/admin/cache/invalidate` (requires `x-admin-token`)

## Production DB setup
```bash
DATABASE_URL="postgresql://..." ./scripts/setup-production-db.sh
```

## Deployment
- **Backend**: Heroku/AWS/DigitalOcean (Node process: `node src/index.js`)
- **Frontend**: Vercel/Netlify static deploy (`index.html`, `admin.html`)
- See full runbook in `docs/DEPLOYMENT.md`.
