const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const c=await b.newContext({viewport:{width:375,height:812}}),base='https://uuurary.github.io/national-day-roadbook-2026/';
if(process.env.LOCAL_SITE==='1')await c.route(base+'**',r=>{const f=path.resolve(__dirname,'..',decodeURIComponent(new URL(r.request().url()).pathname.slice(new URL(base).pathname.length))||'index.html');const ext=path.extname(f),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};return r.fulfill({body:fs.readFileSync(f),contentType:types[ext]||'application/octet-stream'});});
if(process.env.REAL_MAP!=='1')await c.route('**/map-config.json',r=>r.fulfill({json:{provider:'osm'}}));
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(base);await p.locator('.day-intro').waitFor();assert.equal(await p.locator('#date-select option').count(),1);
assert.match(await p.locator('.route-spine').innerText(),/新安江/);
assert.equal(await p.locator('#refresh-weather').isVisible(),false);
for(let i=0;i<6;i++){await p.locator('[data-switch-day="'+i+'"]').click();assert.match(await p.locator('.day-intro').textContent(),new RegExp('2026-10-0'+(i+2)));assert.ok(!await p.locator('.day-intro').innerText().then(t=>t.includes('待支付')));}
assert.match(await p.locator('.timeline').innerText(),/广德交投体育场/);
await p.locator('#day-map-disclosure>summary').click();await p.locator('#day-map .trip-pin').first().waitFor({timeout:60000});
for(const w of [375,844,1440]){await p.setViewportSize({width:w,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'qa/current/actual-'+w+'.png'});}
if(process.env.REAL_MAP==='1'){await p.waitForSelector('#map[data-provider="amap"][data-tiles-ready="true"]',{timeout:60000});assert.equal(await p.locator('#map').getAttribute('data-map-error'),null);}
await p.locator('[data-switch-day="4"]').click();assert.match(await p.locator('.timeline').innerText(),/安顺控股/);assert.match(await p.locator('.day-intro').innerText(),/酒店/);
await p.goto(base+'?view=plan');await p.locator('.day-intro').waitFor();assert.equal(await p.locator('#date-select option').count(),3);
assert.deepEqual(errors,[]);console.log('PASS actual six dates, actual timeline, unknown values, daily map, 375/844/1440, original archive');
}finally{await b.close();}})().catch(e=>{console.error(String(e).replace(/[a-f0-9]{32}/gi,'[redacted]'));process.exitCode=1;});
