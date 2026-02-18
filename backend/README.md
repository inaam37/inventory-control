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

## API endpoints
- `GET /health` — service health check
- `GET /api/overview` — status + roadmap metadata
- `GET /api/items` — placeholder list (wire to Prisma)
- `POST /api/items` — placeholder create (wire to Prisma)
- `POST /api/purchase-orders` — create supplier purchase order with approval threshold handling
- `POST /api/purchase-orders/auto-generate` — auto-generate POs for low-stock items (`onHand < reorderPoint`)
- `PUT /api/purchase-orders/:id/status` — update lifecycle state (`PENDING`, `PARTIAL`, `DELIVERED`, `CANCELLED`)

## Purchase order workflow highlights
- Computes `totalCost` from line quantity × unit cost.
- Estimates supplier delivery from longest item lead time.
- Supports approval workflow based on configurable threshold (`approvalStatus`).
- Groups low-stock items by supplier and creates one PO per supplier during auto-generation.

## Project layout
```
backend/
  prisma/
    schema.prisma
  src/
    index.js
    prisma.js
    routes/
      overview.js
      items.js
      purchaseOrders.js
```

## Next steps
1. Add authentication and JWT sessions.
2. Implement CRUD endpoints for items, vendors, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
