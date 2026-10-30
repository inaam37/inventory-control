# Farmhouse manager manual

## First setup

Run `npm ci` then `npm start` and open the displayed localhost address. Use one editing tab and one browser profile. The Manager workspace opens first. Your saved inventory remains in that browser; it is not uploaded to GitHub or shared with coworkers.

The menu catalogue is public information, preloaded from six menu PDFs. It has separate dinner/lunch/brunch/happy-hour prices, sides, add-ons, dessert and beverages. Wine lists, group menus, tasting-menu choices and rotating specials require separate confirmation. No ingredient quantities are guessed from a menu description.

## Stock units and purchase packs

Choose a consistent stock unit before entering recipes or orders. Example: stock flour in kg, a case contains 10 kg, and the invoice case price is CAD 30. Enter pack size `10` and cost per stock unit `3`. A case containing 2 bags of 5 kg is 10 kg total. Do not enter `2` unless each stock unit really is a 5 kg bag.

Changing a stock unit after stock, quotes, recipes or orders exist is blocked. Start a new item or have the migration reviewed. On-hand edits in Inventory create a count adjustment in the ledger. Items with recipes/orders/movement history cannot be deleted; keep them with zero par when retired.

## Verified GFS / Sysco pricing

The supplier websites point to ordering portals; current negotiated account prices were not accessible as public price lists. Use the quote CSV template in Manager workspace. A file must be mapped to these column names:

`item,vendor,sku,packQty,packUnit,packPrice,quotedAt,source,currency,specification`

`item` must exactly match the inventory name (case-insensitive); `itemId` can be used instead. Pack quantity is the total net content of one order pack. `packPrice` is the CAD price excluding tax and freight. Quote date uses YYYY-MM-DD. Source identifies the private invoice/quote in your records. Specification is optional but should include brand/grade/cut where relevant.

Supported conversions: kg/g/lb/oz (mass), l/litre/liter/ml (volume), and each/ea (count). The app never converts volume to mass or infers a case size. Unknown items, incompatible units, bad dates, missing sources, non-CAD prices, duplicate identities and invalid numeric values reject the preview. Fix all bad rows and preview again; imports are never silently partial.

Previewing does not save quotes. Importing adds price history to the comparison list without altering stock or costs. `Use for costing / orders` requires confirmation and updates the item's supplier, SKU, unit cost and pack quantity. Comparison is normalized price, not a guarantee of equal quality or total landed cost. Quotes older than 30 days are flagged. No supplier account credentials are entered here.

## Recipes and menu

Enter ingredient quantities in inventory stock units, not a different display unit. For example, 200 g of an item stocked in kg must be entered as `0.2`. Yield is the batch's number of portions. Map the resulting recipe to the correct public menu entry and service.

The menu price and recipe form price are separate: menu checklist percentages use that entry's public price; sales/theoretical cost reports use the recipe form price. A shared recipe may map to several service prices. Bundles and tasting menus need a real composite recipe or remain uncosted. A chef must check weights, edible yield, substitutions and portion sizes before using any cost percentage.

## Counts and orders

Draft count fields save while you type and survive refresh. Applying counts updates only the entries provided and writes adjustments. Blank means no change. Invalid/negative quantities block the entire count application.

Suggested order = max(0, par − on hand − unreceived open-order quantity), rounded up to complete packs. Drafts count as open orders. Cancel an obsolete draft to release its pending quantity. A generated order requires assigned suppliers and positive unit costs. Manual orders use the explicitly entered stock-unit quantity; check pack multiples yourself.

Nothing is emailed or submitted to a vendor. Review quantities/specifications and use your usual ordering portal.

## Receiving

In Manager workspace, select the PO, enter an invoice/reference, date and delivered quantities in stock units. Blank means zero. The app rejects duplicates for the same PO/reference, quantities above the remaining balance and missing inventory items. Stock and ledger entries update together with the saved delivery. Receive the remaining balance with a new delivery reference. The older Purchase Orders full-receipt button is supported only for entirely unreceived orders.

A mistake in a receipt currently requires a documented count correction and manager review; invoice reversals, returns, credit notes, lot expiry and supplier reconciliation are future workflows. Do not reuse a reference to force another receipt.

## Usage, sales and reports

Cooking stock-outs and waste reduce on-hand quantities. Waste requires a reason. New workspaces block negative stock. A legacy backup may retain its former negative-stock setting; check it before use. Sales logs estimate usage from recipe quantities and do not deduct stock automatically. Record cooking usage separately to avoid double counting.

Theoretical recipe costs are estimates based on current item costs and the recipe form's sales price, not accounting COGS or historical invoice valuation. Current-stock value-by-date filters items by creation date; use inventory snapshots to compare closed periods. Missing purchase costs must be resolved before relying on valuation totals.

Staff Directory does not enforce access. Report reminders run only when requested in the open app; no email/SMS delivery or background scheduler exists. POS uploads and invoice entries are metadata logs, not parsed integrations.

## Backup, restore and recovery

Download full JSON backups at least daily, after receiving and before any update/restore. Check the downloaded file exists in a location you control. The displayed backup timestamp records a download request, not off-device backup verification.

Restore validates the selected file, asks before replacement and stores the previous local value under a recovery key. Manager workspace can download that before-restore copy or the raw stored data. A bad stored JSON value is preserved and the app blocks saves until a valid restore or deliberate clear. On a quota or tab-conflict warning, export JSON immediately and reload before further editing. Never commit these files to the public repository.

Clearing current data resets this browser only. It does not delete your downloaded backups or the before-restore recovery copy.
