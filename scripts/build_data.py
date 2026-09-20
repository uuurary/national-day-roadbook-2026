"""Convert the verified PDF source into a static, TREK-shaped shared payload.

No execution/import of the PDF authoring script is required. Coordinates are
WGS84 city-area anchors, not precise scenic-area gates or booked overnight sites.
"""
import ast
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'tmp/pdfs/build_nationalday_2026.py'
tree = ast.parse(SOURCE.read_text(encoding='utf-8'))
tables = []
for node in tree.body:
    if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == 'table':
        tables.append(ast.literal_eval(node.value.args[0]))
sources = []
for node in tree.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'sources' for t in node.targets):
        sources = ast.literal_eval(node.value)

anchors = {
 'changzhou': ['常州市区',31.8107,119.9730],
 'jingxian': ['泾县县城',30.6890,118.4050],
 'taohuatan': ['桃花潭镇',30.4870,118.1620],
 'gantang': ['黄山区甘棠',30.2730,118.1350],
 'xuancheng': ['宣城市区',30.9400,118.7520],
 'liyang': ['溧阳市区',31.4170,119.4820],
 'lucun': ['黟县卢村观景台（村域锚点）',30.0173730,117.9702933],
 'yixian': ['黟县县城（碧阳镇）',29.9234341,117.9382507],
 'xixinan': ['西溪南古村落（村域）',29.8344992,118.2813922],
 'chengkan': ['呈坎古村（村域）',29.9217184,118.2761838],
 'yansi': ['黄山徽州区岩寺镇',29.8284593,118.3335978],
 'guangde': ['广德市区（桐汭街道）',30.8964607,119.4119888],
 'huaian': ['淮安市区',33.6100,119.0150],
 'lianyungang': ['连云港海州',34.5970,119.2150],
 'rizhao': ['日照市区',35.4170,119.5200],
 'huangdao': ['青岛西海岸',35.9600,120.1900],
 'deqing': ['德清武康',30.5340,119.9730],
 'jinhua': ['金华市区',29.0760,119.6450],
 'songyang': ['松阳县城',28.4480,119.4770],
 'yunhe': ['云和县城',28.1150,119.5690],
 'jinyun': ['缙云县城',28.6580,120.0870],
 'tonglu': ['桐庐县城',29.7940,119.6860],
}
cfgs = [
 dict(id='anhui',name='安徽',en='ANHUI',title='从桃花潭，走进徽州',subtitle='泾县、桃花潭、卢村观景台、西溪南、呈坎一路串联，回程在广德市区落脚。推荐6天。',color='#277c68',tag='古村山水 · 推荐6天',km='900-1100',budget='2200-4200',hotel='10月4日 · 黄山徽州区岩寺',hotelCost='350-700元 / 间',daily=2,visits=3,sleep=4,backup=5,
   paths=[['changzhou','jingxian'],['jingxian','taohuatan','lucun','yixian'],['yixian','xixinan','yansi'],['yansi','chengkan','guangde'],['guangde','changzhou']],
   dayTitles=['先到泾县，江边休息','桃花潭与卢村观景台','西溪南，下午酒店休整','呈坎古村，北返广德','从广德市区回常州'],
   charging=['泾县午餐快充，补到85%-90%；夜宿用电另留余量。','泾县出发≥80%，进山区不依赖单桩；黟县县城晚餐快充。','岩寺酒店附近找多枪快充站，北返前补到85%-90%。','岩寺出发85%-90%；北返途中以预测到站≥20%选备站，广德晚餐补能。','广德按实时导航核电量，预计到家留20%；短途也不跳过检查。'],
   meals=['泾县面条/锅贴配蛋，晚餐炖菜、时蔬；备次日早餐。','桃花潭镇家常午餐，黟县晚餐徽菜；臭鳜鱼按口味少量点。','西溪南外围午餐；岩寺晚餐面食、毛豆腐或家常菜，酒店洗衣。','呈坎游后先吃午餐再转场；广德市区炖菜/面食，困倦不饮酒。','广德早餐，途中简单午餐或回常州吃；不为网红店绕远。'],
   scenic=[['青弋江泾县步道'],['泾县桃花潭景区','黟县卢村观景平台'],['黄山市西溪南古村落'],['黄山市呈坎景区','广德市区'],['广德市区']],
   warning='5天版第4日呈坎后仍有较长转场，单驾驶员优先6天。卢村指黟县观景台，不是广德卢村镇；车宿回县城/城区并核实过夜许可。',
   extra=[{'route':'岩寺 → 呈坎 → 岩寺','distance':'40-70 km / 1-1.5 h','schedule':'08:00早餐后出发；08:30-11:30呈坎；午餐后回岩寺，14:00-15:00午休，傍晚只在城区短走，落实车宿。不必为了鱼灯再走夜间山路。','stay':'徽州区岩寺 · 车宿③','path':['yansi','chengkan','yansi'],'title':'呈坎慢游，不赶长途','charging':'岩寺晚餐时补到85%-90%，次日转场广德。','food':'呈坎午餐；岩寺晚餐家常菜。','scenic':['黄山市呈坎景区']}, {'route':'岩寺 → 广德市区','distance':'240-290 km / 3.5-4.5 h','schedule':'08:30出发，以实时导航推荐的高速/主干道北返；每90-120分钟休息；途中午餐、按需快充，约15:00-16:30到广德市区，短走后晚餐、车宿。','stay':'广德市区 · 车宿④','path':['yansi','guangde'],'title':'分段北返，在广德歇脚','charging':'岩寺85%-90%出发；沿途预测到站不足20%提前补；广德为次晨返程备电。','food':'途中午餐，广德市区炖菜/时蔬。','scenic':['广德市区']}, {'route':'广德市区 → 常州','distance':'130-170 km / 2-3 h','schedule':'08:00早餐，09:00前出发；途中休息，预计12:00-14:00回常州，国庆堵车另留余量。不等免费截止才返程。','stay':'回常州','path':['guangde','changzhou'],'title':'轻松回到常州','charging':'按到家预测留20%，必要时途中短补。','food':'广德早餐，常州午餐。','scenic':[]}]),
 dict(id='shandong',name='山东',en='SHANDONG',title='沿海岸，去听海风',subtitle='连云港歇脚，日照看沙滩与森林，青岛西海岸留给一整段慢时光。',color='#2a7199',tag='看海优先 · 推荐6天',km='1300-1550',budget='2050-4500',hotel='10月4日 · 青岛西海岸',hotelCost='350-750元 / 间',daily=6,visits=7,sleep=None,backup=8,
   paths=[['changzhou','huaian','lianyungang'],['lianyungang','rizhao'],['rizhao','huangdao'],['huangdao','rizhao','lianyungang'],['lianyungang','huaian','changzhou']],
   dayTitles=['先到连云港歇脚','日照，海滩与森林','住进西海岸','看一眼海，再南返','分段回到常州'],
   charging=['淮安午餐快充，连云港检查次日余量。','日照午后补能，晚间离开充电位驻车。','西海岸午餐快充；酒店不是充电可用性保证。','日照午餐补能，连云港夜宿前再次核SOC。','淮安休息快充，预测到家不足20%时提前补。'],
   meals=['淮安午餐，海州家常菜。','海鲜面、家常海鲜，先问重量和加工费。','鲅鱼饺子或家常菜，不必追海景餐厅。','日照午餐，海州晚餐。','淮安午餐，回家晚餐。'],
   scenic=[['连云港月牙岛'],['日照万平口','日照海滨国家森林公园'],['青岛城市阳台','唐岛湾'],['青岛金沙滩'],[]],
   warning='海边风大时选择离海稍远的授权停车场。沙滩、低洼潮区和堤岸边缘不作为床车睡觉点；这次不串威海。',
   extra=[{'route':'青岛西海岸慢游','distance':'30-60 km / 1-2 h','schedule':'08:30早餐后游城市阳台；午休后唐岛湾或金沙滩二选一，下午补给并确认当晚合法驻车。','stay':'西海岸 · 车宿③','path':['huangdao'],'title':'把一天交给海岸','charging':'西海岸补到85%-90%，次日南返。','food':'海鲜面/家常菜；早餐提前采购。','scenic':['青岛城市阳台','唐岛湾']}, {'route':'西海岸 → 日照 → 连云港','distance':'260-320 km / 3.5-4.5 h','schedule':'08:30出发，日照午餐补能，16:30前到连云港；不再安排收费大景点。','stay':'连云港 · 车宿④','path':['huangdao','rizhao','lianyungang'],'title':'沿海岸分段南返','charging':'日照或连云港补能。','food':'日照午餐，海州晚餐。','scenic':[]}, {'route':'连云港 → 常州','distance':'360-410 km / 4.5-5.5 h','schedule':'08:00出发，淮安休息、午餐与快充，预计15:00-17:00到常州，拥堵另留余量。','stay':'回常州','path':['lianyungang','huaian','changzhou'],'title':'回家，路上不赶','charging':'淮安快充；抵家预留20%。','food':'淮安午餐。','scenic':[]}]),
 dict(id='zhejiang',name='浙江',en='ZHEJIANG',title='山水之间，遇见秋天',subtitle='德清湿地启程，松阳山村，云和梯田，缙云的好溪与仙都。',color='#b27142',tag='山水摄影 · 推荐6天',km='1200-1450',budget='2400-4750',hotel='10月4日 · 云和县城',hotelCost='300-650元 / 间',daily=9,visits=10,sleep=11,backup=12,
   paths=[['changzhou','deqing'],['deqing','jinhua','songyang'],['songyang','yunhe'],['yunhe','jinyun'],['jinyun','jinhua','changzhou']],
   dayTitles=['德清湿地，先慢下来','去松阳，住在县城','山村半日，云和酒店','梯田与缙云溪谷','带着秋色回常州'],
   charging=['德清补能，次日是较长转场。','金华外围午餐快充，松阳夜宿前查电量。','上山前≥70%；云和县城酒店附近快充。','梯田游览后检查电量，再转场缙云。','金华/杭州外围择站快充，别把450 km全用完。'],
   meals=['德清面食与家常菜。','金华午餐，松阳煨盐鸡/时蔬。','村外午餐，云和菌菇/炖菜。','县城采购早餐，缙云烧饼与敲肉羹。','沿途午餐，常州晚餐。'],
   scenic=[['德清下渚湖'],['松阳大木山'],['松阳杨家堂村','松阳陈家铺村'],['云和梯田九曲云环','缙云好溪'],[]],
   warning='山村一日只选杨家堂或陈家铺一组，避免连续山路。梯田收割与云海随天气变化，出发前看近7日实景；2026换乘公告需临行核实。',
   extra=[{'route':'缙云 → 桐庐','distance':'180-240 km / 2.5-3.5 h','schedule':'08:00-11:30仙都一条正式短线；午餐休息，13:00后向桐庐，16:30前确认床车停车。','stay':'桐庐 · 车宿④','path':['jinyun','tonglu'],'title':'仙都半日，歇脚桐庐','charging':'缙云出发前补能，桐庐次晨复核SOC。','food':'缙云午餐，桐庐家常菜。','scenic':['缙云仙都']}, {'route':'桐庐 → 常州','distance':'250-310 km / 3.5-4.5 h','schedule':'08:00出发，途中休息与按需补电，中午至下午回常州；不过度追赶时间。','stay':'回常州','path':['tonglu','changzhou'],'title':'山水旅程的最后一段','charging':'桐庐85%-90%出发，沿途视到达预测补能。','food':'途中或常州午餐。','scenic':[]}]),
]

