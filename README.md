# PantryPilot Inventory Control

PantryPilot is a static browser-based prototype for restaurant inventory management. It stores data in `localStorage` and supports inventory items, vendors, count sheets, ordering suggestions, purchase order drafts, recipes, usage tracking, price history, reports, and data export/import workflows.

## Running Locally

Open `index.html` in a browser, or serve the folder with any simple static web server so `index.html` and `csv-utils.js` are loaded from the same directory.

## Phase 1 Stabilization

- Restored the missing ordering suggestions renderer.
- Repaired ingredient autocomplete setup so it only uses `state.items`.
- Added CSV helper functions required by startup and export buttons.
- Added a visible startup error banner if initialization fails.

## Phase 1 Smoke Test Results

Completed on 2026-05-25 against the local static app.

- Passed: Page loads with zero console errors.
- Passed: Navigation tabs work.
- Passed: Save Item works.
- Passed: Save Vendor works.
- Passed: Count sheet opens.
- Passed: Ordering Suggestions loads.
- Passed: Generate PO Drafts works.
- Passed: Reports page opens.
- Passed: Refresh keeps saved `localStorage` data.

## Phase 2 Persistence

- Added a versioned local state schema with `schemaVersion: 1`.
- Added `migrateState(raw)` so older saved browser data loads with current defaults.
- Added guarded local saves through `safeSaveState()`, including a visible save status indicator.
- Preserved all persistent collections in local save/export/import flows, including count sessions, reports, uploads, invoices, and settings.
- Added a visible Clear all data control with confirmation that it only deletes local browser data.
- Defaulted currency settings to CAD and wired currency formatting to the configured setting.
- Blocked duplicate inventory item names and barcodes while still allowing edits to the same item.

## Phase 2 Smoke Test Results

Completed on 2026-05-25 against the local static app runtime.

- Passed: Persistence schema parses with zero JavaScript syntax errors.
- Passed: Original app script and helper start together with no startup reference errors.
- Passed: Saved JSON includes every required persistent field.
- Passed: `schemaVersion: 1` is written to local state.
- Passed: CAD is the default currency setting.
- Passed: Active count session data is included in saved state.
- Passed: Duplicate barcode validation shows form feedback and marks the barcode field invalid.
- Passed: Usage item autocomplete is rebuilt from `state.items` and sorted alphabetically.
- Passed: Save quota/security failure path shows `Save failed` with a visible warning.
- Passed: Clear all data and currency controls are present in Data Tools.
- Note: The in-app browser refused local URLs in this sandbox, so the Phase 2 pass used a local runtime harness plus script parsing. Run the manual checklist below in a normal browser before release.

## Phase 3 Stock Movement

- Added a `stockTransactions` ledger to persisted local state.
- Added `recordStockTransaction({ itemId, type, qty, unit, date, sourceId, note, userId })` with previous/new quantity tracking.
- Count sheets now record `count-adjustment` ledger entries for quantity differences.
- Receiving a PO now increases item `onHand` and records one `stock-in` transaction per received line.
- Already received POs are protected from accidental double receiving unless the user confirms.
- Usage and waste now reduce item `onHand` and record `stock-out` / `waste` transactions.
- Negative stock movement warns the user; it can be blocked through `settings.blockNegativeStock`.
- Added an Item Activity panel that shows recent movement date, type, quantity, previous quantity, new quantity, and note for the selected item.
- Added a Stock Transactions CSV export.

## Phase 3 Smoke Test Results

Completed on 2026-05-25 against the local static app runtime.

- Passed: Original app script and helper start together with stock movement controls installed.
- Passed: Receiving a PO increased stock from 10 to 14.
- Passed: Duplicate receiving was prevented when confirmation was declined.
- Passed: Usage reduced stock from 14 to 11 and created a `stock-out` transaction.
- Passed: Waste reduced stock from 11 to 9 and created a `waste` transaction with reason.
- Passed: Count adjustment changed stock from 9 to 8 and created a `count-adjustment` transaction for `-1`.
- Passed: Item Activity rendered all four stock movements with previous/new quantities.
- Passed: Saved JSON includes `stockTransactions`.
- Passed: Stock Transactions CSV export control is present.
- Note: The in-app browser refused local URLs in this sandbox, so the Phase 3 pass used a local runtime harness plus script parsing. Run the manual checklist below in a normal browser before release.

## Developer Smoke Test Checklist

- Page loads with zero console errors.
- Navigation tabs work.
- Save Item works.
- Save Vendor works.
- Count sheet opens.
- Ordering Suggestions loads.
- Generate PO Drafts works.
- Reports page opens.
- Start count session persists after refresh.
- CAD shows by default.
- Duplicate barcode is blocked with form feedback.
- Data Tools exports/imports JSON without dropping persistent fields.
- Receiving a PO increases stock and writes `stock-in` entries.
- Usage decreases stock and writes `stock-out` entries.
- Waste decreases stock and writes `waste` entries.
- Count sheets write `count-adjustment` entries for changed quantities.
- Clicking an item shows Item Activity with previous/new quantities.
- Stock Transactions CSV exports.
