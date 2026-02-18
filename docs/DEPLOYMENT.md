# Deployment Runbook (Phase 20)

## Architecture
- **Backend**: Express API (Deploy to Heroku, AWS Elastic Beanstalk, or DigitalOcean App Platform)
- **Database**: Managed PostgreSQL (Heroku Postgres, AWS RDS, or DigitalOcean Managed DB)
- **Frontend**: Static site on Vercel or Netlify
- **Monitoring**: Sentry for backend error logging + tracing

## 1) Production database setup
1. Provision PostgreSQL instance.
2. Set `DATABASE_URL` in backend environment.
3. Run migration deploy script:

```bash
cd backend
npm ci
DATABASE_URL="postgresql://..." ./scripts/setup-production-db.sh
```

## 2) Backend deployment (Heroku example)
1. Create Heroku app.
2. Add Heroku Postgres addon.
3. Configure env vars:
   - `DATABASE_URL`
   - `ADMIN_TOKEN`
   - `SENTRY_DSN`
   - `CACHE_TTL_SECONDS`
4. Deploy backend directory and ensure Procfile runs `node src/index.js`.
5. Run smoke checks:

```bash
curl https://<backend-url>/health
curl https://<backend-url>/api/overview
```

## 3) Frontend deployment (Vercel or Netlify)
- Deploy repository root as static site.
- Ensure `index.html` and `admin.html` are published.
- Add rewrite rules from `vercel.json` / `netlify.toml`.

## 4) Monitoring setup
1. Create Sentry project (Node/Express).
2. Copy DSN and set `SENTRY_DSN` in backend env.
3. Optional: set `SENTRY_TRACES_SAMPLE_RATE=0.1`.
4. Trigger test error (internal only) and verify event appears.

## 5) Performance & caching
- API response caching enabled for GET overview/items.
- Request duration is logged for backend observability.
- Tune `CACHE_TTL_SECONDS` based on refresh frequency.

## 6) Release checklist
- Run backend tests (`npm test`).
- Confirm migrations applied.
- Confirm admin endpoints protected by `x-admin-token`.
- Validate Sentry receives test events.
- Validate frontend/admin pages load in production.
