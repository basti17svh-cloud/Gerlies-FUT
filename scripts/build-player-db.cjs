/* Build assets/players-db.csv from EA's FC rating database (drop-api.ea.com).
   Runs in GitHub Actions (EA's API is not reachable from every network): node scripts/build-player-db.cjs
   Columns are the ones normCSV() in footera-app.js reads. A short or implausible download never
   replaces the checked-in file. */
'use strict';
const fs=require('fs'),path=require('path');

const API='https://drop-api.ea.com/rating/ea-sports-fc';
const OUT=path.join(__dirname,'..','assets','players-db.csv');
// The game compares this revision with its offline copy and downloads the new file only when it changed.
const VERSION_OUT=path.join(__dirname,'..','assets','players-db-version.json');
const PAGE=100,PARALLEL=6;
const MIN_MEN=10000,MIN_WOMEN=1000;
// EA ships some clubs under licence names; the game shows the real clubs.
const CLUB_ALIASES={'Lombardia FC':'Inter','Milano FC':'AC Milan','Bergamo Calcio':'Atalanta','Latium':'Lazio','Piemonte Calcio':'Juventus','OM':'Olympique de Marseille'};
const COLUMNS=['player_id','common_name','short_name','long_name','positions','overall','pace','shooting','passing','dribbling','defending','physic',
 'preferred_foot','weak_foot','skill_moves','nationality_name','nationality_id','nation_flag_url','club_name','club_team_id','club_logo_url',
 'league_name','player_face_url','playstyles','playstyles_plus','gender'];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function page(gender,offset){
 const url=`${API}?locale=en&gender=${gender}&limit=${PAGE}&offset=${offset}`;
 for(let attempt=0;;attempt++){
  try{
   const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Footera player database)','Accept':'application/json'}});
   if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const data=await res.json();
   return {items:Array.isArray(data.items)?data.items:[],total:Number(data.totalItems||0)};
  }catch(e){if(attempt>=5)throw new Error(`${url}: ${e.message}`);await sleep(Math.min(16000,1000*2**attempt))}
 }
}
async function allPlayers(gender){
 const first=await page(gender,0),items=[...first.items],offsets=[];
 for(let o=PAGE;o<first.total;o+=PAGE)offsets.push(o);
 const pages=new Map();
 for(let i=0;i<offsets.length;i+=PARALLEL){
  const batch=offsets.slice(i,i+PARALLEL);
  const got=await Promise.all(batch.map(o=>page(gender,o)));
  batch.forEach((o,k)=>pages.set(o,got[k].items));
  await sleep(150);
 }
 for(const o of offsets)items.push(...pages.get(o));
 return {items,total:first.total};
}

