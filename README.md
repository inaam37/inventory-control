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
