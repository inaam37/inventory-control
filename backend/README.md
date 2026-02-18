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
Implemented endpoints currently run against an in-memory store to validate workflows before Prisma wiring:

- `GET /health` — service health check
- `GET /api/overview` — status + available modules/endpoints
- `GET /api/items` — list inventory items
- `POST /api/items` — create inventory item

### Alerts & notifications
- `POST /api/alerts/run` — evaluate low stock, expiring soon (3 days), variance, high waste, supplier due
- `GET /api/alerts/notifications?userId=:id` — in-app notifications + bell unread metadata
- `POST /api/alerts/notifications/:id/read` — mark notification as read
- `GET /api/alerts/preferences/:userId` — fetch user alert channel preferences
- `PUT /api/alerts/preferences/:userId` — update user alert channel preferences
- `POST /api/alerts/digest/daily` — send daily digest for management users
- `GET /api/alerts/delivery-log` — inspect simulated email/SMS/Slack delivery records

> Slack delivery is optional and currently stubbed as `skipped` unless webhook logic is added.

## Project layout
```
backend/
  prisma/
    schema.prisma
  src/
    dataStore.js
    services/
      alertsEngine.js
    routes/
      inventory.js
      overview.js
      items.js
      alerts.js
    index.js
```

## Next steps
1. Replace in-memory store with Prisma models.
2. Add auth and scope notifications per organization.
3. Move alert sweeps and digest generation to scheduled background jobs.
4. Wire real providers (SMTP/Twilio/Slack webhook).
