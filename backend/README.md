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
This phase now supports item persistence (file-backed `ingredients-table`) and barcode workflows:

- `GET /health` — service health check
- `GET /api/overview` — status + roadmap metadata
- `GET /api/items?organizationId=<id>` — list ingredients/items for an organization
- `POST /api/items` — create ingredient/item (supports optional `barcode`)
- `POST /api/barcode/generate/:ingredientId` — assign (if missing) and render barcode image
- `POST /api/barcode/scan` — lookup ingredient by barcode and optional stock in/out adjustment
- `POST /api/barcode/print-bulk` — generate printable barcode payloads for multiple ingredients

## Project layout
```
backend/
  prisma/
    schema.prisma
  src/
    index.js
    lib/
      async-handler.js
      item-store.js
    routes/
      barcode.js
      overview.js
      items.js
    index.js
```

## Next steps
1. Add authentication and JWT sessions.
2. Expand CRUD coverage for items, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
