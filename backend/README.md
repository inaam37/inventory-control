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

## Environment setup

Copy and edit env values:

```bash
cp .env.example .env
```

Required variables:

- `PORT`
- `RESTAURANT_NAME`
- `DATABASE_URL`
- `JWT_SECRET`
- `BCRYPT_SALT_ROUNDS`
- `INVENTORY_API_KEY`

## Health check

```bash
curl http://localhost:3001/health
```

Response includes service status and restaurant name.
