import test from 'node:test';import assert from 'node:assert/strict';import {plan} from '../data/actual-plan.mjs';import {validatePlan,itinerary} from '../core.mjs';import {mapModel} from '../itinerary-map.mjs';
test('actual six days with four car nights, one hotel, no invented costs',()=>{
 validatePlan(plan);const {days}=itinerary(plan,'anhui','2-6');
 assert.equal(days[0].date,'2026-10-02');assert.equal(days.at(-1).date,'2026-10-07');
 assert.deepEqual(days.map(d=>d.stay.type),['car','car','car','car','hotel','home']);
 assert.equal(days[2].stay.area,'呈坎服务区（方向未记录）');
 assert.ok(days.every(d=>d.budget===null&&d.distanceKm===null));
 assert.ok(!days.some(d=>d.path.includes('xixinan')||d.path.includes('qiyun')));
 assert.equal(days.at(-1).path.at(-1),'changzhou');
});
test('actual map omits unverified coordinates and has no invented GPS geometry',()=>{
 const days=plan.routes[0].variants[6],model=mapModel(plan.anchors,days,null,{segments:{}});
 for(const key of ['anshun','bishan','changshe'])assert.ok(!model.stops.some(s=>s.key===key));
 assert.ok(model.stops.some(s=>s.key==='feichong'));assert.ok(model.stops.some(s=>s.key==='chengkanSouth'));
 assert.ok(model.segments.every(s=>!s.cached));
 assert.ok(days[4].stops.some(s=>s.name==='安顺控股超级充电站重卡'));
});
