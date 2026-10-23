import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {chapter,days,pois,anchors,packing,checks} from '../data/taishan.mjs';import {mapModel} from '../itinerary-map.mjs';import {stopPresentation} from '../map-presentation.mjs';
test('Taishan keeps three dates, cross-midnight order, 4-person budget and one hotel night',()=>{
 assert.equal(chapter.people,4);assert.deepEqual(days.map(d=>d.date),['2026-11-06','2026-11-07','2026-11-08']);
 assert.match(days[0].timeline.at(-1).time,/次日00:20/);assert.equal(days[1].timeline[0].time,'00:20—02:00');
 assert.equal(days[1].timeline.find(e=>e.place==='酒店连续补觉').time,'11:00—16:00');
 assert.ok(days.every(d=>d.budget.length===10&&d.path.every(k=>anchors[k])));
 const b=days.reduce((a,d)=>a.map((n,i)=>n+d.budget[i]),Array(10).fill(0));assert.deepEqual(b.slice(0,2),[400,700]);
 assert.equal(days.filter(d=>d.stay.type==='hotel').length,1);
 assert.equal(days[0].stay.type,'none');assert.ok(!days[0].path.includes('hotel'));
 assert.equal(days[0].budget[0],0);assert.equal(days[0].budget[1],0);
 assert.match(days[1].stay.reason,/11月7日入住、11月8日退房/);
 assert.match(days[1].timeline.find(e=>e.place==='酒店连续补觉').note,/提前入住/);
 assert.match(days[0].timeline.find(e=>e.place==='出发前休整').note,/寄存/);
 assert.doesNotMatch(JSON.stringify({days,checks}),/双床|连订|连续两晚|回房短休/);
 const model=mapModel(anchors,days,1,{segments:{}});assert.ok(model.stops.some(x=>x.key==='shibapan'));assert.ok(!model.stops.some(x=>x.key==='changzhou'));
 assert.match(stopPresentation({key:'hotel',name:pois.hotel.name},days).note,/第2晚/);
});
test('Taishan image attribution, personal/shared packing and coordinate cache are complete',()=>{
 const root=new URL('../',import.meta.url),gallery=JSON.parse(fs.readFileSync(new URL('data/taishan-gallery.json',root)));
 assert.equal(new Set(gallery.map(p=>p.src)).size,5);for(const p of gallery){assert.ok(p.license&&p.author&&p.source);assert.ok(fs.statSync(new URL(p.src,root)).size>10000);}
 const coords=JSON.parse(fs.readFileSync(new URL('data/amap-coordinates.json',root)));for(const [k,p] of Object.entries(pois))assert.deepEqual(coords.points[anchors[k].slice(1).join(',')],p.gcj);
 assert.equal(new Set(packing.map(p=>p.id)).size,packing.length);assert.ok(packing.some(p=>p.scope==='personal'&&p.label.includes('头灯')));
 const txt=fs.readFileSync(new URL('data/taishan-packing.txt',root),'utf8');assert.ok(packing.every(p=>txt.includes(p.label)));
});
