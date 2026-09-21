// Scoped GitHub REST publication using an already-authorized local gh CLI.
// Never embeds or prints credentials. Requires an explicit expected remote HEAD.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const gh=process.env.GH_PATH||'gh',repo='uuurary/national-day-roadbook-2026';
const expected=process.env.EXPECTED_HEAD;if(!/^[a-f0-9]{40}$/.test(expected||''))throw new Error('EXPECTED_HEAD is required');
function api(endpoint,method='GET',body){const args=['api',endpoint,'--method',method];if(body)args.push('--input','-');const r=spawnSync(gh,args,{encoding:'utf8',input:body?JSON.stringify(body):undefined,maxBuffer:30*1024*1024,timeout:45000,windowsHide:true});if(r.status!==0)throw new Error(`${method} ${endpoint}: ${r.stderr||r.error}`);return r.stdout.trim()?JSON.parse(r.stdout):{};}
const head=api(`repos/${repo}/git/ref/heads/main`);if(head.object.sha!==expected)throw new Error('Remote changed; stop and review before publication');
const base=api(`repos/${repo}/git/commits/${expected}`);
const files=['index.html','app.js','core.mjs','style.css','package.json','README.md','NOTICE.md','site-config.json','data/plan.mjs','data/plan.json','assets/chengkan.jpg','assets/xiandu.jpg','scripts/build.mjs','scripts/serve.mjs','scripts/publish.mjs','tests/plan.test.mjs','tests/current-browser.cjs'];
const tree=[];for(const name of files){const buf=fs.readFileSync(path.join(root,name));if(name.endsWith('.jpg')){const blob=api(`repos/${repo}/git/blobs`,'POST',{content:buf.toString('base64'),encoding:'base64'});tree.push({path:name,mode:'100644',type:'blob',sha:blob.sha});}else tree.push({path:name,mode:'100644',type:'blob',content:buf.toString('utf8')});}
const built=api(`repos/${repo}/git/trees`,'POST',{base_tree:base.tree.sha,tree});
const commit=api(`repos/${repo}/git/commits`,'POST',{message:'Build responsive 2026 National Day itinerary with live weather and local checklists',tree:built.sha,parents:[expected]});
api(`repos/${repo}/git/refs/heads/main`,'PATCH',{sha:commit.sha,force:false});
console.log(JSON.stringify({repository:`https://github.com/${repo}`,commit:commit.sha,updatedFiles:files.length}));
