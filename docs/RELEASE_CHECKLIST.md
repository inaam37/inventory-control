# PR #35 — final merge checklist

## What the final button does

Open [PR #35](https://github.com/inaam37/inventory-control/pull/35). When `Validate inventory app` is green and GitHub reports no conflicts, choose **Merge pull request → Confirm merge**. An **Approve** review by itself does not put the code on main. This PR is deliberately left open for the owner to take that final action.

The current live site is [inaam37.github.io/inventory-control](https://inaam37.github.io/inventory-control/). It responded successfully during finalization and was still serving the earlier app. This change does not alter the account's hosting settings; a successful merge makes the new source available to its configured deployment.

## Included and checked

- Manager landing page and mobile navigation.
- 110 public menu prices with source links; no invented recipe weights or supplier prices.
- Verified-quote import and comparison, stock units, order packs, pending order deduction and partial receiving.
- Counts, ledger, usage/waste, recipe mapping/costing, reports and JSON recovery.
- Root static serving plus a minimal `dist/` package for Netlify/Vercel.
- Project-subpath asset loading (`/inventory-control/`), desktop/mobile layout, and excluded private paths.
- Engine/API/browser/deployment validation and dependency audits in GitHub Actions.
- Manager manual, deployment notes and a detailed Claude handoff.

The GitHub check's run log is the authority for whether the latest commit passed remotely. Local verification evidence and known limitations are in `docs/STATUS.md`.

## Before using real restaurant records

Download a full JSON backup from your existing browser first. Stay on the same site/browser/profile to retain its local inventory. After the site updates, check the Manager workspace, open a count sheet, and confirm that your existing records are present before entering a delivery. If data are missing, use Data Tools to restore the backup rather than entering duplicate opening balances.

Confirm active menu prices, recipe weights/yields, opening counts, pars and authorized GFS/Sysco invoices. The app cannot infer those from a public menu. Keep operational data and private recipes out of the public Git repository.

This release is for one browser. Shared multi-staff accounts, a durable server database, remote backup, supplier order submission and POS integration remain separate milestones. Merging does not make those integrations exist.

If old committed environment values were real credentials, rotate them. The current version removes them but cannot erase prior Git history.

## Recovery if the release misbehaves

Export the current browser JSON before changing data. The pre-upgrade source is main's original commit `8caffebbbcb3aeab8dbe580f4da694186b93a5fe`; a source rollback should be a new reviewed revert commit, not a forced history rewrite. Keep a copy of the upgraded backup: older app code does not understand all schema-2 fields, and using it against newer data may lose those fields on save. Prefer correcting the new release and restoring a validated backup where needed.
