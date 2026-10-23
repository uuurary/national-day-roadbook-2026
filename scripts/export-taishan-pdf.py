"""Export the confirmed Taishan plan to a paginated, source-linked PDF."""
import json, os, html
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, Flowable, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'data/taishan.json').read_text(encoding='utf8'))
OUT=ROOT/'output/pdf/2026-11-泰山.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
FONTDIR=Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'
pdfmetrics.registerFont(TTFont('Body',str(FONTDIR/'simsun.ttc'),subfontIndex=0))
pdfmetrics.registerFont(TTFont('Head',str(FONTDIR/'simhei.ttf')))
INK=colors.HexColor('#233f34'); GREEN=colors.HexColor('#254c3c'); BLUE=colors.HexColor('#e8f2f5'); PAPER=colors.HexColor('#f6f4ee'); LINE=colors.HexColor('#d9dfd5'); MUTED=colors.HexColor('#57655e')
W,H=A4; CW=W-88
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.2,leading=16,textColor=INK,wordWrap='CJK',spaceAfter=7),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8.3,leading=12.5,textColor=MUTED,wordWrap='CJK',spaceAfter=5),
 'title':ParagraphStyle('title',fontName='Head',fontSize=31,leading=42,textColor=GREEN,spaceAfter=12),
 'h1':ParagraphStyle('h1',fontName='Head',fontSize=21,leading=29,textColor=GREEN,spaceAfter=12),
 'h2':ParagraphStyle('h2',fontName='Head',fontSize=13,leading=20,textColor=GREEN,spaceBefore=9,spaceAfter=6),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=9,leading=14,textColor=INK,wordWrap='CJK'),
 'cellhead':ParagraphStyle('cellhead',fontName='Head',fontSize=9,leading=14,textColor=INK,wordWrap='CJK')
}
def norm(s):return str(s).replace('—','-').replace('–','-').replace('‑','-')
def p(s,style='body',raw=False):return Paragraph(norm(s) if raw else html.escape(norm(s)).replace('\n','<br/>'),styles[style])
story=[]
def add(s,style='body',raw=False):story.append(p(s,style,raw))
def title(n,s):add(n+' / 2026-11-泰山','small');add(s,'h1')
def new():story.append(PageBreak())
def table(rows,widths,header=True):
 t=Table([[p(v,'cellhead' if header and i==0 else 'cell') for v in row]for i,row in enumerate(rows)],colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
 cmds=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,0),.6,LINE),('LINEBELOW',(0,1),(-1,-1),.3,LINE)]
 if header:cmds.append(('BACKGROUND',(0,0),(-1,0),BLUE))
 t.setStyle(TableStyle(cmds));story.append(t);story.append(Spacer(1,9))
def callout(s):
 t=Table([[p(s)]],colWidths=[CW]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BLUE),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story.append(t);story.append(Spacer(1,10))
def link(url,label):return '<link href="'+html.escape(url,quote=True)+'" color="#254c3c">'+html.escape(label)+'</link>'
class Photo(Flowable):
 def __init__(self,filename,w,h):super().__init__();self.filename=str(filename);self.width=w;self.height=h
 def draw(self):
  from reportlab.lib.utils import ImageReader
  im=ImageReader(self.filename);iw,ih=im.getSize();scale=max(self.width/iw,self.height/ih);ww,hh=iw*scale,ih*scale
  self.canv.saveState();clip=self.canv.beginPath();clip.rect(0,0,self.width,self.height);self.canv.clipPath(clip,stroke=0);self.canv.drawImage(im,(self.width-ww)/2,(self.height-hh)/2,width=ww,height=hh);self.canv.restoreState()
class Box(Flowable):
 def __init__(self,label=''):super().__init__();self.width=38;self.height=18;self.label=label
 def draw(self):self.canv.setStrokeColor(GREEN);self.canv.rect(13,3,9,9,stroke=1,fill=0)
def day_budget(d):
 b=d['budget'];lo=sum(b[::2]);hi=sum(b[1::2]);add('当天四人预算：¥'+str(lo)+'-'+str(hi)+'；住宿、交通、门票、餐饮和补给按付款日归集，未重复计算跨夜行程。','small')
def timeline(events):
 rows=[['时间（规划）','地点、停留与衔接']]
 kinds={'core':'核心','optional':'可删减','drive':'交通','food':'用餐','rest':'休息/缓冲'}
 for e in events:
  text=kinds[e['kind']]+' | '+e['place']+'\n'+e['note']
  if e.get('next'):text+='\n交通/费用：'+e['next']
  rows.append([e['time'],text])
 table(rows,[100,CW-100])
