# PantryPilot — Farmhouse inventory workspace

A working **single-browser manager app**, with CAD supplier quote comparison, pack-aware order drafts, partial receiving, a stock ledger, count drafts, usage/waste, recipe costing, reports, and JSON backup/restore. The public Farmhouse menu catalogue contains **110 service-specific prices** checked October 30, 2026.

This is a local operating tool, **not a deployed multi-user system**. Browser storage is the source of truth. The separate API scaffold is in-memory and does not sync with the browser. No supplier orders, email/SMS, POS sync, invoice OCR, or paid AI calls are connected.

## Run

```sh
npm ci
npm start
```

Open `http://127.0.0.1:8000`. The local server binds to this computer and serves only the supported app assets. Opening `index.html` directly may work, but use a server for consistent storage and downloads. Avoid private/incognito mode. Export a full JSON backup before clearing browser storage, changing devices, or updating the app. GitHub Pages can serve the same static app; each browser has its own independent data.

## Manager workflow

1. **Inventory:** add each ingredient in its stock unit (kg, g, l, ml, each). Enter on-hand, par, supplier, net order pack size and **cost per stock unit**, never case cost in the unit-cost box.
2. **Manager workspace:** import a mapped GFS/Sysco quote CSV, preview every row, then import. Choose a verified quote to set the item's supplier, SKU, unit cost and net pack quantity. No real supplier prices are bundled.
3. **Recipes:** enter chef-confirmed ingredient quantities in those same stock units and batch yield. Map recipes to service-specific menu entries in the Manager workspace. Missing quantities/costs show `Uncosted`.
4. **Count Sheets:** enter actual stock, then Apply Counts. Draft entries survive reload and adjustments write to the ledger.
5. **Manager workspace:** review order suggestions. Open orders reduce the suggested need; quantities round up to whole packs. Generate drafts once, then review them in Purchase Orders. Nothing is sent.
6. Receive each delivery using its invoice/reference and actual quantities in stock units. Partial deliveries retain the remaining balance. Duplicate references and over-receiving are rejected.
7. **Usage & Variance:** record cooking stock-outs and waste. Sales record theoretical usage only; they do not deduct stock again.
8. **Reports / Data Tools:** export CSV, printable reports and full JSON backups. Restore validates before replacing and keeps a local before-restore recovery copy.

See [the manager manual](docs/USER_MANUAL.md), [source evidence](docs/SOURCES.md), [current status](docs/STATUS.md), and [Claude handoff](CLAUDE_HANDOFF.md).

## Verification

```sh
npm test
npm run check
npx playwright install chromium --only-shell
npm run test:browser
cd backend
npm ci
npm test
```

The browser journey uses synthetic test data only. It checks menu loading, inventory entry, supplier quote normalization/selection, pack ordering, duplicate draft prevention, partial/full/duplicate receipts, count draft recovery, usage/waste and negative-stock protection, recipe costing/mapping, sales/reporting, reload persistence, backup/restore, corrupt-data preservation, XSS sanitization, concurrent-tab conflicts, and a 390 px mobile viewport.

## Data and security boundaries

- The repository is public. Never commit invoices, negotiated pricing, credentials, sales exports, private recipes or browser backups.
- Staff Directory entries are labels, not login accounts or enforced permissions.
- Existing browser data is migrated to schema 2. Invalid stored data is preserved instead of overwritten. Another-tab changes block stale saves and display an export/reload warning; simultaneous races across tabs are not a replacement for database transactions. Use one editing tab.
- Legacy HTML sinks are sanitized with vendored DOMPurify. CSV exports neutralize spreadsheet-formula prefixes. A content security policy blocks app network requests.
- A tracked `.env` file was removed. **If any values from that file were ever used as real credentials, rotate them:** deleting the current file does not remove Git history.
- Backend demo login keys and unsigned tokens were removed. The optional scaffold requires a private `MANAGER_KEY` of at least 24 characters, uses signed one-hour sessions, and enforces write permissions. It is still not a production deployment.
- No money was spent and no paid API calls are part of these changes.

## Other folders

`backend/` is an optional API scaffold, not the browser app's database. `frontend/`, `admin.html`, and `inventory-control-shareable.html` are legacy prototypes and are not part of the supported manager workflow. `PROMPT.md` is historical context; current instructions are in `CLAUDE_HANDOFF.md`.
