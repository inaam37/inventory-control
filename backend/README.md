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
