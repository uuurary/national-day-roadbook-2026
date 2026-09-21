import {mapModel,createItineraryMap} from './itinerary-map.mjs';

let sdkPromise,configPromise,coordinatePromise;
function getConfig(){if(!configPromise)configPromise=fetch('map-config.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('地图配置加载失败');return r.json();});return configPromise;}
function loadSDK(config){
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  if(!config.key||!config.securityJsCode||config.publicCredentialsAuthorized!==true){reject(Error('高德公开配置未确认'));return;}
  window._AMapSecurityConfig={securityJsCode:config.securityJsCode};
  const script=document.createElement('script');let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;error?reject(error):resolve(window.AMap);};
  const timer=setTimeout(()=>finish(Error('高德组件加载超时')),15000);
  script.src=`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}`;script.async=true;
  script.onload=()=>finish(window.AMap?.Map?null:Error('高德组件不可用'));
  script.onerror=()=>finish(Error('高德组件加载失败'));document.head.appendChild(script);
 });
 return sdkPromise;
}
const pointKey=p=>p.join(',');
// Ramer–Douglas–Peucker simplification (~15 m), for display only, not navigation.
export function simplifyPath(points,tolerance=.00015){
 if(points.length<3)return points;
 const first=points[0],last=points.at(-1),dx=last[0]-first[0],dy=last[1]-first[1],length=dx*dx+dy*dy;let far=0,index=0;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-first[0])*dx+(p[1]-first[1])*dy)/length)):0;const distance=(p[0]-first[0]-t*dx)**2+(p[1]-first[1]-t*dy)**2;if(distance>far){far=distance;index=i;}}
 return far>tolerance*tolerance?[...simplifyPath(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyPath(points.slice(index),tolerance)]:[first,last];
}
async function convertPoints(A,points){
 // Official conversion is performed once at build time, never repeatedly per visitor.
 if(!coordinatePromise)coordinatePromise=fetch('data/amap-coordinates.json',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error('COORDINATE_CACHE_LOAD_ERROR');return r.json();});
 const cache=await coordinatePromise;
 return points.map(p=>{const position=cache.points?.[pointKey(p)];if(!Array.isArray(position)||position.length!==2||!position.every(Number.isFinite))throw Error('COORDINATE_CACHE_MISSING');return position;});
}
async function convertModel(A,model){
 const paths=model.segments.map(s=>simplifyPath(s.points));
 const points=[...model.stops.map(s=>s.point),...paths.flat()],locations=await convertPoints(A,points);let cursor=model.stops.length;
 return {...model,stops:model.stops.map((s,i)=>({...s,position:locations[i]})),segments:model.segments.map((s,i)=>{const path=locations.slice(cursor,cursor+paths[i].length);cursor+=paths[i].length;return {...s,path};})};
}
function amapController(A,mount,status,getCache,onFailure){
 const map=new A.Map(mount,{viewMode:'2D',zoom:7,center:[119,30.5],resizeEnable:true,scrollWheel:false,showLabel:true,animateEnable:false});
 let disposed=false,revision=0,model,overlays=[],loaded=false,frame=0;
 const completeTimer=setTimeout(()=>{if(!loaded&&!disposed)onFailure();},20000);
 function message(note=''){status.textContent='高德底图 · 实线：简化缓存道路；虚线：方向示意。无实时路况。'+(note||'')+(model?.stops.length===1?' 本日仅有县域参考点，市内景点请用名称导航。':'');}
 map.on('complete',()=>{loaded=true;clearTimeout(completeTimer);mount.dataset.tilesReady='true';});
 function record(){if(disposed||!model)return;const b=map.getBounds(),sw=b.getSouthWest(),ne=b.getNorthEast();mount.dataset.zoom=String(map.getZoom());mount.dataset.bounds=JSON.stringify([sw.getLat(),sw.getLng(),ne.getLat(),ne.getLng()]);}
 map.on('moveend',record);map.on('zoomend',record);
 function fit(){if(disposed||!overlays.length||!mount.offsetWidth||!mount.offsetHeight)return;if(model.stops.length===1)map.setZoomAndCenter(12,model.stops[0].position,true);else map.setFitView(overlays,true,[28,28,28,28],13);record();}
 function draw(next){if(disposed)return;model=next;map.remove(overlays);overlays=[];
  for(const [i,s]of model.stops.entries()){const node=document.createElement('span');node.className='amap-stop';node.textContent=model.index===null?String(i+1):s.orders.join('·');node.title=s.name;overlays.push(new A.Marker({position:s.position,title:s.name,content:node,offset:new A.Pixel(-15,-15)}));}
  for(const segment of model.segments)overlays.push(new A.Polyline({path:segment.path,strokeColor:segment.cached?'#376447':'#477d97',strokeWeight:model.index===null?3:4,strokeOpacity:.9,strokeStyle:segment.cached?'solid':'dashed'}));
  map.add(overlays);mount.dataset.selection=model.index===null?'all':String(model.index);mount.dataset.stops=model.stops.map(s=>s.key).join(',');mount.dataset.geometryReady=String(model.segments.some(s=>s.cached));mount.dataset.coordinateSystem='GCJ-02';fit();message();
 }
 return {
  async show(anchors,days,index){const run=++revision;try{
   const initial=await convertModel(A,mapModel(anchors,days,index,null));if(disposed||run!==revision)return;draw(initial);
   let cache;try{cache=await getCache();}catch{message('道路数据加载失败，请用高德地点导航。');return;}
   const next=await convertModel(A,mapModel(anchors,days,index,cache));if(disposed||run!==revision)return;draw(next);
  }catch(error){if(!disposed&&run===revision)onFailure(error);}},
  resize(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);},
  destroy(){disposed=true;revision++;clearTimeout(completeTimer);cancelAnimationFrame(frame);map.destroy();}
 };
}
export function createTravelMap(mount,status,getCache){
 let controller,disposed=false,latest,failed=false,reason='';
 function fallback(error){if(disposed||failed)return;failed=true;const code=/^[A-Z_0-9]{1,80}$/.test(error?.message||'')?error.message:'LOAD_ERROR';mount.dataset.mapError=code;controller?.destroy();mount.replaceChildren();mount.dataset.provider='osm';delete mount.dataset.coordinateSystem;delete mount.dataset.tilesReady;reason=`高德加载失败（${code}），已回退 OpenStreetMap；请检查域名、额度或网络。`;
  controller=createItineraryMap(mount,status,getCache);if(latest)controller.show(...latest);
 }
 // Keep fallback explanation when Leaflet subsequently updates its status.
 const statusObserver=new MutationObserver(()=>{if(reason&&!status.textContent.startsWith(reason))status.textContent=reason+' '+status.textContent;});statusObserver.observe(status,{childList:true,characterData:true,subtree:true});
 status.textContent='正在加载地图组件与底图…';
 getConfig().then(async config=>{if(disposed)return;if(config.provider!=='amap'){mount.dataset.provider='osm';controller=createItineraryMap(mount,status,getCache);}else{const A=await loadSDK(config);if(disposed)return;mount.dataset.provider='amap';controller=amapController(A,mount,status,getCache,fallback);}if(latest&&!disposed)controller.show(...latest);}).catch(fallback);
 return {show(...args){latest=args;controller?.show(...args);},resize(){controller?.resize();},destroy(){disposed=true;statusObserver.disconnect();controller?.destroy();}};
}
