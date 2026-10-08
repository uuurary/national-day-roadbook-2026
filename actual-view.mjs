const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function actualDay(d,link,mapURL,expanded){
 return '<div class="day-layout"><article class="panel"><header class="day-intro"><p class="eyebrow">'+d.date+' · 实际行程</p><h3>'+esc(d.title)+'</h3><p class="notice">按实际途经顺序记录，不补写具体时刻、停留时长或消费。实际里程、驾驶时长、步数：未记录。</p><p><strong>当晚：</strong>'+esc(d.stay.area)+'</p></header><details id="day-map-disclosure" class="day-map-disclosure" '+(expanded?'open':'')+'><summary>查看当天地图与地点列表</summary><div id="day-map-slot"></div></details><ol class="timeline">'+d.stops.map((s,i)=>'<li class="core"><time>第'+(i+1)+'站</time><div class="event"><strong>'+esc(s.name)+'</strong><p>'+esc(s.note||'实际路线节点；抵离时间未记录。')+'</p><div class="event-nav">'+link(mapURL(s.name),'高德查看此地点')+'</div></div></li>').join('')+'</ol></article><aside class="side-stack"><section class="panel"><h3>过夜记录</h3><p>'+esc(d.stay.area)+'</p><p>'+esc(d.stay.reason)+'</p><p>淋浴设施：'+(d.stay.shower===null?'本次未记录':d.stay.shower?'此前用户确认可淋浴；本次是否使用未记录':'此前用户确认无淋浴')+'</p></section><section class="panel"><h3>餐饮记录</h3><p>'+esc(d.food)+'</p><p>菜品、数量、金额未记录。</p></section><section class="panel"><h3>实际费用</h3><p>住宿、充电与停车、已购门票、餐饮：金额均未记录。未记录不代表0元。</p></section><section class="panel"><h3>照片与补充</h3><p>'+esc(d.photo)+'</p><p>原计划的时间安排与Plan B已存档，不作为实际发生记录。</p></section></aside></div>';
}
export function decorateActual(data){
 if(!data.actual)return;
 document.title=data.title;
 document.querySelector('.brand>span:last-child').firstChild.textContent='2026 国庆实际路书';
 document.querySelector('.hero-jump').textContent='回看每日行程 ↓';
 document.querySelector('.route-spine').textContent='常州 → 泾县面馆 · 查济 · 桃花潭 → 卢村 · 宏村 · 碧山 → 凫峰 · 呈坎服务区 → 西递 → 呈坎 · 唐模 → 徽州古城 · 渔梁 · 昌歙线 · 新安江 → 宁国 · 广德酒店 → 常州';
 const stats=document.querySelectorAll('.stat');stats[1].innerHTML='<strong>10月2—7日</strong><span>实际日期 · 2026年</span>';stats[2].innerHTML='<strong>未记录</strong><span>实际步行与驾驶时长</span>';stats[3].innerHTML='<strong>未记录</strong><span>实际支出，不沿用预算</span>';
 document.querySelector('#overview > .notice').textContent=data.routes[0].tradeoff;
 document.querySelector('.route-mileage').textContent='实际总里程：未记录';
 document.querySelector('.route-mileage + .meta').textContent='地图仅按已定位节点顺序连线；未核实坐标的节点仍保留在每日列表，不画猜测位置。不是车辆GPS轨迹。';
 const budget=document.querySelector('#overview > details.sources');budget.innerHTML='<summary>实际记录与原计划存档</summary><p>本页依据实际路线更新。实际费用、精确里程、抵离时间未记录，不能用旧预算或计划时间代替。</p><p><a href="?view=plan">查看原计划存档 ↗</a>（与实际行程明确分开）</p>';
 document.querySelector('#daily h2').textContent='每日一程，回看实际路线';
 document.querySelector('#weather h2').textContent='历史天气 · 未补录';
 document.querySelector('#weather .section-heading .meta').textContent='旅行已结束，不再请求未来天气预报。';
 document.querySelector('#weather > .notice').textContent='未提供旅行当天实况与历史观测数据，不用当前预报或历史平均气候代替。';
 document.querySelector('#refresh-weather').hidden=true;
 document.querySelector('#checks h2').textContent='原行前检查与同行备忘';
 document.querySelector('.status-grid').innerHTML='<div class="panel"><h3>已确认</h3><p>10月2—7日常州往返，六天五晚；第1晚桃花潭正门停车场，第2—4晚呈坎服务区，第5晚广德卡旺卡旁酒店。</p></div><div class="panel"><h3>待补充的实际记录</h3><p>第3晚服务区方向、酒店名称、碧山实际停车情况；各项费用、时间和里程。</p></div><div class="panel"><h3>地图边界</h3><p>安顺控股充电站、碧山停车场、昌歙线具体端点坐标未核实。酒店和第3晚服务区为区域参考，不是精确入口。当前实时路况不是10月2—7日历史路况。</p></div>';
 const boundary=document.querySelector('#checks > details.sources > p.meta');if(boundary)boundary.textContent='实际路书与原计划存档分开。清单和备注仍只保存在本浏览器，无跨设备同步；不提供历史GPS轨迹、历史实况或自动补录费用。';
 document.querySelectorAll('.map-meta').forEach(n=>n.textContent='虚线为实际节点顺序示意，不是GPS轨迹或实际驾车路径。未核实坐标的节点不绘制；酒店、第3晚服务区与景区入口为位置参考。高德路况如显示，为当前实时路况，不代表旅行当天。');
}