def footer(c,doc):
 c.setFillColor(MUTED);c.setFont('Body',8);c.drawString(44,25,'2026-11-泰山 | 四人高铁周末旅行');c.drawRightString(W-44,25,'第 '+str(doc.page)+' 页')
 if doc.page>1:c.setStrokeColor(LINE);c.line(44,H-36,W-44,H-36);c.setFont('Body',8);c.drawString(44,H-28,'11月6日夜爬入园 / 11月7日看日出 / 11月8日返常州')
# 1
add('WEEKEND JOURNEY / NOVEMBER 2026','small');add('2026-11-泰山','title');add('四个人，沿着石阶一起等天亮。','h2')
story.append(Photo(ROOT/'assets/taishan-0.jpg',CW,205));story.append(Spacer(1,5));add('封面：泰山日出历史实景（2005），Pfctdayelise，CC BY-SA 2.5；原图与许可见末页。画面裁切，不代表本次天气。','small')
table([['日期','人数与交通','住宿'],['2026.11.06-11.08','四人，普通体力\n高铁往返常州/常州北 - 泰安','红门附近，两间双床房连续两晚']],[145,165,CW-310])
callout('推荐：周五约19:00到泰安站，短休后约23:00红门检票；周六清晨登顶观日，索道+景区车下山，回酒店连续补觉4-5小时；周日岱庙慢游，下午高铁返常州。')
add('最先落实的三件事','h2');add('1. 两间双床房连订11月6、7日，11月8日退房，确保周六上午能直接回房。\n2. 匹配11月6日红门夜间入园时段，不因次晨看日出而买错日期。\n3. 临出发核对山顶风、雨雪、结冰及夜间开放；下山索道运营需复查。')
add('整理/导出：2026-10-23。行程来源资料查询：2026-10-21。车票与酒店未代订，运行时刻待核实；时间与费用属于规划估算。','small')
# 2
new();title('02','路线地图与使用边界')
add('常州-泰安，全程往返','h2')
story.append(Image(str(ROOT/'tmp/pdfs/taishan-all.png'),width=CW,height=CW*400/960))
add('高德实际底图；城市间虚线表示高铁方向，不是列车实际轨迹。常州站与常州北须按最终车次选择。','small')
add('泰山夜爬与下山区段','h2')
story.append(Image(str(ROOT/'tmp/pdfs/taishan-mountain.png'),width=CW,height=CW*400/960))
add('红门 → 万仙楼 → 斗母宫 → 壶天阁 → 中天门 → 云步桥 → 五大夫松 → 十八盘 → 南天门 → 天街/开放观日区。下山：中天门索道上站 → 中天门 → 天外村。','body')
add('图为2026-10-23截图，标记来自高德地点查询；细虚线仅为地点连接，不能当作开放步道或实际道路导航。酒店与观日区是区域参考。图内路况颜色为截图时当前路况，不是11月6-8日预测。','small')
# 3
new();d=DATA['days'][0];title('03','11月6日 周五 | 抵达与夜爬起步')
callout('住宿：'+d['stay']['area']+'。入住后先吃饭、短休，再出发；大行李留房间。')
timeline(d['timeline'])
add('餐饮与体力安排','h2');add(d['food']);day_budget(d);add(d['planB'],'small');add('23:00至次日00:20的最后一段跨零点，后续接下一页。按最慢者节奏，休息也计入7-8小时夜爬预留。','small')
# 4
new();d=DATA['days'][1];title('04','11月7日 周六 | 夜爬、日出与下山')
timeline(d['timeline'][:9])
add('观日与拍照','h2');add(d['photo']);add('06:00-07:00为规划观日窗口，并非已核实的准确日出时刻；以临近景区预报和现场开放指引为准。','small')
# 5
new();title('05','11月7日 周六 | 补觉与轻松晚餐')
timeline(d['timeline'][9:])
callout('周六下午的优先级：连续补觉 > 清淡热食 > 附近散步。下山排队延误就顺延补觉，取消下午与夜间游览。')
add('吃什么、在哪里找','h2');add(d['food']);day_budget(d);add('为什么保留两晚酒店','h2');add(d['stay']['reason'])
add('中天门与索道停运时的决策','h2');add('中天门一起评估体力，不适就联系工作人员调整，不默认夜间有交通接走。若索道因强风等停运，先按工作人员安排在安全区域等候或评估开放步道下撤，保暖和体力优先。')
# 6
new();d=DATA['days'][2];title('06','11月8日 周日 | 岱庙与返程')
timeline(d['timeline'])
add('餐饮与拍照','h2');add(d['food']);add(d['photo']);day_budget(d);add(d['planB'],'small')
callout('取行李、市区交通、安检候车合计留约90分钟，并按实际车次倒推。泰安高铁站和市区泰山站不是同一车站。')
# 7
new();title('07','预算、预约与天气调整')
b=[sum(d['budget'][i] for d in DATA['days']) for i in range(10)]
labels=['住宿：两间房×两晚','交通：往返高铁/市区/景区','门票：普通成人参考','餐饮：四人全程','补给/租赁：四人']
rows=[['费用项目','四人合计预留']]
for i,label in enumerate(labels):rows.append([label,'¥'+str(b[i*2])+'-'+str(b[i*2+1])])
lo=sum(b[::2]);hi=sum(b[1::2]);rows.append(['全程合计','¥'+str(lo)+'-'+str(hi)])
table(rows,[CW-165,165]);add('人均约¥'+str(round(lo/4))+'-'+str(round(hi/4))+'，另留每人¥100-200机动金。高铁四人往返¥2,000-3,000仅作预算占位，不是实时报价。住宿按¥200-350/间夜估算。')
add('门票参考与未包含费用','h2');add('泰山普通票按115元/人，索道单程按100元/人，景区车按40元/人预留；官网与收费目录车价资料有差异，以实际官方结算为准。岱庙最多20元/人，先核对泰山订单权益。预算不含装备购置、购物、额外院落/体验及计划外住宿。')
add('办理与复查节点','h2');add('10月23日关注11月6日去程高铁，10月25日关注11月8日返程，具体按12306预售及起售时间。约10月31日起查看11月6日景区预约，以小程序可售日期和时段为准。11月3-5日查景区天气和运行通知，11月6日再复查。')
add('天气与Plan B','h2');add('本PDF未保存逐日有效预报，温度、降雨和山顶风力待临近更新。准备分层保暖、帽子手套、防滑鞋和雨衣；大风、雨雪结冰或夜间关闭时取消夜爬，调整为周六白天景区车+索道，并办理日期/入口退改。')
add('若确认11月6日午夜专线开行，可改乘车至中天门后徒步；仍需爬十八盘，应另核班次、入园时段及票价。四人状态不好时直接留酒店休息。','small')
# 8
new();title('08','四人轻装清单')
add('上山一个小包。个人物品每人一份；共用品一份；可选不计必备。可以在纸上勾选，也可用网页保存勾选。')
packrows=[[p('物品/归属','cellhead')]+[p('同行'+str(i+1),'cellhead')for i in range(4)]]
for item in DATA['packing']:
 scope={'personal':'每人自带','shared':'同行共用','optional':'可选'}[item['scope']]
 packrows.append([p(item['category']+' | '+item['label']+'\n'+scope,'cell')]+([Box() for _ in range(4)]if item['scope']=='personal' else [Box(),p('共用/按需','small'),'','']))
