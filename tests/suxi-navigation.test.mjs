import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilePlatform,amapAppURL,amapIntentURL,navigationOptions,dailyNavigationKeys} from '../suxi-navigation.mjs';
const poi={name:'留园',id:'B02000IFFA',gcj:[120.59226,31.315369]};
test('Suxi native routes use documented iOS path and Android route/plan with GCJ02',()=>{
 const ios=new URL(amapAppURL(poi,'ios','walking'));
 assert.equal(ios.protocol,'iosamap:');assert.equal(ios.hostname,'path');
 assert.equal(ios.searchParams.get('t'),'2');assert.equal(ios.searchParams.get('dlon'),'120.59226');
 assert.equal(ios.searchParams.get('dlat'),'31.315369');assert.equal(ios.searchParams.get('dev'),'0');
 assert.equal(ios.searchParams.get('did'),poi.id);assert.ok(ios.searchParams.get('sourceApplication'));
 assert.equal(ios.searchParams.has('slat'),false);
 const android=new URL(amapAppURL(poi,'android','transit'));
 assert.equal(android.protocol,'amapuri:');assert.equal(android.hostname,'route');assert.equal(android.pathname,'/plan/');
 assert.equal(android.searchParams.get('t'),'1');assert.equal(android.searchParams.get('m'),'0');
 const intent=amapIntentURL(amapAppURL(poi,'android','driving'));
 assert.match(intent,/^intent:\/\/route\/plan\//);assert.match(intent,/package=com.autonavi.minimap/);
 assert.ok(!intent.includes('browser_fallback_url'));
});
test('Suxi platform detection includes iPad desktop UA, Android UA data and manual unknown selection',()=>{
 assert.equal(mobilePlatform({userAgent:'iPhone'}),'ios');
 assert.equal(mobilePlatform({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}),'ios');
 assert.equal(mobilePlatform({userAgent:'Desktop',userAgentData:{platform:'Android'}}),'android');
 assert.equal(mobilePlatform({userAgent:'Windows',maxTouchPoints:0}),null);
 assert.equal(navigationOptions(poi,{userAgent:'Windows'}).primary,null);
 assert.match(navigationOptions(poi,{userAgent:'Android Chrome/130 Mobile'}).primary,/^intent:/);
 assert.match(navigationOptions(poi,{userAgent:'Android MicroMessenger'}).primary,/^amapuri:/);
});
test('Suxi reference hotels stay native keyword search, never fake an exact hotel',()=>{
 const hotel={name:'酒店区域',reference:true,query:'苏州独墅湖南地铁站附近酒店',gcj:[120.704464,31.248059]};
 for(const platform of ['ios','android']){
  const u=new URL(amapAppURL(hotel,platform,'walking'));
  assert.equal(u.hostname,'poi');assert.equal(u.searchParams.get(platform==='ios'?'name':'keywords'),hotel.query);
  assert.ok(!u.searchParams.has('dlat'));
 }
 assert.ok(!navigationOptions(poi,{userAgent:'iPhone'}).primary.startsWith('http'));
});

test('Repeated destinations get one daily navigation and food stops add no duplicates',()=>{
 const events=[{key:'xiyuan',kind:'drive'},{key:'xiyuan',kind:'core'},{key:'xiyuan',kind:'food'},{key:'jinji',kind:'drive'},{key:'timesquare',kind:'drive',travel:{navKey:'timesquare'}},{key:'hotel',kind:'rest'},{key:'hotel',kind:'rest'}];
 assert.deepEqual(dailyNavigationKeys(events),['xiyuan',null,null,'jinji','timesquare','hotel',null]);
 assert.deepEqual(dailyNavigationKeys(events),['xiyuan',null,null,'jinji','timesquare','hotel',null]);
 assert.deepEqual(dailyNavigationKeys([{kind:'food',key:'hotel'},{kind:'drive',key:'pingjiang'}]),[null,'pingjiang']);
});
