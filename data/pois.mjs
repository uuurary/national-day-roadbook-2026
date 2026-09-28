import {gcjToWgs} from '../coordinates.mjs';
// Verified AMap PlaceSearch results, 2026-09-28. GCJ-02, [longitude, latitude].
export const pois={
 changzhou:{name:'常州站（出发／返程参考点，实际以家为准）',id:'B0FFF5U99B',gcj:[119.973242,31.785216]},
 zhaji:{name:'查济古建筑群游客中心停车场',id:'B0FFL1INVR',gcj:[118.042997,30.518456]},
 yimei:{name:'益妹超市（桃花潭免费停车导航点）',id:'B0GU71MLE6',gcj:[118.145546,30.476539]},
 taopark:{name:'桃花潭旅游度假区正门停车场（夜宿）',id:'B0MGASD8ZF',gcj:[118.151635,30.493006]},
 lucun:{name:'卢村观景平台路侧停车场',id:'B0MB2601S8',gcj:[117.971575,30.017025]},
 hongcun:{name:'宏村南门停车场',id:'B022F00E03',gcj:[117.991663,30.000109]},
 fufeng:{name:'凫峰服务区停车场（夜宿／淋浴）',id:'B0MBAS99SI',gcj:[117.833265,29.733058]},
 xidi:{name:'西递古村落4号地面停车场',id:'B022F00RJ4',gcj:[117.99123,29.901581]},
 qiyun:{name:'齐云山服务区（黄浮高速黄山方向，夜宿／淋浴）',id:'B0FFF5V5IP',gcj:[118.131202,29.751178]},
 xixinan:{name:'西溪南古村落停车场',id:'B0G3SLXRJT',gcj:[118.286874,29.841042]},
 chengkan:{name:'呈坎景区售票处地上停车场',id:'B0GUBNLP33',gcj:[118.27924,29.913973]},
 tangmo:{name:'唐模景区西门停车场',id:'B0FFF46XVG',gcj:[118.328663,29.869334]},
 chengkanService:{name:'呈坎服务区（京台高速北京方向，夜宿／淋浴）',id:'B0FFHUU34U',gcj:[118.286888,29.935074]},
 huizhouOld:{name:'徽州古城游客中心',id:'B0H2OABXUB',gcj:[118.43611,29.862754]},
 yuliang:{name:'徽州古城渔梁坝和渔梁古镇停车点',id:'B0IK9AWXB6',gcj:[118.449129,29.857689]},
 guangde:{name:'广德绥安新天地（酒店／餐饮区域参考点）',id:'B02330OHH4',gcj:[119.419968,30.88726]}
};
export const anchors=Object.fromEntries(Object.entries(pois).map(([k,p])=>{const [lng,lat]=gcjToWgs(p.gcj);return [k,[p.name,lat,lng]];}));
