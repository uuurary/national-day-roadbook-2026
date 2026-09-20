import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/trips.json',import.meta.url),'utf8'));
test('Each route has five-day and six-day alternatives, exactly one hotel night, and returns home',()=>{
 assert.equal(data.trips.length,3);
 for(const trip of data.trips)for(const [len,days] of Object.entries(trip.variants)){
  assert.equal(days.length,Number(len));assert.equal(days[0].date,'2026-10-02');assert.equal(days.at(-1).date,len==='5'?'2026-10-06':'2026-10-07');
  assert.equal(days.filter(d=>d.stay.includes('酒店')).length,1);
  assert.equal(days.filter(d=>d.stay.includes('车宿')).length,Number(len)-2);
  assert.equal(days[0].path[0],'changzhou');assert.equal(days.at(-1).path.at(-1),'changzhou');
  for(let i=1;i<days.length;i++)assert.equal(days[i-1].path.at(-1),days[i].path[0]);
  for(const day of days){assert.ok(day.charging);assert.ok(day.schedule);for(const key of day.path)assert.ok(data.anchors[key]);}
 }
});
test('Every map anchor has plausible regional WGS84 coordinates',()=>{for(const [name,lat,lng] of Object.values(data.anchors)){assert.ok(name);assert.ok(lat>27&&lat<37);assert.ok(lng>116&&lng<122);}});
test('All data snapshots are present and their notes disclose import limitations',()=>{for(const trip of data.trips)for(const n of ['5','6']){const snap=JSON.parse(fs.readFileSync(new URL(`../data/${trip.id}-${n}-trek-snapshot.json`,import.meta.url),'utf8'));assert.equal(snap.days.length,Number(n));assert.ok(snap._format_note.includes('not'));}});
test('Route geometry cache matches anchor pairs and plausible coordinates',()=>{const cache=JSON.parse(fs.readFileSync(new URL('../data/routes.json',import.meta.url),'utf8'));for(const [key,val]of Object.entries(cache.segments)){const [a,b]=key.split('--');assert.ok(data.anchors[a]&&data.anchors[b]);assert.equal(val.geometry.type,'LineString');assert.ok(val.geometry.coordinates.length>1);assert.ok(val.distance_m>0);}});
