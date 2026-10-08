import {plan as original} from './plan.mjs';
import {gcjToWgs} from '../coordinates.mjs';
const extra={
 xiaowei:{name:'小卫香辣面馆（公路小区店）',id:'B0FFGBCRAR',gcj:[118.410548,30.690352]},
 chengkanSouth:{name:'呈坎服务区（京台高速台北方向）',id:'B0FFHUKVMA',gcj:[118.285451,29.934831]},
 chengkanUnknown:{name:'呈坎服务区（第3晚方向未记录；仅区域参考）',gcj:[118.286888,29.935074]},
 xinAn:{name:'新安江山水画廊风景区（景区参考点，非实测停靠位置）',id:'B022F00OA6',gcj:[118.618285,29.862743]},
 ningguoTea:{name:'卡旺卡（宣城宁国河沥溪老街店）',id:'B0K2VSABUQ',gcj:[119.008347,30.635293]},
 guangdeStay:{name:'广德卡旺卡绥安新天地店旁酒店（区域参考，酒店名未记录）',gcj:[119.417075,30.886137]},
 feichong:{name:'飞充网智慧超级充电站（广德交投体育场）',id:'B0L2KKEYTR',gcj:[119.43192,30.88711]}
};
const pois={...original.pois,...extra};
const anchors=Object.fromEntries(Object.entries(pois).map(([key,p])=>{const [lng,lat]=gcjToWgs(p.gcj);return [key,[p.name,lat,lng]];}));
const S=(key,name,note='')=>({key,name:name||anchors[key]?.[0],note});
const unknown=(key,name,note)=>S(key,name,note+'；坐标未唯一核实，不绘制定位标记。');
const rows=[
 ['泾县面馆、查济与桃花潭',[
 S('changzhou','常州（常州站为地图参考点）'),S('xiaowei'),S('zhaji'),S('taopark')],
 'taopark','桃花潭旅游度假区正门停车场','car',false],
 ['桃花潭、卢村、宏村，经凫峰到呈坎',[
 S('yimei','益妹超市／桃花潭','免费停车导航点，默认对应桃花潭景区。'),S('lucun'),S('hongcun','宏村景区（地图沿用南门停车场参考）'),
 unknown('bishan','黟县碧山村停车场','截图标“暂停营业”，实际停车情况未记录'),S('fufeng','凫峰服务区','本日途经点，不再记为当晚住宿。'),S('chengkanSouth')],
 'chengkanSouth','呈坎服务区（京台高速台北方向，按截图末站）','car',true],
 ['西递游览，返回呈坎服务区',[
 S('xidi','西递古村落（地图沿用停车场参考）'),S('chengkanUnknown')],
 'chengkanUnknown','呈坎服务区（方向未记录）','car',true],
 ['呈坎与唐模，服务区过夜',[
 S('chengkan','呈坎'),S('tangmo','唐模景区'),S('chengkanService','呈坎服务区（京台高速北京方向）')],
 'chengkanService','呈坎服务区（京台高速北京方向，按截图末站）','car',true],
 ['歙县山水，经宁国至广德酒店',[
 unknown('anshun','安顺控股超级充电站重卡','用户补充名称；充电量、价格未记录'),
 S('huizhouOld','徽州古城'),S('yuliang','渔梁坝和渔梁古镇'),
 unknown('changshe','安徽省黄山市歙县昌歙线','仅确认途经道路，未提供具体起止点'),
 S('xinAn'),S('ningguoTea','卡旺卡（宣城宁国老街店）'),
 S('guangdeStay','卡旺卡（宣城广德绥安新天地店）及旁边酒店','酒店按用户确认的相邻区域记录，不将茶饮店当作酒店入口。')],
 'guangdeStay','广德卡旺卡（绥安新天地店）旁酒店，店名未记录','hotel',null],
 ['广德补电，返回常州',[
 S('feichong'),S('changzhou','常州（返家，地图以常州站为参考）')],
 'changzhou','常州家中','home',null]
];
let previous='changzhou';
const days=rows.map(([title,stops,end,area,type,shower],i)=>{
 const path=[...new Set([previous,...stops.map(s=>s.key)])];previous=end;
 return {id:'actual-'+(i+1),actual:true,title,stops,path,city:end,walk:'未记录',drive:'未记录',distanceKm:null,distanceNote:'实际里程未记录；地图仅按地点顺序连线，不是车辆GPS轨迹。',budget:null,
 stay:{area,type,shower,confirmed:true,reason:type==='hotel'?'用户确认第五晚住广德卡旺卡附近酒店；酒店名称、房费未记录。':'按截图与用户补充记录；服务区设施说明沿用用户此前确认，不代表本次实际使用记录。'},
 timeline:stops.map((s,j)=>({time:'第'+(j+1)+'站',place:s.name,note:s.note||'用户提供的实际路线节点；抵离时间、停留时长未记录。',kind:'core'})),
 food:stops.filter(s=>/xiaowei|Tea|Stay/.test(s.key)).map(s=>s.name).join('；')||'具体餐饮未记录。',
 photo:'未提供本次照片及拍摄时刻；首页轮播仍为历史景观图。',
 booking:'古镇票已购买；本次实际票款未记录。',planB:'本页为已完成行程回顾，不将原计划的备选活动记为实际到访。'};
});
export const plan={...original,actual:true,version:'2026-10-08-actual',checked:'2026-10-08',title:'2026国庆出游 · 实际路书',
 dates:[{id:'2-7',start:'2026-10-02',length:6,label:'10月2—7日 · 实际6天5晚'}],
 anchors,pois,cities:{...original.cities,...Object.fromEntries(Object.keys(extra).map(k=>[k,anchors[k]]))},
 routes:[{...original.routes[0],intro:'2026年10月2—7日，常州往返。按实际地点顺序回顾六天五晚：四晚车宿，一晚广德酒店。',tag:'实际行程 · 六天五晚',tradeoff:'依据用户截图及补充整理。抵离时间、里程、费用未记录的留空；地点顺序不等于GPS轨迹。',variants:{6:days}}],
 sources:[['实际行程来源','https://github.com/uuurary/national-day-roadbook-2026','用户2026-10-08提供的高德分组截图及文字确认；不是历史计划推算。'],['新增地点定位','https://www.amap.com/','2026-10-08高德JS地点查询；安顺控股充电站、碧山停车场及昌歙线具体端点未唯一核实，未绘制定位。']],
 checks:original.checks};