t=Table(packrows,colWidths=[CW-152,38,38,38,38],repeatRows=1);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BLUE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]));story.append(t)
add('头灯每人一盏，出发前试亮；保暖衣不要完全指望山上租赁。酒店换洗用品、大件行李留在房间。','small')
# 9
new();title('09','出发前检查与来源')
for i,(_,label) in enumerate(DATA['checks'],1):add(str(i)+'. '+label,'small')
add('网页与资料来源','h2')
for title_,url,published,note in DATA['sources']:
 add(link(url,title_)+'<br/>发布/版本：'+html.escape(published)+'；查询：2026-10-21。'+html.escape(norm(note)),'small',raw=True)
add('封面图片：'+link(DATA['photos'][0]['source'],'Pfctdayelise / 原图')+'；'+link(DATA['photos'][0]['licenseURL'],'CC BY-SA 2.5')+'。地图：高德底图，保留图内署名及审图信息。','small',raw=True)
add('泰山网页：'+link('https://uuurary.github.io/national-day-roadbook-2026/chapters/2026-11-taishan/','打开2026-11-泰山')+'；'+link('https://uuurary.github.io/national-day-roadbook-2026/chapters/2026-10-wannan/','皖南实际路书独立入口')+'。网页清单仅本浏览器保存，不跨设备同步。','small',raw=True)
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=48,bottomMargin=43,title='2026-11-泰山',author='旅行路书',subject='2026年11月6-8日四人泰山夜爬与周末行程')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(OUT);print(json.dumps({'file':str(OUT),'pages':len(reader.pages),'bytes':OUT.stat().st_size},ensure_ascii=False))
for i,page in enumerate(reader.pages,1):
 text=page.extract_text() or ''
 if len(text.strip())<20:raise RuntimeError('Unexpected empty page '+str(i))

