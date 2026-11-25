const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs');
const queries=['荣阳楼','日昇兴糕团','长发西饼','伟记奥面馆','朱新年','哑巴生煎','苏雅兴','陆稿荐','采芝斋','叶受和','黄天源','江南蟹壳黄','梅月轩','忆品苏酒酿','三万昌','OT另茶','Bonjour本就','百分茶','柠檬森林','新梅华','江南雅厨','香雪海人民桥','潘玉麟糖粥','随柳居','鸡脚旮旯','万福兴','绿杨馄饨','近水楼糕团','明月楼糕团','乐惠馄饨','吕膳堂馄饨','忆浇香小笼包','蜜好阁包子铺','七分甜时代广场','茉沏尹山湖','百分茶圆融时代广场','OT另茶平江路','柠檬森林平江路'];
const anchors={xiyuan:[120.587334,31.314823],liuyuan:[120.59226,31.315369],daoqian:[120.6153,31.300856],jinji:[120.705882,31.320659],timesquare:[120.715013,31.32261],yinshan:[120.704046,31.245687],pingjiang:[120.634556,31.313969]};
function km(a,b){const r=Math.PI/180,x=(b[0]-a[0])*r*Math.cos((a[1]+b[1])*r/2),y=(b[1]-a[1])*r;return Math.hypot(x,y)*6371;}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),base='https://uuurary.github.io/national-day-roadbook-2026/';
 await page.route(base,r=>r.fulfill({body:'<!doctype html><title>Shop verification</title>',contentType:'text/html'}));await page.goto(base);
 const config=JSON.parse(fs.readFileSync('map-config.json','utf8'));
 await page.evaluate(c=>window._AMapSecurityConfig={securityJsCode:c.securityJsCode},config);
 await page.addScriptTag({url:'https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key)});
 await page.evaluate(()=>new Promise(resolve=>AMap.plugin(['AMap.PlaceSearch','AMap.Walking'],resolve)));
 const output=[];
 for(const query of queries){await page.waitForTimeout(1600);
  const result=await page.evaluate(query=>new Promise(resolve=>new AMap.PlaceSearch({city:'苏州',citylimit:true,pageSize:10}).search(query,(status,data)=>resolve(status==='complete'?data.poiList.pois.map(p=>({name:p.name,id:p.id,address:p.address,gcj:[p.location.lng,p.location.lat],tel:p.tel})):[]))),query);
  const nearby=result.map(p=>({...p,near:Object.entries(anchors).map(([key,a])=>({key,straightKm:+km(p.gcj,a).toFixed(2)})).sort((a,b)=>a.straightKm-b.straightKm).slice(0,2)})).filter(p=>p.near[0].straightKm<=1.4);
  output.push({query,nearby});console.log(JSON.stringify({query,nearby}));
 }
 fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/suxi-shop-search.json',JSON.stringify({checked:'2026-11-25',anchors,queries:output},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(String(e).replace(/[a-f0-9]{32}/gi,'[redacted]'));process.exitCode=1;});
