// Shared marker semantics; derive lodging from the selected itinerary, not hard-coded POIs.
export const mapTheme={style:'amap://styles/fresh',route:'#285b49',outline:'#fffdf5',hint:'#527f99',context:'#819b90'};
export const symbols={
 sight:'<path d="M3 18 9 7l4 6 3-4 5 9H3Z"/><path d="m7 10 2 2 2-2"/>',
 car:'<path d="m5 9 2-4h10l2 4M4 9h16v9H4zM7 18v2m10-2v2M7 13h2m6 0h2"/>',
 hotel:'<path d="M4 20V8h16v12M8 8V4h8v4M9 20v-5h6v5M8 11h1m6 0h1"/>',
 home:'<path d="m3 11 9-8 9 8M6 10v11h12V10M10 21v-7h4v7"/>',
 parking:'<path d="M8 21V3h5a5 5 0 0 1 0 10H8"/>',
 shower:'<path d="M5 7a4 4 0 0 1 8 0v2M9 12h8l-2-3h-4l-2 3ZM10 16v1m5-1v1m-3 3v1"/>'
};
export const icon=type=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+symbols[type]+'</svg>';
export function stopPresentation(stop,days){
 const nights=days.map((d,i)=>({d,i})).filter(({d})=>d.path.at(-1)===stop.key&&['car','hotel'].includes(d.stay?.type));
 const stay=nights[0]?.d.stay;
 const kind=stop.key==='changzhou'?'home':stay?.type||(/停车导航点/.test(stop.name)?'parking':'sight');
 const label={home:'出发 / 返程',car:'车宿',hotel:'酒店',parking:'停车导航点',sight:'景点 / 途经'}[kind];
 const clean=stop.name.replace(/（.*?）/g,'');
 const note=stay?('第'+nights.map(n=>n.i+1).join('、')+'晚 · '+label+' · '+(stay.shower?'可淋浴':'无淋浴')+(stay.type==='car'?'（用户确认；浴室时段另核）':'（区域参考，未预订）')):label+' · '+(stop.key==='changzhou'?'常州站仅为参考点，以家为准':'按实际入口导航');
 return {kind,label,name:clean,note,shower:stay?.shower===true};
}
export function markerNode(stop,days,number,onSelect){
 const p=stopPresentation(stop,days),node=document.createElement('button');
 node.type='button';node.className='trip-pin pin-'+p.kind;node.dataset.stop=stop.key;node.dataset.kind=p.kind;
 node.setAttribute('aria-label',number+' · '+stop.name+' · '+p.note);node.title=stop.name+' · '+p.note;
 node.innerHTML='<span class="pin-face">'+icon(p.kind)+'<span class="pin-number"></span>'+(p.shower?'<span class="pin-shower">'+icon('shower')+'</span>':'')+'</span>';
 node.querySelector('.pin-number').textContent=String(number);
 node.addEventListener('click',e=>{e.stopPropagation();onSelect(p);});
 return node;
}
export function showStopDetail(mount,p){
 const panel=document.getElementById(mount.id+'-detail');if(!panel)return;
 panel.replaceChildren();const title=document.createElement('strong'),note=document.createElement('span');
 title.textContent=p.name;note.textContent=p.note;panel.append(title,note);panel.dataset.selected='true';
}
export function resetStopDetail(mount){
 const panel=document.getElementById(mount.id+'-detail');if(panel){panel.textContent='轻点地图标记，查看地点与过夜信息';delete panel.dataset.selected;}
}
export const mapLegend='<div class="map-legend" aria-label="地图图例">'+[['sight','景点'],['car','车宿'],['hotel','酒店'],['shower','可淋浴']].map(([k,l])=>'<span class="legend-'+k+'">'+icon(k)+l+'</span>').join('')+'<span><i class="legend-road"></i>路线</span><span><i class="legend-road dashed"></i>示意</span></div>';
