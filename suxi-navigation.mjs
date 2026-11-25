// Suzhou/Wuxi only. Keep the older driving chapters' navigation unchanged.
// AMap mobile URI docs: /api/amap-mobile/guide/{ios,android}/{route,search}
export function mobilePlatform(env={}){
 const ua=env.userAgent||'',platform=env.userAgentData?.platform||env.platform||'';
 if(/iPhone|iPad|iPod/i.test(ua)||(/Mac/i.test(platform+' '+ua)&&env.maxTouchPoints>1))return 'ios';
 if(/Android/i.test(ua+' '+platform))return 'android';
 return null;
}
export function amapAppURL(poi,platform,mode='walking'){
 if(!['ios','android'].includes(platform))throw Error('Select a mobile platform');
 const p=new URLSearchParams({sourceApplication:'2026-11-苏锡周末',dev:'0'});
 const point=poi.gcj,valid=Array.isArray(point)&&point.length===2&&point.every(Number.isFinite);
 if(poi.reference||!valid){
  p.set(platform==='ios'?'name':'keywords',poi.query||poi.name);
  return (platform==='ios'?'iosamap':'androidamap')+'://poi?'+p;
 }
 p.set('dname',poi.name);p.set('dlon',point[0]);p.set('dlat',point[1]);
 if(poi.id)p.set('did',poi.id);
 p.set('t',String({driving:0,transit:1,walking:2}[mode]??2));p.set('m','0');
 // No start coordinate: AMap uses the phone's current location after permission.
 return (platform==='ios'?'iosamap://path?':'amapuri://route/plan/?')+p;
}
export function amapIntentURL(uri){
 const u=new URL(uri);
 return 'intent://'+u.host+u.pathname+u.search+'#Intent;scheme='+u.protocol.slice(0,-1)+';package=com.autonavi.minimap;end';
}
export function navigationOptions(poi,env={},mode='walking'){
 const platform=mobilePlatform(env),ios=amapAppURL(poi,'ios',mode),android=amapAppURL(poi,'android',mode);
 const intent=amapIntentURL(android),chrome=/Chrome\//i.test(env.userAgent||'')&&!/MicroMessenger|QQ\/|; wv\)/i.test(env.userAgent||'');
 return {platform,ios,android,intent,primary:platform==='ios'?ios:platform==='android'?(chrome?intent:android):null,
  web:'https://uri.amap.com/search?'+new URLSearchParams({keyword:poi.query||poi.name,callnative:'1'}),
  embedded:/MicroMessenger|QQ\//i.test(env.userAgent||'')};
}

export function dailyNavigationKeys(events){
 const seen=new Set();
 return events.map(event=>{
  const key=event.travel?.navKey||event.key;
  if(!key||event.kind==='food'||seen.has(key))return null;
  seen.add(key);return key;
 });
}
