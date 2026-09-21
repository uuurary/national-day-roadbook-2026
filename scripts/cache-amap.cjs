// One-off build step. Uses the owned Pages origin and official JS API conversion.
// Logs progress only, never credentials. Generated coordinates contain no credentials.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'map-config.json'))),{plan}=await import('../data/plan.mjs'),{mapModel}=await import('../itinerary-map.mjs'),{simplifyPath}=await import('../amap-map.mjs'),cache=JSON.parse(fs.readFileSync(path.join(root,'data/routes.json')));
 const pairs=new Map();for(const route of plan.routes)for(const days of Object.values(route.variants)){const model=mapModel(plan.anchors,days,null,cache);for(const s of model.stops)pairs.set(s.point.join(','),s.point);for(const segment of model.segments)for(const p of simplifyPath(segment.points))pairs.set(p.join(','),p);}
 const output=path.join(root,'data/amap-coordinates.json');let saved={points:{}};if(fs.existsSync(output))saved=JSON.parse(fs.readFileSync(output));
 const pending=[...pairs].filter(([k])=>!saved.points[k]);console.log('Coordinate cache: '+pending.length+' points pending');
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();const base='https://uuurary.github.io/national-day-roadbook-2026/';await page.route(base,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Route coordinate build</title>'}));await page.goto(base);
 await page.evaluate(config=>{window._AMapSecurityConfig={securityJsCode:config.securityJsCode};},config);await page.addScriptTag({url:'https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key)});
 for(let i=0;i<pending.length;i+=40){const batch=pending.slice(i,i+40);let positions;
  for(let attempt=0;attempt<3;attempt++){await page.waitForTimeout(attempt?2500:1300);const response=await page.evaluate(points=>new Promise(resolve=>{const timer=setTimeout(()=>resolve({error:'TIMEOUT'}),12000);AMap.convertFrom(points.map(p=>[p[1],p[0]]),'gps',(status,result)=>{clearTimeout(timer);if(status==='complete')resolve({positions:result.locations.map(p=>[p.getLng(),p.getLat()])});else resolve({error:typeof result==='string'&&/^[A-Z_0-9]{1,80}$/.test(result)?result:'CONVERSION_ERROR'});});}),batch.map(([,p])=>p));if(response.positions){positions=response.positions;break;}if(response.error!=='CUQPS_HAS_EXCEEDED_THE_LIMIT')throw Error(response.error);}
  if(!positions)throw Error('Rate limit persists');batch.forEach(([k],j)=>saved.points[k]=positions[j]);
  fs.writeFileSync(output,JSON.stringify({source:'AMap.convertFrom(gps): WGS84 to GCJ-02',convertedAt:new Date().toISOString(),displayToleranceDegrees:.00015,points:saved.points}));
  if(i%400===0||i+40>=pending.length)console.log('Converted '+Math.min(i+40,pending.length)+' / '+pending.length);
 }
 }finally{await browser.close();}
 console.log('Coordinate cache complete');
})().catch(e=>{console.error(e.name+': '+e.message.replace(/[a-f0-9]{32}/gi,'[redacted]').split('\n')[0]);process.exitCode=1;});
