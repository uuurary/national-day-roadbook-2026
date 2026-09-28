const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),base='https://uuurary.github.io/national-day-roadbook-2026/';
 await page.route(base,r=>r.fulfill({body:'<!doctype html><title>POI verification</title>',contentType:'text/html'}));await page.goto(base);
 const config=JSON.parse(fs.readFileSync('map-config.json','utf8'));
 await page.evaluate(c=>{window._AMapSecurityConfig={securityJsCode:c.securityJsCode};},config);
 await page.addScriptTag({url:'https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key)});
 await page.evaluate(()=>new Promise(r=>AMap.plugin(['AMap.PlaceSearch','AMap.Driving'],r)));
 for(const name of ['西溪南古村落','呈坎景区','常州站','广德绥安新天地']){
  const result=await page.evaluate(name=>new Promise(resolve=>new AMap.PlaceSearch({city:'安徽',pageSize:5}).search(name,(status,data)=>resolve(status==='complete'?data.poiList.pois.map(p=>({name:p.name,id:p.id,address:p.address,city:p.cityname,district:p.adname,lng:p.location.lng,lat:p.location.lat})): {status,error:data.info}))),name);
  console.log(JSON.stringify({query:name,result}));await page.waitForTimeout(1200);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e.message.replace(/[a-f0-9]{32}/gi,'[redacted]'));process.exitCode=1;});
