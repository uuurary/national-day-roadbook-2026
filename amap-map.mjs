import {mapModel,createItineraryMap} from './itinerary-map.mjs?v=20260929-mapfix';

import {mapTheme,markerNode,showStopDetail,resetStopDetail} from './map-presentation.mjs?v=20260929-mapfix';
let sdkPromise,configPromise,coordinatePromise;
async function fetchTimed(url,timeout){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{signal:controller.signal,cache:'no-cache'});}finally{clearTimeout(timer);}}
function getConfig(){if(!configPromise)configPromise=fetchTimed('map-config.json',10000).then(r=>{if(!r.ok)throw Error('地图配置加载失败');return r.json();});return configPromise;}
function loadSDK(config){
 if(window.AMap?.Map)return Promise.resolve(window.AMap);
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  if(!config.key||!config.securityJsCode||config.publicCredentialsAuthorized!==true){reject(Error('高德公开配置未确认'));return;}
  window._AMapSecurityConfig={securityJsCode:config.securityJsCode};
  const script=document.createElement('script');let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;error?reject(error):resolve(window.AMap);};
  const timer=setTimeout(()=>finish(Error('SDK_TIMEOUT')),15000);
  script.src=`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}`;script.async=true;
  script.onload=()=>finish(window.AMap?.Map?null:Error('SDK_UNAVAILABLE'));
  script.onerror=()=>finish(Error('SDK_NETWORK_ERROR'));document.head.appendChild(script);
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
 // Cached original GCJ-02 points come from AMap; visitors do not reconvert them.
 if(!coordinatePromise)coordinatePromise=fetchTimed('data/amap-coordinates.json',12000).then(r=>{if(!r.ok)throw Error('COORDINATE_CACHE_LOAD_ERROR');return r.json();});
 const cache=await coordinatePromise;
 return points.map(p=>{const position=cache.points?.[pointKey(p)];if(!Array.isArray(position)||position.length!==2||!position.every(Number.isFinite))throw Error('COORDINATE_CACHE_MISSING');return position;});
}
async function convertModel(A,model){
 const paths=model.segments.map(s=>simplifyPath(s.points));
 const points=[...model.stops.map(s=>s.point),...paths.flat()],locations=await convertPoints(A,points);let cursor=model.stops.length;
 return {...model,stops:model.stops.map((s,i)=>({...s,position:locations[i]})),segments:model.segments.map((s,i)=>{const path=locations.slice(cursor,cursor+paths[i].length);cursor+=paths[i].length;return {...s,path};})};
}
// Keep traffic failures isolated from the basemap and itinerary overlays.
export function attachTraffic(A,map,notify,clock=globalThis){
 let layer,disposed=false,timer;
 const arm=delay=>{clock.clearTimeout(timer);timer=clock.setTimeout(()=>{if(!disposed)notify('unavailable');},delay);};
 const complete=()=>{if(disposed)return;notify('ready');arm(240000);};
 notify('loading');
 try{layer=new A.TileLayer.Traffic({autoRefresh:true,interval:180,zIndex:10});layer.on('complete',complete);arm(20000);map.add(layer);}catch{clock.clearTimeout(timer);notify('unavailable');}
 return ()=>{disposed=true;clock.clearTimeout(timer);if(layer){layer.off('complete',complete);layer.stopFresh?.();map.remove(layer);layer.destroy?.();}};
}
function amapController(A,mount,status,getCache,onFailure){
 const map=new A.Map(mount,{mapStyle:mapTheme.style,viewMode:'2D',zoom:7,center:[119,30.5],resizeEnable:true,scrollWheel:false,showLabel:true,animateEnable:false});
 let disposed=false,revision=0,model,overlays=[],background=[],tripDays=[],loaded=false,frame=0,layoutTimer=0;
 mount.dataset.mapStyle=mapTheme.style;
 let visibleWait=0;const completeTimer=setInterval(()=>{if(loaded||disposed){clearInterval(completeTimer);return;}if(!mount.closest('details:not([open])')&&mount.offsetWidth&&mount.offsetHeight)visibleWait++;if(visibleWait>=30){clearInterval(completeTimer);onFailure(Error('BASEMAP_TIMEOUT'));}},1000);
 const sizeObserver=new ResizeObserver(()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(fit,180);});sizeObserver.observe(mount);
 let trafficState='loading',roadNote='',trafficLoadedAt='';
 function message(note){if(note!==undefined)roadNote=note;status.dataset.state=trafficState;const traffic=trafficState==='ready'?'路况已加载 · 每3分钟自动刷新 · 最近加载 '+trafficLoadedAt+'（北京时间）':trafficState==='loading'?'实时路况加载中…':'路况更新未确认，颜色可能过期；以高德导航为准。行程仍可查看。';status.textContent=traffic+'。'+roadNote;}
 const disposeTraffic=attachTraffic(A,map,state=>{trafficState=state;if(state==='ready')trafficLoadedAt=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());mount.dataset.trafficState=state;message();});
 map.on('complete',()=>{loaded=true;clearInterval(completeTimer);mount.dataset.tilesReady='true';fit();});
 function record(){if(disposed||!model)return;const b=map.getBounds(),sw=b.getSouthWest(),ne=b.getNorthEast();mount.dataset.zoom=String(map.getZoom());mount.dataset.bounds=JSON.stringify([sw.getLat(),sw.getLng(),ne.getLat(),ne.getLng()]);}
 map.on('moveend',record);map.on('zoomend',record);map.on('resize',fit);
 function fit(){if(disposed||!overlays.length||!mount.offsetWidth||!mount.offsetHeight)return;if(model.stops.length===1)map.setZoomAndCenter(12,model.stops[0].position,true);else map.setFitView(overlays,true,[48,40,48,40],13);record();}
 function draw(next,context){if(disposed)return;model=next;map.remove([...overlays,...background]);overlays=[];background=[];resetStopDetail(mount,model.stops,tripDays);
  if(context)for(const s of context.segments)background.push(new A.Polyline({path:s.path,strokeColor:mapTheme.context,strokeWeight:1,strokeOpacity:.2,zIndex:30}));map.add(background);
  for(const [i,s]of model.stops.entries()){const node=markerNode(s,tripDays,i+1,p=>showStopDetail(mount,p));overlays.push(new A.Marker({position:s.position,title:s.name,content:node,offset:new A.Pixel(-22,-22),zIndex:120}));}
  for(const segment of model.segments)overlays.push(new A.Polyline({path:segment.path,strokeColor:segment.cached?mapTheme.route:mapTheme.hint,strokeWeight:model.index===null?2:3,strokeOpacity:1,isOutline:true,outlineColor:mapTheme.outline,borderWeight:1,lineJoin:'round',lineCap:'round',zIndex:60,strokeStyle:segment.cached?'solid':'dashed'}));
  map.add(overlays);mount.dataset.selection=model.index===null?'all':String(model.index);mount.dataset.stops=model.stops.map(s=>s.key).join(',');mount.dataset.geometryReady=String(model.segments.some(s=>s.cached));mount.dataset.coordinateSystem='GCJ-02';fit();message();
 }
 return {
  async show(anchors,days,index){tripDays=days;const run=++revision;try{
   const initial=await convertModel(A,mapModel(anchors,days,index,null));if(disposed||run!==revision)return;draw(initial);
   let cache;try{cache=await getCache();}catch{message('道路数据加载失败，请用高德地点导航。');return;}
   const next=await convertModel(A,mapModel(anchors,days,index,cache));const context=index===null?null:await convertModel(A,mapModel(anchors,days,null,cache));if(disposed||run!==revision)return;draw(next,context);
  }catch(error){if(!disposed&&run===revision)onFailure(error);}},
  resize(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);},
  zoomBy(delta){if(disposed||!model)return false;map.setZoom(Math.max(3,Math.min(18,map.getZoom()+delta)),true);record();return true;},
  resetView(){if(disposed||!model)return false;fit();return true;},
  destroy(){disposed=true;revision++;disposeTraffic();clearInterval(completeTimer);clearTimeout(layoutTimer);sizeObserver.disconnect();cancelAnimationFrame(frame);map.destroy();}
 };
}
export function createTravelMap(mount,status,getCache){
 let controller,disposed=false,latest,failed=false,reason='',started=false;
 const retry=document.createElement('button');retry.type='button';retry.textContent='重试高德地图';retry.hidden=true;retry.className='map-retry';status.after(retry);
 function fallback(error){if(disposed||failed)return;failed=true;retry.hidden=false;const code=/^[A-Z_0-9]{1,80}$/.test(error?.message||'')?error.message:'LOAD_ERROR';mount.dataset.mapError=code;controller?.destroy();mount.replaceChildren();mount.dataset.provider='osm';delete mount.dataset.coordinateSystem;delete mount.dataset.tilesReady;delete mount.dataset.trafficState;status.dataset.state='unavailable';reason=`高德加载失败（${code}），已回退 OpenStreetMap；可重试；若持续失败，请将此错误码反馈。`;
  controller=createItineraryMap(mount,status,getCache);if(latest)controller.show(...latest);
 }
 // Keep fallback explanation when Leaflet subsequently updates its status.
 const statusObserver=new MutationObserver(()=>{if(reason&&!status.textContent.startsWith(reason))status.textContent=reason+' '+status.textContent;});statusObserver.observe(status,{childList:true,characterData:true,subtree:true});
 status.textContent='展开地图后加载高德底图。';
 function start(){if(disposed||started||mount.closest('details:not([open])')||!mount.offsetWidth||!mount.offsetHeight)return;started=true;status.textContent='正在加载高德组件与底图…';
 getConfig().then(async config=>{if(disposed)return;if(config.provider!=='amap'){mount.dataset.provider='osm';controller=createItineraryMap(mount,status,getCache);}else{const A=await loadSDK(config);if(disposed)return;mount.dataset.provider='amap';controller=amapController(A,mount,status,getCache,fallback);}if(latest&&!disposed)controller.show(...latest);}).catch(fallback);}
 let startFrame=0;function scheduleStart(){cancelAnimationFrame(startFrame);startFrame=requestAnimationFrame(start);}const visibilityObserver=new ResizeObserver(scheduleStart);visibilityObserver.observe(mount);scheduleStart();
 retry.addEventListener('click',()=>{if(disposed)return;controller?.destroy();controller=null;mount.replaceChildren();reason='';failed=false;started=false;retry.hidden=true;configPromise=null;sdkPromise=null;coordinatePromise=null;delete mount.dataset.mapError;delete mount.dataset.tilesReady;delete mount.dataset.trafficState;status.dataset.state='loading';start();});
 return {show(...args){latest=args;scheduleStart();controller?.show(...args);},resize(){scheduleStart();controller?.resize();},zoomBy(delta){return controller?.zoomBy?.(delta)||false;},resetView(){return controller?.resetView?.()||false;},destroy(){disposed=true;cancelAnimationFrame(startFrame);visibilityObserver.disconnect();retry.remove();statusObserver.disconnect();controller?.destroy();}};
}
