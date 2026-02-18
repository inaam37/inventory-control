# Inventory Control Backend (Phase 1)

This backend sets up a Node.js + Express foundation for a restaurant inventory system with PostgreSQL via Prisma.

## What is included

- Express server running on **port 3001** by default
- Folder architecture:
  - `src/models`
  - `src/routes`
  - `src/controllers`
  - `src/middleware`
- Database bootstrap in `src/config/database.js`
- Environment template with server, auth, and API key settings

## Quick start

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

## Environment
Create a `.env` file with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/pantrypilot"
DEFAULT_ORGANIZATION_ID="your-organization-uuid"
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
      inventory.js
      overview.js
      items.js
      purchaseOrders.js
```

## Next steps
1. Add authentication and JWT sessions.
2. Expand CRUD coverage for items, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
