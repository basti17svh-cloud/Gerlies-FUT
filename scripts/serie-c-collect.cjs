/* Collect the 2026-27 Serie C squads from Wikipedia + Wikidata (runs in GitHub Actions; Wikipedia is not
   reachable from every network). Prints one JSON line per club ("SC|{...}") into the job log; the
   Footera rows are then built from that raw data by scripts/build-serie-c.cjs. Read-only: pushes nothing. */
'use strict';
const UA={'User-Agent':'FooteraSerieC/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){for(let i=0;;i++){try{const r=await fetch(url,{headers:UA});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){if(i>=4)throw e;await sleep(1000*2**i)}}}
const wiki=(lang,params)=>get(`https://${lang}.wikipedia.org/w/api.php?format=json&formatversion=2&redirects=1&`+new URLSearchParams(params));
const wikitext=async(lang,title)=>{try{const j=await wiki(lang,{action:'parse',page:title,prop:'wikitext'});return {title:j.parse?.title||title,text:j.parse?.wikitext||''}}catch(e){return {title,text:''}}};
const CLUBS=require('./serie-c-clubs.json');
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function links(text){const out=[];for(const m of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g))out.push({target:m[1].trim(),label:(m[2]||m[1]).trim()});return out}
function sections(text){const parts=[];let cur={head:'',body:''};for(const line of text.split('\n')){const h=line.match(/^(={2,4})\s*(.*?)\s*\1\s*$/);if(h){parts.push(cur);cur={head:h[2],level:h[1].length,body:''}}else cur.body+=line+'\n'}parts.push(cur);return parts}
function params(tpl){const o={};let depth=0,buf='',list=[];for(let i=0;i<tpl.length;i++){const c=tpl[i],d=tpl.slice(i,i+2);if(d==='[['||d==='{{'){depth++;buf+=d;i++;continue}if(d===']]'||d==='}}'){depth--;buf+=d;i++;continue}if(c==='|'&&depth===0){list.push(buf);buf='';continue}buf+=c}list.push(buf);list.shift();for(const p of list){const k=p.indexOf('=');if(k>0)o[p.slice(0,k).trim().toLowerCase()]=p.slice(k+1).trim()}return o}
function templates(text,names){const out=[],re=new RegExp('\\{\\{\\s*(?:'+names.join('|')+')\\s*\\|','gi');let m;while((m=re.exec(text))){let depth=0,i=m.index;for(;i<text.length;i++){if(text.startsWith('{{',i)){depth++;i++}else if(text.startsWith('}}',i)){depth--;i++;if(depth===0)break}}out.push(text.slice(m.index+2,i-1));re.lastIndex=i}return out}
const linkName=v=>{const l=links(v||'')[0];return l?{title:l.target,name:l.label.replace(/\s*\(.*?\)\s*$/,'')}:{title:'',name:String(v||'').replace(/<[^>]+>|\{\{[^}]*\}\}|'''?/g,'').trim()}};
function squadEn(text){
 const secs=sections(text);let picked=secs.filter(s=>/squad|players|rosa/i.test(s.head)&&!/loan|youth|primavera|under|reserve|former|notable|retired|women|staff|out/i.test(s.head));
 if(!picked.length)return[];
 const body=picked.map(s=>s.body).join('\n');
 return templates(body,['Fs player','football squad player','Fs2 player']).map(params).map(p=>({...linkName(p.name),no:p.no||'',nat:p.nat||'',pos:p.pos||'',captain:/captain|\(c\)|vice/i.test(p.other||'')}));
}
function squadIt(text){
 const secs=sections(text);const picked=secs.filter(s=>/^(rosa|organico)/i.test(s.head)&&!/prestito|giovanil|primavera/i.test(s.head));
 const body=(picked.length?picked:secs.filter(s=>/rosa/i.test(s.head))).map(s=>s.body).join('\n');
 return templates(body,['Calciatore in rosa','Calciatore rosa']).map(params).map(p=>({...linkName(p.nome||p.name),no:p.n||p.numero||'',nat:p.nazione||p.nat||'',pos:p.ruolo||'',captain:/capitano|\(c\)/i.test(p.altro||p.note||'')}));
}
async function crest(lang,text){
 const f=(text.match(/\|\s*(?:image|logo|immagine|stemma|scudetto)\s*=\s*(?:\[\[)?(?:File:|Image:|Immagine:|file:)?([^|\]\n<{}]+\.(?:png|svg|jpe?g|webp|gif))/i)||[])[1];if(!f)return'';
 try{const j=await wiki(lang,{action:'query',prop:'imageinfo',iiprop:'url',iiurlwidth:160,titles:'File:'+f.trim()});return j.query?.pages?.[0]?.imageinfo?.[0]?.thumburl||''}catch(e){return''}
}
async function qids(lang,titles){const out={};for(let i=0;i<titles.length;i+=50){const j=await wiki(lang,{action:'query',prop:'pageprops',ppprop:'wikibase_item',titles:titles.slice(i,i+50).join('|')});const map={};for(const n of j.query?.normalized||[])map[n.to]=n.from;for(const r of j.query?.redirects||[])map[r.to]=map[r.from]||r.from;for(const p of j.query?.pages||[]){const q=p.pageprops?.wikibase_item;if(q){out[p.title]=q;if(map[p.title])out[map[p.title]]=q}}}return out}
const LABELS={};
async function wikidata(ids){const out={};for(let i=0;i<ids.length;i+=50){const j=await get('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=claims|labels&languages=en&ids='+ids.slice(i,i+50).join('|'));for(const[id,e]of Object.entries(j.entities||{})){const c=e.claims||{};const val=p=>(c[p]||[]).map(x=>x.mainsnak?.datavalue?.value).filter(Boolean);out[id]={pos:val('P413').map(v=>v.id),dob:(val('P569')[0]?.time||'').slice(1,11),cit:val('P27').map(v=>v.id),foot:val('P552').map(v=>v.id),height:(val('P2048')[0]?.amount||''),label:e.labels?.en?.value||''}}}return out}
async function labels(ids){ids=ids.filter(x=>!LABELS[x]);for(let i=0;i<ids.length;i+=50){const j=await get('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=labels&languages=en&ids='+ids.slice(i,i+50).join('|'));for(const[id,e]of Object.entries(j.entities||{}))LABELS[id]=e.labels?.en?.value||id}}
(async()=>{
 const seasonEn=await wikitext('en','2026–27 Serie C');const enLinks=links(seasonEn.text);
 let total=0;
 for(const club of CLUBS){
  let enTitle=club.en||(enLinks.find(l=>norm(l.label)===norm(club.name))||{}).target||'';
  if(!enTitle){const s=await wiki('en',{action:'query',list:'search',srlimit:1,srsearch:`${club.name} ${club.city} football club`});enTitle=s.query?.search?.[0]?.title||''}
  let en=enTitle?await wikitext('en',enTitle):{title:'',text:''};
  let itTitle='';try{const j=await wiki('en',{action:'query',prop:'langlinks',lllang:'it',titles:en.title});itTitle=j.query?.pages?.[0]?.langlinks?.[0]?.title||''}catch(e){}
  if(club.it)itTitle=club.it;
  const it=itTitle?await wikitext('it',itTitle):{title:'',text:''};
  const itSeason=itTitle?await wikitext('it',`${itTitle} 2026-2027`):{title:'',text:''};
  const cands=[['it-season',squadIt(itSeason.text),'it'],['en',squadEn(en.text),'en'],['it',squadIt(it.text),'it']];
  const best=cands.find(c=>c[1].length>=16)||cands.sort((a,b)=>b[1].length-a[1].length)[0];
  const [source,players,lang]=best;
  const q=await qids(lang,players.map(p=>p.title).filter(Boolean));
  const wd=await wikidata([...new Set(Object.values(q))]);
  await labels([...new Set(Object.values(wd).flatMap(x=>[...x.pos,...x.cit.slice(0,1),...x.foot]))]);
  for(const p of players){const id=q[p.title];const d=id&&wd[id];if(d){p.qid=id;p.wdPos=d.pos.map(x=>LABELS[x]);p.dob=d.dob;p.cit=d.cit.slice(0,1).map(x=>LABELS[x]);p.foot=d.foot.map(x=>LABELS[x]);p.height=d.height}}
  const logo=await crest('en',en.text)||await crest('it',it.text);
  total+=players.length;
  console.log('SC|'+JSON.stringify({club:club.name,group:club.group,city:club.city,en:en.title,it:itTitle,itSeason:itSeason.text?itSeason.title:'',source,counts:cands.map(c=>c[0]+':'+c[1].length).join(' '),logo,players}));
  await sleep(200);
 }
 console.log('TOTAL',total);
})().catch(e=>{console.error(e);process.exit(1)});