trips=[]
for cfg in cfgs:
    days=[]
    for i,row in enumerate(tables[cfg['daily']][1:]):
        route,_,dist=row[1].partition('\n')
        days.append(dict(day_number=i+1,date=f'2026-10-{i+2:02}',title=cfg['dayTitles'][i],route=route,distance=dist,schedule=row[2],stay=row[3].replace('\n',' · '),path=cfg['paths'][i],charging=cfg['charging'][i],food=cfg['meals'][i],scenic=cfg['scenic'][i]))
    six=copy.deepcopy(days[:3] if cfg['id'] in ['anhui','shandong'] else days[:4])
    for ext in cfg['extra']:
        d=copy.deepcopy(ext);d['day_number']=len(six)+1;d['date']=f"2026-10-{len(six)+2:02}";six.append(d)
    result={k:cfg[k] for k in ['id','name','en','title','subtitle','color','tag','km','budget','hotel','hotelCost','warning']}
    result.update(variants={'5':days,'6':six},visits=tables[cfg['visits']],sleep=tables[cfg['sleep']] if cfg['sleep'] is not None else [],alternatives=tables[cfg['backup']])
    trips.append(result)
payload=dict(schemaVersion=1,updated='2026-09-20',revision='anhui-required-stops-v2',coordinatesNote='WGS84城市/镇区/村域锚点，不是景区入口、充电站或已获准夜宿的精确位置；卢村仅为村域附近锚点，观景台停车请按完整地点名称核实。实际导航按地点名称搜索。',anchors=anchors,trips=trips,packing=tables[13],budget=tables[14],checkpoints=tables[15],rules=tables[1],sources=sources)
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/trips.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')

