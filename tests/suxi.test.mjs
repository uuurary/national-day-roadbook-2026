import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {chapter,days,pois,anchors,lodging,packing,checks,hero,photos,transport,nearbyShops,shopInfo} from '../data/suxi.mjs';import {mapModel} from '../itinerary-map.mjs';
test('Suxi keeps two-person weekend dates and selected route',()=>{assert.equal(chapter.people,2);assert.deepEqual(days.map(d=>d.date),['2026-11-28','2026-11-29']);assert.deepEqual(days[0].budget.slice(0,2),[250,400]);assert.deepEqual(days[1].budget.slice(0,2),[0,0]);assert.match(lodging.dates,/一间一晚/);assert.match(lodging.area,/尹山湖/);assert.ok(!days[0].path.includes('shantang'));assert.equal(days[1].path.filter(k=>k==='hotel').length,1);assert.ok(!days[1].path.includes('pingjiang'));assert.match(days[1].timeline[0].time,/10:00/);assert.ok(days[1].path.indexOf('mall')<days[1].path.indexOf('theatre'));assert.ok(!Object.keys(pois).some(k=>['huqiu','yuantouzhu'].includes(k)));assert.ok(days.every(d=>d.timeline.find(e=>e.kind==='show').time.startsWith('19:00')));});
test('Suxi retains conditional night tour, return guard, verified map and budget',()=>{assert.match(days[0].planB,/尹山湖/);assert.match(days[1].timeline.at(-1).note,/75—90分钟/);assert.match(pois.mall.name,/万象城/);assert.ok(days.every(d=>d.path.every(k=>anchors[k])));const model=mapModel(anchors,days,1,{segments:{}});assert.ok(model.stops.some(s=>s.key==='huishan'));assert.ok(!model.stops.some(s=>s.key==='liuyuan'));assert.ok(model.segments.every(s=>!s.cached));const b=days.reduce((a,d)=>a.map((n,i)=>n+d.budget[i]),Array(8).fill(0));assert.deepEqual([b[0]+b[2]+b[4]+b[6],b[1]+b[3]+b[5]+b[7]],[940,1580]);assert.equal(new Set([...packing.map(p=>p.id),...checks.map(c=>'check-'+c[0])]).size,packing.length+checks.length);const cache=JSON.parse(fs.readFileSync(new URL('../data/amap-coordinates.json',import.meta.url)));for(const [k,p]of Object.entries(pois))assert.deepEqual(cache.points[anchors[k].slice(1).join(',')],p.gcj);});

test('Suxi autumn route preserves stop order, transport and credited ginkgo cover',()=>{const p=days[0].path.filter(k=>['xiyuan','liuyuan','daoqian','jinji','yinshan'].includes(k));assert.deepEqual(p,['xiyuan','liuyuan','daoqian','jinji','yinshan']);assert.equal(transport.length,4);assert.match(transport[2].mode,/1号线直达/);assert.match(transport[3].mode,/8号线.*2号线/);assert.match(transport[3].route,/时代广场.*松涛街.*独墅湖南/);assert.match(days[0].timeline.find(e=>e.place==='坐休45分钟').time,/13:15/);assert.match(pois.jinji.name,/湖东/);assert.equal(photos.length,5);assert.equal(new Set(photos.map(p=>p.src)).size,5);for(const p of photos){assert.equal(p.license,'CC BY 2.0');assert.ok(fs.statSync(new URL('../'+p.src,import.meta.url)).size>10000);}assert.ok(days[0].timeline.filter(e=>e.kind==='drive').every(e=>e.next));assert.equal(hero.license,'CC BY 2.0');assert.match(hero.alt,/留园.*银杏/);assert.ok(fs.statSync(new URL('../'+hero.src,import.meta.url)).size>10000);assert.ok(hero.source.startsWith('https://commons.wikimedia.org/'));});

test('Suxi transport has separate route/mode/duration and notes',()=>{
 for(const d of days)for(const e of d.timeline.filter(e=>e.kind==='drive')){
  assert.ok(e.travel?.route,e.place);assert.ok(e.travel?.mode,e.place);
  assert.ok(e.travel?.duration,e.place);assert.ok(e.note,e.place);
 }
 for(const t of transport){assert.ok(t.route);assert.ok(t.note);assert.ok(t.time);}
});

test('Final Suxi itinerary contains no discarded itinerary or revision commentary',()=>{
 const text=JSON.stringify({days,lodging,transport});
 assert.doesNotMatch(text,/原山塘|山塘街夜游取消|住宿改到|不再去湖西|纠正万象汇|新增月光|只保留选定路线/);
 assert.equal(days[0].timeline.length,18);assert.equal(days[1].timeline.length,13);
 assert.match(days[0].planB,/尹山湖/);assert.match(days[1].timeline.at(-1).note,/75—90分钟/);
});

test('Optional nearby shops do not become mandatory route segments',()=>{
 const plain=mapModel(anchors,days.map(d=>({...d,nearby:[]})),0,{segments:{}});
 const withShops=mapModel(anchors,days,0,{segments:{}});
 assert.ok(withShops.stops.some(s=>s.optional));
 assert.deepEqual(withShops.segments,plain.segments);
 assert.equal(mapModel(anchors,days,1,{}).stops.filter(s=>s.optional).length,0);
 assert.ok(!days.some(d=>d.path.some(k=>k.startsWith('snack')||k.startsWith('tea'))));
});

test('Screenshot shop branches have verified locations, transparent stock and no Sunday detour',()=>{
 assert.equal(nearbyShops.length,11);assert.equal(new Set(nearbyShops.map(s=>s.id)).size,11);
 assert.equal(nearbyShops.filter(s=>s.walk.meters!==null).length,10);
 for(const s of nearbyShops){assert.ok(pois[s.key]);assert.equal(s.day,0);assert.equal(s.walk.checked,chapter.checked);assert.ok(s.item&&s.advice&&s.source);}
 assert.match(shopInfo.note,/现价.*库存.*待核实/);assert.deepEqual(days[1].nearby,[]);
 assert.doesNotMatch(JSON.stringify(days[1]),/平江/);
});
