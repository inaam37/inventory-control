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
