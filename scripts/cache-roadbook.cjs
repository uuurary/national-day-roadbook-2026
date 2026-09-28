// Official AMap driving snapshot, not live visitor navigation. No credentials in output.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs');
(async()=>{const {pois}=await import('../data/pois.mjs'),{gcjToWgs}=await import('../coordinates.mjs'),{plan}=await import('../data/plan.mjs');
 const points={},segments={},pairs=new Set();const timestamp=new Date().toISOString();
 const add=p=>{const [lng,lat]=gcjToWgs(p);points[[lat,lng].join(',')]=p;return [lng,lat];};
 Object.values(pois).forEach(p=>add(p.gcj));
 for(const days of Object.values(plan.routes[0].variants))for(const d of days)for(let i=1;i<d.path.length;i++)pairs.add(d.path[i-1]+'--'+d.path[i]);
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),base='https://uuurary.github.io/national-day-roadbook-2026/';await page.route(base,r=>r.fulfill({body:'<!doctype html><title>Route snapshot</title>',contentType:'text/html'}));await page.goto(base);
 const config=JSON.parse(fs.readFileSync('map-config.json','utf8'));await page.evaluate(c=>{window._AMapSecurityConfig={securityJsCode:c.securityJsCode};},config);await page.addScriptTag({url:'https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key)});await page.evaluate(()=>new Promise(r=>AMap.plugin('AMap.Driving',r)));
 for(const key of pairs){const [a,b]=key.split('--');const result=await page.evaluate(([a,b])=>new Promise(resolve=>{
  const t=setTimeout(()=>resolve({error:'TIMEOUT'}),20000);
  new AMap.Driving({policy:AMap.DrivingPolicy.LEAST_TIME}).search(a,b,(status,data)=>{clearTimeout(t);if(status!=='complete')return resolve({error:typeof data==='string'?data:data.info});const r=data.routes[0];resolve({distance:r.distance,time:r.time,path:r.steps.flatMap(s=>s.path.map(p=>[p.lng,p.lat]))});});
 }),[pois[a].gcj,pois[b].gcj]);
 if(result.path?.length>1){segments[key]={geometry:{type:'LineString',coordinates:result.path.map(add)},distance_m:result.distance,duration_s:result.time};console.log(key+' '+Math.round(result.distance/1000)+' km '+Math.round(result.time/60)+' min');}else console.log(key+' unavailable: '+result.error);
 await page.waitForTimeout(1300);
 }
 fs.writeFileSync('data/routes.json',JSON.stringify({source:'AMap.Driving JS API snapshot',fetchedAt:timestamp,note:'Directional GCJ-02 driving paths retained for AMap. Approximate WGS84 inverse for OSM only; actual entrance, access and holiday traffic must be checked.',segments}));
 fs.writeFileSync('data/amap-coordinates.json',JSON.stringify({source:'Original AMap GCJ-02 POI/driving coordinates; keys approximate WGS84 for fallback only',convertedAt:timestamp,points}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message.replace(/[a-f0-9]{32}/gi,'[redacted]'));process.exitCode=1;});
