const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),base='https://uuurary.github.io/national-day-roadbook-2026/';
 await page.route(base,r=>r.fulfill({body:'<!doctype html><title>POI verification</title>',contentType:'text/html'}));await page.goto(base);
 const config=JSON.parse(fs.readFileSync('map-config.json','utf8'));
 await page.evaluate(c=>{window._AMapSecurityConfig={securityJsCode:c.securityJsCode};},config);
 await page.addScriptTag({url:'https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key)});
 await page.evaluate(()=>new Promise(r=>AMap.plugin(['AMap.PlaceSearch','AMap.Driving'],r)));
 for(const name of ['泰安站','红门游客中心','万仙楼','斗母宫','壶天阁','泰山中天门','泰山云步桥','泰山五大夫松','泰山十八盘','泰山南天门','泰山天街','泰山玉皇顶','日观峰','泰山中天门索道南天门站','天外村游客中心','岱庙','泰安老街']){
  const result=await page.evaluate(name=>new Promise(resolve=>new AMap.PlaceSearch({city:'泰安',citylimit:true,pageSize:3}).search(name,(status,data)=>resolve(status==='complete'?data.poiList.pois.map(p=>({name:p.name,id:p.id,address:p.address,city:p.cityname,district:p.adname,lng:p.location.lng,lat:p.location.lat})): {status,error:data.info}))),name);
  console.log(JSON.stringify({query:name,result}));await page.waitForTimeout(1200);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e.message.replace(/[a-f0-9]{32}/gi,'[redacted]'));process.exitCode=1;});
