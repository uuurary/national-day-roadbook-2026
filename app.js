/* SPDX-License-Identifier: AGPL-3.0-only
 * Static adaptation of the itinerary/share-data approach in liketrek/TREK.
 * See NOTICE.md for upstream files and the precise scope of this adaptation.
 */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, geometry = {segments:{}}, map, mapLayer, tileLayer, routeBounds;
let storageOK = true;
const read = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{storageOK=false;return fallback;}};
const write = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageOK=false;return false;}};
const q = new URLSearchParams(location.hash.slice(1));
const state = {trip:['anhui','shandong','zhejiang'].includes(q.get('trip'))?q.get('trip'):'anhui',duration:q.get('days')==='6'?'6':'5',day:null,tab:'plan'};
let packed = read('roadbook-2026-packed',{});
const activeTrip = () => data.trips.find(t=>t.id===state.trip);
const activeDays = () => [...activeTrip().variants[state.duration]].sort((a,b)=>a.day_number-b.day_number);
const routeKeys = days => {const keys=[];for(const d of days)for(const k of d.path)if(keys.at(-1)!==k)keys.push(k);return keys;};
const searchMap = text => 'https://www.amap.com/search?query='+encodeURIComponent(text);
const googleRoute = keys => {
  const names=keys.map(k=>data.anchors[k][0].replace(/（.*?）/g,''));
  if(names.length<2)return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(names[0]||activeTrip().name);
  const params=new URLSearchParams({api:'1',origin:names[0],destination:names.at(-1),travelmode:'driving'});
  if(names.length>2)params.set('waypoints',names.slice(1,-1).join('|'));
  return 'https://www.google.com/maps/dir/?'+params;
};
function updateHash(){const params=new URLSearchParams({trip:state.trip,days:state.duration});history.replaceState(null,'','#'+params);}
function renderHero(){
  const t=activeTrip();document.documentElement.style.setProperty('--accent',t.color);
  $('#trip-tabs').innerHTML=data.trips.map((x,i)=>`<button class="trip-choice ${x.id===state.trip?'active':''}" data-trip="${x.id}" aria-pressed="${x.id===state.trip}"><span class="index">0${i+1}</span><span><strong>${x.name}</strong><small>${x.en} / ${x.tag.split(' · ')[0]}</small></span><span class="arrow">↗</span></button>`).join('');
  $('#trip-hero').innerHTML=`<svg class="hero-art" viewBox="0 0 700 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#cfdfbb" stroke-width="1"><path d="M-20 210 Q80 190 145 100 T300 80 T500 90 T740 35"/><path d="M-20 230 Q80 210 145 120 T300 100 T500 110 T740 55"/><path d="M-20 250 Q80 230 145 140 T300 120 T500 130 T740 75"/><path d="M-20 270 Q80 250 145 160 T300 140 T500 150 T740 95"/><path d="M-20 290 Q80 270 145 180 T300 160 T500 170 T740 115"/><circle cx="550" cy="45" r="21"/></g></svg><div class="hero-copy"><span class="eyebrow">${t.en} / ${t.tag}</span><h2>${t.title}</h2><p>${t.subtitle}</p></div><div class="hero-stats"><div><b>${t.km}</b><span>公里 · 基础版规划</span></div><div><b>${state.duration}天${Number(state.duration)-1}晚</b><span>10月2日 - ${state.duration==='5'?'6':'7'}日</span></div></div>`;
  $$('.duration button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.duration===state.duration)));
  $('#snapshot-link').href=`./data/${t.id}-${state.duration}-trek-snapshot.json`;
  document.title=`${t.name} ${state.duration}天 · 山水路书 2026`;
}
function renderDays(){
  $('#days').innerHTML=activeDays().map(d=>{
    const selected=state.day===d.day_number;
    const dayName=new Date(d.date+'T12:00:00+08:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Shanghai'});
    return `<article class="day-card ${selected?'selected':''}" id="day-${d.day_number}"><button class="day-header" data-day="${d.day_number}" aria-expanded="${selected}" aria-controls="body-${d.day_number}"><span class="day-num">${String(d.day_number).padStart(2,'0')}</span><span class="day-main"><span class="day-date">${dayName}</span><span class="day-title">${escapeHTML(d.title)}</span></span><span class="plus" aria-hidden="true">${selected?'−':'+'}</span></button><div class="day-sub">${escapeHTML(d.route)}<br>${escapeHTML(d.distance)} · ${escapeHTML(d.stay)}</div><div class="day-body" id="body-${d.day_number}" ${selected?'':'hidden'}><p class="schedule">${escapeHTML(d.schedule)}</p><div class="day-detail"><span class="detail-label">补能</span><span>${escapeHTML(d.charging)}</span></div><div class="day-detail"><span class="detail-label">吃饭</span><span>${escapeHTML(d.food)}</span></div><div class="day-detail"><span class="detail-label">住处</span><span>${escapeHTML(d.stay)}${d.stay.includes('车宿')?'；需提前确认过夜许可与厕所。':d.stay.includes('酒店')?'；酒店尚未预订。':''}</span></div><div class="place-links">${d.scenic.map(s=>`<a class="place-link" href="${searchMap(s)}" target="_blank" rel="noopener">${escapeHTML(s)} ↗</a>`).join('')}</div><div class="nav-row"><a href="${googleRoute(d.path)}" target="_blank" rel="noopener">Google Maps 查看当天城市路线 ↗</a><a href="${searchMap(data.anchors[d.path.at(-1)][0])}" target="_blank" rel="noopener">高德搜索目的地区域 ↗</a></div></div></article>`;
  }).join('');
  const t=activeTrip();
  $('#overnight').innerHTML=`<h3>▧　${t.hotel}</h3><p>旅途中间的一次完整休整。洗澡、洗衣、补觉，让余下的日子更轻松。</p><small>${t.hotelCost} · 预算，非已预订价格</small>`;
  $('#rules').innerHTML=[['01 / DRIVE','慢一点，路也很好看','每90-120分钟休息；长转场日只留短走景点。山路尽量在白天完成。'],['02 / CHARGE','把余量留在电池里','每200-250 km主动进入补能窗口；夜宿耗电以实测为准，普通行程到站留20%。'],['03 / STAY','先落脚，再看风景',t.warning]].map(([i,h,p])=>`<div class="rule"><span class="eyebrow">${i}</span><h3>${h}</h3><p>${escapeHTML(p)}</p></div>`).join('');
}
function initMap(){
  if(!window.L){$('#map').innerHTML='<div class="fatal">地图组件未载入。仍可使用日程中的高德/Google Maps链接。</div>';return;}
  map=L.map('map',{scrollWheelZoom:false,zoomControl:true}).setView([31.7,119.4],7);
  tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
  let failed=0;tileLayer.on('tileerror',()=>{if(++failed===3)toast('底图网络不稳定；路线与文字仍可查看。');});
  mapLayer=L.layerGroup().addTo(map);
}
function renderMap(){
  const selected=state.day?activeDays().filter(d=>d.day_number===state.day):activeDays();
  const keys=routeKeys(selected);const unique=[...new Set(keys)];
  $('#map-title').textContent=state.day?`第${state.day}天 · ${selected[0].route}`:'全程路线 · 城镇/村域锚点';
  $('#anchor-list').innerHTML=unique.map((k,i)=>`<button data-anchor="${k}">${i+1} ${escapeHTML(data.anchors[k][0])}</button>`).join('');
  if(!map){$('#map-status').textContent='地图不可用，可使用日程中的导航链接';return;}
  mapLayer.clearLayers();const bounds=[];let routed=0,total=0;
  for(let i=0;i<keys.length-1;i++){
    const a=keys[i],b=keys[i+1];if(a===b)continue;total++;
    const segment=geometry.segments[`${a}--${b}`];
    if(segment?.geometry){const line=segment.geometry.coordinates.map(([lng,lat])=>[lat,lng]);L.polyline(line,{color:activeTrip().color,weight:4,opacity:.82}).addTo(mapLayer);bounds.push(...line);routed++;}
    else{const line=[data.anchors[a].slice(1),data.anchors[b].slice(1)];L.polyline(line,{color:activeTrip().color,weight:3,opacity:.6,dashArray:'6 8'}).bindTooltip('城市间方向示意，非道路导航').addTo(mapLayer);bounds.push(...line);}
  }
  unique.forEach((k,i)=>{const [name,lat,lng]=data.anchors[k];bounds.push([lat,lng]);const icon=L.divIcon({html:`<span class="map-marker">${i+1}</span>`,className:'',iconSize:[30,30],iconAnchor:[15,15]});L.marker([lat,lng],{icon,title:name}).bindPopup(`<b>${escapeHTML(name)}</b><br>城镇/村域锚点，非精确入口<br><a href="${searchMap(name.replace(/（.*?）/g,''))}" target="_blank" rel="noopener">高德搜索 ↗</a>`).addTo(mapLayer);});
  routeBounds=L.latLngBounds(bounds);map.fitBounds(routeBounds,{padding:[35,35],maxZoom:11});
  $('#map-status').textContent=total===0?'当地游览区域 · 景点请按名称搜索':routed===total?'OSRM 城市间道路参考 · 非实时导航':`道路参考 ${routed}/${total} 段 · 虚线为方向示意`;
}
function renderPacking(){
  $('#packing').innerHTML=data.packing.slice(1).map((row,g)=>{const items=row[1].split(/[；;]/).filter(Boolean);return `<div class="pack-group"><h3>${escapeHTML(row[0])}</h3>${items.map((text,i)=>{const id=`pack-${g}-${i}`;return `<label class="pack-item"><input type="checkbox" data-pack="${id}" ${packed[id]?'checked':''}><span>${escapeHTML(text)}</span></label>`;}).join('')}<p class="pack-hint">${escapeHTML(row[2])}</p></div>`;}).join('');updateProgress();
  $('#personal-note').value=read('roadbook-2026-note','');$('#save-state').textContent=storageOK?'只保存在此浏览器，不上传至GitHub。':'此浏览器不允许本地存储；勾选和备忘暂时仅在本页有效。';
}
function updateProgress(){const all=$$('[data-pack]');const n=all.filter(i=>i.checked).length;$('#packing-progress').innerHTML=`${n}<span style="opacity:.4"> / ${all.length}</span><small>已准备 · 两人共用清单</small>`;}
function htmlTable(rows){return `<div class="table-wrap"><table class="data-table"><thead><tr>${rows[0].map(v=>`<th scope="col">${escapeHTML(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>`<tr>${row.map(v=>`<td>${escapeHTML(v).replace(/\n/g,'<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function renderBackup(){const t=activeTrip();$('#alternatives').innerHTML=t.alternatives.slice(1).map(row=>`<article class="alternative"><h3>${escapeHTML(row[0])}</h3><p>${escapeHTML(row[1])}</p><p class="tradeoff">${escapeHTML(row[2])}</p></article>`).join('');$('#budget').innerHTML='<h2>两个人，大概花多少？</h2><p>以下按5天4晚、1晚酒店，单位：元。6天版另留250-500元；均为预算，不是实时成交价。</p>'+htmlTable(data.budget);$('#visits').innerHTML='<h2>景点怎么取舍</h2>'+htmlTable(t.visits)+(t.sleep.length?'<h2>夜晚落脚的区域</h2>'+htmlTable(t.sleep):'');$('#checkpoints').innerHTML='<h2>出发前，把这几件事做好</h2>'+htmlTable(data.checkpoints);}
function renderSources(){$('#sources').innerHTML=data.sources.map(([id,title,url,note])=>`<div class="source-item"><a href="${escapeHTML(url)}" target="_blank" rel="noopener">[${id}] ${escapeHTML(title)}</a><br>${escapeHTML(note)}</div>`).join('');}
function renderAll(){renderHero();renderDays();renderMap();renderBackup();updateHash();}
function selectTab(tab){state.tab=tab;for(const btn of $$('.section-tabs button'))btn.setAttribute('aria-selected',String(btn.dataset.tab===tab));for(const name of ['plan','prepare','backup'])$(`#panel-${name}`).hidden=name!==tab;if(tab==='plan'&&map)requestAnimationFrame(()=>{map.invalidateSize();map.fitBounds(routeBounds,{padding:[35,35],maxZoom:11});});}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500);}
document.addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn||!data)return;
  if(btn.dataset.trip){state.trip=btn.dataset.trip;state.day=null;renderAll();}
  if(btn.dataset.duration){state.duration=btn.dataset.duration;state.day=null;renderAll();}
  if(btn.dataset.day){state.day=state.day===Number(btn.dataset.day)?null:Number(btn.dataset.day);renderDays();renderMap();}
  if(btn.dataset.tab)selectTab(btn.dataset.tab);
  if(btn.id==='all-days'){state.day=null;renderDays();renderMap();}
  if(btn.id==='fit-map'&&map)map.fitBounds(routeBounds,{padding:[35,35],maxZoom:11});
  if(btn.dataset.anchor&&map)map.setView(data.anchors[btn.dataset.anchor].slice(1),11);
});
document.addEventListener('change',e=>{if(e.target.dataset.pack){packed[e.target.dataset.pack]=e.target.checked;if(!write('roadbook-2026-packed',packed))toast('浏览器未允许保存，清单将在本页临时保留。');updateProgress();}});
$('#personal-note').addEventListener('input',e=>{$('#save-state').textContent=write('roadbook-2026-note',e.target.value)?'已保存到此浏览器。':'暂时无法写入本机存储，请自行备份备忘。';});
window.addEventListener('hashchange',()=>{const p=new URLSearchParams(location.hash.slice(1));if(data.trips.some(t=>t.id===p.get('trip')))state.trip=p.get('trip');state.duration=p.get('days')==='6'?'6':'5';state.day=null;renderAll();});
try{
  const response=await fetch('./data/trips.json');if(!response.ok)throw new Error('行程数据加载失败');data=await response.json();
  try{const r=await fetch('./data/routes.json');if(r.ok)geometry=await r.json();}catch{/* A missing route cache degrades to labelled dashed direction lines. */}
  initMap();renderAll();renderPacking();renderSources();
  try{const r=await fetch('./site-config.json');if(r.ok){const cfg=await r.json();if(/^https:\/\/github\.com\//.test(cfg.repository))$('#source-link').href=cfg.repository;}}catch{}
}catch(error){$('#trip-hero').innerHTML=`<div class="fatal">暂时无法载入行程。请刷新，或<a href="./report.pdf">下载完整PDF</a>。<p>${escapeHTML(error.message)}</p></div>`;}
