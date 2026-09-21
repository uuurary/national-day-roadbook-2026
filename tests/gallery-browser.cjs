const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.route('**/map-config.json',r=>r.fulfill({json:{provider:'osm'}}));
 await page.route('https://api.open-meteo.com/**',r=>r.abort());
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');
 await page.waitForFunction(()=>document.querySelector('.hero-gallery')?.dataset.playing==='true');
 const first=await page.locator('.hero-gallery').getAttribute('data-slide');
 await page.waitForFunction(first=>document.querySelector('.hero-gallery').dataset.slide!==first,first,{timeout:12000});
 await page.getByRole('button',{name:'暂停自动轮播',exact:true}).click();
 assert.equal(await page.locator('.hero-gallery').getAttribute('data-playing'),'false');
 const sources=new Set();
 for(let i=0;i<5;i++){sources.add(await page.locator('#destination-photo').getAttribute('src'));await page.waitForFunction(()=>document.querySelector('#destination-photo').naturalWidth>0);await page.getByRole('button',{name:'下一张实景',exact:true}).click();}
 assert.equal(sources.size,5);
 await page.locator('.gallery-stage').click();await page.locator('.gallery-stage').press('ArrowLeft');
 assert.equal(await page.locator('.hero-gallery').getAttribute('data-playing'),'false');
 for(const width of [375,844,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const b of await page.locator('.gallery-controls button').all())assert.ok((await b.boundingBox()).height>=44);}
 await page.setViewportSize({width:375,height:812});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'qa/current/gallery-mobile.png'});
 await page.waitForFunction(()=>document.querySelector('#map').dataset.geometryReady==='true');
 for(const target of ['overview','day']){
  const id=target==='overview'?'#map':'#day-map',z=Number(await page.locator(id).getAttribute('data-zoom'));
  await page.locator('[data-map-target="'+target+'"][data-map-zoom="1"]').click();assert.equal(Number(await page.locator(id).getAttribute('data-zoom')),z+1);
  await page.locator('[data-map-target="'+target+'"][data-map-zoom="-1"]').click();assert.equal(Number(await page.locator(id).getAttribute('data-zoom')),z);
  await page.locator('[data-map-target="'+target+'"][data-map-zoom="reset"]').click();
 }
 assert.equal(await page.locator('#map').getAttribute('data-selection'),'all');
 await page.locator('[data-day="1"]').click();assert.match(await page.locator('.day-alternatives').innerText(),/卢村或西递/);assert.equal(await page.locator('.day-alternatives article').count(),2);assert.match(await page.locator('.timeline').innerText(),/卢村风光景区/);
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.route('**/map-config.json',r=>r.fulfill({json:{provider:'osm'}}));await reduced.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await reduced.locator('.hero-gallery').waitFor();assert.equal(await reduced.locator('.hero-gallery').getAttribute('data-playing'),'false');
 await reduced.route('**/assets/*.jpg',r=>r.abort());await reduced.getByRole('button',{name:'下一张实景',exact:true}).click();await reduced.locator('.hero-gallery.failed').waitFor();await reduced.unroute('**/assets/*.jpg');await reduced.getByRole('button',{name:'下一张实景',exact:true}).click();await reduced.waitForFunction(()=>!document.querySelector('.hero-gallery').classList.contains('failed'));
 console.log('PASS five photos, autoplay/pause/manual/keyboard, reduced motion, image failure recovery, responsive layout, both zoom controls and Day 2 choices');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
