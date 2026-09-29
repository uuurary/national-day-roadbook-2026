import {mapLegend} from './map-presentation.mjs?v=20260929-ux';
import {itinerary,sumBudget,total,money,mapURL,googleURL,weatherURL,exactWeather,weatherText,clothing,validatePlan,safeLoad,eventDestination} from './core.mjs?v=20260929-ux';
import {createTravelMap} from './amap-map.mjs?v=20260929-ux';
import {createGallery} from './gallery.mjs?v=20260929-ux';
import {gallery} from './data/gallery.mjs?v=20260929-ux';
const $=s=>document.querySelector(s), main=$('#main');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,text)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;
const KEY='national-day-2026-v2';
let storage=null,saveOK=true;
try{storage=window.localStorage;storage.setItem(`${KEY}-probe`,'1');storage.removeItem(`${KEY}-probe`);}catch{saveOK=false;}
const saved=safeLoad(storage,KEY,{});
let checked=saved.checked&&typeof saved.checked==='object'?saved.checked:{};
let notes=typeof saved.notes==='string'?saved.notes:'';
if(!notes)try{notes=storage?.getItem('roadbook-2026-note')||'';}catch{}
const params=new URLSearchParams(location.search);
let state={route:params.get('route')||saved.route||'anhui',date:params.get('dates')||saved.date||'2-7',day:Math.max(0,Number(params.get('day')||saved.day||0))};
let heroGallery,data,current,map,dayMap,observer,weatherGeneration=0,routeCache,weatherCache=new Map();
let dayOpen=true,mapScope='day',packFilter='all';
let travelerNames=Array.isArray(saved.travelerNames)?saved.travelerNames.slice(0,2).map(x=>String(x).slice(0,16)):['',''];
const packOpen=new Map();
const compactMap=window.matchMedia('(max-width: 900px)');
let dayMapExpanded=!compactMap.matches;
const sleepLabel=s=>s.type==='hotel'?'酒店休整':s.type==='car'?'车宿 · 用户确认':'返回家中';
const distanceText=range=>`${range[0]}–${range[1]} km`;
const sumDistance=days=>days.reduce((sum,d)=>sum.map((v,i)=>v+d.distanceKm[i]),[0,0]);
function announce(message){$('#live-status').textContent=message;}
function storageMessage(){return saveOK?'自动保存于此浏览器，不上传、不跨设备同步。清除网站数据或结束隐私模式可能丢失。':'当前浏览器无法持久保存：勾选与备注仅本次页面临时保留，刷新可能丢失。请截图备份。';}
function persist(){try{if(!storage)throw new Error('No storage');storage.setItem(KEY,JSON.stringify({...state,checked,notes,travelerNames}));saveOK=true;}catch{saveOK=false;}document.querySelectorAll('.storage-note').forEach(n=>n.textContent=storageMessage());}
function syncURL(){const u=new URL(location.href);u.searchParams.set('route',state.route);u.searchParams.set('dates',state.date);u.searchParams.set('day',state.day);history.replaceState(null,'',u);}
async function fetchJSON(url,timeout=10000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:'no-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(t);}}
const heading=(n,title,sub='')=>`<div><span class="section-no">${n} / YOUR JOURNEY</span><h2>${title}</h2>${sub?`<p class="meta">${sub}</p>`:''}</div>`;
function budgetTable(b){return `<table class="budget-table"><caption class="sr-only">两人每日或全程预算估算</caption><tbody>${['住宿/淋浴 · 1间房 / 两人','交通 · 1辆车，充电及停车','门票新增 · 已购金额未计','餐饮 · 两人'].map((t,i)=>`<tr><th scope="row">${t}</th><td>${money(b.slice(i*2,i*2+2))}</td></tr>`).join('')}</tbody></table><p class="budget-total">待支付估算 ${money(total(b))}</p>`;}
function normalize(){current=itinerary(data,state.route,state.date);state.route=current.route.id;state.date=current.slot.id;state.day=Number.isFinite(state.day)?Math.min(current.days.length-1,Math.floor(state.day)):0;state.day=Math.max(0,state.day);}
function render(){
 normalize();heroGallery?.destroy();map?.destroy();dayMap?.destroy();map=null;dayMap=null;if(observer)observer.disconnect();
 const {route,slot,days}=current,budget=sumBudget(days),grand=total(budget),nights=days.slice(0,-1),hotels=nights.filter(d=>d.stay.type==='hotel').length,moves=nights.slice(1).filter((d,i)=>d.city!==nights[i].city).length;
 main.innerHTML=`<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">2026 · NATIONAL DAY ROAD TRIP</p><h1 id="hero-title">${route.id==='anhui'?'在徽州，<br>慢慢过几天。':'往江南，<br>再走远一点。'}</h1><p class="lede">${esc(route.intro)}</p><div class="chips"><span class="chip">${esc(slot.label)}</span><span class="chip">2 人 · 1 位司机</span><span class="chip">纯电实际续航 450 km</span></div><a class="hero-jump" href="#daily">打开每日路书 ↓</a></div><figure class="hero-media"><img id="destination-photo" src="${route.image}" alt="${route.imageAlt}" fetchpriority="high"><div class="image-fallback">目的地照片暂未加载<br><small>不影响查看行程与清单</small></div><figcaption>${esc(route.imageCredit)} · 历史实景，非本次实时画面<br>${link(route.imageSource,'Zhangzhugang / Wikimedia Commons')} · ${link('https://creativecommons.org/licenses/by-sa/4.0/','CC BY-SA 4.0')} · 显示裁切</figcaption></figure></section>
 <div class="controls"><div><span class="control-label">固定路线 · 皖南</span><div class="route-toggle" role="group" aria-label="目的地路线">${data.routes.map(r=>`<button data-route="${r.id}" aria-pressed="${r.id===route.id}">${r.name}路线</button>`).join('')}</div></div><div class="date-control"><label class="control-label" for="date-select">出行日期 · 2026 年</label><select id="date-select">${data.dates.map(d=>`<option value="${d.id}" ${d.id===slot.id?'selected':''}>${d.label}</option>`).join('')}</select></div></div>
 <section id="overview" class="section" style="margin-top:0"><div class="section-heading">${heading('01','一眼看懂这趟旅程',`${route.name} · ${route.tag}`)}</div><div class="stats"><div class="stat"><strong>${days.length} 天 ${days.length-1} 晚</strong><span>车宿 ${nights.length-hotels} 晚 + 酒店 ${hotels} 晚</span></div><div class="stat"><strong>${moves} 次换区</strong><span>过夜区域变化，不含返家</span></div><div class="stat"><strong>5–8 km 内</strong><span>每日步行上限 · 午休 90 分钟</span></div><div class="stat"><strong>${money(grand)}</strong><span>两人待支付估算 · 已购票款另计</span></div></div>
 <p class="notice">${esc(route.tradeoff)}<br>多数天实驾约4h内，最多1–2天放宽至5h；国庆可能超出。每天午休90分钟，最后一天约8–9点晚起。古镇门票已购；过夜和淋浴按用户确认标注。</p><div class="overview-grid"><div class="panel"><h3>路线摘要</h3><p class="route-spine">${esc(slot.length===6?'常州 → 查济 · 桃花潭 → 卢村 · 宏村 → 凫峰 → 西递 → 齐云山服务区 → 西溪南 · 呈坎 · 唐模 → 呈坎服务区 → 徽州古城 · 渔梁 → 广德酒店 → 常州':'常州 → 查济 · 桃花潭 → 卢村 · 宏村 → 凫峰 → 西递 → 齐云山服务区 → 西溪南 · 呈坎 · 唐模 → 呈坎服务区 → 广德午餐 → 常州')}</p><p class="route-mileage">全程预计 ${distanceText(sumDistance(days))}</p><p class="meta">驾驶里程含基础行程的市内补给与绕行余量，不含额外远途备选。都是规划估算，不是实时导航；选择实际入口后复核。</p><a class="daily-jump" href="#daily">查看每日行程 ↓</a></div><div class="panel"><h3 id="overview-map-title">全程路线预览</h3><div id="map" class="map-wrap" aria-label="路线地图，近似城市与景点位置"></div>${mapLegend}<div id="map-detail" class="map-stop-detail" role="status">轻点地图标记，查看地点与过夜信息</div><div id="map-state" class="map-state" role="status">正在加载底图…</div><details class="map-explainer"><summary>地图说明与使用边界</summary><p class="map-meta">“最近加载”为浏览器加载时间，非路况数据发布时间。绿通畅、黄缓行、红拥堵、深红严重拥堵。默认高德底图（加载失败会回退 OpenStreetMap）；地点链接用高德打开。实线为简化缓存道路，虚线仅为地点连接示意；叠加高德当前实时路况，约每3分钟自动刷新，不代表出游日期预测。主线使用高德核对的停车场/服务区节点，起终点与酒店仍为区域参考。道路是查询快照，按实际入口及交通标志导航；未绘入的古村备选另计。</p><div class="links">${link(googleURL('安徽省黄山市'),'Google 地图查看区域')}</div></details></div></div>
 <details class="panel sources"><summary>全程预算怎么算？查看明细与假设</summary>${budgetTable(budget)}<p class="meta">以上只计算后续待支付：住宿按1间房，车宿/淋浴杂费按两人，充电停车按1辆车，餐饮按两人。所有古镇门票已购买，实际付款金额未提供，不纳入此合计；门票新增0元不代表免费。5天版无固定酒店；6天版广德酒店目标约¥300，暂留¥300–500/房，未预订。淋浴收费未核实，预留不是报价。</p><p class="meta">另留 ¥400–600 机动金，后续准备约 ${money([grand[0]+400,grand[1]+600])}（不含已购票款）。不含购物、装备购置、车辆折旧、计划外酒店、订单不含的夜游/接驳及临时体验。高速按符合免费政策的小客车估算，非符合车型另计。政策来源见行前检查。</p></details></section>
 <section id="daily" class="section"><div class="section-heading">${heading('02','每日一程，点开就出发','点开某一天查看安排，地图同步定位当天区段；再次点击可收起。')}</div><nav id="day-switcher" class="day-switcher" aria-label="快速切换日期"></nav><div class="daily-workspace"><div id="day-tabs" class="day-tabs" role="group" aria-label="每日行程卡片"></div><div id="day-map-rail"><section id="day-map-panel" class="panel"><p class="eyebrow">ROUTE / SELECTED DAY</p><h3 id="day-map-title">当天路线</h3><div class="map-actions"><button data-map-scope="day">当天区段</button><button data-map-scope="all">全程总览</button></div><div id="day-map" class="map-wrap" aria-label="当天路线地图"></div>${mapLegend}<div id="day-map-detail" class="map-stop-detail" role="status">轻点地图标记，查看地点与过夜信息</div><p id="day-map-state" class="map-state" role="status">正在加载地图…</p><details class="map-explainer"><summary>地图说明与路况图例</summary><p class="map-meta">“最近加载”是浏览器完成图层加载的时间，不是路况数据发布时间。绿通畅、黄缓行、红拥堵、深红严重拥堵；当前路况不代表旅行日期预测，也不自动重算行程。地图自动包含当天起点、主线停车节点和过夜点。高德直接显示原始GCJ-02查询坐标，备用底图采用近似WGS84；道路为查询快照；实时路况另层叠加，不自动重算路线或耗时，临时管控以现场为准。</p></details><div id="day-map-links" class="links"></div></section></div></div></section>
 <section id="weather" class="section"><div class="section-heading">${heading('03','看天气，再决定穿什么','按旅行日期和经过城市匹配，不以今天代替出行日。')}<button id="refresh-weather">刷新天气</button></div><p class="notice blue">来源：${link('https://open-meteo.com/en/docs','Open-Meteo 数值预报')}（非中国气象部门官方预警）。最多尝试获取未来 16 天；第 8–16 天仅作趋势参考。返回数据未覆盖、日期已过或网络失败时显示“待更新”。不使用历史气候冒充当日预报。</p><div id="weather-grid" class="weather-grid"></div></section>
 <section id="packing" class="section"><div class="section-heading">${heading('04','轻装上路，一起打勾','个人物品分开勾选，共用品只带一份。可选项不计入必备进度。')}</div><div class="panel"><div class="pack-intro"><div><h3>两个人的行李清单</h3><p class="meta">按你确认的清单装包，出发前再根据天气调整衣物与被褥。</p></div><span id="pack-count" class="progress-count"></span></div><div class="progress" aria-hidden="true"><span id="pack-progress"></span></div><p class="storage-note">${storageMessage()}</p><p><a href="packing-list.txt" download="2026国庆出游_轻装行李清单.txt">下载独立行李清单 TXT ↓</a></p><details class="packing-notes"><summary>数量口径与携带提醒</summary><p class="meta">按你提供的清单更新：衣物按每人，浴巾两人合计2条，露营椅可选。相同物品保留旧勾选，新增/拆分项请重新确认。药箱仅为携带记录，按已有医嘱或说明书使用；吹风机先确认供电额定功率。</p></details><div class="packing-tools"><label class="check-label"><input id="packing-pending" type="checkbox">只看未准备</label><details><summary>设置同行者称呼</summary><div class="traveler-fields">${[0,1].map(i=>`<label>同行者 ${i+1}<input data-traveler="${i}" maxlength="16" value="${esc(travelerNames[i]||'')}" placeholder="称呼（仅本地保存）"></label>`).join('')}</div></details></div><div id="packing-grid" class="packing-grid"></div><p id="packing-empty" hidden>全部已准备好。可取消筛选查看完整清单。</p></div></section>
 <section id="checks" class="section"><div class="section-heading">${heading('05','出发前，最后确认一下','未勾选并不代表未准备；勾选也不代替官方确认或实际预订。')}</div><div class="panel"><div class="checklist">${data.checks.map(([id,label])=>checkbox(`check-${id}`,label)).join('')}</div><p class="notice warn">车宿先试睡：按车辆手册确认驻车空调可持续运行。实际续航 450 km 不是应全部用完的里程；建议电量降至约 30% 时主动找充电，夜宿前额外留空调余量（经验缓冲，非车型耗电保证）。充满/充够后离开充电车位，不占位睡整夜。</p><label for="trip-notes"><h3>同行备忘</h3></label><textarea id="trip-notes" placeholder="例如：酒店订单、确认允许过夜的停车场、备选充电站。请勿填密码、证件号码等敏感信息。">${esc(notes)}</textarea><p class="storage-note">${storageMessage()}</p></div>
 <div class="status-grid section"><div class="panel"><h3>已确定 · 需求</h3><p>常州往返；两人、一位司机；实际续航450km；三种日期；每日午休；少量爬坡、避高处。5天4晚车宿；6天4晚车宿＋广德酒店1晚。</p><p>古镇门票已购买（用户确认）；桃花潭正门可过夜无淋浴，凫峰/齐云山/呈坎可过夜及淋浴（用户确认）。酒店尚未预订。</p></div><div class="panel"><h3>待核实 · 临时信息</h3><p>当日开放、临时交通管控、天气预警、商家营业；淋浴开放时段、收费和维护；已购票适用日期、入园时段及夜游权益。</p></div><div class="panel"><h3>待办理 · 按所选天数</h3><p>6天版广德可取消酒店；已购门票如需实名、激活或预约时段，按订单办理。5天版默认不住酒店。附加体验需要时另确认，不重复买古镇门票。</p></div></div>
 <details class="panel sources"><summary>事实来源与实现边界 · 查询日期 ${data.checked}</summary><ul>${data.sources.map(([title,url,note])=>`<li>${link(url,title)}<br>${esc(note)}<br><small>查询：${data.checked}；旧公告不作为今年国庆政策。</small></li>`).join('')}</ul><p class="meta">本页可切换路线/日期、打开外部地图、获取可用天气并本地勾选。没有账号、跨设备同步、自动订票、实时充电排队或离线完整地图；不会自动推送提醒。网页照片为有署名历史实景，不表示当前开放状态。旧版 PDF 保留在仓库中，但未同步本版，不作当前攻略使用。</p></details></section>`;
 heroGallery=createGallery(document.querySelector('.hero-media'),gallery,Math.max(0,gallery.findIndex(p=>p.src===route.image)));
 renderDay();renderPacking();initMap();renderWeather();loadWeather();observeSections();syncURL();persist();
}
function dailyMapPlaces(d){return [...new Set(d.path.map(k=>data.anchors[k][0].replace(/（(?:出发／返程参考点，实际以家为准|桃花潭免费停车导航点|夜宿(?:／淋浴)?|酒店／餐饮区域参考点)）/g,'').replace('，夜宿／淋浴','')).concat((d.navigation||[]).map(n=>n[1])))];}
function renderDay(){
 const {days}=current,d=days[state.day];
 $('#day-switcher').innerHTML=days.map((x,i)=>`<button data-switch-day="${i}" aria-pressed="${i===state.day}">${x.date.slice(5).replace('-','/')}<span>第${i+1}天</span></button>`).join('');
 // Keep the map container alive when the open card or viewport changes.
 const panel=$('#day-map-panel');if(panel)$('#day-map-rail').appendChild(panel);
 $('#day-tabs').innerHTML=days.map((x,i)=>`<article class="day-card ${i===state.day&&dayOpen?'is-open':''}"><h3 class="day-card-heading"><button id="day-toggle-${i}" class="day-tab" data-day="${i}" aria-pressed="${i===state.day&&dayOpen}" aria-expanded="${i===state.day&&dayOpen}" aria-controls="day-body-${i}"><span class="day-card-number">DAY ${i+1}<small>${x.date.slice(5).replace('-','/')}</small></span><span class="day-card-copy"><strong>${esc(x.title)}</strong><small>${esc(x.stay.area)} · ${sleepLabel(x.stay)}</small><span class="day-card-hint">${i===state.day&&dayOpen?'收起安排 −':'查看安排 ＋'} · 预计 ${distanceText(x.distanceKm)}<br>实驾估算 ${x.drive}</span></span></button></h3><div id="day-body-${i}" class="day-card-body" role="region" aria-labelledby="day-toggle-${i}" ${i===state.day&&dayOpen?'':'hidden'}>${i===state.day?'<div id="day-content"></div>':''}</div></article>`).join('');
 const labels={core:'核心安排',optional:'可删减',rest:'休息 / 缓冲',drive:'交通 · 耗时估算',food:'用餐'};$('#day-content').innerHTML=`<div class="day-layout"><article class="panel"><header class="day-intro"><p class="eyebrow">DAY ${state.day+1} / ${d.date}</p><h3>${esc(d.title)}</h3><div class="chips"><span class="chip">步行 ${d.walk}</span><span class="chip">驾驶预计 ${distanceText(d.distanceKm)}</span><span class="chip">实驾估算 ${d.drive}</span></div><div class="day-quick"><p><strong>核心：</strong>${esc(d.timeline.filter(e=>e.kind==='core').map(e=>e.place).join(' · '))}</p><p><strong>今晚：</strong>${esc(d.stay.area)} · ${d.stay.shower?'可淋浴':'无淋浴'}</p><div class="links">${link(mapURL(data.anchors[d.path.at(-1)][0]),d.stay.type==='home'?'返程区域参考':'查看今晚落脚点')}</div></div><details class="day-assumptions"><summary>里程、强度与时间说明</summary><p class="meta distance-note">${esc(d.distanceNote)} 里程不含步行，拥堵主要增加时间和空调耗电；额外备选另计。</p><p class="meta" style="margin-top:12px">强度：${parseInt(d.walk)>=5?'轻至中等，注意累计步数':'轻量，以休息为主'}。下列时间是计划，不是营业承诺；景区段须匹配预约时段。</p></details></header><details id="day-map-disclosure" class="day-map-disclosure" ${dayMapExpanded?'open':''}><summary>查看当天地图与地点列表</summary><div id="day-map-slot"></div></details><ol class="timeline">${d.timeline.map(e=>`<li class="${e.kind}"><time>${e.time}</time><div class="event"><span class="kind ${e.kind}">${labels[e.kind]}</span><strong>${esc(e.place)}</strong><p>${esc(e.note)}</p>${eventNavigation(e,d)}</div></li>`).join('')}</ol></article><aside class="side-stack">${d.alternatives?`<section class="panel day-alternatives"><h3>${esc(d.alternativesTitle||'抵达后还能去哪？只选一项')}</h3>${d.alternatives.map(a=>`<article><h4>${esc(a.name)}</h4><p>${esc(a.note)}</p><div class="links">${link(mapURL(a.place),'高德查看地点')}${link(a.source,'官方介绍')}</div></article>`).join('')}<p class="meta">${esc(d.alternativesNote||'查询：2026-09-21；距离和时间均为规划估算，开放、预约、收费待核实。不建议首日再加查济、桃花潭或皖南川藏线。')}</p></section>`:''}<section class="panel"><h3>今晚住哪里</h3><p><strong>${esc(d.stay.area)}</strong> · ${sleepLabel(d.stay)}</p><p>${esc(d.stay.reason)}</p><p class="notice blue">淋浴：${d.stay.shower?'可淋浴':'不可淋浴'}${d.stay.type==='car'?' · 用户确认；时段/收费/维护另核':''}</p></section><section class="panel"><h3>吃什么 · 在哪里找</h3><p>${esc(d.food)}</p><p class="meta">只推荐品类与区域；具体餐馆营业、价格、座位另行核实。</p></section><section class="panel"><h3>补电与续航</h3><p>${esc(d.charging)}</p></section><section class="panel"><h3>拍照与预约</h3><p>${esc(d.photo)}</p><p><strong>预约提醒：</strong>${esc(d.booking)}</p></section><section class="panel"><h3>当天预算 · 两人估算</h3>${budgetTable(d.budget)}<p class="meta">古镇门票已购，付款金额未提供，未计入待支付估算；交通不含车辆折旧。</p>${d.extraBudget?`<p class="meta">${esc(d.extraBudget)}</p>`:''}</section><section class="panel"><h3>Plan B · 不硬赶</h3><p>${esc(d.planB)}</p><p class="meta">出发前改：确认退改规则、预约时段和备选酒店；遇关闭/预警取消户外活动，不绕封闭路线。</p></section><section class="panel"><h3>用高德打开对应地点</h3><div class="links">${dailyMapPlaces(d).map(n=>link(mapURL(n),n.replace(/安徽省|浙江省|黄山市|杭州市|丽水市/g,''))).join('')}</div><p class="meta">以上打开高德地点搜索，出发前选定实际入口。不要把地图区域点当作停车入口。</p>${link(googleURL(dailyMapPlaces(d).at(-1)),'Google 地图备选')}</section></aside></div>`;
 $('#day-map-disclosure').addEventListener('toggle',e=>{dayMapExpanded=e.target.open;if(dayMapExpanded)dayMap?.resize();});
 placeDayMap();updateDayMaps();
}
function eventNavigation(e,d){
 const place=eventDestination(e.place,d.path,data.anchors);
 if(!place)return '';
 const label=place.key==='guangde'?'查看区域（非酒店定位）':'导航至停车 / 入口参考点';
 return '<div class="event-nav">'+link(mapURL(place.name),label)+'</div>';
}
function checkbox(id,label,optional=false){return `<label class="check-label"><input type="checkbox" data-check="${id}" ${optional?'data-optional="true"':''} ${checked[id]===true?'checked':''}><span>${esc(label)}</span></label>`;}
function renderPacking(){
 const cats=[...new Set(data.packing.map(p=>p[0]))];
 $('#packing-grid').innerHTML=cats.map(cat=>`<details class="packing-group" data-category="${esc(cat)}" ${packOpen.get(cat)!==false?'open':''}><summary>${esc(cat)} <span class="category-count"></span></summary>${data.packing.filter(p=>p[0]===cat).map(([,owner,id,label])=>`<div class="pack-item"><div class="pack-title"><span class="owner ${owner}">${owner==='personal'?'每人自带':owner==='shared'?'同行共用':'可选'}</span><span>${esc(label)}</span></div><div class="check-row">${owner==='personal'?checkbox('pack-'+id+'-1',travelerNames[0]||'同行者 1')+checkbox('pack-'+id+'-2',travelerNames[1]||'同行者 2'):checkbox('pack-'+id,'已准备',owner==='optional')}</div></div>`).join('')}</details>`).join('');
 for(const group of document.querySelectorAll('.packing-group'))group.addEventListener('toggle',()=>packOpen.set(group.dataset.category,group.open));
 $('#packing-pending').checked=packFilter==='pending';updateProgress();updatePackingFilter();
}
function updateProgress(){
 const boxes=[...document.querySelectorAll('#packing input[data-check]:not([data-optional])')],done=boxes.filter(b=>b.checked).length;
 $('#pack-count').textContent=done+' / '+boxes.length;$('#pack-progress').style.width=(done/boxes.length*100)+'%';
 for(const group of document.querySelectorAll('.packing-group')){const rows=[...group.querySelectorAll('.pack-item')],complete=rows.filter(r=>[...r.querySelectorAll('[data-check]')].every(b=>b.checked)).length;group.querySelector('.category-count').textContent=complete+'/'+rows.length+' 项';}
}
function updatePackingFilter(){
 let remaining=0;
 for(const row of document.querySelectorAll('.pack-item')){const done=[...row.querySelectorAll('[data-check]')].every(b=>b.checked);row.hidden=packFilter==='pending'&&done;if(row.hidden&&row.contains(document.activeElement))$('#packing-pending').focus({preventScroll:true});if(!row.hidden)remaining++;}
 for(const group of document.querySelectorAll('.packing-group'))group.hidden=packFilter==='pending'&&![...group.querySelectorAll('.pack-item')].some(r=>!r.hidden);
 $('#packing-empty').hidden=remaining>0;
}
function getRouteCache(){
 if(!routeCache)routeCache=fetchJSON('data/routes.json').catch(error=>{routeCache=null;throw error;});
 return routeCache;
}
function initMap(){
 map=createTravelMap($('#map'),$('#map-state'),getRouteCache);
 map.show(data.anchors,current.days,null);
 dayMap=createTravelMap($('#day-map'),$('#day-map-state'),getRouteCache);
 updateDayMaps();
}
function placeDayMap(){
 const panel=$('#day-map-panel');if(!panel)return;
 const host=compactMap.matches&&dayOpen?$('#day-map-slot'):$('#day-map-rail');
 host.appendChild(panel);
 dayMap?.resize();
}
function updateDayMaps(){
 if(!current||!$('#day-map-title'))return;
 const selected=dayOpen&&mapScope==='day'?state.day:null,d=current.days[state.day];
 $('#day-map-title').textContent=selected===null?'全程路线总览':`第 ${state.day+1} 天 · ${d.date.slice(5).replace('-','/')} · 当天区段`;
 for(const button of document.querySelectorAll('[data-map-scope]')){button.setAttribute('aria-pressed',String(button.dataset.mapScope===(selected===null?'all':'day')));button.disabled=button.dataset.mapScope==='day'&&!dayOpen;}
 $('#day-map-links').innerHTML=(selected===null?[]:dailyMapPlaces(d)).map(name=>link(mapURL(name),name.replace(/安徽省|浙江省|黄山市|杭州市|丽水市/g,''))).join('');
 $('#overview-map-title').textContent='全程路线预览';
 dayMap?.show(data.anchors,current.days,selected);
}
compactMap.addEventListener('change',placeDayMap);
const weatherCityKey={zhaji:'taopark',yimei:'taopark',lucun:'hongcun',xidi:'hongcun',xixinan:'chengkanService',chengkan:'chengkanService',tangmo:'chengkanService',yuliang:'huizhouOld'};
function citiesFor(d){return [...new Set(d.path.map(k=>weatherCityKey[k]||k).filter(k=>data.cities[k]))];}
function weatherBody(cityKey,date){const city=data.cities[cityKey],entry=weatherCache.get(cityKey),w=exactWeather(entry?.payload,date),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()),delta=(Date.parse(date)-Date.parse(today))/86400000;const usable=w&&delta>=0?w:null;return `<div class="city-weather"><h3>${esc(city[0])}</h3>${usable?`<div class="weather-temp">${usable.min}–${usable.max}°C</div><p>${weatherText(usable.code)} · 降水概率 ${Number.isFinite(usable.rain)?usable.rain+'%':'未提供'}</p><p class="weather-status">${delta>=7?'中期趋势 · 不宜据此锁定户外活动':'可用日期预报 · 仍须临行复查'}</p>`:`<div class="weather-temp">待更新</div><p class="weather-status">${!entry?'正在查询对应日期…':entry.error?'天气加载失败，可重试或查看官方渠道。':'接口未覆盖此旅行日期 / 日期已过，不生成每日温度。'}</p>`}<p>${clothing(usable)}</p><p class="meta">${entry?.retrievedAt?'获取时间：'+esc(entry.retrievedAt)+'（北京时间）<br>模型发布时间：接口未提供。':'尚无成功获取记录。'}</p>${link(city[3]?`https://www.weather.com.cn/weather15d/${city[3]}.shtml`:'https://www.weather.com.cn/','中国天气网参考')}</div>`;}
function renderWeather(){if(!current||!$('#weather-grid'))return;$('#weather-grid').innerHTML=current.days.map((d,i)=>`<article class="panel weather-card"><p class="eyebrow">DAY ${i+1} · ${d.date}</p>${citiesFor(d).map(k=>weatherBody(k,d.date)).join('<hr>')}<p class="meta">活动适配：${d.walk.includes('坡')||d.walk.includes('石板')?'湿滑石板和缓坡谨慎慢走；':'平地步行也穿防滑鞋；'}${d.stay.type==='car'?'车宿被褥按夜间最低温另留保暖余量。':'酒店/家中休息，次晨出门再确认降雨。'}</p></article>`).join('');}
async function loadWeather(force=false){const generation=++weatherGeneration,button=$('#refresh-weather');button.disabled=true;button.textContent='正在查询…';const keys=[...new Set(current.days.flatMap(citiesFor))];await Promise.all(keys.map(async key=>{const old=weatherCache.get(key);if(!force&&old&&!old.error&&Date.now()-old.at<600000)return;try{const payload=await fetchJSON(weatherURL(data.cities[key]),8000);if(!Array.isArray(payload?.daily?.time))throw new Error('Invalid weather response');weatherCache.set(key,{payload,at:Date.now(),retrievedAt:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short'}).format(new Date())});}catch{weatherCache.set(key,{error:true,at:Date.now()});}if(generation===weatherGeneration)renderWeather();}));if(generation!==weatherGeneration)return;renderWeather();button.disabled=false;button.textContent='刷新天气';}
function updateSectionNav(){let active='overview';for(const id of ['overview','daily','weather','packing','checks']){const section=document.getElementById(id);if(section&&section.getBoundingClientRect().top<=Math.min(innerHeight*.25,200))active=id;}document.querySelectorAll('.main-nav a').forEach(a=>{const yes=a.hash===`#${active}`;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
function observeSections(){observer=new IntersectionObserver(updateSectionNav,{rootMargin:'-10% 0px -45% 0px',threshold:0});['overview','daily','weather','packing','checks'].forEach(id=>observer.observe(document.getElementById(id)));updateSectionNav();}
let navFrame=0;window.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(()=>{updateSectionNav();navFrame=0;});},{passive:true});
main.addEventListener('click',e=>{
 const quick=e.target.closest('[data-switch-day]');if(quick){const n=Number(quick.dataset.switchDay);if(n!==state.day||!dayOpen)document.querySelector('[data-day="'+n+'"]').click();else document.querySelector('[data-day="'+n+'"]').scrollIntoView({block:'start'});return;}
 const route=e.target.closest('[data-route]');
 if(route){state.route=route.dataset.route;state.day=0;dayOpen=true;mapScope='day';render();document.querySelector(`[data-route="${state.route}"]`).focus({preventScroll:true});announce('已切换路线，日期与预算已更新');return;}
 const day=e.target.closest('[data-day]');
 if(day){const next=Number(day.dataset.day);dayOpen=next!==state.day||!dayOpen;state.day=next;mapScope=dayOpen?'day':'all';renderDay();persist();syncURL();

  const toggle=document.querySelector(`[data-day="${state.day}"]`);toggle.focus({preventScroll:true});toggle.scrollIntoView({block:'start',behavior:'auto'});
  announce(dayOpen?'已展开第 '+(state.day+1)+' 天，地图已定位当天区段':'已收起当天安排，地图显示全程');return;}
 const scope=e.target.closest('[data-map-scope]');if(scope){mapScope=scope.dataset.mapScope;updateDayMaps();announce(mapScope==='all'?'地图已显示全程':'地图已定位当天区段');return;}
 if(e.target.closest('#refresh-weather'))loadWeather(true);if(e.target.closest('#retry-load'))boot();
});
main.addEventListener('change',e=>{if(e.target.id==='packing-pending'){packFilter=e.target.checked?'pending':'all';updatePackingFilter();}if(e.target.matches('[data-traveler]')){travelerNames[Number(e.target.dataset.traveler)]=e.target.value.trim().slice(0,16);persist();renderPacking();}if(e.target.id==='date-select'){state.date=e.target.value;state.day=0;dayOpen=true;mapScope='day';render();$('#date-select').focus({preventScroll:true});announce('出行日期已更新');}if(e.target.matches('[data-check]')){checked[e.target.dataset.check]=e.target.checked;persist();updateProgress();updatePackingFilter();announce(saveOK?'已保存到本浏览器':'仅临时保存，请截图备份');}});
main.addEventListener('input',e=>{if(e.target.id==='trip-notes'){notes=e.target.value;persist();}});
window.addEventListener('popstate',()=>{if(!data)return;const p=new URLSearchParams(location.search);state={route:p.get('route')||'anhui',date:p.get('dates')||'2-7',day:Number(p.get('day')||0)};render();});
async function boot(){main.innerHTML='<div class="loading" role="status">正在整理你的山水路书…</div>';try{data=validatePlan(await fetchJSON('data/plan.json'));render();if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());}catch{main.innerHTML='<div class="error-state" role="alert"><h1>路书暂未加载</h1><p>可能是网络中断、网页更新中或数据格式异常。你的本地清单不会被清空。</p><button class="primary" id="retry-load">重新加载行程</button><p class="meta">本页需要通过网站或本地 HTTP 服务打开；直接双击 HTML 文件可能无法读取数据。</p></div>';}}
boot();
