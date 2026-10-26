/* Build assets/players-db.csv from EA's official ratings site (www.ea.com/games/ea-sports-fc/ratings).
   Runs in GitHub Actions (EA is not reachable from every network): node scripts/build-player-db.cjs
   drop-api.ea.com/rating/ea-sports-fc still serves the previous game (FC 26: Lewandowski at Barcelona),
   so the players come from the ratings page's own data route, which serves the current game.
   Columns are the ones normCSV() in footera-app.js reads. A short or implausible download never
   replaces the checked-in file. */
'use strict';
const fs=require('fs'),path=require('path');

const SITE='https://www.ea.com',PAGE_PATH='/en/games/ea-sports-fc/ratings';
// The game the ratings page must show. Raise it when EA switches the page to the next FC.
const GAME='fc-27';
const OUT=path.join(__dirname,'..','assets','players-db.csv');
// The game compares this revision with its offline copy and downloads the new file only when it changed.
const VERSION_OUT=path.join(__dirname,'..','assets','players-db-version.json');
const PARALLEL=6;
const MIN_MEN=10000,MIN_WOMEN=1000;
// EA ships some clubs under licence names; the game shows the real clubs.
const CLUB_ALIASES={'Lombardia FC':'Inter','Milano FC':'AC Milan','Bergamo Calcio':'Atalanta','Latium':'Lazio','Piemonte Calcio':'Juventus','OM':'Olympique de Marseille'};
// Transfers EA's ratings site has not picked up yet: EA id -> club. Remove an entry once EA shows the club itself.
const CLUB_OVERRIDES={264652:{"club_name":"Liverpool","club_team_id":"9","club_logo_url":"https://drop-assets.ea.com/images/3mmzooNXBDCKuCy6kWcGQo/2e332a30fe2a7225a88fcb1898f48bbf/l9.png","league_name":"Premier League"},232411:{club_name:'RB Leipzig',club_team_id:112172,club_logo_url:'https://drop-assets.ea.com/images/1EoW6b2VkhiP3S0vqikd9s/f181f899a2037360f70a9a8aba18af30/l112172.png',league_name:'Bundesliga'}}; // Nkunku
const COLUMNS=['player_id','common_name','short_name','long_name','positions','overall','pace','shooting','passing','dribbling','defending','physic',
 'preferred_foot','weak_foot','skill_moves','nationality_name','nationality_id','nation_flag_url','club_name','club_team_id','club_logo_url',
 'league_name','player_face_url','playstyles','playstyles_plus','gender'];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const HEADERS={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept':'application/json,text/html'};
async function fetchText(url){
 for(let attempt=0;;attempt++){
  try{
   const res=await fetch(url,{headers:HEADERS});
   if(!res.ok)throw new Error(`HTTP ${res.status}`);
   return await res.text();
  }catch(e){if(attempt>=5)throw new Error(`${url}: ${e.message}`);await sleep(Math.min(16000,1000*2**attempt))}
 }
}
// The page is a Next.js app: its build id names the JSON route that returns one page of 100 players.
async function buildId(){
 const html=await fetchText(SITE+PAGE_PATH.replace(/^\/en/,''));
 const m=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!m)throw new Error('ratings page has no __NEXT_DATA__');
 const data=JSON.parse(m[1]),game=data.props?.pageProps?.gameDetails?.slug;
 if(game!==GAME)throw new Error(`ratings page shows ${game}, expected ${GAME}`);
 return data.buildId;
}
async function page(id,n){
 const props=JSON.parse(await fetchText(`${SITE}/_next/data/${id}${PAGE_PATH}.json?page=${n}`)).pageProps||{};
 const game=props.gameDetails?.slug;if(game!==GAME)throw new Error(`page ${n} shows ${game}, expected ${GAME}`);
 const d=props.ratingDetails||{};
 return {items:Array.isArray(d.items)?d.items:[],total:Number(d.totalItems||0)};
}
async function allPlayers(){
 const id=await buildId(),first=await page(id,1),items=[...first.items],numbers=[];
 const per=first.items.length||100;
 for(let n=2;(n-1)*per<first.total;n++)numbers.push(n);
 const pages=new Map();
 for(let i=0;i<numbers.length;i+=PARALLEL){
  const batch=numbers.slice(i,i+PARALLEL);
  const got=await Promise.all(batch.map(n=>page(id,n)));
  batch.forEach((n,k)=>pages.set(n,got[k].items));
  await sleep(150);
 }
 for(const n of numbers)items.push(...pages.get(n));
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
 const all=await allPlayers(),isWomen=p=>Number(p?.gender?.id)===1||/women/i.test(label(p?.gender));
 const men={items:all.items.filter(p=>!isWomen(p))},women={items:all.items.filter(isWomen)};
 console.log(`EA ${GAME} lists ${all.total} players; downloaded ${men.items.length} men + ${women.items.length} women`);
 const sample=men.items.find(p=>Array.isArray(p.playerAbilities)&&p.playerAbilities.length);
 if(sample)console.log('Sample playerAbilities',JSON.stringify(sample.playerAbilities.slice(0,3)));
 const seen=new Set(),rows=[];
 for(const p of[...men.items,...women.items]){if(p?.id==null||seen.has(String(p.id)))continue;seen.add(String(p.id));rows.push({...row(p),...CLUB_OVERRIDES[p.id]})}
 rows.sort((a,b)=>b.overall-a.overall||Number(a.player_id)-Number(b.player_id));
 const{fail,leagues}=check(rows,men.items.length,women.items.length);
 console.log('Top leagues',JSON.stringify(Object.entries(leagues).sort((a,b)=>b[1]-a[1]).slice(0,12)));
 console.log('Licence names replaced',JSON.stringify(Object.fromEntries(Object.keys(CLUB_ALIASES).map(k=>[k,men.items.filter(p=>label(p.team)===k).length]))));
 if(fail.length||all.items.length<all.total*.98){
  console.error('Not writing the player database:',fail.join('; ')||'incomplete download');process.exit(1);
 }
 const csv=[COLUMNS.join(','),...rows.map(r=>COLUMNS.map(c=>cell(r[c])).join(','))].join('\n')+'\n';
 fs.writeFileSync(OUT,csv);
 fs.writeFileSync(VERSION_OUT,JSON.stringify({game:GAME,revision:require('crypto').createHash('sha256').update(csv).digest('hex').slice(0,16),players:rows.length})+'\n');
 console.log(`Wrote ${rows.length} players (${(csv.length/1048576).toFixed(1)} MB) to assets/players-db.csv`);
})().catch(e=>{console.error(e);process.exit(1)});
