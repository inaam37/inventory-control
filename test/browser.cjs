const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../scripts/serve.cjs');
(async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  const url=`http://127.0.0.1:${server.address().port}`;
    await page.goto(url);await page.waitForFunction(()=>window.renderManager);
    await page.locator('[data-view="manager"]').click();
    console.log('Stage: menu loaded');
    assert.equal(await page.locator('#manager tbody').last().locator('tr').count(),110);
    // Add real form input, synthetic stock and cost. No restaurant data.
    await page.locator('[data-view="inventory"]').click();
    await page.locator('#itemName').fill('Test flour');await page.locator('#itemCategory').selectOption('Dry Storage');await page.locator('#itemUnit').selectOption('kg');
    await page.locator('#itemOnHand').fill('2');await page.locator('#itemPar').fill('20');await page.locator('#itemCost').fill('0');
    await page.locator('#saveItem').click();assert.equal(await page.evaluate(()=>state.items.length),1);
    await page.locator('[data-view="manager"]').click();
    const date=await page.evaluate(()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Vancouver'}));
    await page.getByRole('textbox',{name:'Supplier quote CSV'}).fill(`item,vendor,sku,packQty,packUnit,packPrice,quotedAt,source,currency,specification\nTest flour,GFS,TEST1,5000,g,15,${date},synthetic-test,CAD,test-only\nTest flour,Sysco,TEST2,10,kg,28,${date},synthetic-test,CAD,test-only`);
    await page.getByRole('button',{name:'Preview and validate all rows',exact:true}).click();
    await page.getByRole('button',{name:'Import validated quotes',exact:true}).click();assert.equal(await page.evaluate(()=>state.supplierQuotes.length),2);
    await page.getByRole('button',{name:'Use for costing / orders'}).first().click();
    assert.equal(await page.evaluate(()=>state.items[0].cost),2.8);assert.equal(await page.evaluate(()=>state.items[0].packSize),10);
    await page.getByRole('button',{name:'Generate purchase order drafts',exact:true}).click();assert.equal(await page.evaluate(()=>state.poDrafts[0].items[0].qty),20);
    await page.getByRole('button',{name:'Generate purchase order drafts',exact:true}).click();assert.equal(await page.evaluate(()=>state.poDrafts.length),1);
    console.log('Stage: quotes and order draft passed');
    const orderId=await page.evaluate(()=>state.poDrafts[0].id);
    await page.locator('#manager').getByLabel('Purchase order',{exact:true}).selectOption(orderId);
    await page.getByLabel('Delivery invoice / reference',{exact:true}).fill('TEST-DELIVERY-1');
    await page.getByLabel('Test flour delivered today',{exact:true}).fill('8');
    await page.getByRole('button',{name:'Save delivery and update stock',exact:true}).click();assert.equal(await page.evaluate(()=>state.items[0].onHand),10);assert.equal(await page.evaluate(()=>state.poDrafts[0].status),'Partially Received');
    await page.getByLabel('Delivery invoice / reference',{exact:true}).fill('TEST-DELIVERY-1');await page.getByLabel('Test flour delivered today',{exact:true}).fill('1');await page.getByRole('button',{name:'Save delivery and update stock',exact:true}).click();assert.equal(await page.evaluate(()=>state.items[0].onHand),10);
    await page.getByLabel('Delivery invoice / reference',{exact:true}).fill('TEST-DELIVERY-2');await page.getByLabel('Test flour delivered today',{exact:true}).fill('12');await page.getByRole('button',{name:'Save delivery and update stock',exact:true}).click();assert.equal(await page.evaluate(()=>state.items[0].onHand),22);assert.equal(await page.evaluate(()=>state.poDrafts[0].status),'Received');
    assert.equal(await page.evaluate(()=>state.stockTransactions.filter(t=>t.type==='stock-in').length),2);
    // Count drafts survive refresh, then apply an adjustment to the stock ledger.
    await page.locator('[data-view="counts"]').click();
    await page.locator('input[data-count-id]').fill('21');await page.reload();await page.waitForFunction(()=>window.renderManager);
    await page.locator('[data-view="counts"]').click();assert.equal(await page.locator('input[data-count-id]').inputValue(),'21');
    await page.locator('#applyCounts').click();assert.equal(await page.evaluate(()=>state.items[0].onHand),21);
    await page.locator('[data-view="usage"]').click();
    await page.locator('#usageItemSearch').fill('Test flour');await page.locator('#usageQty').fill('2');await page.locator('#saveUsage').click();
    await page.locator('#wasteItemSearch').fill('Test flour');await page.locator('#wasteQty').fill('1');await page.locator('#wasteReason').fill('Synthetic test');await page.locator('#logWaste').click();
    assert.equal(await page.evaluate(()=>state.items[0].onHand),18);
    await page.locator('#usageItemSearch').fill('Test flour');await page.locator('#usageQty').fill('100');await page.locator('#saveUsage').click();assert.equal(await page.evaluate(()=>state.items[0].onHand),18);
    // Recipe form picks up items created after page startup.
    await page.locator('[data-view="recipes"]').click();await page.locator('#recipeName').fill('Synthetic test recipe');await page.locator('#recipeYield').fill('4');await page.locator('#recipePrice').fill('20');
    await page.locator('.ingredient-item').selectOption(await page.evaluate(()=>state.items[0].id));await page.locator('.ingredient-qty').fill('2');await page.locator('#saveRecipe').click();
    assert.equal(await page.evaluate(()=>InventoryEngine.recipeCost(state.recipes[0],state.items).servingCost),1.4);
    await page.locator('[data-view="manager"]').click();await page.getByLabel('Recipe for Dinner Seasonal Green Salad',{exact:true}).selectOption(await page.evaluate(()=>state.recipes[0].id));
    assert.match(await page.locator('#manager').innerText(),/9\.3%/);
    await page.locator('[data-view="usage"]').click();await page.locator('#saleRecipe').selectOption(await page.evaluate(()=>state.recipes[0].id));await page.locator('#saleServings').fill('4');await page.locator('#saveSale').click();assert.equal(await page.evaluate(()=>state.items[0].onHand),18);
    await page.locator('[data-view="reports"]').click();await page.locator('#reportType').selectOption('recipeCosting');await page.locator('#generateReport').click();assert.match(await page.locator('#reportTableBody').innerText(),/1\.40/);
    console.log('Stage: receiving passed');
    await page.reload();await page.waitForFunction(()=>window.renderManager);assert.equal(await page.evaluate(()=>state.items[0].onHand),18);assert.equal(await page.evaluate(()=>state.supplierQuotes.length),2);
    await page.locator('[data-view="manager"]').click();
    const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export full JSON backup',exact:true}).click();const download=await downloadWait;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(backup.items[0].onHand,18);assert.equal(backup.menuCatalog.length,110);
    // XSS in legacy HTML templates must not execute on render.
    await page.evaluate(()=>{state.items[0].name='<img src=x onerror="window.__xss=1"><svg onload="window.__xss=2"></svg>';renderAll();});assert.equal(await page.evaluate(()=>window.__xss),undefined);assert.equal(await page.locator('#itemsTable img, #itemsTable svg').count(),0);
    // Other tabs cannot silently overwrite a newer saved value.
    const second=await context.newPage();await second.goto(url);await second.waitForFunction(()=>window.renderManager);
    await second.evaluate(()=>{state.settings.safetyDays=7;saveState();});
    assert.equal(await page.evaluate(()=>{state.settings.safetyDays=9;return saveState();}),false);
    assert.equal(await second.evaluate(()=>JSON.parse(localStorage.getItem(STORAGE_KEY)).settings.safetyDays),7);
    await second.close();
    // Bad local JSON survives page reload unchanged instead of being replaced by defaults.
    await page.evaluate(()=>localStorage.setItem(STORAGE_KEY,'{broken'));await page.reload();await page.waitForFunction(()=>window.renderManager);
    assert.equal(await page.evaluate(()=>localStorage.getItem(STORAGE_KEY)),'{broken');assert.equal(await page.evaluate(()=>window.inventoryRecoveryRequired),true);
    console.log('Stage: conflict and recovery passed');
    // Restore validates before replacing and supports a recovery copy.
    await page.locator('[data-view="data"]').click();
    await page.locator('#importJson').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.waitForFunction(()=>state.items.length===1&&state.items[0].onHand===18);
    assert.equal(await page.evaluate(()=>localStorage.getItem(STORAGE_KEY+'_before_restore')),'{broken');
    await page.setViewportSize({width:390,height:844});await page.locator('[data-view="manager"]').click();
    if(process.env.QA_SCREENSHOT)await page.screenshot({path:process.env.QA_SCREENSHOT,fullPage:false});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth + 1),'Mobile viewport must not overflow horizontally');
    assert.deepEqual(errors,[]);console.log('Browser journey PASS: menu, form entry, quotes, comparison, pack orders, duplicate drafts, partial/duplicate/full receipts, persistence, JSON backup/restore, corrupt-data recovery, XSS, tab conflict, mobile layout.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
