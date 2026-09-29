import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {plan} from '../data/plan.mjs';import {mapModel} from '../itinerary-map.mjs';import {pois} from '../data/pois.mjs';
const cache=JSON.parse(fs.readFileSync(new URL('../data/routes.json',import.meta.url),'utf8'));

test('timeline navigation resolves destination and directional services, never generic rests',async()=>{
 const {eventDestination}=await import('../core.mjs');const path=plan.routes[0].variants[6][3].path;
 assert.equal(eventDestination('呈坎 → 唐模西门停车场',path,plan.anchors).key,'tangmo');
 assert.equal(eventDestination('唐模 → 呈坎服务区（北京方向）',path,plan.anchors).key,'chengkanService');
 assert.equal(eventDestination('合规停车处',path,plan.anchors),null);
 assert.equal(eventDestination('宏村',path,plan.anchors),null);
});

test('traffic refresh, timeout, recovery and cleanup are isolated',async()=>{
 const {attachTraffic}=await import('../amap-map.mjs');let tick,delay,layer,removed=false,stopped=false;const states=[];
 const clock={setTimeout(fn,ms){tick=fn;delay=ms;return 1;},clearTimeout(){}};
 class Traffic{constructor(options){this.options=options;layer=this;}on(_,fn){this.complete=fn;}off(){this.complete=null;}stopFresh(){stopped=true;}}
 const cleanup=attachTraffic({TileLayer:{Traffic}},{add(){},remove(){removed=true;}},s=>states.push(s),clock);
 assert.equal(layer.options.autoRefresh,true);assert.equal(layer.options.interval,180);assert.equal(delay,20000);
 tick();assert.equal(states.at(-1),'unavailable');layer.complete();assert.equal(states.at(-1),'ready');assert.equal(delay,240000);
 tick();assert.equal(states.at(-1),'unavailable');layer.complete();assert.equal(states.at(-1),'ready');
 cleanup();assert.ok(removed&&stopped);const length=states.length;tick();assert.equal(states.length,length);
 const failed=[];attachTraffic({TileLayer:{Traffic:class{constructor(){throw Error('offline');}}}},{},s=>failed.push(s),clock)();
 assert.deepEqual(failed,['loading','unavailable']);
});
test('maps follow selected day while overview contains all planned stays',()=>{for(const days of Object.values(plan.routes[0].variants)){for(let i=0;i<days.length;i++)assert.deepEqual(mapModel(plan.anchors,days,i,cache).stops.map(s=>s.key),[...new Set(days[i].path)]);const keys=mapModel(plan.anchors,days,null,cache).stops.map(s=>s.key);for(const k of ['changzhou','taopark','fufeng','qiyun','chengkanService','guangde'])assert.ok(keys.includes(k));}});
test('directional highway routes do not reuse reverse-side cached paths',()=>{const m=mapModel(plan.anchors,[{path:['yimei','taopark','yimei']}],null,cache);assert.equal(m.segments.length,2);assert.deepEqual(m.stops[0].orders,[1,3]);const missing=mapModel(plan.anchors,[{path:['guangde','xidi']}],0,cache);assert.equal(missing.segments[0].cached,false);});
test('single stop and missing geometry show gracefully',()=>{assert.equal(mapModel(plan.anchors,[{path:['guangde']}],0,null).stops.length,1);assert.ok(mapModel(plan.anchors,plan.routes[0].variants[6],0,null).segments.every(s=>!s.cached));});
test('original GCJ coordinates cover every simplified route without double conversion',async()=>{const {simplifyPath}=await import('../amap-map.mjs'),c=JSON.parse(fs.readFileSync(new URL('../data/amap-coordinates.json',import.meta.url),'utf8'));for(const [k,p]of Object.entries(pois))assert.deepEqual(c.points[plan.anchors[k].slice(1).join(',')],p.gcj);for(const days of Object.values(plan.routes[0].variants)){const m=mapModel(plan.anchors,days,null,cache);for(const p of [...m.stops.map(s=>s.point),...m.segments.flatMap(s=>simplifyPath(s.points))])assert.ok(c.points[p.join(',')]);}});
test('native navigation uses mobile AMap schemes and exact GCJ02 coordinates',async()=>{
 const {nativeMapURL}=await import('../core.mjs');
 const poi={name:'停车场',id:'B123',gcj:[118.123,30.456]};
 for(const [ua,scheme] of [['Android','androidamap:'],['iPhone','iosamap:']]){
  const u=new URL(nativeMapURL('停车场',poi,ua));
  assert.equal(u.protocol,scheme);assert.equal(u.hostname,'navi');
  assert.equal(u.searchParams.get('lon'),'118.123');assert.equal(u.searchParams.get('lat'),'30.456');assert.equal(u.searchParams.get('dev'),'0');
 }
 assert.match(nativeMapURL('餐厅',null,'Android'),/^androidamap:\/\/poi\?/);
 assert.equal(new URL(nativeMapURL('餐厅',null,'iPhone')).searchParams.get('name'),'餐厅');
 assert.match(nativeMapURL('餐厅',null,'Windows'),/^https:/);
});
