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

## Next steps
1. Add authentication and JWT sessions.
2. Implement CRUD endpoints for items, vendors, recipes, and PO drafts.
3. Add background jobs for reorder notifications.
4. Wire the frontend to these endpoints.
