const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let browser;const base=process.env.BASE_URL||'https://uuurary.github.io/national-day-roadbook-2026/';
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message.replace(/[a-f0-9]{32}/gi,'[redacted]'));});
 if(process.env.LOCAL_SITE==='1')await context.route(base+'**',r=>{const relative=decodeURIComponent(new URL(r.request().url()).pathname.slice(new URL(base).pathname.length))||'index.html',root=path.resolve(__dirname,'..'),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))return r.fulfill({status:403});const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'};return r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});});
 await context.route('https://api.open-meteo.com/**',r=>r.abort());
 await page.goto(base);await page.waitForSelector('#map[data-tiles-ready="true"][data-geometry-ready="true"]',{timeout:90000});
 assert.equal(await page.locator('[data-map-zoom],.map-tools').count(),0);
 assert.equal(await page.locator('#map').getAttribute('data-map-style'),'amap://styles/fresh');
 await page.waitForSelector('#map[data-traffic-state="ready"]',{timeout:30000});
 assert.match(await page.locator('#map-state').innerText(),/每3分钟自动刷新/);
 assert.equal(await page.locator('#map .pin-hotel').count(),1);
 assert.equal(await page.locator('#map .pin-car').count(),4);
 assert.equal(await page.locator('#map .pin-car .pin-shower').count(),3);
 await page.locator('#map + .map-legend [data-map-filter="car"]').click();
 assert.equal(await page.locator('#map .trip-pin:visible').count(),4);
 await page.locator('#map + .map-legend [data-map-filter="shower"]').click();
 assert.equal(await page.locator('#map .trip-pin:visible').count(),4);
 await page.locator('#map + .map-legend [data-map-filter="all"]').click();
 await page.locator('[data-day="3"]').click();await page.waitForSelector('#day-map[data-selection="3"][data-geometry-ready="true"]');
 const stop=page.locator('#day-map button[data-stop="chengkanService"]');await stop.focus();await page.keyboard.press('Enter');assert.match(await page.locator('#day-map-detail').innerText(),/可淋浴/);assert.match(await page.locator('#day-map-detail').innerText(),/用户确认/);
 await page.waitForSelector('#day-map[data-traffic-state="ready"]',{timeout:30000});
 for(const width of [375,844,1440]){
  console.log('Checking viewport',width);
  await page.setViewportSize({width,height:900});await page.locator('#day-map-panel').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.waitForFunction(()=>{const m=document.querySelector('#day-map').getBoundingClientRect();return [...document.querySelectorAll('#day-map .trip-pin')].every(p=>{const r=p.getBoundingClientRect();return r.top>=m.top&&r.bottom<=m.bottom&&r.left>=m.left&&r.right<=m.right;});}).catch(async error=>{console.log(await page.locator('#day-map').evaluate(m=>({map:m.getBoundingClientRect().toJSON(),pins:[...m.querySelectorAll('.trip-pin')].map(p=>p.getBoundingClientRect().toJSON())})));throw error;});
  for(const b of await page.locator('#day-map .trip-pin').all()){const box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);const face=await b.locator('.pin-face').boundingBox();assert.equal(face.width,32);assert.equal(face.height,32);}
  await page.locator('#day-map button[data-stop="tangmo"]').click();assert.match(await page.locator('#day-map-detail').innerText(),/唐模/);
  await page.screenshot({path:'qa/current/map-style-'+width+'.png'});
 }
 await page.selectOption('#date-select','2-6');await page.waitForFunction(()=>!document.querySelector('#map .pin-hotel'));assert.equal(await page.locator('#map .pin-car').count(),4);
 await page.waitForSelector('#day-map[data-selection="0"]');const p=page.locator('#day-map button[data-stop="taopark"]');await p.focus();await page.keyboard.press('Enter');assert.match(await page.locator('#day-map-detail').innerText(),/无淋浴/);
 await page.evaluate(()=>{window.AMap.TileLayer.Traffic=class{constructor(){throw Error('SIMULATED_TRAFFIC_FAILURE');}};});
 await page.selectOption('#date-select','2-7');
 await page.waitForSelector('#map[data-provider="amap"][data-traffic-state="unavailable"][data-geometry-ready="true"]');
 assert.match(await page.locator('#map-state').innerText(),/路况更新未确认/);
 await page.locator('[data-day="3"]').click();await page.waitForSelector('#day-map[data-selection="3"][data-traffic-state="unavailable"] .trip-pin');
 const fallback=await context.newPage();await fallback.route('https://webapi.amap.com/**',r=>r.abort());await fallback.goto(base);await fallback.waitForSelector('#day-map[data-provider="osm"] .trip-pin');await fallback.locator('[data-day="0"]').click();await fallback.locator('#day-map button[data-stop="taopark"]').focus();await fallback.keyboard.press('Enter');assert.match(await fallback.locator('#day-map-detail').innerText(),/无淋浴/);
 await fallback.unroute('https://webapi.amap.com/**');
 await fallback.locator('#map-state + .map-retry').click();
 await fallback.waitForSelector('#map[data-provider="amap"][data-tiles-ready="true"]',{timeout:90000});
 assert.equal(await fallback.locator('#map-state + .map-retry').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS official fresh basemap, 4 car/1 hotel/3 shower semantics, mobile touch/keyboard details, 5-day no hotel, fallback markers, 375/844/1440 layout');
 await browser.close();
})().catch(async e=>{console.error((e.stack||e.message).replace(/[a-f0-9]{32}/gi,'[redacted]').slice(0,1500));await browser?.close();process.exitCode=1;});