const label=v=>v&&typeof v==='object'?String(v.label??v.name??'').trim():String(v??'').trim();
const statValue=(stats,key)=>{const v=stats?.[key];return Number(v&&typeof v==='object'?v.value:v)||0};
function abilities(list){
 const normal=[],plus=[];
 for(const a of Array.isArray(list)?list:[]){
  const name=label(a).replace(/\s*\+$/,'');if(!name)continue;
  const kind=String(a?.type?.id??a?.type?.label??a?.type??'').toLowerCase();
  (kind.includes('plus')||/\+$/.test(label(a))?plus:normal).push(name);
 }
 return {normal,plus};
}
function row(p){
 const first=String(p.firstName??'').trim(),last=String(p.lastName??'').trim(),common=String(p.commonName??'').trim();
 const full=[first,last].filter(Boolean).join(' ');
 const eaTeam=label(p.team),team=CLUB_ALIASES[eaTeam]||eaTeam;
 const pos=[label(p.position&&p.position.shortLabel)||label(p.position)];
 for(const alt of Array.isArray(p.alternatePositions)?p.alternatePositions:[])pos.push(String(alt?.shortLabel??alt?.label??'').trim());
 const s=p.stats||{},ab=abilities(p.playerAbilities);
 return {
  player_id:p.id,common_name:common,short_name:common||full,long_name:full||common,
  positions:[...new Set(pos.map(x=>x.toUpperCase()).filter(Boolean))].join(','),
  overall:p.overallRating,pace:statValue(s,'pac'),shooting:statValue(s,'sho'),passing:statValue(s,'pas'),
  dribbling:statValue(s,'dri'),defending:statValue(s,'def'),physic:statValue(s,'phy'),
  preferred_foot:Number(p.preferredFoot)===2?'Left':Number(p.preferredFoot)===1?'Right':'',
  weak_foot:p.weakFootAbility??'',skill_moves:p.skillMoves??'',
  nationality_name:label(p.nationality),nationality_id:p.nationality?.id??'',nation_flag_url:p.nationality?.imageUrl??'',
  club_name:team,club_team_id:p.team?.id??'',club_logo_url:team===eaTeam?(p.team?.imageUrl??''):'',
  league_name:String(p.leagueName??'').trim(),player_face_url:p.avatarUrl??'',
  playstyles:ab.normal.join(', '),playstyles_plus:ab.plus.join(', '),gender:label(p.gender)
 };
}
const cell=v=>{const t=String(v??'').replace(/[\r\n]+/g,' ');return /[",]/.test(t)?`"${t.replace(/"/g,'""')}"`:t};

function check(rows,men,women){
 const fail=[];
 if(men<MIN_MEN)fail.push(`only ${men} men`);
 if(women<MIN_WOMEN)fail.push(`only ${women} women`);
 const ids=new Set(rows.map(r=>String(r.player_id)));if(ids.size!==rows.length)fail.push(`${rows.length-ids.size} duplicate ids`);
 const bad=rows.filter(r=>!r.player_id||!r.short_name||!(r.overall>=40&&r.overall<=99)||!r.positions).length;
 if(bad>rows.length*.02)fail.push(`${bad} incomplete rows`);
 for(const[id,name]of[[231747,'Mbappé'],[239085,'Haaland'],[277643,'Yamal']]){
  const r=rows.find(x=>Number(x.player_id)===id);if(!r||r.overall<85)fail.push(`${name} missing or below 85`);
 }
 // Cards show the name fans use. EA keeps it in commonName; without it Raphinha would read "Raphael Dias Belloli".
 for(const[id,name]of[[233419,'Raphinha'],[231866,'Rodri'],[243812,'Rodrygo'],[238794,'Vini Jr.']]){
  const r=rows.find(x=>Number(x.player_id)===id);if(r&&r.short_name!==name)fail.push(`${name} is called "${r.short_name}"`);
 }
 const leagues={};for(const r of rows)if(!/women/i.test(r.gender))leagues[r.league_name]=(leagues[r.league_name]||0)+1;
 for(const l of['Bundesliga','Premier League','LALIGA EA SPORTS'])if((leagues[l]||0)<300)fail.push(`${l}: ${leagues[l]||0}`);
 for(const prefix of['Serie A','Ligue 1']){const n=Object.entries(leagues).filter(([k])=>k.startsWith(prefix)&&!/serie b/i.test(k)).reduce((a,[,v])=>a+v,0);if(n<300)fail.push(`${prefix}: ${n}`)}
 return {fail,leagues};
}

(async()=>{
 const [men,women]=await Promise.all([allPlayers(0),allPlayers(1)]);
 console.log(`EA reports ${men.total} men and ${women.total} women; downloaded ${men.items.length} + ${women.items.length}`);
 const sample=men.items.find(p=>Array.isArray(p.playerAbilities)&&p.playerAbilities.length);
 if(sample)console.log('Sample playerAbilities',JSON.stringify(sample.playerAbilities.slice(0,3)));
 const seen=new Set(),rows=[];
 for(const p of[...men.items,...women.items]){if(p?.id==null||seen.has(String(p.id)))continue;seen.add(String(p.id));rows.push(row(p))}
 rows.sort((a,b)=>b.overall-a.overall||Number(a.player_id)-Number(b.player_id));
 const{fail,leagues}=check(rows,men.items.length,women.items.length);
 console.log('Top leagues',JSON.stringify(Object.entries(leagues).sort((a,b)=>b[1]-a[1]).slice(0,12)));
 console.log('Licence names replaced',JSON.stringify(Object.fromEntries(Object.keys(CLUB_ALIASES).map(k=>[k,men.items.filter(p=>label(p.team)===k).length]))));
 if(fail.length||men.items.length<men.total*.98||women.items.length<women.total*.98){
  console.error('Not writing the player database:',fail.join('; ')||'incomplete download');process.exit(1);
 }
 const csv=[COLUMNS.join(','),...rows.map(r=>COLUMNS.map(c=>cell(r[c])).join(','))].join('\n')+'\n';
 fs.writeFileSync(OUT,csv);
 fs.writeFileSync(VERSION_OUT,JSON.stringify({revision:require('crypto').createHash('sha256').update(csv).digest('hex').slice(0,16),players:rows.length})+'\n');
 console.log(`Wrote ${rows.length} players (${(csv.length/1048576).toFixed(1)} MB) to assets/players-db.csv`);
})().catch(e=>{console.error(e);process.exit(1)});
