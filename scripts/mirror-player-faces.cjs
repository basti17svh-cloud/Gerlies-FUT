/* Copy every player portrait once into Footera's own Supabase storage (public bucket "player-faces").
   Runs in GitHub Actions (futwiz, fut.gg and EA are not reachable from every network):
     node scripts/mirror-player-faces.cjs
   The game loads <bucket>/faces/<EA id>.webp (and icons/<EA id>.webp for Icons) first and falls back
   to the old external sources when a file is missing, so a partial run never breaks a card.
   Each portrait is taken from the same source the game would show (futwiz FC27 first, then the older
   futwiz seasons, EA's own portrait, SoFIFA), shrunk to at most 256 px and stored as WebP.
   Already mirrored files are skipped, so every run only fetches new players.
   Env: SUPABASE_ACCESS_TOKEN (+ SUPABASE_PROJECT_REF) or SUPABASE_SERVICE_KEY,
        MIRROR_LIMIT (max uploads per run), MIRROR_FORCE=1 (re-upload everything). */
'use strict';
const fs=require('fs'),path=require('path');
const sharp=require('sharp');

const ROOT=path.join(__dirname,'..');
const REF=process.env.SUPABASE_PROJECT_REF||'idxydyrihtyecvfjvtuk';
const URL_BASE=`https://${REF}.supabase.co`;
const BUCKET='player-faces';
const LIMIT=Number(process.env.MIRROR_LIMIT||25000);
const FORCE=process.env.MIRROR_FORCE==='1';
const PARALLEL=8,MAX_SIDE=256;
const HEADERS={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept':'image/avif,image/webp,image/png,image/*;q=0.8'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function csvRow(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out}
const futwiz=id=>[27,26,25].map(v=>`https://cdn.futwiz.com/assets/img/fc${v}/faces/${id}.png`);
const sofifa=id=>{const n=String(id).padStart(6,'0');return n.length===6?[27,26,25,24].map(v=>`https://cdn.sofifa.net/players/${n.slice(0,3)}/${n.slice(3)}/${v}_120.png`):[]};

// Same order as portraitCandidates() in footera-app.js.
function playerJobs(){
 const [head,...lines]=fs.readFileSync(path.join(ROOT,'assets','players-db.csv'),'utf8').split(/\r?\n/).filter(Boolean);
 const cols=csvRow(head),ID=cols.indexOf('player_id'),FACE=cols.indexOf('player_face_url');
 const jobs=new Map();
 for(const line of lines){
  const row=csvRow(line),id=String(row[ID]||'').replace(/\D/g,'');
  if(!id||jobs.has(`faces/${id}.webp`))continue;
  jobs.set(`faces/${id}.webp`,[...futwiz(id),row[FACE],...sofifa(id)].filter(Boolean));
 }
 return jobs
}
// Icons: the fut.gg portrait listed in MID_ICON_DATA, then futwiz.
function iconJobs(){
 const src=fs.readFileSync(path.join(ROOT,'footera-app.js'),'utf8'),jobs=new Map();
 for(const m of src.matchAll(/,(\d+),\[[\d,]*\],\[[\d,]*\],\d,\d,"(?:Left|Right)","(https:\/\/game-assets\.fut\.gg\/[^"]+)"/g))
  jobs.set(`icons/${m[1]}.webp`,[m[2],...futwiz(m[1])]);
 for(const m of src.matchAll(/team:"ICON",face:"https:\/\/cdn\.futwiz\.com\/[^"]+",futwizId:"(\d+)"/g))
  if(!jobs.has(`icons/${m[1]}.webp`))jobs.set(`icons/${m[1]}.webp`,futwiz(m[1]));
 return jobs
}

async function serviceKey(){
 if(process.env.SUPABASE_SERVICE_KEY)return process.env.SUPABASE_SERVICE_KEY;
 const token=process.env.SUPABASE_ACCESS_TOKEN;
 if(!token)throw new Error('Set SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_KEY');
 const res=await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,{headers:{Authorization:`Bearer ${token}`}});
 if(!res.ok)throw new Error(`Supabase API keys: HTTP ${res.status}`);
 const keys=await res.json();
 const key=keys.find(k=>k.name==='service_role'&&k.api_key)||keys.find(k=>k.type==='secret'&&k.api_key);
 if(!key)throw new Error('No service key found for the project');
 return key.api_key
}

async function existing(auth){
 const have=new Set();
 for(const prefix of ['faces','icons']){
  for(let offset=0;;offset+=1000){
   const res=await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}})});
   if(!res.ok)throw new Error(`List ${prefix}: HTTP ${res.status} ${await res.text()}`);
   const rows=await res.json();
   rows.forEach(r=>r.id&&have.add(`${prefix}/${r.name}`));
   if(rows.length<1000)break
  }
 }
 return have
}

async function download(url){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(15000)});
   if(res.status===404||res.status===403||res.status===410)return null;
   if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const buf=Buffer.from(await res.arrayBuffer());
   const meta=await sharp(buf).metadata();
   if(!meta.width||meta.width<24||meta.height<24)return null;
   return sharp(buf).resize({width:MAX_SIDE,height:MAX_SIDE,fit:'inside',withoutEnlargement:true}).webp({quality:82,alphaQuality:90,effort:5}).toBuffer()
  }catch(e){if(/unsupported image|Input buffer/i.test(e.message))return null;await sleep(800*2**attempt)}
 }
 return null
}

async function upload(auth,name,body){
 for(let attempt=0;attempt<4;attempt++){
  const res=await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${name}`,{method:'POST',headers:{...auth,'Content-Type':'image/webp','Cache-Control':'max-age=2592000','x-upsert':'true'},body});
  if(res.ok)return true;
  if(res.status<500&&res.status!==429)throw new Error(`Upload ${name}: HTTP ${res.status} ${await res.text()}`);
  await sleep(1000*2**attempt)
 }
 return false
}

async function main(){
 const key=await serviceKey(),auth={apikey:key,Authorization:`Bearer ${key}`};
 const jobs=new Map([...iconJobs(),...playerJobs()]);
 const have=FORCE?new Set():await existing(auth);
 const todo=[...jobs].filter(([name])=>!have.has(name)).slice(0,LIMIT);
 console.log(`${jobs.size} portraits known, ${have.size} already mirrored, ${todo.length} to fetch now`);
 const stats={uploaded:0,missing:0,bytes:0,hosts:{}};const missing=[];
 let next=0;
 async function worker(){
  while(next<todo.length){
   const [name,sources]=todo[next++];
   let done=false;
   for(const src of sources){
    const webp=await download(src);
    if(!webp)continue;
    if(await upload(auth,name,webp)){stats.uploaded++;stats.bytes+=webp.length;const h=new URL(src).host;stats.hosts[h]=(stats.hosts[h]||0)+1;done=true}
    break
   }
   if(!done){stats.missing++;missing.push(name)}
   const n=stats.uploaded+stats.missing;if(n%500===0)console.log(`${n}/${todo.length} (${stats.uploaded} stored)`)
  }
 }
 await Promise.all(Array.from({length:PARALLEL},worker));
 const mb=(stats.bytes/1048576).toFixed(1);
 const summary=[`### Spielerbilder im eigenen Speicher`,``,`- bekannt: ${jobs.size}`,`- schon vorhanden: ${have.size}`,`- neu gespeichert: ${stats.uploaded} (${mb} MB)`,`- ohne Bild in jeder Quelle: ${stats.missing}`,`- Quellen: ${Object.entries(stats.hosts).map(([h,n])=>`${h} ${n}`).join(', ')||'-'}`,missing.length?`- Beispiele ohne Bild: ${missing.slice(0,20).join(', ')}`:''].join('\n');
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
 // Every source blocked at once means the runner is being refused, not that players have no picture.
 if(todo.length>=50&&stats.uploaded===0)throw new Error('No portrait could be downloaded from any source');
}
main().catch(e=>{console.error(e);process.exit(1)});
