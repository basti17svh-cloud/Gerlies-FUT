/* V21.229 HALLOWEEN · BLUTMOND: roster rules, timing, upgrade, pack, evolution and assets. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=require('./helpers/app-html.cjs')(root);
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function setup(){
 const ctx={Date,Intl,Map,Set};vm.createContext(ctx);
 vm.runInContext([fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),section('const MOMENTUM_EVENT=','function activePromoEvent(').replace(/^const /gm,'var '),section('function eventPackIsActive(','function activePromoPackEntry('),
  'function normalizeKey(v){return String(v||"").toLowerCase()}',section('// Blutmond upgrade:','function displayBase(')].join('\n'),ctx);
 return ctx;
}
function setupWithPromos(){
 const c=setup();vm.runInContext(section('const TOTW_WEEK_1=','const TOTW_WEEKS=').replace(/^const /gm,'var '),c);return c;
}
const csv=fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8').split('\n');
const dbRow=id=>csv.find(line=>line.startsWith(id+','));

for(const [label,key] of [['HALLOWEEN',"HALLOWEEN_EVENT"],['HALLOWEEN Team 2',"HALLOWEEN_TEAM2_EVENT"]])test(`${label} is a complete 18-card release of real players from 18 clubs`,()=>{
 const c=setup(),ev=c[key];
 assert.equal(c.completeEventRoster(ev),true);
 assert.equal(ev.players.filter(p=>p.position==='GK').length,2);
 for(const p of ev.players){
  const row=dbRow(p.pid);assert.ok(row,`${p.name} is in the FC27 player database`);
  assert.ok(row.includes(p.name)||row.normalize('NFC').includes(p.name.normalize('NFC')),`${p.name} matches EA id ${p.pid}`);
  assert.ok(p.ovr>p.baseOvr,`${p.name} is upgraded`);
  assert.equal(p.stats.length,6);
  assert.ok(fs.existsSync(path.join(root,p.dynamicFace)),`${p.name} portrait`);
  assert.match(p.dynamicFace,/halloween\/dynamic\//,`${p.name} uses an EA dynamic picture`);
 }
});

test('HALLOWEEN ratings are spread like an EA promo instead of only top cards',()=>{
 const ratings=setup().HALLOWEEN_EVENT.players.map(p=>p.ovr);
 assert.equal(Math.max(...ratings),91,'Messi is the top card');
 assert.equal(ratings.filter(r=>r>=89).length,3);
 assert.ok(ratings.filter(r=>r<=86).length>=7);
 assert.equal(Math.min(...ratings),84);
});

test('HALLOWEEN Team 2 is spread from 82 to 88 with Semenyo on top',()=>{
 const ratings=setup().HALLOWEEN_TEAM2_EVENT.players.map(p=>p.ovr);
 assert.equal(Math.max(...ratings),88);assert.equal(Math.min(...ratings),82);
 assert.ok(ratings.filter(r=>r<=84).length>=9,'most of the team is affordable');
});

const promoCards=c=>[
 ...['HALLOWEEN_EVENT','HALLOWEEN_TEAM2_EVENT','HALLOWEEN_WEEK_SBC_EVENT'].flatMap(k=>{const ev=c[k];return[...ev.players.map(p=>({p,start:ev.activeFrom})),...(ev.sbcPlayer?[{p:ev.sbcPlayer,start:ev.sbcPlayer.releaseAt}]:[])]}),
 ...c.EVENT_OBJECTIVES.filter(t=>t.eventType==='halloween-objective').map(t=>({p:t.player,start:t.activeFrom}))
];
test('HALLOWEEN skips players who had a TOTW or Momentum card in the five weeks before their release',()=>{
 const c=setupWithPromos(),fiveWeeks=35*864e5;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const recent=[];
 const cards=promoCards(c);assert.equal(cards.length,18+18+2+2+1);
 for(const {p,start:from} of cards){
  const start=Date.parse(from),recent=[];
  for(let n=1;c['TOTW_WEEK_'+n];n++){const w=c['TOTW_WEEK_'+n],at=Date.parse(w.releaseDate+'T19:00:00+02:00');if(at<=start&&start-at<fiveWeeks)recent.push(...w.players.map(x=>({ids:[x.eaId,x.fallback?.id].filter(Boolean).map(String),names:(x.names||[]).map(norm),from:w.name})))}
  for(const m of c.MOMENTUM_RELEASES)if(start-Date.parse(m.activeFrom)<fiveWeeks)recent.push(...m.players.map(x=>({ids:[x.pid],names:[norm(x.name)],from:m.name})),...(m.sbcPlayer?[{ids:[m.sbcPlayer.pid].filter(Boolean),names:[m.sbcPlayer.name,...(m.sbcPlayer.names||[])].map(norm),from:m.name}]:[]));
  const hit=recent.find(r=>r.ids.includes(String(p.pid))||r.names.includes(norm(p.name)));assert.equal(hit,undefined,`${p.name} already had a ${hit?.from} card`);
 }
 const pids=cards.map(x=>String(x.p.pid));assert.equal(new Set(pids).size,pids.length,'no player twice in Halloween');
});

test('HALLOWEEN stats are playable in the card position without going over the top',()=>{
 const c=setup();
 for(const p of [...c.HALLOWEEN_EVENT.players,...c.HALLOWEEN_TEAM2_EVENT.players]){
  const base=dbRow(p.pid).replace(/"[^"]*"/g,'x').split(',').slice(6,12).map(Number);
  p.stats.forEach((v,i)=>{assert.ok(v>base[i],`${p.name} stat ${i} is upgraded`);assert.ok(v-base[i]<=p.ovr-p.baseOvr+11,`${p.name} stat ${i} boost stays moderate`)});
  if(['ST','LW','RW','LM','RM','CAM','LB','RB','CB'].includes(p.position))assert.ok(p.stats[0]>=77,`${p.name} has playable pace`);
 }
});

test('HALLOWEEN continues on 06.11. with Team 2 released and roster-guarded',()=>{
 const c=setup(),ev=c.HALLOWEEN_EVENT;
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-10-30T18:59:59+01:00')),false);
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-10-30T19:00:00+01:00')),true);
 assert.equal(c.activeHalloweenEvent(Date.parse('2026-11-06T19:00:00+01:00'))?.id,c.HALLOWEEN_TEAM2_EVENT.id,'06.11 is not the end of Halloween: Team 2 takes over');
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-11-06T19:00:00+01:00')),false,'Team 1 leaves the packs');
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-11-13T19:00:00+01:00')),false,'provisional expiry after the second week');
 assert.equal(c.HALLOWEEN_TEAM2_EVENT.activeFrom,'2026-11-06T19:00:00+01:00');
 assert.equal(c.eventRosterReady(c.HALLOWEEN_TEAM2_EVENT),true,'Team 2 roster is approved and complete');
 assert.match(html,/Team 2 · Blutmond/);
 assert.equal(ev.sbcPlayer.releaseAt,'2026-10-31T19:00:00+01:00');
 assert.equal(ev.sbcPlayer.segments.length,4);
 assert.ok(fs.existsSync(path.join(root,ev.sbcPlayer.dynamicFace)));
});

test('Team 2 automatically replaces Team 1 if and only if its approved roster is complete',()=>{
 const c=setup(),team1=c.HALLOWEEN_EVENT,team2=c.HALLOWEEN_TEAM2_EVENT;
 const justBefore=Date.parse('2026-11-06T18:59:59+01:00'),handover=Date.parse('2026-11-06T19:00:00+01:00');
 const approved=team2.players;team2.players=[];
 assert.equal(c.activeHalloweenEvent(handover).id,team1.id,'never expose an empty Team 2');
 team2.players=approved;
 assert.equal(c.eventRosterReady(team2),true);
 assert.equal(c.activeHalloweenEvent(justBefore).id,team1.id,'do not publish early');
 assert.equal(c.activeHalloweenEvent(handover).id,team2.id,'switch at the exact minute');
 assert.equal(c.eventPackIsActive(team1,handover),false,'Team 1 leaves normal packs');
 assert.equal(c.eventPackIsActive(team2,handover),true,'Team 2 is in packs');
});

test('the Blutmond upgrade adds +1 to every Halloween card from the Halloween night on',()=>{
 const c=setup(),up=c.HALLOWEEN_EVENT.upgrade;
 assert.equal(up.at,'2026-10-31T19:00:00+01:00');
 for(const eventType of ['halloween','halloween-sbc','halloween-objective']){
  assert.equal(c.halloweenUpgradeFor({eventType},Date.parse('2026-10-31T18:59:00+01:00')),null);
  assert.equal(c.halloweenUpgradeFor({eventType},Date.parse('2026-10-31T19:00:00+01:00')).ovr,1);
 }
 assert.equal(c.halloweenUpgradeFor({eventType:'momentum'},Date.parse('2026-11-01T12:00:00+01:00')),null);
 assert.equal(c.halloweenUpgradeFor({cosmeticDesign:'halloween'},Date.parse('2026-11-01T12:00:00+01:00')),null,'design-only cards get no upgrade');
});

test('the Blutmond pack guarantees one Halloween card and is coins-only during the event',()=>{
 const pack=section('{id:"halloween-pack"','\n');
 assert.match(pack,/coins:60000,points:null/);
 assert.match(pack,/eventSlot:"halloween-2026"/);
 assert.match(pack,/dailyLimit:3/);
 assert.match(html,/activeHalloweenEvent\(now\.getTime\(\)\)\?\["halloween-pack"\]:\[\]/);
 assert.ok(fs.readFileSync(path.join(root,'pack-odds-ui.js'),'utf8').includes('gleich wahrscheinlich'),'odds disclose the guaranteed event slot');
 assert.ok(fs.existsSync(path.join(root,'assets/footera/events/halloween/pack-halloween.webp')));
});

test('the Blutmond evolution is free, event-only, for normal cards and ends in the Halloween design',()=>{
 const evo=JSON.parse(section('EVOLUTION_POOL.push({"id":"halloween_blutmond"','});').slice('EVOLUTION_POOL.push('.length)+'}');
 assert.equal(evo.group,'event');assert.equal(evo.design,'halloween');
 assert.deepEqual(evo.cost,{coins:0,points:0});
 assert.equal(evo.req.baseCardsOnly,true);assert.ok(!evo.req.positions.includes('GK'));
 assert.equal(evo.stages.reduce((n,s)=>n+s.ovr,0),4);
 assert.match(html,/if\(evo\?\.design\)item\.cosmeticDesign=evo\.design;/);
 assert.match(html,/x\.group==="event"&&evoEventWindowOpen\(x,date\)/);
});

test('Halloween card artwork, stylesheet and caches are wired up',()=>{
 assert.ok(fs.existsSync(path.join(root,'assets/footera/events/halloween/card-halloween-v1.webp')));
 assert.match(html,/halloween-card\.css\?v=\d+/);
 assert.match(html,/cosmeticDesign==="halloween"\|\|String\(item\?\.eventType\|\|""\)\.startsWith\("halloween"\)\)return"halloween"/);
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.ok(sw.includes('./halloween-card.css?v=')&&sw.includes('card-halloween-v1.webp'));
});

test('the event poster always lists cards from the highest to the lowest rating',()=>{
 const ctx={};vm.createContext(ctx);vm.runInContext(section('function byEventRating(','function eventShowcases('),ctx);
 const sorted=ctx.byEventRating([86,91,84,90,86].map((ovr,i)=>({i,player:{ovr}})));
 assert.deepEqual([...sorted].map(e=>e.player.ovr),[91,90,86,86,84]);
 assert.deepEqual([...sorted].filter(e=>e.player.ovr===86).map(e=>e.i),[0,4],'equal ratings keep their order');
 for(const kind of ['totwEventEntries(team)','totwReviewEntries(preview)','promoEventEntries(event)'])assert.ok(html.includes(`entries:()=>byEventRating(${kind})`),kind);
});

test('the Halloween announcement keeps the SBC and objective players secret',()=>{
 const teaser=section('function openHalloweenPreview(','\n}\n')+section('function halloweenHeroSlide(','function homeHeroSlides(');
 assert.ok(!/Müller|Muller|Raumdeuter|Leão|Leao|Gyökeres|Gyokeres|Mbeumo|Son Heung|Semenyo/.test(teaser),'no SBC or objective spoiler in the hero teaser or the preview timeline');
 assert.match(teaser,/geheime Spieler-SBC/);
});

test('Gyökeres runs one full week as a Halloween SBC and Mbeumo opens Team 2 a day after the rotation',()=>{
 const c=setup(),week=c.HALLOWEEN_WEEK_SBC_EVENT,team2=c.HALLOWEEN_TEAM2_EVENT;
 assert.equal(week.sbcPlayer.releaseAt,'2026-11-02T19:00:00+01:00');
 assert.equal(week.sbcPlayer.activeUntilAt,'2026-11-09T19:00:00+01:00','one week, not a 48 h flash SBC');
 assert.equal(week.theme,'halloween');assert.equal(week.players.length,0,'no pack release');
 assert.equal(c.eventRosterReady(week),false);
 assert.equal(team2.sbcPlayer.releaseAt,'2026-11-07T19:00:00+01:00');
 assert.equal(team2.sbcPlayer.activeUntilAt,team2.activeUntilAt);
 for(const def of [week.sbcPlayer,team2.sbcPlayer]){
  assert.ok(fs.existsSync(path.join(root,def.dynamicFace)),`${def.name} picture`);
  assert.ok(dbRow(def.pid),`${def.name} is a real FC27 player`);
  assert.ok(def.segments.length>=3);
 }
 const ctx={Date};vm.createContext(ctx);vm.runInContext(section('function eventSbcPlayerIsActive(','function eventSbcAliases('),ctx);
 assert.equal(ctx.eventSbcPlayerIsActive(week,Date.parse('2026-11-02T18:59:00+01:00')),false);
 assert.equal(ctx.eventSbcPlayerIsActive(week,Date.parse('2026-11-08T12:00:00+01:00')),true);
 assert.equal(ctx.eventSbcPlayerIsActive(week,Date.parse('2026-11-09T19:00:00+01:00')),false);
 assert.match(html,/eventSbcNamedTitle\(sample\)\{return \["flashback","halloween"\]\.includes\(eventThemeOf/);
});

test('the Team 2 objective (Son) counts Rivals wins and the second Blutmond evolution covers 80-85 cards',()=>{
 const c=setup(),son=c.EVENT_OBJECTIVES.find(t=>t.id==='halloween-son');
 assert.equal(son.mode,'rivals');assert.equal(son.target,6);assert.equal(son.minDifficulty,undefined);
 assert.equal(son.activeFrom,'2026-11-06T19:00:00+01:00');assert.equal(son.activeUntilAt,'2026-11-13T19:00:00+01:00');
 assert.ok(fs.existsSync(path.join(root,son.player.dynamicFace)));
 assert.match(html,/task\.minDifficulty&&\(!difficulty/);
 const evo=JSON.parse(section('EVOLUTION_POOL.push({"id":"halloween_blutmond_2"','});').slice('EVOLUTION_POOL.push('.length)+'}');
 assert.equal(evo.activeFrom,'2026-11-06T19:00:00+01:00');assert.equal(evo.activeUntilAt,'2026-11-13T19:00:00+01:00');
 assert.equal(evo.req.minOvr,80);assert.equal(evo.req.maxOvr,85);assert.equal(evo.design,'halloween');
 assert.deepEqual(evo.cost,{coins:0,points:0});
 assert.equal(evo.stages.reduce((n,s)=>n+s.ovr,0),4);assert.ok(evo.maxFinalOvr>=evo.req.maxOvr+4);
});
