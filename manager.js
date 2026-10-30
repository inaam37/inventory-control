/* Manager workflows. Uses the same state/ledger as the existing app. */
window.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const E = InventoryEngine, host = document.getElementById('manager');
  const el = (tag, text, parent, attrs = {}) => {
    const node = document.createElement(tag);
    if (text !== null) node.textContent = text;
    Object.assign(node, attrs); if (parent) parent.append(node); return node;
  };
  const button = (text, parent, fn) => { const b = el('button', text, parent, { type: 'button', className: 'ghost' }); b.addEventListener('click', () => run(fn)); return b; };
  const field = (label, parent, type = 'text') => { const wrap = el('label', label, parent); return el('input', null, wrap, { type }); };
  const money = n => n === null || !Number.isFinite(n) ? 'Uncosted' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 4 }).format(n);
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
  const notice = el('div', '', host, { role: 'status', className: 'form-feedback' });
  const run = fn => { try { fn(); } catch (e) { notice.textContent = e.message; notice.className = 'form-feedback error'; notice.scrollIntoView({ block: 'nearest' }); } };
  const commit = fn => {
    if (window.inventoryRecoveryRequired) throw new Error('Restore a valid backup before changing inventory.');
    if (localStorage.getItem(STORAGE_KEY) !== window.inventoryLoadedValue) throw new Error('Another tab changed inventory. Export your work, then reload.');
    const before = getStateSnapshot();
    // Snapshot must be independent of the live arrays for rollback.
    const backup = JSON.parse(JSON.stringify(before));
    try { fn(); if (!saveState()) throw new Error('Changes could not be saved. Nothing from this action was applied.'); }
    catch (e) { Object.assign(state, backup); renderAll(); throw e; }
    notice.textContent = 'Saved in this browser. Export a backup before closing.';
    notice.className = 'form-feedback success'; renderAll();
  };
  const card = title => { const c = el('div', null, host, { className: 'card' }); el('h3', title, c); return c; };
  const table = (parent, headings) => { const wrap = el('div', null, parent); wrap.style.overflowX = 'auto'; const t = el('table', null, wrap), tr = el('tr', null, el('thead', null, t)); headings.forEach(h => el('th', h, tr)); return el('tbody', null, t); };
  const cell = (tr, text) => el('td', text, tr);
  const selection = (parent, label, options) => { const wrap = el('label', label, parent), select = el('select', null, wrap, { ariaLabel: label }); options.forEach(([value, text]) => el('option', text, select, { value })); return select; };
  const intro = card('Farmhouse manager workspace');
  el('p', 'Single-browser inventory. No cloud sync or staff login is connected. Supplier invoices, counts and recipes stay in this browser; export a JSON backup for another device. Order buttons create drafts only.', intro);
  el('p', 'Start: add inventory in stock units → import verified supplier quotes → confirm recipes → count stock → draft orders → receive deliveries → log usage/waste → export backup.', intro);
  const summary = el('p', '', intro);
  const negativeLabel = el('label', 'Block stock-outs that would make stock negative ', intro);
  const negativeStock = el('input', null, negativeLabel, { type: 'checkbox', ariaLabel: 'Block negative stock' }); negativeStock.style.width = 'auto';
  negativeStock.addEventListener('change', () => run(() => commit(() => { state.settings.blockNegativeStock = negativeStock.checked; })));
  button('Export full JSON backup', intro, () => { state.settings.lastBackupAt = new Date().toISOString(); if (!saveState()) throw new Error('Backup timestamp could not be saved. Use Data Tools export to rescue unsaved work.'); exportJson(); render(); });
  button('Print count sheet', intro, () => { setActiveView('counts'); window.print(); });
  const exportCard = card('Recovery copies');
  el('p', 'A recovery copy is kept before a JSON restore. Download it here if you selected the wrong file. Invalid stored data is preserved for recovery.', exportCard);
  function downloadRaw(key, name) {
    const data = localStorage.getItem(key); if (!data) throw new Error('No recovery copy exists.');
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = el('a', '', null, { href: url, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  button('Download before-restore copy', exportCard, () => downloadRaw(STORAGE_KEY + '_before_restore', 'inventory-before-restore.json'));
  button('Download stored data', exportCard, () => downloadRaw(STORAGE_KEY, 'inventory-stored-recovery.json'));
  const quoteCard = card('GFS / Sysco supplier price comparison');
  el('p', 'Import CAD invoice or quote prices excluding tax, delivery charges and rebates. This is a normalized price comparison, not a delivered-cost quote. Check brand, grade, specification and availability before choosing. Prices over 30 days old are marked stale.', quoteCard);
  for (const [name, href] of [['Gordon Ordering', 'https://gfs.ca/products-services/technology-solutions/gordon-ordering/'], ['Sysco Shop', 'https://shop.sysco.ca/auth/login']]) { el('a', name, quoteCard, { href, target: '_blank', rel: 'noopener noreferrer' }); el('span', '  ', quoteCard); }
  el('p', 'No account prices have been imported. Your subscriptions do not provide supplier-portal access. Export from your account, then map columns to this template; invoices and credentials must never be committed to GitHub.', quoteCard);
  const csv = el('textarea', null, quoteCard, { rows: 5, ariaLabel: 'Supplier quote CSV', placeholder: 'item,vendor,sku,packQty,packUnit,packPrice,quotedAt,source,currency,specification' });
  const upload = field('Choose quote CSV (maximum 2 MB)', quoteCard, 'file'); upload.accept = '.csv,text/csv';
  let preview = [];
  const previewNote = el('p', 'No file staged.', quoteCard);
  upload.addEventListener('change', async () => { const f = upload.files[0]; if (!f) return; if (f.size > 2e6) { notice.textContent = 'File exceeds 2 MB.'; return; } csv.value = await f.text(); preview = []; previewNote.textContent = 'File loaded. Preview it before importing.'; });
  csv.addEventListener('input', () => { preview = []; previewNote.textContent = 'Text changed. Preview again.'; });
  button('Download quote template', quoteCard, () => downloadCSV('supplier-quotes-template.csv', 'item,vendor,sku,packQty,packUnit,packPrice,quotedAt,source,currency,specification\n'));
  const previewBody = table(quoteCard, ['Item', 'Supplier / SKU', 'Pack', 'Pack CAD', 'CAD / stock unit', 'Date / source']);
  button('Preview and validate all rows', quoteCard, () => {
    preview = []; previewBody.replaceChildren();
    const rows = E.parseCSV(csv.value);
    if (rows.length > 5000) throw new Error('Limit imports to 5,000 quotes.');
    const required = ['vendor','sku','packQty','packUnit','packPrice','quotedAt','source'];
    if (!('item' in rows[0]) && !('itemId' in rows[0])) throw new Error('CSV needs an item or itemId column.');
    if (required.some(k => !(k in rows[0]))) throw new Error('Use the quote template column names.');
    const results = [], errors = [];
    rows.forEach((r, i) => { try { results.push(E.normalizeQuote(r, state.items, today())); } catch(e) { errors.push(`Row ${i + 2}: ${e.message}`); } });
    if (errors.length) { previewNote.textContent = errors.join('\n'); throw new Error(`${errors.length} invalid rows. Nothing staged or imported.`); }
    const keys = new Set();
    for (const q of results) { const key = JSON.stringify([q.itemId,q.vendor.toLowerCase(),q.sku,q.quotedAt,q.source]); if (keys.has(key)) throw new Error('Duplicate quote identity in this CSV; keep one row per item/vendor/SKU/date/source.'); keys.add(key); }
    preview = results;
    results.slice(0, 100).forEach(q => { const tr = el('tr', null, previewBody); [state.items.find(i => i.id === q.itemId).name, `${q.vendor} / ${q.sku}`, `${q.packQty} ${q.packUnit}`, money(q.packPrice), `${money(q.unitCost)} / ${q.baseUnit}`, `${q.quotedAt} / ${q.source}`].forEach(v => cell(tr, v)); });
    previewNote.textContent = `${results.length} valid quotes staged. Showing up to 100. Check pack net quantity and price basis; no changes yet.`;
  });
  button('Import validated quotes', quoteCard, () => {
    if (!preview.length) throw new Error('Preview a valid CSV first.');
    if (preview.some(q => !state.items.some(i => i.id === q.itemId && i.unit === q.baseUnit))) throw new Error('Inventory items or stock units changed after preview. Preview the CSV again.');
    commit(() => {
      preview.forEach(q => {
        const index = state.supplierQuotes.findIndex(p => p.itemId === q.itemId && p.vendor.toLowerCase() === q.vendor.toLowerCase() && p.sku === q.sku && p.quotedAt === q.quotedAt && p.source === q.source);
        const record = { ...q, id: index < 0 ? crypto.randomUUID() : state.supplierQuotes[index].id };
        if (index < 0) state.supplierQuotes.push(record); else state.supplierQuotes[index] = record;
      });
    });
    preview = []; previewBody.replaceChildren(); previewNote.textContent = 'Quotes imported. Choose a price below to use it for costing and ordering.';
  });
  const compare = table(quoteCard, ['Item', 'Supplier / SKU', 'Net pack', 'CAD / stock unit', 'Quote / specification', 'Use price']);
  const ordersCard = card('Pack-aware order review');
  el('p', 'Suggested quantity = par − on hand − unreceived quantities on open orders, rounded up to whole packs. Confirm par and supplier before drafting. Existing order lines retain their original cost and pack quantity.', ordersCard);
  const orderBody = table(ordersCard, ['Item / supplier', 'On hand / par', 'Open orders', 'Need', 'Packs / quantity', 'Estimated CAD']);
  button('Generate purchase order drafts', ordersCard, () => generatePoDrafts());
  const receiptCard = card('Receive a delivery (partial or full)');
  el('p', 'Enter quantities delivered today in each item’s stock unit. Blank means zero. Each invoice/reference can be received only once per order. Receive the balance later with a different reference. This does not submit or pay an order.', receiptCard);
  const poSelect = selection(receiptCard, 'Purchase order', []);
  const ref = field('Delivery invoice / reference', receiptCard);
  const receiptDate = field('Received date', receiptCard, 'date'); receiptDate.value = today();
  const receiptBody = table(receiptCard, ['Item', 'Ordered', 'Already received', 'Stock unit', 'Delivered today']);
  let receiptInputs = [];
  function receiveRows() {
    receiptBody.replaceChildren(); receiptInputs = [];
    const po = state.poDrafts.find(p => p.id === poSelect.value); if (!po) return;
    po.items.forEach(l => { const tr = el('tr', null, receiptBody); [l.name, l.qty, l.receivedQty || 0, l.unit].forEach(v => cell(tr, String(v))); const input = el('input', null, cell(tr, null), { type: 'number', min: '0', max: String(E.round(l.qty - (l.receivedQty || 0))), step: 'any', placeholder: '0', ariaLabel: `${l.name} delivered today` }); receiptInputs.push(input); });
  }
  poSelect.addEventListener('change', receiveRows);
  button('Save delivery and update stock', receiptCard, () => {
    const po = state.poDrafts.find(p => p.id === poSelect.value); if (!po) throw new Error('Select an open purchase order.');
    const receivedDate = E.date(receiptDate.value); if (receivedDate > today()) throw new Error('Delivery date cannot be in the future.');
    const reference = ref.value.trim(), plan = E.receiptPlan(po, state.items, receiptInputs.map(i => i.value), reference, state.receivingLogs);
    commit(() => {
      const id = crypto.randomUUID();
      plan.forEach(p => {
        const item = state.items.find(i => i.id === p.itemId), previousQty = Number(item.onHand || 0);
        item.onHand = E.round(previousQty + p.qty);
        recordStockTransaction({ itemId: item.id, type: 'stock-in', qty: p.qty, unit: item.unit, date: receivedDate, sourceId: id, note: `Delivery ${reference}`, userId: 'Manager', previousQty, newQty: item.onHand });
        po.items[p.index].receivedQty = E.round(Number(po.items[p.index].receivedQty || 0) + p.qty);
      });
      po.status = po.items.every(l => Number(l.receivedQty || 0) >= Number(l.qty)) ? 'Received' : 'Partially Received';
      state.receivingLogs.unshift({ id, poId: po.id, vendorName: po.vendorName, receivedDate, reference, note: 'Manager delivery receipt', total: plan.reduce((s,p) => s + p.qty * p.cost, 0), lines: plan });
    }); ref.value = '';
  });
  const menuCard = card('Farmhouse live-menu costing checklist');
  el('p', 'Public menu PDFs checked October 30, 2026. Prices exclude tax. Dinner, lunch, brunch, dessert, beverages and happy hour are separate. Wine lists, group packages and rotating specials need separate manager confirmation. Menus do not specify recipe weights or yields; those are never inferred.', menuCard);
  button('Load / update public menu catalogue', menuCard, () => commit(() => {
    FARMHOUSE_MENU.forEach(entry => {
      const old = state.menuCatalog.find(m => m.id === entry.id);
      if (old) Object.assign(old, entry, { recipeId: old.recipeId || '' }); else state.menuCatalog.push({ ...entry });
    });
  }));
  const serviceFilter = selection(menuCard, 'Service', [['', 'All services'], ...[...new Set(FARMHOUSE_MENU.map(m => m.service))].map(s => [s,s])]);
  const menuSearch = field('Search menu', menuCard, 'search');
  const menuBody = table(menuCard, ['Service / dish', 'Public price CAD', 'Recipe mapping', 'Cost / portion', 'Food cost %', 'Source / readiness']);
  serviceFilter.addEventListener('change', renderMenu); menuSearch.addEventListener('input', renderMenu);
  function renderMenu() {
    menuBody.replaceChildren();
    state.menuCatalog.filter(m => (!serviceFilter.value || m.service === serviceFilter.value) && m.name.toLowerCase().includes(menuSearch.value.toLowerCase())).forEach(m => {
      const tr = el('tr', null, menuBody); cell(tr, `${m.service} · ${m.name}`); cell(tr, money(m.menuPrice));
      const choose = selection(cell(tr, null), `Recipe for ${m.service} ${m.name}`, [['', 'Needs recipe'], ...state.recipes.map(r => [r.id,r.name])]); choose.value = m.recipeId || '';
      choose.addEventListener('change', () => run(() => commit(() => { m.recipeId = choose.value; })));
      const r = state.recipes.find(r => r.id === m.recipeId), c = r ? E.recipeCost(r,state.items) : null;
      cell(tr, c?.complete ? money(c.servingCost) : 'Uncosted');
      cell(tr, c?.complete && m.menuPrice > 0 ? `${(100 * c.servingCost / m.menuPrice).toFixed(1)}%` : '—');
      const last = cell(tr, null); el('a', 'Menu PDF', last, { href: m.sourceUrl, target: '_blank', rel: 'noopener noreferrer' });
      el('p', c?.complete ? 'Costed from entered recipe. Chef must confirm portion / yield.' : `Needs ${c ? c.missing.join(', ') : 'recipe quantities and yield'}`, last);
    });
  }
  function render() {
    if (!Array.isArray(state.supplierQuotes)) state.supplierQuotes = [];
    if (!Array.isArray(state.menuCatalog)) state.menuCatalog = [];
    negativeStock.checked = Boolean(state.settings.blockNegativeStock);
    summary.textContent = `${state.items.length} inventory items (${state.items.filter(i => !(Number(i.cost) > 0)).length} uncosted) · ${state.supplierQuotes.length} supplier quotes · ${state.menuCatalog.length} menu price entries. Last backup download requested: ${state.settings.lastBackupAt || 'never'}.`;
    compare.replaceChildren(); orderBody.replaceChildren();
    state.items.forEach(item => {
      E.latestQuotes(state.supplierQuotes, item.id, today()).forEach(q => {
        const tr = el('tr', null, compare); [item.name, `${q.vendor} / ${q.sku}`, `${q.packQty} ${q.packUnit}`, `${money(q.unitCost)} / ${q.baseUnit}`, `${q.quotedAt}${q.stale ? ' · STALE' : ''} · ${q.specification || 'Confirm specification'} · ${q.source}`].forEach(v => cell(tr,v));
        button('Use for costing / orders', cell(tr,null), () => {
          if (!confirm(`Confirm ${q.vendor} ${q.sku} matches ${item.name}. Use ${money(q.unitCost)} per ${q.baseUnit} and ${q.baseQty} ${q.baseUnit} per order pack?${q.stale ? ' This quote is over 30 days old; verify availability and price first.' : ''}`)) return;
          commit(() => {
            let vendor = state.vendors.find(v => v.name.toLowerCase() === q.vendor.toLowerCase());
            if (!vendor) { vendor = { id: crypto.randomUUID(), name: q.vendor, contact: '', email: '', phone: '' }; state.vendors.push(vendor); }
            Object.assign(item, { cost: q.unitCost, packSize: q.baseQty, vendorId: vendor.id, sku: q.sku, costSource: q.source, costDate: q.quotedAt });
            state.priceHistory.unshift({ id: crypto.randomUUID(), itemId: item.id, vendorId: vendor.id, amount: q.unitCost, date: q.quotedAt, note: q.source });
          });
        });
      });
      const s = E.suggestion(item, state.poDrafts); if (!s.need && !s.pending) return;
      const tr = el('tr',null,orderBody);
      [item.name + ' / ' + getVendorName(item.vendorId), `${item.onHand} / ${item.par} ${item.unit}`, `${s.pending} ${item.unit}`, `${s.need} ${item.unit}`, `${s.packs} packs / ${s.qty} ${item.unit}`, Number(item.cost) > 0 ? money(s.qty * item.cost) : 'Needs verified cost'].forEach(v => cell(tr,v));
    });
    const selected = poSelect.value; poSelect.replaceChildren(); el('option','Select order',poSelect,{value:''});
    state.poDrafts.filter(po => !['Received','Cancelled'].includes(po.status)).forEach(po => el('option',`${po.vendorName} · ${po.id.slice(0,8)} · ${po.status}`,poSelect,{value:po.id}));
    poSelect.value = selected; receiveRows(); renderMenu();
  }
  window.renderManager = render;
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { notice.textContent = 'Inventory changed in another tab. Export unsaved work, then reload before editing.'; notice.className = 'form-feedback error'; } });
  render();
});
