/* V21.334 BLACK FRIDAY: rosters, 5-week rule, timing, Deal des Tages SBCs, shop deals, no spoilers, assets. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=require('./helpers/app-html.cjs')(root);
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function setup(){
 const ctx={Date,Intl,Map,Set};vm.createContext(ctx);
 vm.runInContext([fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),section('const MOMENTUM_EVENT=','function activePromoEvent(').replace(/^const /gm,'var '),section('function eventPackIsActive(','function activePromoPackEntry('),
  'function normalizeKey(v){return String(v||"").toLowerCase()}',section('const TOTW_WEEK_1=','const TOTW_WEEKS=').replace(/^const /gm,'var '),
  section('const BLACKFRIDAY_DEAL_SBCS=','function activeEventPlayerSBCs(').replace(/^const /gm,'var '),
  section('const BLACKFRIDAY_STORE_DEAL=','function activePromoPacks(').replace(/^const /gm,'var ')].join('\n'),ctx);
 return ctx;
}
const csv=fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8').split('\n');
const dbRow=id=>csv.find(line=>line.startsWith(id+','));
const dbStats=id=>dbRow(id).replace(/"[^"]*"/g,'x').split(',').slice(6,12).map(Number);
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const at=s=>Date.parse(s),ids=rows=>rows.map(r=>r.id).join(',');

for(const [label,key] of [['BLACK FRIDAY Team 1','BLACKFRIDAY_EVENT'],['BLACK FRIDAY Team 2','BLACKFRIDAY_TEAM2_EVENT']])test(`${label} is a complete 18-card release of real players from 18 clubs`,()=>{
 const c=setup(),ev=c[key];
 assert.equal(c.completeEventRoster(ev),true);
 assert.equal(ev.theme,'blackfriday');
 assert.equal(ev.players.filter(p=>p.position==='GK').length,2);
 for(const p of ev.players){
  const row=dbRow(p.pid);assert.ok(row,`${p.name} is in the FC27 player database`);
  assert.ok(row.normalize('NFC').includes(p.name.normalize('NFC')),`${p.name} matches EA id ${p.pid}`);
  assert.ok(row.includes(p.team),`${p.name} plays for ${p.team}`);
  assert.ok(p.ovr>p.baseOvr,`${p.name} is upgraded`);
  assert.equal(p.stats.length,6);
  assert.match(p.dynamicFace,/^assets\/footera\/events\/blackfriday\/dynamic\/\d+\.webp$/);
  assert.ok(fs.existsSync(path.join(root,p.dynamicFace)),`${p.name} portrait`);
 }
});

test('Team 1 tops out at 91 and Team 2 stays mostly affordable (82-89)',()=>{
 const c=setup(),one=c.BLACKFRIDAY_EVENT.players.map(p=>p.ovr),two=c.BLACKFRIDAY_TEAM2_EVENT.players.map(p=>p.ovr);
 assert.equal(Math.max(...one),91,'91 is top (Basti 2026-10-29)');assert.equal(Math.min(...one),82);
 assert.ok(one.filter(r=>r<=86).length>=7,'Team 1 is spread like an EA promo');
 assert.equal(Math.max(...two),89);assert.equal(Math.min(...two),82);
 assert.ok(two.filter(r=>r<=84).length>=11,'most of Team 2 is affordable');
});

const bfCards=c=>[
 ...['BLACKFRIDAY_EVENT','BLACKFRIDAY_TEAM2_EVENT','BLACKFRIDAY_SUNDAY_SBC_EVENT'].flatMap(k=>{const ev=c[k];return[...ev.players.map(p=>({p,start:ev.activeFrom})),...(ev.sbcPlayer?[{p:ev.sbcPlayer,start:ev.sbcPlayer.releaseAt}]:[])]}),
 ...c.EVENT_OBJECTIVES.filter(t=>t.eventType==='blackfriday-objective').map(t=>({p:t.player,start:t.activeFrom}))
];
test('nobody had a TOTW, POTM or promo card in the five weeks before their Black Friday release',()=>{
 const c=setup(),five=35*864e5,cards=bfCards(c);
 assert.equal(cards.length,18+18+3+2);
 const promos=[];
 for(let n=1;c['TOTW_WEEK_'+n];n++){const w=c['TOTW_WEEK_'+n];promos.push(...w.players.map(x=>({ids:[x.eaId,x.fallback?.id].filter(Boolean).map(String),names:(x.names||[]).map(norm),from:w.name,at:at(w.releaseDate+'T19:00:00+02:00'),ovr:x.ovr,stats:x.stats,gk:x.position==='GK'})))}
 for(const e of c.EVENT_PROMO_RELEASES.filter(e=>e.theme!=='blackfriday'))promos.push(...(e.players||[]).map(x=>({ids:[String(x.pid)],names:[norm(x.name)],from:e.id,at:at(e.activeFrom),ovr:x.ovr,stats:x.stats,gk:x.position==='GK'})),...(e.sbcPlayer?[{ids:[String(e.sbcPlayer.pid)],names:[e.sbcPlayer.name,...(e.sbcPlayer.names||[])].map(norm),from:e.id,at:at(e.sbcPlayer.releaseAt),ovr:e.sbcPlayer.ovr,stats:e.sbcPlayer.stats,gk:e.sbcPlayer.position==='GK'}]:[]));
 for(const t of c.EVENT_OBJECTIVES.filter(t=>t.eventType!=='blackfriday-objective'))promos.push({ids:[String(t.player.pid)],names:[norm(t.player.name)],from:t.id,at:at(t.activeFrom),ovr:t.player.ovr,stats:t.player.stats,gk:t.player.position==='GK'});
 for(const m of fs.readFileSync(path.join(root,'potm.js'),'utf8').matchAll(/pid:"(\d+)",name:"([^"]+)".*?ovr:(\d+).*?stats:\[([^\]]+)\].*?from:"([^"]+)"/g))promos.push({ids:[m[1]],names:[norm(m[2])],from:'POTM',at:at(m[5]),ovr:Number(m[3]),stats:m[4].split(',').map(Number),gk:false});
 for(const {p,start} of cards){
  const hits=promos.filter(r=>r.ids.includes(String(p.pid))||r.names.includes(norm(p.name)));
  const recent=hits.find(r=>r.at<=at(start)+864e5&&at(start)-r.at<five);
  assert.equal(recent,undefined,`${p.name} already had a ${recent?.from} card`);
  // A Black Friday card must beat every earlier special card of the same player.
  for(const old of hits.filter(r=>r.at<at(start))){
   assert.ok(p.ovr>old.ovr,`${p.name} ${p.ovr} beats ${old.from} ${old.ovr}`);
   if(Array.isArray(old.stats)&&old.gk===(p.position==='GK'))old.stats.forEach((v,i)=>assert.ok(p.stats[i]>=v,`${p.name} stat ${i} not below ${old.from}`));
  }
 }
 const pids=cards.map(x=>String(x.p.pid));assert.equal(new Set(pids).size,pids.length,'no player twice in Black Friday');
});

test('TOTW weeks around Black Friday never pick a Black Friday player (five weeks before the release)',()=>{
 const c=setup(),five=35*864e5,cards=bfCards(c);
 for(let n=1;c['TOTW_WEEK_'+n];n++){
  const w=c['TOTW_WEEK_'+n],released=at(w.releaseDate+'T19:00:00+01:00'),ids=new Set(w.players.map(x=>String(x.eaId)));
  for(const {p,start} of cards)if(released<=at(start)&&at(start)-released<five)assert.ok(!ids.has(String(p.pid)),`TOTW ${n} must not contain ${p.name}`);
 }
});

// Stats that were lifted only to beat the same player's earlier TOTW/Momentum card by one point.
const EARLIER={'192985':[77,88,92,87,69,72]};
test('Black Friday stats are playable in the card position without going over the top',()=>{
 const c=setup();
 for(const {p} of bfCards(c)){
  const base=dbStats(p.pid),baseOvr=Number(dbRow(p.pid).replace(/"[^"]*"/g,'x').split(',')[5]);
  const beat=EARLIER[p.pid]||[];
  p.stats.forEach((v,i)=>{assert.ok(v>base[i],`${p.name} stat ${i} is upgraded`);assert.ok(v-base[i]<=p.ovr-baseOvr+11||v===beat[i]+1,`${p.name} stat ${i} boost stays moderate`);assert.ok(v<=99)});
  if(['ST','LW','RW','LM','RM','CAM','LB','RB','CB'].includes(p.position))assert.ok(p.stats[0]>=77,`${p.name} has playable pace`);
 }
});

test('Team 1 runs Fr 27.11. to Fr 04.12., then Team 2 until the end of Season 2 on Fr 11.12.',()=>{
 const c=setup(),one=c.BLACKFRIDAY_EVENT,two=c.BLACKFRIDAY_TEAM2_EVENT;
 assert.equal(c.eventPackIsActive(one,at('2026-11-27T18:59:59+01:00')),false);
 assert.equal(c.eventPackIsActive(one,at('2026-11-27T19:00:00+01:00')),true);
 assert.equal(c.eventPackIsActive(one,at('2026-12-04T18:59:59+01:00')),true);
 assert.equal(c.eventPackIsActive(one,at('2026-12-04T19:00:00+01:00')),false);
 assert.equal(c.eventPackIsActive(two,at('2026-12-04T19:00:00+01:00')),true);
 assert.equal(c.eventPackIsActive(two,at('2026-12-11T19:00:00+01:00')),false);
 // Black Friday comes first in the release list, Halloween is over by then.
 const order=c.EVENT_PROMO_RELEASES.map(e=>e.id);
 assert.ok(order.indexOf('blackfriday-2026-team2')<order.indexOf('halloween-2026-team2'));
 const objectives=c.EVENT_OBJECTIVES.filter(t=>t.eventType==='blackfriday-objective');
 assert.equal(JSON.stringify(objectives.map(t=>[t.mode,t.target,t.activeFrom,t.activeUntilAt])),JSON.stringify([['squad',8,one.activeFrom,one.activeUntilAt],['rivals',6,two.activeFrom,two.activeUntilAt]]));
 assert.equal(objectives[0].minDifficulty,'pro');
});

test('Deal des Tages: a new SBC every evening Fr-Mo at 19:00, each one running a full week',()=>{
 const c=setup();
 const deals=[[c.BLACKFRIDAY_EVENT.sbcPlayer.releaseAt,c.BLACKFRIDAY_EVENT.sbcPlayer.activeUntilAt],...c.BLACKFRIDAY_DEAL_SBCS.filter(d=>d.id.includes('pick')).map(d=>[d.releaseAt,d.activeUntilAt]),[c.BLACKFRIDAY_SUNDAY_SBC_EVENT.sbcPlayer.releaseAt,c.BLACKFRIDAY_SUNDAY_SBC_EVENT.sbcPlayer.activeUntilAt],...c.BLACKFRIDAY_DEAL_SBCS.filter(d=>d.id.includes('cyber')).map(d=>[d.releaseAt,d.activeUntilAt])];
 assert.equal(deals.map(d=>d[0]).join(','),'2026-11-27T19:00:00+01:00,2026-11-28T19:00:00+01:00,2026-11-29T19:00:00+01:00,2026-11-30T19:00:00+01:00');
 for(const [from,to] of deals)assert.equal(at(to)-at(from),7*864e5,'one week, not a 48 h flash SBC');
 assert.equal(c.BLACKFRIDAY_TEAM2_EVENT.sbcPlayer.releaseAt,c.BLACKFRIDAY_TEAM2_EVENT.activeFrom);
 assert.equal(at(c.BLACKFRIDAY_TEAM2_EVENT.sbcPlayer.activeUntilAt)-at(c.BLACKFRIDAY_TEAM2_EVENT.sbcPlayer.releaseAt),7*864e5);
 assert.equal(c.BLACKFRIDAY_SUNDAY_SBC_EVENT.players.length,0,'the Sunday deal is not a pack release');
 assert.equal(c.eventRosterReady(c.BLACKFRIDAY_SUNDAY_SBC_EVENT),false);
 assert.equal(ids(c.activeBlackFridayDealSBCs(new Date('2026-11-28T18:59:00+01:00'))),'');
 assert.equal(ids(c.activeBlackFridayDealSBCs(new Date('2026-11-30T19:00:00+01:00'))),'blackfriday_pick_20261128,blackfriday_cyber_20261130');
 assert.equal(ids(c.activeBlackFridayDealSBCs(new Date('2026-12-05T19:00:00+01:00'))),'blackfriday_cyber_20261130');
 assert.equal(ids(c.activeBlackFridayDealSBCs(new Date('2026-12-07T19:00:00+01:00'))),'');
 for(const s of c.activeBlackFridayDealSBCs(new Date('2026-12-01T12:00:00+01:00'))){assert.equal(s.once,true);assert.equal(s.group,'Profis')}
 for(const def of [c.BLACKFRIDAY_EVENT.sbcPlayer,c.BLACKFRIDAY_TEAM2_EVENT.sbcPlayer,c.BLACKFRIDAY_SUNDAY_SBC_EVENT.sbcPlayer]){
  assert.ok(dbRow(def.pid),`${def.name} is a real FC27 player`);assert.ok(fs.existsSync(path.join(root,def.dynamicFace)),`${def.name} picture`);
  assert.equal(def.packEligible,false);assert.ok(def.segments.length>=3);
 }
 assert.match(html,/allActiveSBCs\(now=new Date\(\)\)\{return \[[^\n]*activeBlackFridayDealSBCs\(now\)/);
 assert.match(html,/\{id:"blackfriday-team1-player",[^\n]*eventSlot:"blackfriday-2026",eventSlotFixed:true/);
});

test('shop deals: coin packs 30 % cheaper only Fr 27.11. 19:00 - Di 01.12. 19:00, Points prices unchanged',()=>{
 const c=setup(),pack={id:'goldplayers',coins:15000,points:350};
 assert.equal(c.storeDealPack(pack,at('2026-11-27T18:59:59+01:00')),pack);
 const deal=c.storeDealPack(pack,at('2026-11-27T19:00:00+01:00'));
 assert.equal(deal.coins,10500);assert.equal(deal.coinsBefore,15000);assert.equal(deal.points,350);assert.equal(deal.storeDeal,true);
 assert.equal(c.storeDealPack(pack,at('2026-12-01T18:59:59+01:00')).coins,10500);
 assert.equal(c.storeDealPack(pack,at('2026-12-01T19:00:00+01:00')),pack);
 const pointsOnly={id:'x',coins:null,points:500};assert.equal(c.storeDealPack(pointsOnly,at('2026-11-28T12:00:00+01:00')),pointsOnly);
 assert.equal(pack.coins,15000,'the catalogue entry itself is never changed');
 // Display and purchase read the same discounted list.
 assert.match(html,/function activeStorePacks\(\)\{return \[\.\.\.PACKS\.filter\(p=>p\.store&&!p\.rotation\)\.map\(p=>storeDealPack\(p\)\),\.\.\.activePromoPacks\(\)\]\}/);
 assert.match(html,/storeDealPack\(\{\.\.\.pack,dailyLimit:/);
});

test('teaser and preview keep the SBC and objective players secret',()=>{
 const src=section('function blackFridayHeroSlide(','function homeHeroSlides(');
 const c=setup();
 for(const p of [c.BLACKFRIDAY_EVENT.sbcPlayer,c.BLACKFRIDAY_TEAM2_EVENT.sbcPlayer,c.BLACKFRIDAY_SUNDAY_SBC_EVENT.sbcPlayer,...c.EVENT_OBJECTIVES.filter(t=>t.eventType==='blackfriday-objective').map(t=>t.player)])
  assert.ok(!norm(src).includes(norm(p.name).split(' ').pop()),`${p.name} stays secret`);
});

test('card art, CSS and evolutions are wired up for the release',()=>{
 for(const f of ['assets/footera/events/blackfriday/card-blackfriday-v1.webp','assets/footera/events/blackfriday/pack-blackfriday.webp','blackfriday-card.css'])assert.ok(fs.existsSync(path.join(root,f)),f);
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8'),worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const v=index.match(/blackfriday-card\.css\?v=(\d+)/);assert.ok(v,'stylesheet is linked');
 assert.ok(worker.includes(`"./blackfriday-card.css?v=${v[1]}"`),'PWA caches the same stylesheet revision');
 assert.match(html,/if\(item\?\.cosmeticDesign==="blackfriday"\|\|String\(item\?\.eventType\|\|""\)\.startsWith\("blackfriday"\)\)return"blackfriday";/);
 for(const id of ['blackfriday_neon','blackfriday_cyber'])assert.match(html,new RegExp(`"id":"${id}"[^\\n]*"design":"blackfriday"`));
 const cosmetic=fs.readFileSync(path.join(root,'footera-cosmetic-evolutions.js'),'utf8');
 assert.match(cosmetic,/\{id:"blackfriday",[^\n]*activeFrom:"2026-11-27T19:00:00\+01:00",activeUntilAt:"2026-12-11T19:00:00\+01:00"\}/);
});
