const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=require('./helpers/app-html.cjs')(root);
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function setup(at='2026-10-14T19:00:00+02:00'){
 class Clock extends Date{constructor(...args){super(...(args.length?args:[at]))}static now(){return Date.parse(at)}}
 const context={Date:Clock,Intl,URL,location:{href:'https://footera.test/index.html?totwPreview=5'},
  normalizeKey:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),
  isActiveEventSbcBase:()=>false,isEventSbcBlockedTotwInfo:()=>false,activePromoPackEntry:()=>null,
  makeItem:(base,tradeable,options={})=>({pid:base.id,tradeable,...options}),
  resolveTotwWeekBase:(team,info,index)=>({id:`totw-${team.id}-${index}`,name:info.names[0]})};
 vm.createContext(context);
 vm.runInContext([
  fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),section('const TOTW_WEEK_1=','let LIVE_TOTW='),
  section('function totwSearchKeys(','function uniqueTotwPlayer('),section('function totwInfo(','function currentTotwBases('),
  section('function publishedTotwWeeks(','function eventResolveBase('),section('function allTotwMarketBases(','function resolveTotwBase('),
  section('function makeLivePackItem(','let promoEventClockId=')
 ].join('\n'),context);
 context.team=vm.runInContext('TOTW_WEEK_5',context);return context;
}
test('Approved TOTW 5 has eighteen unique men and clubs, exact 2/5/6/5 positions and Doku instead of Cherki',()=>{
 const c=setup();assert.equal(c.team.sourceStatus,'admin-approved');assert.equal(c.team.releaseDate,'2026-10-14');
 assert.equal(c.totwRosterErrors(c.team).length,0);
 assert.equal(new Set(c.team.players.map(p=>p.names[0])).size,18);
 assert.equal(new Set(c.team.players.map(p=>p.fallback.team)).size,18);
 for(const name of ['James Bree','Petar Sučić','Jérémy Doku','Pascal Groß'])assert.ok(c.team.players.some(p=>p.names[0]===name));
 for(const name of ['Jeff Chabot','Antonio Nusa','Rayan Cherki','João Pedro'])assert.ok(!c.team.players.some(p=>p.names[0]===name));
 const doku=c.team.players.find(p=>p.names[0]==='Jérémy Doku');assert.equal(doku.position,'LW');assert.equal(doku.fallback.team,'Manchester City');
});
test('pending, rejected and missing approval cannot enter packs, archive or market at the release time',()=>{
 for(const status of ['pending-approval','rejected',undefined]){
  const c=setup();c.team.sourceStatus=status;
  assert.equal(c.activeTotwWeek(),null);assert.equal(c.latestPublishedTotw().id,4);
  assert.ok(!c.publishedTotwWeeks().some(t=>t.id===5));
  assert.ok(!c.allTotwMarketBases().some(base=>base.id.startsWith('totw-5-')));
  const item=c.makeLivePackItem({id:'nkunku',name:'Christopher Nkunku',ovr:82},true);
  assert.equal(item.variant,undefined);
 }
});
test('explicit approval opens the real pack and archive gate at 19:00 Berlin and closes at next 19:00',()=>{
 for(const [at,active,published] of [
  ['2026-10-14T18:59:59+02:00',4,false],['2026-10-14T19:00:00+02:00',5,true],
  ['2026-10-21T18:59:59+02:00',5,true],['2026-10-21T19:00:00+02:00',null,true]
 ]){
  const c=setup(at);assert.equal(c.team.sourceStatus,'admin-approved');
  assert.equal(c.activeTotwWeek()?.id||null,active);
  assert.equal(c.publishedTotwWeeks().some(t=>t.id===5),published);
  assert.equal(c.allTotwMarketBases().some(base=>base.id.startsWith('totw-5-')),published);
  const item=c.makeLivePackItem({id:'nkunku',name:'Christopher Nkunku',ovr:82},true);
  assert.equal(item.eventName,active===5?'Team of the Week 5':undefined);
  if(active===5){const info=c.team.players.find(p=>p.names[0]==='Christopher Nkunku');assert.equal(item.displayRating,info.ovr);assert.deepEqual(Array.from(item.eventStats),Array.from(info.stats));assert.equal(item.eventReleaseId,'totw-5')}
 }
});
test('approval cannot bypass club limits, missing players, positions, gender, duplicates or invalid attributes',()=>{
 const mutations=[
  t=>{t.players[1].fallback.team=t.players[0].fallback.team},
  t=>{t.players[1].fallback.team='  WÉRDER   BREMEN  '},
  t=>t.players.pop(),t=>t.players[7].position='ST',t=>t.players[0].fallback.gender='female',
  t=>t.players[1].names=t.players[0].names,t=>t.players[0].stats[0]=100,
  t=>t.players[0].fallback.team='',t=>t.players[0].ovr=NaN
 ];
 for(const mutate of mutations){const c=setup();c.team.sourceStatus='admin-approved';mutate(c.team);assert.ok(c.totwRosterErrors(c.team).length);assert.equal(c.activeTotwWeek(),null);assert.equal(c.publishedTotwWeeks().some(t=>t.id===5),false)}
});
test('read-only preview resolves the draft without approving, publishing or modifying it',()=>{
 const c=setup();c.team.sourceStatus='pending-approval';const before=JSON.stringify(c.team);assert.equal(c.requestedTotwPreview().id,5);
 assert.equal(c.activeTotwWeek(),null);assert.equal(JSON.stringify(c.team),before);
 c.location.href='https://footera.test/index.html?totwPreview=999';assert.equal(c.requestedTotwPreview(),null);
 c.location.href='https://footera.test/index.html';assert.equal(c.requestedTotwPreview(),null);
});
test('exact mononyms and full aliases resolve, ambiguous partial surnames do not',()=>{
 const c=setup(),isco=c.team.players.find(p=>p.names[0]==='Isco');
 assert.equal(c.totwAliasMatch({name:'Isco'},isco),100);
 assert.equal(c.totwAliasMatch({name:'Francisco Román Alarcón Suárez'},isco),100);
 assert.equal(c.totwAliasMatch({name:'Alarcón'},isco),0);
});
