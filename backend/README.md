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

## API scaffold
- `GET /health` — service health check
- `GET /api/overview` — status + roadmap metadata
- `GET /api/items` — placeholder list (wire to Prisma)
- `POST /api/items` — placeholder create (wire to Prisma)
- `GET /api/inventory` — current inventory snapshot with quantities, locations, expiry dates, and last count timestamp
- `GET /api/inventory/low-stock` — critical low-stock items below reorder point

## Project layout
```
backend/
  prisma/
    schema.prisma
  src/
    config/
      roles.js
    db/
      userStore.js
    lib/
      auth.js
    middleware/
      auth.js
      authorize.js
    routes/
      auth.js
      overview.js
      items.js
    index.js
```

## Next steps
1. Add authentication and JWT sessions.
2. Expand CRUD coverage for items, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
