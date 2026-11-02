const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../scripts/serve.cjs');
(async()=>{
  const directory=path.resolve(__dirname,'../dist');
  assert.ok(fs.existsSync(path.join(directory,'.nojekyll')));
  for(const name of ['backend','.git','.env','CLAUDE_HANDOFF.md','test'])assert.equal(fs.existsSync(path.join(directory,name)),false,`${name} must not ship`);
  const server=createServer({directory,prefix:'/inventory-control'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const page=await browser.newPage({viewport}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
      const base=`http://127.0.0.1:${server.address().port}/inventory-control/`;
      await page.goto(base);await page.waitForFunction(()=>window.renderManager);
      assert.equal(await page.evaluate(()=>state.menuCatalog.length),110);
      assert.equal(await page.locator('#manager').isVisible(),true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      for(const file of ['backend/.env','.git/config','package.json'])assert.equal((await fetch(base+file)).status,404);
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log('Packaged app PASS at /inventory-control/: desktop/mobile, 110 menu entries, all assets loaded, private paths blocked.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
