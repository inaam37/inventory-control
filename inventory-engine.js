/* Deterministic inventory rules shared by the browser and node:test. No network or paid APIs. */
(function (root) {
  'use strict';
  const units = { kg: ['mass', 1000], g: ['mass', 1], lb: ['mass', 453.59237], oz: ['mass', 28.349523125], l: ['volume', 1000], litre: ['volume', 1000], liter: ['volume', 1000], ml: ['volume', 1], each: ['count', 1], ea: ['count', 1] };
  const positive = (x, label, zero = false) => {
    if (x === '' || x === null || typeof x === 'boolean' || !Number.isFinite(Number(x)) || (zero ? Number(x) < 0 : Number(x) <= 0)) throw new Error(`${label} must be ${zero ? 'non-negative' : 'greater than zero'}.`);
    return Number(x);
  };
  const round = x => Math.round((x + Number.EPSILON) * 1e6) / 1e6;
  function convert(qty, from, to) {
    const a = units[String(from).trim().toLowerCase()], b = units[String(to).trim().toLowerCase()];
    if (!a || !b || a[0] !== b[0]) throw new Error(`Cannot convert ${from} to ${to}; confirm the pack's net quantity in the stock unit.`);
    return Number(qty) * a[1] / b[1];
  }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Use a valid YYYY-MM-DD date.');
    return value;
  }
  function normalizeQuote(raw, items, today = new Date().toISOString().slice(0, 10)) {
    const item = items.find(i => i.id === raw.itemId || i.name.toLowerCase() === String(raw.item || '').trim().toLowerCase());
    if (!item) throw new Error(`Unknown item: ${raw.item || raw.itemId || '(blank)'}. Add inventory items first.`);
    const vendor = String(raw.vendor || '').trim();
    if (!vendor || !String(raw.sku || '').trim() || !String(raw.source || '').trim()) throw new Error('Vendor, supplier SKU, and invoice/quote source are required.');
    if ((raw.currency || 'CAD') !== 'CAD') throw new Error('Import CAD prices only; foreign exchange is not inferred.');
    const quotedAt = date(raw.quotedAt);
    if (quotedAt > today) throw new Error('Quote date cannot be in the future.');
    const packQty = positive(raw.packQty, 'Pack net quantity');
    const packPrice = positive(raw.packPrice, 'Pack price');
    const baseQty = convert(packQty, raw.packUnit, item.unit);
    if (!Number.isFinite(baseQty) || baseQty <= 0) throw new Error('Invalid pack quantity.');
    return { itemId: item.id, vendor, sku: String(raw.sku).trim(), packQty, packUnit: String(raw.packUnit).trim(), packPrice, baseQty, baseUnit: item.unit, unitCost: packPrice / baseQty, quotedAt, source: String(raw.source).trim(), currency: 'CAD', specification: String(raw.specification || '').trim() };
  }
  function latestQuotes(quotes, itemId, today = new Date().toISOString().slice(0, 10)) {
    const latest = new Map();
    quotes.filter(q => q.itemId === itemId).forEach(q => {
      const key = `${q.vendor.toLowerCase()}|${q.sku}`;
      if (!latest.has(key) || q.quotedAt >= latest.get(key).quotedAt) latest.set(key, q);
    });
    return [...latest.values()].map(q => ({ ...q, stale: (Date.parse(today) - Date.parse(q.quotedAt)) / 86400000 > 30 })).sort((a, b) => a.unitCost - b.unitCost);
  }
  function suggestion(item, orders) {
    const pending = orders.filter(po => !['Received', 'Cancelled'].includes(po.status)).flatMap(po => po.items || []).filter(l => l.itemId === item.id).reduce((s, l) => s + Math.max(0, Number(l.qty) - Number(l.receivedQty || 0)), 0);
    const need = Math.max(0, Number(item.par || 0) - Number(item.onHand || 0) - pending);
    const pack = positive(item.packSize || 1, 'Pack size');
    const packs = Math.ceil(round(need / pack));
    return { pending: round(pending), need: round(need), packs, qty: round(packs * pack), packSize: pack };
  }
  function receiptPlan(po, items, lines, reference, logs) {
    if (!reference.trim()) throw new Error('Enter the delivery invoice/reference.');
    if (['Received', 'Cancelled'].includes(po.status)) throw new Error('This order cannot be received again.');
    if (logs.some(r => r.poId === po.id && r.reference === reference.trim())) throw new Error('This delivery reference was already received for this order.');
    const plan = [];
    for (let index = 0; index < po.items.length; index++) {
      const line = po.items[index], raw = lines[index];
      const qty = positive(raw === '' || raw === undefined ? 0 : raw, 'Delivered quantity', true);
      const remaining = round(Number(line.qty) - Number(line.receivedQty || 0));
      if (qty > remaining + 0.000001) throw new Error(`${line.name}: delivered quantity exceeds the remaining order (${remaining}).`);
      const item = items.find(i => i.id === line.itemId);
      if (qty && !item) throw new Error(`${line.name}: inventory item no longer exists.`);
      if (qty) plan.push({ index, itemId: line.itemId, qty, cost: Number(line.cost || 0) });
    }
    if (!plan.length) throw new Error('Enter at least one delivered quantity.');
    return plan;
  }
  function recipeCost(recipe, items) {
    const missing = [];
    if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) missing.push('ingredient quantities');
    let cost = 0;
    for (const l of recipe.ingredients || []) {
      const i = items.find(i => i.id === l.itemId);
      if (!i || !Number.isFinite(Number(i.cost)) || Number(i.cost) <= 0 || !Number.isFinite(Number(l.qty)) || Number(l.qty) <= 0) missing.push(i?.name || l.itemId || 'ingredient');
      else cost += Number(i.cost) * Number(l.qty);
    }
    const yieldQty = Number(recipe.yield);
    if (!Number.isFinite(yieldQty) || yieldQty <= 0) missing.push('recipe yield');
    return { complete: !missing.length, missing, batchCost: missing.length ? null : cost, servingCost: missing.length ? null : cost / yieldQty };
  }
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', quoted = false, closed = false;
    text = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; }
      else if (c === '"') { if (cell || closed) throw new Error('Invalid CSV quote.'); quoted = true; }
      else if (c === ',' || c === '\n' || c === '\r') {
        row.push(cell); cell = ''; closed = false;
        if (c !== ',') { if (row.some(x => x.trim())) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
      } else { if (closed && c.trim()) throw new Error('Unexpected text after CSV quote.'); if (!closed) cell += c; }
    }
    if (quoted) throw new Error('Unclosed CSV quote.');
    row.push(cell); if (row.some(x => x.trim())) rows.push(row);
    if (rows.length < 2) throw new Error('CSV needs a header and at least one row.');
    const headers = rows.shift().map(h => h.trim());
    if (new Set(headers).size !== headers.length || headers.some(h => !h || ['__proto__', 'constructor', 'prototype'].includes(h))) throw new Error('Invalid or duplicate CSV headers.');
    return rows.map((r, i) => { if (r.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${r.length} cells; expected ${headers.length}.`); return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()])); });
  }
  function validateBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.items) || !Array.isArray(data.vendors)) throw new Error('Backup must contain inventory items and vendors arrays.');
    if (Number(data.schemaVersion || 1) > 2) throw new Error('This backup needs a newer app.');
    const arrays = ['items','vendors','recipes','sales','usageLogs','priceHistory','poDrafts','invoices','receivingLogs','inventorySnapshots','schedules','users','feedback','posUploads','reportSchedules','stockTransactions','supplierQuotes','menuCatalog'];
    arrays.forEach(k => { if (data[k] !== undefined && !Array.isArray(data[k])) throw new Error(`${k} must be an array.`); if (data[k]?.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error(`Invalid row in ${k}.`); });
    if (data.settings !== undefined && (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings))) throw new Error('Invalid settings.');
    for (const key of ['items','vendors','recipes','poDrafts']) {
      const seen = new Set();
      for (const row of data[key] || []) { if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw new Error(`Invalid or duplicate ID in ${key}.`); seen.add(row.id); }
    }
    data.items.forEach(i => { if (typeof i.name !== 'string' || !i.name.trim() || typeof i.unit !== 'string') throw new Error('Invalid inventory item.'); ['onHand','cost','par','reorderPoint','usagePerDay','leadTimeDays'].forEach(k => { if (i[k] !== undefined) positive(i[k], k, true); }); });
    (data.recipes || []).forEach(r => { if (typeof r.name !== 'string' || !Array.isArray(r.ingredients)) throw new Error('Invalid recipe.'); positive(r.yield, 'Recipe yield'); r.ingredients.forEach(l => { if (!data.items.some(i => i.id === l.itemId)) throw new Error('Recipe references a missing inventory item.'); positive(l.qty, 'Recipe ingredient quantity'); }); });
    (data.poDrafts || []).forEach(po => { if (!Array.isArray(po.items)) throw new Error('Invalid purchase order.'); po.items.forEach(l => { positive(l.qty, 'Order quantity'); positive(l.cost, 'Order cost', true); if (l.receivedQty !== undefined && positive(l.receivedQty, 'Received quantity', true) > l.qty) throw new Error('Invalid received quantity.'); }); });
    (data.supplierQuotes || []).forEach(q => { ['vendor','sku','source','itemId','baseUnit','packUnit'].forEach(k => { if (typeof q[k] !== 'string' || !q[k].trim()) throw new Error('Invalid supplier quote.'); }); ['packQty','packPrice','baseQty','unitCost'].forEach(k => positive(q[k], k)); date(q.quotedAt); if (q.currency !== 'CAD') throw new Error('Quote currency must be CAD.'); });
    (data.menuCatalog || []).forEach(m => { if (typeof m.name !== 'string' || typeof m.service !== 'string' || typeof m.id !== 'string' || !String(m.sourceUrl).startsWith('https://www.farmhouseon10th.com/assets/menus/')) throw new Error('Invalid public menu entry.'); positive(m.menuPrice, 'Menu price', true); });
    return data;
  }
  const api = { convert, normalizeQuote, latestQuotes, suggestion, receiptPlan, recipeCost, parseCSV, validateBackup, date, round };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.InventoryEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
