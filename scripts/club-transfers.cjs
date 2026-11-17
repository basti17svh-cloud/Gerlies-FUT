/* Transfers EA's ratings site has not picked up: EA freezes the FC 27 squads before the transfer
   window closes (Leão moved to Galatasaray on 29.08.2026, EA still lists him at AC Milan).
   Wikidata (open data, edited quickly after official announcements) knows the moves. A move is used
   only when all of this holds:
   - the player's name matches the EA player and EA still shows the club he left (Wikidata lists it),
   - the new club started on or after TRANSFERS_SINCE and has no end date,
   - the new club exists in EA's own data for the same gender (its name, id, logo and league are copied
     from EA), so no unknown club is invented.
   The result is kept in data/club-transfers.json; when Wikidata is unreachable the last list is reused.
   Once EA shows the new club itself the entry no longer applies and drops out on its own. */
'use strict';
const fs=require('fs'),path=require('path');

const FILE=path.join(__dirname,'..','data','club-transfers.json');
const UA={'User-Agent':'FooteraClubCheck/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)','Accept':'application/sparql-results+json'};
const LOAN='Q2914547';
// EA's short club names -> the name Wikidata uses. Add one when a move is reported as unresolved.
const CLUB_NAME_ALIASES={
 'Spurs':'Tottenham Hotspur',"Nott'm Forest":'Nottingham Forest','Newcastle Utd':'Newcastle United','Man Utd':'Manchester United',
 'Manchester Utd':'Manchester United','Sheffield Utd':'Sheffield United','Sheffield Wed':'Sheffield Wednesday','Wolves':'Wolverhampton Wanderers',
 'Charlton Ath':'Charlton Athletic','QPR':'Queens Park Rangers','West Brom':'West Bromwich Albion','Brighton':'Brighton Hove Albion',
 'Ipswich':'Ipswich Town','Norwich':'Norwich City','Bolton':'Bolton Wanderers','Preston':'Preston North End','Hearts':'Heart of Midlothian',
 'OL':'Olympique Lyonnais','OL Lyonnes':'Olympique Lyonnais','Paris SG':'Paris Saint Germain','LOSC Lille':'Lille','Havre AC':'Le Havre',
 'Strasbourg':'Strasbourg Alsace','Angers SCO':'Angers','ESTAC Troyes':'Troyes',
 'FC Bayern München':'Bayern Munich','Frankfurt':'Eintracht Frankfurt','Leverkusen':'Bayer Leverkusen',"M'gladbach":'Borussia Monchengladbach',
 'Union Berlin':'Union Berlin','1. FSV Mainz 05':'Mainz 05',
 'Atlético de Madrid':'Atletico Madrid','Celta':'Celta Vigo','D. Alavés':'Alaves','R. Racing Club':'Racing Santander','RC Deportivo':'Deportivo Coruna',
 'Athletic Club':'Athletic Bilbao','CA Osasuna':'Osasuna',
 'Inter':'Inter Milan','SSC Napoli':'Napoli','SS Lazio':'Lazio','AS Roma':'Roma','Como':'Como 1907',
 'SL Benfica':'Benfica','Vitória SC':'Vitoria Guimaraes','Univ. Craiova':'Universitatea Craiova','Çorum Futbol Kulübü':'Corum',
 'N.E.C. Nijmegen':'NEC','PSV':'PSV Eindhoven','AZ':'AZ Alkmaar','R. Union St.-G.':'Union Saint Gilloise','Sp. Charleroi':'Charleroi',
 'STVV':'Sint Truidense','Al Fayha':'Al Feiha','Royal Antwerp FC':'Antwerp','FC Dinamo 1948':'Dinamo Bucharest','FC Rapid 1923':'Rapid Bucuresti',
 'CFR 1907 Cluj':'CFR Cluj','Omonia FC':'Omonia','Olympiacos FC':'Olympiacos','Feyenoord':'Feyenoord Rotterdam','RCD Espanyol':'Espanyol Barcelona'
};
const STOP=new Set('fc cf sc ac afc ssc sk fk sv vfl vfb tsg rc rcd cd ud sd ca club de do da del di football futbol futebol calcio s a as us ss the and 1 c f w wfc women ladies femenino feminino femminile frauen sfc sl'.split(' '));
const NATIONAL=/national|under-\d|\bu-?\d\d\b|olympic/i;
const words=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/ø/g,'o').replace(/ß/g,'ss').toLowerCase().replace(/\b([a-z])\.(?=[a-z]\.)/g,'$1').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean);
const clubKey=s=>words(CLUB_NAME_ALIASES[s]||s).filter(t=>!STOP.has(t)&&!/^\d+$/.test(t)).sort().join(' ');
const nameKey=s=>words(s).join(' ');
// EA's name uses only words of Wikidata's name ("Leverkusen" in "Bayer 04 Leverkusen", not "Santos Laguna" for "Santos").
function within(ea,wd){const x=clubKey(ea).split(' ').filter(Boolean),y=new Set(clubKey(wd).split(' ').filter(Boolean));return x.length>0&&x.every(t=>y.has(t))}
// Same club when one name's words contain the other's ("West Ham" = "West Ham United").
function sameClub(a,b){
 const x=clubKey(a).split(' ').filter(Boolean),y=clubKey(b).split(' ').filter(Boolean);
 if(!x.length||!y.length)return false;
 const [s,l]=x.length<=y.length?[x,new Set(y)]:[y,new Set(x)];
 return s.every(t=>l.has(t));
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sparql(q){
 for(let a=0;;a++){
  try{
   const r=await fetch('https://query.wikidata.org/sparql',{method:'POST',headers:{...UA,'Content-Type':'application/x-www-form-urlencoded'},body:'query='+encodeURIComponent(q)});
   if(!r.ok)throw new Error('HTTP '+r.status);
   return (await r.json()).results.bindings;
  }catch(e){if(a>=4)throw e;await sleep(5000*(a+1))}
 }
}
const qid=v=>v?String(v.value).replace(/^.*\//,''):'';
const day=v=>v?String(v.value).slice(0,10):'';

// Every footballer with a club spell that started (or a spell that ended) on/after `since`.
async function wikidataMoves(since){
 const t=`"${since}T00:00:00Z"^^xsd:dateTime`;
 // Two small queries instead of one UNION: the combined one times out (HTTP 504).
 const hits=await sparql(`SELECT DISTINCT ?p WHERE { ?p p:P54 ?st. ?st pq:P580 ?d. FILTER(?d >= ${t}) FILTER NOT EXISTS{?st pq:P582 ?e} ?p wdt:P106 wd:Q937857. }`);
 // Spells that ended after `since` catch new clubs entered without a start date; optional when it times out.
 try{hits.push(...await sparql(`SELECT DISTINCT ?p WHERE { ?p p:P54 ?st. ?st pq:P582 ?d. FILTER(?d >= ${t} && ?d <= NOW()) ?p wdt:P106 wd:Q937857. }`))}catch(e){}
 const ids=[...new Set(hits.map(h=>qid(h.p)))],players=[];
 for(let i=0;i<ids.length;i+=150){
  const rows=await sparql(`SELECT ?p ?name ?alt ?club ?clubName ?start ?end ?how WHERE {
   VALUES ?p {${ids.slice(i,i+150).map(x=>'wd:'+x).join(' ')}}
   OPTIONAL{?p rdfs:label ?name FILTER(LANG(?name)="en")}
   OPTIONAL{?p skos:altLabel ?alt FILTER(LANG(?alt)="en")}
   ?p p:P54 ?st. ?st ps:P54 ?club. OPTIONAL{?club rdfs:label ?clubName FILTER(LANG(?clubName)="en")}
   OPTIONAL{?st pq:P580 ?start} OPTIONAL{?st pq:P582 ?end} OPTIONAL{?st pq:P1642 ?how}
   FILTER(!BOUND(?end) || ?end >= "2024-01-01T00:00:00Z"^^xsd:dateTime) }`);
  const by=new Map();
  for(const r of rows){
   const k=qid(r.p);let o=by.get(k);
   if(!o)by.set(k,o={q:k,name:r.name?.value||'',aliases:new Set(),spells:new Map()});
   if(r.alt)o.aliases.add(r.alt.value);
   const sk=qid(r.club)+'|'+day(r.start);
   if(!o.spells.has(sk))o.spells.set(sk,{club:r.clubName?.value||'',start:day(r.start),end:day(r.end),loan:qid(r.how)===LOAN});
  }
  for(const o of by.values())players.push({q:o.q,name:o.name,aliases:[...o.aliases],spells:[...o.spells.values()]});
  await sleep(500);
 }
 return players;
}

// The club a Wikidata player plays for now, if he moved on/after `since`.
function currentMove(p,since){
 const spells=p.spells.filter(s=>s.club&&!NATIONAL.test(s.club));
 const open=spells.filter(s=>!s.end).sort((a,b)=>a.start.localeCompare(b.start));
 let now=open[open.length-1];
 if(!now)return null;
 if(!(now.start>=since)){
  // No start date: accept only when it is his single open club and another spell ended after `since`.
  if(now.start||open.length!==1||!spells.some(s=>s.end>=since))return null;
 }
 return {to:now,before:spells.filter(s=>s!==now)};
}

// rows: EA rows (club_name, club_team_id, club_logo_url, league_name, gender, names).
function resolveTransfers(rows,players,since){
 const isWomen=r=>/women/i.test(r.gender||'');
 const clubs=new Map();// gender|club -> {row, best}
 for(const r of rows){if(!r.club_name)continue;const k=isWomen(r)+'|'+r.club_name,c=clubs.get(k);if(!c||Number(r.overall)>c.best)clubs.set(k,{row:r,best:Number(r.overall)||0})}
 const byName=new Map();
 for(const r of rows)for(const n of new Set([r.common_name,r.short_name,r.long_name].map(nameKey).filter(Boolean))){if(!byName.has(n))byName.set(n,[]);byName.get(n).push(r)}
 const moves=[],unresolved=[];
 for(const p of players){
  const m=currentMove(p,since);if(!m)continue;
  const cands=new Set();for(const n of[p.name,...p.aliases])for(const r of byName.get(nameKey(n))||[])cands.add(r);
  for(const r of cands){
   if(sameClub(r.club_name,m.to.club))continue;
   if(!m.before.some(s=>sameClub(r.club_name,s.club)))continue;// EA must still show a club he left
   const key=clubKey(m.to.club),women=isWomen(r);
   // Same words first ("Bayer Leverkusen" = "Leverkusen" via alias); a looser match only when it is the only one.
   const near=[...clubs.entries()].filter(([k])=>k.startsWith(women+'|')).map(([,c])=>c).filter(c=>within(c.row.club_name,m.to.club)).sort((a,b)=>b.best-a.best);
   const exact=near.filter(c=>clubKey(c.row.club_name)===key),target=exact[0]||(near.length===1?near[0]:null);
   const info={id:String(r.player_id),name:r.short_name,from:r.club_name,to:target?target.row.club_name:m.to.club,since:m.to.start,loan:m.to.loan,wikidata:p.q};
   if(!target){unresolved.push(info);continue}
   moves.push({...info,club_team_id:String(target.row.club_team_id||''),club_logo_url:target.row.club_logo_url||'',league_name:target.row.league_name||''});
  }
 }
 const seen=new Set();
 return {moves:moves.filter(x=>!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>Number(a.id)-Number(b.id)),unresolved};
}

// Applies the moves to the EA rows in place and returns what was applied. Falls back to the saved list.
async function applyClubTransfers(rows,{since,log=console.log}={}){
 let moves,source='wikidata';
 try{
  const players=await wikidataMoves(since),res=resolveTransfers(rows,players,since);
  moves=res.moves;
  log(`Wikidata: ${players.length} footballers moved since ${since}; ${moves.length} EA players still at their old club`);
  for(const u of res.unresolved)log(`Transfer not applied (club not in EA data, add CLUB_NAME_ALIASES?): ${u.name} ${u.from} -> ${u.to}`);
 }catch(e){
  source='saved';log(`Wikidata unreachable (${e.message}); using data/club-transfers.json`);
  moves=fs.existsSync(FILE)?JSON.parse(fs.readFileSync(FILE,'utf8')).moves||[]:[];
 }
 const byId=new Map(rows.map(r=>[String(r.player_id),r])),applied=[];
 for(const m of moves){
  const r=byId.get(m.id);
  if(!r||r.club_name!==m.from)continue;// EA changed the club itself meanwhile
  Object.assign(r,{club_name:m.to,club_team_id:m.club_team_id,club_logo_url:m.club_logo_url,league_name:m.league_name});
  applied.push(m);
 }
 log(`Transfers applied (${source}): ${applied.length}`);
 for(const m of applied)log(`  ${m.name}: ${m.from} -> ${m.to}${m.loan?' (Leihe)':''} seit ${m.since||'?'}`);
 if(source==='wikidata')fs.writeFileSync(FILE,JSON.stringify({since,moves:applied},null,1)+'\n');
 return applied;
}

module.exports={applyClubTransfers,resolveTransfers,currentMove,sameClub,clubKey,FILE};
