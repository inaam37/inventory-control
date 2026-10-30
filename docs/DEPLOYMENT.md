# Running and deployment boundaries

## Supported app

From the repository root run `npm ci` and `npm start`. Open `http://127.0.0.1:8000`. The server binds only to localhost and allows only the supported static app assets. Production dependencies are not needed by the browser: DOMPurify is vendored and no CDN scripts or paid APIs are loaded.

A static host or GitHub Pages can serve the root app files, but it does **not** provide a shared database, staff authentication or remote backups. Each browser/profile has independent localStorage. Keep operational data out of the public source tree. Test restore with a synthetic backup before changing hosts or origins, since browser storage is origin-specific.

## Optional backend scaffold

`backend/` is not connected to the browser workspace. Its current mounted inventory store is in-memory; process restarts lose that API data. Do not use it for a restaurant's production records.

For local development only:

1. `cd backend` and `npm ci`.
2. Copy `.env.example` to an ignored `.env` locally.
3. Set a unique random `MANAGER_KEY` of at least 24 characters, optionally `MANAGER_USERNAME`, and a separate private `ADMIN_TOKEN` if admin routes are needed. Set `FRONTEND_ORIGIN` to an explicitly allowed local origin. Never publish keys.
4. Run `npm run dev`. Login is disabled without the manager key. Tokens are signed, valid for one hour and invalidated on restart.

Excel/AI importing is disabled. CSV parsing is deterministic and all rows are validated before API mutation. No subscription is treated as permission to bill an API.

## Before a shared staff rollout

Choose durable transactional storage and an authenticated hosting environment; migrate the browser state rather than creating another independent source of truth. Implement restaurant-scoped users, enforced roles, server validation for all mutations, idempotent receipts, backups with tested restore, TLS and session management, and an audit trail for corrections/returns. Add integration tests for user isolation and concurrent receipts. Do not expose the existing in-memory scaffold to the internet.

The removed `.env` remains in old commits. If its values were real, rotate them. Do not rewrite shared history without a deliberate migration plan and explicit approval.

## Release package and verification

Run `npm run build` to generate `dist/` from the shared app-file allowlist. Only the supported HTML/JavaScript, vendored sanitizer, its license and `.nojekyll` are included. Backend code, environment files, tests and handoffs are excluded. Netlify/Vercel configuration builds and serves `dist/`.

GitHub Pages can continue publishing from the repository root: `.nojekyll` disables Jekyll processing and all browser asset links remain relative for the `/inventory-control/` project path. `npm run test:deployment` validates the generated package at that path on desktop/mobile.

The GitHub Actions validation workflow runs on this PR and pushes to main with read-only repository permissions. It runs the engine, syntax/sanitizer, build, browser, packaged-subpath, API and dependency checks. It does not publish a site. Review approval alone does not merge; use **Merge pull request → Confirm merge** when checks pass. Existing host settings determine publication after that.