# TREK share snapshot field structure, not an advertised universal import API.
for trip in trips:
    for duration,days in trip['variants'].items():
        ids=list(dict.fromkeys(k for d in days for k in d['path']))
        places=[dict(id=i+1,name=anchors[k][0],lat=anchors[k][1],lng=anchors[k][2],description=payload['coordinatesNote']) for i,k in enumerate(ids)]
        lookup=dict(zip(ids,places))
        snap=dict(trip=dict(title=f"2026国庆 · {trip['name']} · {duration}天",start_date='2026-10-02',end_date=days[-1]['date'],currency='CNY'),days=[dict(id=d['day_number'],day_number=d['day_number'],date=d['date'],title=d['title']) for d in days],places=places,assignments={str(d['day_number']):[dict(id=d['day_number']*100+i,place=lookup[k],order_index=i) for i,k in enumerate(d['path'])] for d in days},dayNotes={str(d['day_number']):[dict(id=d['day_number'],text=d['schedule']+'\n补能：'+d['charging']+'\n住宿：'+d['stay'])] for d in days},permissions=dict(share_map=True,share_packing=True,share_budget=True),packing=payload['packing'],budget=trip['budget'],_format_note='Static snapshot shaped after TREK public share data; not a TREK database backup or guaranteed one-click import.')
        (ROOT/f'data/{trip["id"]}-{duration}-trek-snapshot.json').write_text(json.dumps(snap,ensure_ascii=False,indent=2),encoding='utf-8')
print('Created 3 itineraries, 6 variants and 6 TREK-shaped share snapshots.')
