// Map selection is derived from the same selected day as the expanded itinerary.
export function mapModel(anchors,days,index,cache){
 const selected=index===null?days:[days[index]];
 const paths=selected.filter(Boolean).map(d=>d.path);
 const stops=[],byKey=new Map(),segments=[],seen=new Set();let order=0;
 for(const path of paths){for(const key of path){if(!anchors[key])continue;order++;if(!byKey.has(key)){const stop={key,name:anchors[key][0],point:anchors[key].slice(1),orders:[]};byKey.set(key,stop);stops.push(stop);}byKey.get(key).orders.push(order);}
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(a===b||!anchors[a]||!anchors[b])continue;const id=[a,b].sort().join('--');if(seen.has(id))continue;seen.add(id);const cached=cache?.segments?.[`${a}--${b}`]||cache?.segments?.[`${b}--${a}`];const coordinates=cached?.geometry?.coordinates;const valid=Array.isArray(coordinates)&&coordinates.length>1&&coordinates.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));segments.push({cached:valid,points:valid?coordinates.map(p=>[p[1],p[0]]):[anchors[a].slice(1),anchors[b].slice(1)]});}
 }
 return {index,stops,segments,points:[...stops.map(s=>s.point),...segments.flatMap(s=>s.points)]};
}

export function createItineraryMap(mount,status,getCache){
 const L=window.L;
 if(!L){status.textContent='地图组件加载失败；下方地点导航链接仍可使用。';return {show(){},resize(){},destroy(){}};}
 const map=L.map(mount,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false});
 const layers=L.layerGroup().addTo(map);let disposed=false,revision=0,tileFailed=false,roadFailed=false,model;
 function message(){if(disposed)return;const base=tileFailed?'部分底图加载失败；可使用地点导航链接。':roadFailed?'道路数据加载失败；虚线仅示意，不代表实际道路。':'实线：缓存道路 · 虚线：方向示意 · 无实时路况';status.textContent=base+(model?.stops.length===1?' 本日仅有县域参考点，市内景点请用名称导航。':'');}
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).on('tileerror',()=>{tileFailed=true;message();}).on('load',message).addTo(map);
 function recordView(){if(disposed||!model?.points.length)return;mount.dataset.zoom=String(map.getZoom());const b=map.getBounds();mount.dataset.bounds=JSON.stringify([b.getSouth(),b.getWest(),b.getNorth(),b.getEast()]);}
 map.on('moveend',recordView);
 function fit(){if(!model?.points.length)return;map.invalidateSize({pan:false});if(model.stops.length===1)map.setView(model.stops[0].point,12,{animate:false});else map.fitBounds(model.points,{padding:[28,28],maxZoom:13,animate:false});recordView();}
 function draw(next){if(disposed)return;model=next;layers.clearLayers();for(const [i,s] of model.stops.entries()){const node=document.createElement('span');node.textContent=s.name;const label=model.index===null?String(i+1):s.orders.join('·');L.marker(s.point,{title:s.name,icon:L.divIcon({className:'leaflet-marker-custom',html:label,iconSize:[30,30],iconAnchor:[15,15]})}).bindTooltip(node).addTo(layers);}for(const segment of model.segments)L.polyline(segment.points,{color:segment.cached?'#376447':'#477d97',weight:model.index===null?3:4,opacity:.9,...(!segment.cached?{dashArray:'6 7'}:{})}).addTo(layers);mount.dataset.selection=model.index===null?'all':String(model.index);mount.dataset.stops=model.stops.map(s=>s.key).join(',');mount.dataset.geometryReady=String(Boolean(model.segments.length&&model.segments.some(s=>s.cached)));fit();message();}
 return {
  async show(anchors,days,index){const run=++revision;roadFailed=false;draw(mapModel(anchors,days,index,null));try{const cache=await getCache();if(disposed||run!==revision)return;draw(mapModel(anchors,days,index,cache));}catch{if(disposed||run!==revision)return;roadFailed=true;message();}},
  resize(){if(!disposed)fit();},
  destroy(){disposed=true;revision++;map.remove();}
 };
}
