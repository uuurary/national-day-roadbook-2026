import {mkdir,copyFile,cp,access,writeFile} from 'node:fs/promises';
import {plan as archived} from '../data/plan.mjs';
import {plan} from '../data/actual-plan.mjs';
import * as taishan from '../data/taishan.mjs';
import {gcjToWgs} from '../coordinates.mjs';
import {readFile} from 'node:fs/promises';
import {validatePlan} from '../core.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['chapters.mjs','taishan-app.mjs','taishan.css','actual-view.mjs','map-presentation.mjs','coordinates.mjs','packing-list.txt','index.html','app.js','gallery.mjs','core.mjs','itinerary-map.mjs','amap-map.mjs','map-config.json','style.css','favicon.svg','LICENSE','NOTICE.md','README.md','site-config.json','.nojekyll'];
validatePlan(plan);
await writeFile(path.join(root,'data','archive-plan.json'),JSON.stringify(archived,null,2)+'\n','utf8');
const coords=JSON.parse(await readFile(path.join(root,'data','amap-coordinates.json'),'utf8'));
for(const p of Object.values({...plan.pois,...taishan.pois})){const [lng,lat]=gcjToWgs(p.gcj);coords.points[[lat,lng].join(',')]=p.gcj;}
await writeFile(path.join(root,'data','amap-coordinates.json'),JSON.stringify(coords)+'\n','utf8');
await writeFile(path.join(root,'data','plan.json'),JSON.stringify(plan,null,2)+'\n','utf8');
const photos=JSON.parse(await readFile(path.join(root,'data','taishan-gallery.json'),'utf8'));
if(photos.length!==5||taishan.days.length!==3)throw Error('Taishan chapter incomplete');
await writeFile(path.join(root,'data','taishan.json'),JSON.stringify({...taishan,photos},null,2)+'\n','utf8');
const packText=taishan.chapter.title+' · 轻装清单\n11月6—8日，四人高铁往返；个人物品每人一份，共用品一份。\n\n'+taishan.packing.map(p=>'[ ] '+p.category+'｜'+({personal:'每人自带',shared:'同行共用',optional:'可选'}[p.scope])+'｜'+p.label).join('\n')+'\n\n上山只背小包，大行李提前确认寄存；仅订11月7—8日两间一晚，上午提前入住另确认；临出发复查泰山景区天气和临时通知。\n';
await writeFile(path.join(root,'data','taishan-packing.txt'),packText,'utf8');
for(const f of files)await access(path.join(root,f));
await mkdir(path.join(root,'dist'),{recursive:true});
for(const f of files)await copyFile(path.join(root,f),path.join(root,'dist',f));
for(const f of ['data','vendor','assets','chapters'])await cp(path.join(root,f),path.join(root,'dist',f),{recursive:true});
await mkdir(path.join(root,'dist','output','pdf'),{recursive:true});
try{await copyFile(path.join(root,'output','pdf','2026-11-泰山.pdf'),path.join(root,'dist','output','pdf','2026-11-泰山.pdf'));}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Static site built in dist/. Public map configuration included; no server components.');
