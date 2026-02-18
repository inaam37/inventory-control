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
JWT_SECRET="replace-with-access-secret"
JWT_REFRESH_SECRET="replace-with-refresh-secret"
JWT_ACCESS_TTL_SECONDS="900"
JWT_REFRESH_TTL_SECONDS="604800"
```

## API scaffold
- `GET /health` — service health check
- `POST /api/auth/register` — create user (password hashed)
- `POST /api/auth/login` — issue access/refresh tokens
- `POST /api/auth/refresh` — issue new access token from refresh token
- `POST /api/auth/logout` — invalidate refresh token
- `GET /api/auth/me` — authenticated profile endpoint
- `GET /api/overview` — authenticated roadmap metadata
- `GET /api/items` — authenticated + permission gated read
- `POST /api/items` — authenticated + permission gated write

## Roles & permissions
Supported roles:
- `ADMIN`: full access
- `MANAGER`: overview read, item read/write, user read/write
- `STAFF`: overview read, item read/write
- `VIEWER`: overview read, item read only

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
