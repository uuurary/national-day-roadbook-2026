const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const baseURL=process.env.BASE_URL||'http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
 const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.day-card');
 for(const trip of ['anhui','shandong','zhejiang']){
  await page.locator(`[data-trip="${trip}"]`).click();
  for(const n of ['5','6']){
   await page.locator(`[data-duration="${n}"]`).click();
   assert.equal(await page.locator('.day-card').count(),Number(n));
   await page.locator('[data-day="3"]').click();
   assert.equal(await page.locator('#body-3').isVisible(),true);
   assert.match(await page.locator('#map-title').innerText(),/第3天/);
   assert.ok(await page.locator('.leaflet-marker-icon').count()>0);
   assert.ok(!(await page.locator('#map-status').innerText()).includes('虚线'));
  }
 }
 await page.locator('[data-tab="prepare"]').click();
 const first=page.locator('[data-pack]').first();await first.check();
 await page.locator('#personal-note').fill('测试：出发前核实床车停车许可');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.day-card');
 await page.locator('[data-tab="prepare"]').click();assert.equal(await page.locator('[data-pack]').first().isChecked(),true);
 assert.equal(await page.locator('#personal-note').inputValue(),'测试：出发前核实床车停车许可');
 await page.locator('[data-tab="backup"]').click();assert.equal(await page.locator('.alternative').count(),3);
 const pdf=await page.request.get(new URL('report.pdf',baseURL).href);assert.equal(pdf.status(),200);assert.match(pdf.headers()['content-type'],/pdf/);
 await page.locator('[data-tab="plan"]').click();await page.locator('[data-trip="anhui"]').click();await page.locator('[data-duration="5"]').click();await page.locator('[data-day="1"]').click();
 fs.mkdirSync('qa',{recursive:true});await page.screenshot({path:'qa/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 for(const tab of ['plan','prepare','backup']){await page.locator(`[data-tab="${tab}"]`).click();const dim=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}));assert.ok(dim.w<=dim.v+1,`${tab}: horizontal page overflow ${dim.w}/${dim.v}`);await page.screenshot({path:`qa/mobile-${tab}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({routes:3,variants:6,packingPersistence:true,notesPersistence:true,pdfDownload:true,mobileOverflow:false,pageErrors:errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
