# Inventory upgrade status — October 30, 2026

## Starting point

Repository `inaam37/inventory-control`, default branch `main`, base commit `8caffebbbcb3aeab8dbe580f4da694186b93a5fe` (May 25, 2026). The supported application was already a localStorage prototype. A separate backend had inconsistent auth, a syntax error, missing import dependencies and unsigned editable permission tokens. The existing open PR #30 is an unrelated Word status report and was left untouched.

## Completed in this upgrade

- Added the Manager workspace as the landing page, with a compact mobile navigation strip and operational setup guidance.
- Added 110 public menu prices across six source PDFs; service prices and sizes are separate, with stable service/dish IDs and source links. Recipes can be mapped per entry; unknown costs are clearly uncosted.
- Added source-dated supplier quote CSV preview, all-row validation, CAD/unit normalization, SKU/specification comparison, staleness flags and explicit quote selection for inventory costing/order packs.
- Made suggestions round to whole packs and subtract outstanding drafts/orders; repeated generation does not duplicate pending need.
- Added actual-quantity partial receiving with duplicate-reference and over-receipt protection. Completed receipts cannot be reopened or re-received through the older UI.
- Preserved count drafts across reloads; counts, inventory on-hand edits, stock-outs, waste and receipts write to the stock ledger. New workspaces block negative stock, with a visible manager preference.
- Added backup shape/quantity/reference checks, before-restore copies, raw-data rescue downloads, corrupt-state preservation, save-failure warnings and stale-tab save blocking. Browser storage migration preserves the new collections.
- Fixed recipe ingredient choices after adding inventory, finite-number checks, historical item/recipe deletion protection and stock-unit-change protection.
- Sanitized legacy HTML/print sinks, neutralized formula-prefixed CSV values, added a browser CSP, vendored the locked sanitizer and added a regression check for unsafe HTML assignments.
- Removed a tracked environment file and published demo login credentials; active API sessions are signed and expire after an hour. API mutation permissions are enforced. Paid AI/Excel importing is disabled. Backend startup and tests work.
- Added a localhost-only allowlisted app server, locked dependencies, deterministic inventory tests, API tests and a browser workflow test.
- Updated the manual, deployment notes, source evidence and Claude continuation instructions.

## Validation

- 14 deterministic inventory/import/backup tests pass.
- 11 API/auth tests pass.
- Browser workflow passes with synthetic data: quote import/comparison, inventory creation, whole-pack orders, duplicate draft prevention, partial/full/duplicate receipts, saved count drafts, adjustments, usage/waste, negative-stock blocking, recipe costing/mapping, sales/report generation, reload persistence, JSON backup/restore, corrupted local-state recovery, XSS and tab-conflict checks, and a 390-pixel mobile viewport without horizontal overflow.
- 61 JavaScript sources parse; HTML sink checks and the vendored dependency consistency check pass.
- Root and backend npm audit reports show zero known vulnerabilities at the time checked. This is not a guarantee against all security flaws.

## Finalization additions

- Added read-only GitHub Actions validation for the PR and main pushes.
- Added a shared app-file allowlist, `dist/` build, `.nojekyll`, and Netlify/Vercel static-output configuration.
- Packaged deployment test passes at `/inventory-control/` on desktop/mobile: all assets load, 110 menu entries render, and private paths return 404.
- `npm run verify` passes all engine, syntax, build, browser, packaged deployment and API checks.
- Browser test cleanup also closes its test server if browser startup fails.

## Operational blockers / limitations

- **Verified GFS and Sysco prices:** no authenticated account price list was obtained. Import an authorized, current invoice or portal export privately. No supplier is declared cheaper without comparable data.
- **Restaurant setup:** no real stock counts, supplier prices, sales or private recipe weights were committed. A chef must confirm quantities, yields, substitutions, stock units and pars before live use. Public menu entries alone are insufficient for valid recipe costs.
- **Multiple staff/devices:** not supported as a shared system. Each browser has independent data. The optional API remains in-memory and is not connected to the manager app.
- **Remaining scope:** durable authenticated hosting, restaurant/user isolation, simultaneous database transactions, automated off-device backup/restore, receipts reversals/returns/credits, lot expiry, historical valuation, POS import and official supplier integrations need a separate implementation and validation phase.
- **Old environment values:** deleting `.env` from the current tree does not remove it from Git history. Rotate any values that were ever real credentials. No history rewrite or account changes were made.
- **Current rollout state:** changes are on `codex/farmhouse-manager-upgrade` for review, not a claim that the existing public Pages deployment has been upgraded or that a production staff system is ready.

No supplier order, external email, paid API call or paid hosting purchase was performed.
