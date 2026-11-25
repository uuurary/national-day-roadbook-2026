const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='https://uuurary.github.io/national-day-roadbook-2026/',url=base+'chapters/2026-11-suxi/';
async function setup(browser,ua){
 const context=await browser.newContext({viewport:{width:390,height:844},userAgent:ua,reducedMotion:'reduce'});
 if(process.env.LOCAL_SITE==='1')await context.route(base+'**',r=>{
  const rel=decodeURIComponent(new URL(r.request().url()).pathname.slice(new URL(base).pathname.length));
  const f=path.resolve(__dirname,'..',rel.endsWith('/')?rel+'index.html':rel);
  const types={'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.jpg':'image/jpeg'};
  return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:types[path.extname(f)]||'application/octet-stream'}):r.fulfill({status:404});
 });
 await context.route('https://api.open-meteo.com/**',r=>r.abort());
 // Capture trusted tap destinations instead of invoking an unavailable native app in desktop QA.
 await context.addInitScript(()=>{
  window.__nativeAttempts=[];
  document.addEventListener('click',e=>{const a=e.target.closest('[data-native-map]');if(a){window.__nativeAttempts.push(a.getAttribute('href'));e.preventDefault();}},true);
 });
 const page=await context.newPage();await page.goto(url);await page.locator('#date-select').waitFor();return {context,page};
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
 const {page:p}=await setup(browser,iphone),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const link=p.locator('a.place-nav').filter({hasText:'留园'}).first();
 const u=new URL(await link.getAttribute('href'));assert.equal(u.protocol,'iosamap:');assert.equal(u.hostname,'path');assert.equal(u.searchParams.get('t'),'2');
 assert.equal(await link.getAttribute('target'),'_self');
 await link.click();assert.equal((await p.evaluate(()=>window.__nativeAttempts))[0],u.href);
 await p.locator('#map-launch-dialog[open]').waitFor({timeout:6000});
 assert.match(await p.locator('#map-launch-message').innerText(),/Safari/);
 assert.equal(new URL(await p.locator('#map-launch-options a').first().getAttribute('href')).protocol,'iosamap:');
 await p.locator('#map-launch-options a').first().click();assert.equal((await p.evaluate(()=>window.__nativeAttempts)).length,2);
 assert.equal(p.url(),url);await p.keyboard.press('Escape');assert.ok(!(await p.locator('#map-launch-dialog').isVisible()));
 const drive=p.locator('.timeline li.drive').filter({hasText:'道前街 → 金鸡湖湖东'});
 assert.match(await drive.locator('.event-travel').innerText(),/养育巷.*时代广场.*月光码头/);
 assert.match(await drive.locator('.event-notes').innerText(),/备注与提示/);
 assert.ok(!(await drive.locator('.event-notes').getAttribute('open')));
 await drive.locator('summary').click();assert.match(await drive.locator('.event-notes p').innerText(),/湖西音乐喷泉/);
 assert.doesNotMatch(await drive.locator('.event-notes p').innerText(),/1号线往钟南街/);
 assert.equal(await p.locator('.transport-summary .transport-route').count(),4);
 for(const width of [375,844,1440]){
  await p.setViewportSize({width,height:width===844?390:900});await drive.scrollIntoViewIfNeeded();
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  fs.mkdirSync('qa/current',{recursive:true});await p.screenshot({path:'qa/current/suxi-transport-'+width+'.png'});
 }
 await p.setViewportSize({width:375,height:812});await p.locator('.map-help-button').first().click();
 await p.screenshot({path:'qa/current/suxi-map-help-iphone.png'});
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('denied'))},configurable:true}));
 await p.locator('[data-copy-map="map-copy-place"]').click();await p.waitForFunction(()=>document.querySelector('#map-copy-status').textContent.includes('长按'));
 await p.getByRole('button',{name:'关闭导航帮助'}).click();await p.selectOption('#date-select','1');
 assert.match(await p.locator('.timeline li.drive').first().locator('.event-travel').innerText(),/方式.*路线.*耗时/s);
 const hotel=p.locator('#stay a.place-nav');assert.equal(new URL(await hotel.getAttribute('href')).hostname,'poi');
 const {page:a}=await setup(browser,'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36');
 assert.match(await a.locator('a.place-nav').first().getAttribute('href'),/^intent:\/\/route\/plan\//);
 const {page:d}=await setup(browser,'Mozilla/5.0 (Windows NT 10.0) Chrome/130');
 assert.equal(await d.locator('a.place-nav').count(),0);await d.locator('button.place-nav').first().click();
 assert.ok(await d.locator('#map-launch-dialog').isVisible());assert.match(await d.locator('#map-launch-options a').first().getAttribute('href'),/^iosamap:/);
 assert.deepEqual(errors,[]);
 console.log('PASS: separated route/notes, iPhone Safari UA native tap/ retry/timeout/copy failure, Android intent, desktop manual platform, 375/844/1440 layout. Native installed-app handoff requires real phone verification.');
}finally{await browser.close();}})().catch(e=>{console.error((e.stack||String(e)).replace(/[a-f0-9]{32}/gi,'[redacted]').slice(0,1700));process.exitCode=1;});
