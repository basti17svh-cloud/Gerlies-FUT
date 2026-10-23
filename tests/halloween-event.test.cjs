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

test('HALLOWEEN is a complete 18-card release of real players from 18 clubs',()=>{
 const c=setup(),ev=c.HALLOWEEN_EVENT;
 assert.equal(c.completeEventRoster(ev),true);
 assert.equal(ev.players.filter(p=>p.position==='GK').length,2);
 for(const p of ev.players){
  const row=dbRow(p.pid);assert.ok(row,`${p.name} is in the FC27 player database`);
  assert.ok(row.includes(p.name)||row.normalize('NFC').includes(p.name.normalize('NFC')),`${p.name} matches EA id ${p.pid}`);
  assert.ok(p.ovr>p.baseOvr,`${p.name} is upgraded`);
  assert.equal(p.stats.length,6);
  assert.ok(fs.existsSync(path.join(root,p.dynamicFace)),`${p.name} portrait`);
  if(p.pid!=='158023')assert.match(p.dynamicFace,/halloween\/dynamic\//,`${p.name} uses an EA dynamic picture`);
 }
});

test('HALLOWEEN ratings are spread like an EA promo instead of only top cards',()=>{
 const ratings=setup().HALLOWEEN_EVENT.players.map(p=>p.ovr);
 assert.equal(Math.max(...ratings),91,'Messi is the top card');
 assert.equal(ratings.filter(r=>r>=89).length,3);
 assert.ok(ratings.filter(r=>r<=86).length>=7);
 assert.equal(Math.min(...ratings),84);
});

test('HALLOWEEN skips players who had a TOTW or Momentum card in the five weeks before the event',()=>{
 const c=setupWithPromos(),ev=c.HALLOWEEN_EVENT,start=Date.parse(ev.activeFrom),fiveWeeks=35*864e5;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const recent=[];
 for(let n=1;c['TOTW_WEEK_'+n];n++){const w=c['TOTW_WEEK_'+n];if(start-Date.parse(w.releaseDate+'T19:00:00+02:00')<fiveWeeks)recent.push(...w.players.map(p=>({ids:[p.eaId,p.fallback?.id].filter(Boolean),names:(p.names||[]).map(norm),from:w.name})))}
 for(const m of c.MOMENTUM_RELEASES)if(start-Date.parse(m.activeFrom)<fiveWeeks)recent.push(...m.players.map(p=>({ids:[p.pid],names:[norm(p.name)],from:m.name})));
 assert.ok(recent.length>50);
 for(const p of ev.players){const hit=recent.find(r=>r.ids.includes(p.pid)||r.names.includes(norm(p.name)));assert.equal(hit,undefined,`${p.name} already had a ${hit?.from} card`)}
});

test('HALLOWEEN stats are playable in the card position without going over the top',()=>{
 const ev=setup().HALLOWEEN_EVENT;
 for(const p of ev.players){
  const base=dbRow(p.pid).replace(/"[^"]*"/g,'x').split(',').slice(6,12).map(Number);
  p.stats.forEach((v,i)=>{assert.ok(v>base[i],`${p.name} stat ${i} is upgraded`);assert.ok(v-base[i]<=p.ovr-p.baseOvr+11,`${p.name} stat ${i} boost stays moderate`)});
  if(['ST','LW','RW','LM','RM','CAM','LB','RB','CB'].includes(p.position))assert.ok(p.stats[0]>=77,`${p.name} has playable pace`);
 }
});

test('HALLOWEEN runs from Friday 30.10. 19:00 to Friday 06.11. 19:00 Berlin',()=>{
 const c=setup(),ev=c.HALLOWEEN_EVENT;
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-10-30T18:59:59+01:00')),false);
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-10-30T19:00:00+01:00')),true);
 assert.equal(c.eventPackIsActive(ev,Date.parse('2026-11-06T19:00:00+01:00')),false);
 assert.equal(ev.sbcPlayer.releaseAt,'2026-10-31T19:00:00+01:00');
 assert.equal(ev.sbcPlayer.segments.length,4);
 assert.ok(fs.existsSync(path.join(root,ev.sbcPlayer.dynamicFace)));
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
 assert.match(html,/eventPackIsActive\(HALLOWEEN_EVENT,now\.getTime\(\)\)\?\["halloween-pack"\]:\[\]/);
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
