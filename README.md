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

## Developer Smoke Test Checklist

- Page loads with zero console errors.
- Navigation tabs work.
- Save Item works.
- Save Vendor works.
- Count sheet opens.
- Ordering Suggestions loads.
- Generate PO Drafts works.
- Reports page opens.
