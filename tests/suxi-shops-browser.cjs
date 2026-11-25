const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='https://uuurary.github.io/national-day-roadbook-2026/',url=base+'chapters/2026-11-suxi/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1'});
 if(process.env.LOCAL_SITE==='1')await c.route(base+'**',r=>{const rel=decodeURIComponent(new URL(r.request().url()).pathname.slice(new URL(base).pathname.length)),file=path.resolve(__dirname,'..',rel.endsWith('/')?rel+'index.html':rel);return fs.existsSync(file)?r.fulfill({body:fs.readFileSync(file),contentType:({'.mjs':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}):r.fulfill({status:404});});
 await c.route('https://api.open-meteo.com/**',r=>r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('#date-select').waitFor();
 assert.equal(await p.locator('.shop-card').count(),11);assert.equal(await p.locator('.shop-extra .shop-card').count(),7);
 const card=p.locator('#shop-snackChangfa');assert.match(await card.innerText(),/255米/);assert.match(await card.innerText(),/营业.*现价.*待核实/);
 assert.equal(new URL(await card.locator('.place-nav').getAttribute('href')).protocol,'iosamap:');
 const keys=await p.locator('#day-body .place-nav').evaluateAll(nodes=>nodes.map(n=>n.dataset.mapPoi));assert.equal(keys.length,new Set(keys).size);
 await card.locator('[data-check]').check();await p.reload();await p.locator('#date-select').waitFor();assert.ok(await p.locator('#shop-snackChangfa [data-check]').isChecked());
 await p.locator('#map').scrollIntoViewIfNeeded();await p.waitForSelector('#map[data-provider="amap"][data-tiles-ready="true"]',{timeout:60000});
 await p.waitForFunction(()=>document.querySelectorAll('#map .pin-shop').length===11);
 await p.locator('[data-map-filter="shop"]').click();assert.equal(await p.locator('#map .trip-pin:visible').count(),11);
 assert.equal(await p.locator('#map .pin-hotel:visible').count(),0);
 await p.locator('[data-map-filter="all"]').click();
 await p.locator('.shop-extra>summary').click();
 fs.mkdirSync('qa/current',{recursive:true});
 for(const [width,height]of [[375,812],[844,390],[1440,1000]]){await p.setViewportSize({width,height});await p.locator('#nearby-shops').scrollIntoViewIfNeeded();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'qa/current/suxi-shops-'+width+'.png'});}
 await p.selectOption('#date-select','1');assert.equal(await p.locator('.shop-card').count(),0);assert.doesNotMatch(await p.locator('#day-body').innerText(),/平江路/);assert.match(await p.locator('#day-body').innerText(),/10:00/);
 await p.waitForFunction(()=>!document.querySelector('#map').dataset.stops.includes('snack'));
 assert.equal(await p.locator('#map .pin-shop').count(),0);await p.locator('[data-map-filter="shop"]').click();assert.match(await p.locator('#map-places summary').innerText(),/0 处/);
 await p.locator('[data-scope="all"]').click();await p.waitForFunction(()=>document.querySelectorAll('#map .pin-shop').length===11);
 assert.deepEqual(errors,[]);console.log('PASS: 11 verified optional shops, amber markers/filter, one native link per place, saved purchase checks, 375/844/1440 layout, Sunday rest at 10 and no Pingjiang/shop detour.');
}finally{await browser.close();}})().catch(e=>{console.error((e.stack||String(e)).replace(/[a-f0-9]{32}/gi,'[redacted]').slice(0,1800));process.exitCode=1;});
