// Licensed Commons file pages verified on 2026-10-21; no dependency on the live Commons API.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),crypto=require('node:crypto');
const photos=[
 ['Sunrise at Mt Tai.JPG','泰山 · 清晨日出','2005','Pfctdayelise','CC BY-SA 2.5','https://creativecommons.org/licenses/by-sa/2.5/'],
 ['A view from Mount Tai.jpg','泰山 · 层叠群山','2023','Jari Kirma','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],
 ['泰山南天门-20160718.jpg','泰山 · 南天门','2016','Antigng','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],
 ['泰山 南天门.jpg','泰山 · 十八盘石阶','2008','Charlie fong','Public domain','https://commons.wikimedia.org/wiki/File:'+encodeURIComponent('泰山_南天门.jpg')],
 ['岱庙 - panoramio.jpg','泰安 · 岱庙古建','2014','空之境界','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/']
];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const p=await b.newPage({ignoreHTTPSErrors:true}),manifest=[];
for(const [i,[name,title,year,author,license,licenseURL]]of photos.entries()){
 const file=name.replaceAll(' ','_'),hash=crypto.createHash('md5').update(file).digest('hex'),rel=hash[0]+'/'+hash.slice(0,2)+'/'+encodeURIComponent(file),src='assets/taishan-'+i+'.jpg';
 if(!fs.existsSync(src)){let done=false;for(const url of ['https://upload.wikimedia.org/wikipedia/commons/thumb/'+rel+'/1280px-'+encodeURIComponent(file),'https://upload.wikimedia.org/wikipedia/commons/'+rel]){try{const r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:25000});if(!r.ok()||!r.headers()['content-type']?.includes('image/'))continue;fs.writeFileSync(src,await r.body());done=true;break;}catch(e){console.log(e.message.split('\n')[0]);}}if(!done)throw Error('Could not download '+name);}
 manifest.push({src,title,alt:title+'，历史实景',year,author,license,licenseURL,source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file)});console.log(title);
}fs.writeFileSync('data/taishan-gallery.json',JSON.stringify(manifest,null,2)+'\n');}finally{await b.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
