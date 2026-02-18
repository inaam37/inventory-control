# PantryPilot Backend (Scaffold)

This backend scaffolding sets the foundation for a long-term SaaS deployment using **PostgreSQL + Prisma + Express**. It mirrors the data models currently stored on the client side and is designed to scale with multi-location restaurant teams.

## Why this stack
- **PostgreSQL**: reliable, scalable relational data.
- **Prisma**: type-safe data access and migrations.
- **Express**: minimal API layer (swap with NestJS later if desired).

## Quick start
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Environment
Create a `.env` file with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/pantrypilot"
```

## API scaffold
Current endpoints include Phase 10 expiry tracking and FIFO workflows:

- `GET /health` — service health check
- `GET /api/overview` — status + roadmap metadata
- `GET /api/items` — placeholder list (wire to Prisma)
- `POST /api/items` — placeholder create (wire to Prisma)
- `GET /api/inventory/expiring-soon?organizationId=<id>&days=<n>` — items with batches expiring within n days (default 3)
- `POST /api/inventory/:itemId/batches` — receive inventory with `receivedQty` and `expiryDate`
- `POST /api/inventory/:itemId/use` — consume inventory using FIFO (earliest expiry first)
- `GET /api/inventory/fifo/next/:itemId` — preview next batch selected by FIFO
- `POST /api/inventory/jobs/expire-check` — manually trigger expiry alert generation
- `GET /api/inventory/waste-report?organizationId=<id>` — report waste logged as expired

## Project layout
```
backend/
  prisma/
    schema.prisma
  src/
    index.js
    jobs/
      expiryAlerts.js
    lib/
      expiry.js
      prisma.js
    routes/
      inventory.js
      overview.js
      items.js
```

## Next steps
1. Add authentication and JWT sessions.
2. Implement CRUD endpoints for items, vendors, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
