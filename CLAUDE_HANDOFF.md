# Claude Code continuation — Farmhouse inventory

## Copy this prompt into Claude Code

> Continue `inaam37/inventory-control` from branch `codex/farmhouse-manager-upgrade`. Read this file, `docs/STATUS.md`, and `docs/SOURCES.md` first. Preserve the completed work and the user's browser data. Do not regenerate the app, re-research the same menu PDFs or repeat passed work without a change that justifies it. Inspect the branch diff and tests, fix concrete defects you find, then work through the next priorities below. Do not spend money, call paid APIs, send supplier orders, expose private data or deploy publicly without the user's explicit authorization. When finished, write `CLAUDE_REVIEW_FOR_CHATGPT.md` with actual changes, test evidence, remaining blockers and precise review targets for ChatGPT. Record a new checkpoint before your context or usage limit is reached.

## Checkpoint / repository facts

- Base: `main` at `8caffebbbcb3aeab8dbe580f4da694186b93a5fe`; all current work is on `codex/farmhouse-manager-upgrade`. Read GitHub's current branch head; do not assume main includes these changes.
- User goal: usable restaurant inventory control for a manager, current Farmhouse menu and GFS/Sysco price comparison, with a low-waste handoff between Claude and ChatGPT.
- Runtime entry: root `index.html`; `frontend/` and `backend/public/` are different old prototypes. Do not accidentally build a third source of truth.
- The real manager app is a **single-browser** localStorage tool. The optional backend's mounted inventory is **in-memory** and disconnected. Do not present it as multi-user production software.
- Browser global lexical `state` is the operational state. Persistence schema 2 is in `csv-utils.js`; new arrays are `supplierQuotes` and `menuCatalog` in addition to `stockTransactions`.
- Pure rules: `inventory-engine.js` (conversion, quote validation/comparison, order suggestions, receipt planning, recipe cost completeness, CSV parsing, backup validation).
- New manager interface: `manager.js`, built with DOM text nodes. Legacy HTML sinks pass through `safeHTML` from `safe-html.js`; DOMPurify is vendored from the locked npm dependency. Preserve the license and consistency check.
- Public menu data: `farmhouse-menu.js`, 110 service/size/add-on entries from six PDFs checked 2026-10-30. Stable service/name IDs preserve mappings. Source URLs and byte hashes are in `docs/SOURCES.md`. Wine lists, packages and rotating specials are excluded and clearly disclosed.
- No supplier account price list was obtained. No real invoice, employer recipe, account number, stock/sales data or credential belongs in this **public** repo. Do not turn the conference recap into a price list.
- GFS/Sysco quote CSV headers: `item,vendor,sku,packQty,packUnit,packPrice,quotedAt,source,currency,specification`. `itemId` may replace `item`. Net pack quantity and CAD pack price normalize to stock-unit cost. No density, freight, rebates, availability or like-for-like product quality is inferred.
- Stock units are recipe units; a recipe quantity for 200 g of a kg-stocked item is `0.2`. The app blocks misleading unit changes where stock/recipes/orders/quotes exist.
- Orders subtract pending open quantities and round up packs. Receiving is per stock unit, with a unique invoice/reference per PO, partial balances and duplicate/over-receipt checks.
- Sales track **theoretical** usage; cooking stock-outs and waste alone deduct stock. Do not introduce a second deduction.
- A tracked `.env` was removed. Values that were real require rotation outside this code change. Do not echo old values or rewrite shared history.
- The backend active auth route now requires a private environment `MANAGER_KEY` (24+ chars), signs one-hour sessions and enforces mutation scopes. It is still a scaffold. Legacy paid Excel/AI import is disabled.

## Tests already exercised

```sh
npm ci
npm test                       # 14 engine tests
npm run check                  # 58 JS sources + safe HTML sink/library checks
npx playwright install chromium --only-shell
npm run test:browser            # complete synthetic manager workflow
cd backend
npm ci
npm test                       # 11 API/auth tests
npm audit --audit-level=high
```

Root `npm audit` also reported zero known vulnerabilities. The browser journey covers quotes, order rounding/pending balances, receiving, counts surviving refresh, usage/waste, negative-stock blocking, recipe cost/mapping, sales/reporting, backup/restore, corrupt-data preservation, stale-tab conflicts, XSS and mobile horizontal overflow. Test data are synthetic. Use a clean browser context; do not overwrite the user's saved browser inventory to test.

In the original work environment Chromium download initially failed through one mirror but succeeded through Playwright's Microsoft fallback. No need to diagnose that again if your browser already launches. Tests pin Playwright 1.56.1. `npm start` runs a localhost-only allowlisted static server on port 8000.

## Next priorities, in order

1. **Independent code review.** Inspect changes against main, with particular attention to save/rollback behavior, the legacy/new receipt paths, backup migration, validation of nested backups and data displayed in legacy HTML templates. Run relevant tests once, fix observed issues and add focused regression coverage. Avoid cosmetic rewrites and tests that merely mirror code.
2. **Complete private restaurant setup when data are available.** Ask for authorized GFS and Sysco invoice/CSV exports, matched product specifications, approved recipe quantities/yields, opening counts and pars. Import through the app; keep operational exports/invoices out of git. Mark missing data as unknown. Do not fabricate a pricing comparison or recipe portions. Get chef/manager sign-off on actual data before relying on savings or costs.
3. **Choose and build a single shared data architecture if requested.** Reuse the pure engine and frontend workflows; replace the disconnected scaffold with durable transactional storage, restaurant-scoped identity/roles, signed/secure sessions, validation, idempotency and verified backup/restore. Obtain hosting/environment decisions without creating paid resources. Prototype/tests must demonstrate cross-user isolation and concurrent-receipt behavior before staff rollout. Keep a tested migration from the full browser JSON format.
4. **Receiving corrections and actual operational gaps.** Design receipt reversals/returns/credit notes with immutable audit links, then lot/expiry tracking, historical valuation and POS sales import. Preserve the rule against double stock deduction. Make each milestone independently reviewable.
5. **Deployment last.** Package a concrete tested deployment for review, with real secrets configured outside git and synthetic-data QA. The current static app should not be described as enforcing staff access. No public rollout or paid service without authorization.

If prerequisites for a priority are missing, record a precise blocker and keep working on independent code review/tests or the next unblocked item. Do not spend a session repeatedly searching for inaccessible prices or invent integration access.

## Required review return to ChatGPT

Overwrite `CLAUDE_REVIEW_FOR_CHATGPT.md` only after your work. Include:

- Branch/head and comparison base; concise problem/result summary.
- Files/functions changed and why, with the important diff targets.
- Actual test commands, results, counts, dates, environment and any failures/not-run checks.
- Exact data sources, checked dates, unknown prices/recipes and assumptions.
- Security/data migration/rollback implications, including any private data that must stay local.
- Outstanding tasks in priority order, with acceptance criteria and required user input.
- Questions where ChatGPT should challenge the result; no unsubstantiated production-readiness claim.

Before stopping, commit a coherent checkpoint, list uncommitted files if any, and leave the next concrete action. Do not report a task complete merely because a UI exists.
