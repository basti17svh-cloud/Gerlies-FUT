const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=require('./helpers/app-html.cjs')(root);
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
const key=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function setup(){
 const context={Intl,URL,Date};vm.createContext(context);
 vm.runInContext([fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),section('const TOTW_WEEK_1=','let LIVE_TOTW='),section('const MOMENTUM_EVENT=','function completeEventRoster(').replace(/^const /gm,'var '),'var EVENTS=[...MOMENTUM_RELEASES,HALLOWEEN_EVENT,FLASHBACK_REUS_EVENT];var WEEKS=TOTW_WEEKS;'].join('\n'),context);
 return context;
}
const weekWindow=(c,team)=>[Date.parse(team.releaseDate+'T19:00:00+02:00')-36e5*2,Date.parse(c.totwAddCalendarDays(team.releaseDate,7)+'T19:00:00+02:00')];
test('from TOTW 6 on, nobody appears in two consecutive weeks and the release gate enforces it',()=>{
 const c=setup();
 for(const team of c.WEEKS.filter(w=>Number(w.id)>=6)){
  const prev=c.WEEKS.find(w=>Number(w.id)===Number(team.id)-1),before=new Set(prev.players.map(p=>key(p.names[0])));
  assert.equal(team.players.map(p=>p.names[0]).filter(n=>before.has(key(n))).join(', '),'',`TOTW ${team.id}`);
  const clone={...team,sourceStatus:'admin-approved',players:[...team.players.slice(1),{...prev.players.find(p=>p.position===team.players[0].position)}]};
  assert.ok(c.totwRosterErrors(clone).includes('Kein Spieler zwei Wochen hintereinander'));
 }
});
test('from TOTW 6 on, no TOTW player is part of a promo event or event SBC running in the same week',()=>{
 const c=setup();
 for(const team of c.WEEKS.filter(w=>Number(w.id)>=6)){
  const [from,to]=weekWindow(c,team);
  const running=c.EVENTS.filter(e=>Date.parse(e.activeFrom)<to&&Date.parse(e.activeUntilAt)>from);
  const busy=new Set(running.flatMap(e=>[...(e.players||[]),...(e.sbcPlayer?[e.sbcPlayer]:[])]).flatMap(p=>[p.name,...(p.names||[])]).map(key));
  assert.equal(team.players.map(p=>p.names[0]).filter(n=>busy.has(key(n))).join(', '),'',`TOTW ${team.id}`);
 }
});
test('from TOTW 6 on, every TOTW card beats the same player\'s earlier special cards in rating and every face stat',()=>{
 const c=setup();
 for(const team of c.WEEKS.filter(w=>Number(w.id)>=6)){
  const released=Date.parse(team.releaseDate+'T19:00:00+02:00');
  const earlier=[
   ...c.WEEKS.filter(w=>Number(w.id)<Number(team.id)).flatMap(w=>w.players.map(p=>({src:`TOTW ${w.id}`,id:String(p.eaId||''),names:p.names,ovr:p.ovr,pos:p.position,stats:p.stats}))),
   ...c.EVENTS.filter(e=>Date.parse(e.activeFrom)<released).flatMap(e=>[...(e.players||[]),...(e.sbcPlayer?[e.sbcPlayer]:[])].map(p=>({src:e.id,id:String(p.pid||''),names:[p.name,...(p.names||[])],ovr:p.ovr,pos:p.position,stats:p.stats})))
  ];
  const problems=[];
  for(const p of team.players){
   const keys=new Set(p.names.map(key));
   for(const old of earlier.filter(o=>(p.eaId&&o.id===String(p.eaId))||o.names.some(n=>keys.has(key(n))))){
    if(!(p.ovr>old.ovr))problems.push(`${p.names[0]} ${p.ovr} <= ${old.src} ${old.ovr}`);
    if(Array.isArray(old.stats)&&(old.pos==='GK')===(p.position==='GK')&&old.stats.some((v,i)=>p.stats[i]<v))problems.push(`${p.names[0]} stats below ${old.src}`);
   }
  }
  assert.equal(problems.join('; '),'',`TOTW ${team.id}`);
 }
});

test('TOTW 7 is approved but only becomes active at 19:00 Berlin on 28 October 2026',()=>{
 const c=setup(),team=c.WEEKS.find(w=>Number(w.id)===7);
 assert.ok(team,'TOTW 7 is present');
 assert.equal(team.sourceStatus,'admin-approved');
 assert.equal(team.releaseDate,'2026-10-28');
 assert.equal(c.totwRosterErrors(team).length,0);
 assert.equal(c.activeTotwWeek(new Date('2026-10-28T17:59:59Z'))?.id,6);
 assert.equal(c.activeTotwWeek(new Date('2026-10-28T18:00:00Z'))?.id,7);
 assert.equal(c.latestPublishedTotw(new Date('2026-10-28T17:59:59Z'))?.id,6);
 assert.equal(c.latestPublishedTotw(new Date('2026-10-28T18:00:00Z'))?.id,7);
 assert.equal(c.activeTotwWeek(new Date('2026-11-04T17:59:59Z'))?.id,7);
 assert.equal(c.activeTotwWeek(new Date('2026-11-04T18:00:00Z')),null);
 const chosen=new Set(team.players.map(p=>String(p.eaId)));
 for(const prior of c.WEEKS.filter(w=>[5,6].includes(Number(w.id))))
  assert.ok(prior.players.every(p=>!chosen.has(String(p.eaId))),`TOTW 7 duplicates TOTW ${prior.id}`);
});

test('TOTW 7 portrait files are precached by the matching PWA release',()=>{
 const c=setup(),week=c.WEEKS.find(w=>w.id===7),worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(week&&week.players.length===18,'approved TOTW 7 is present');
 for(const player of week.players){
  const asset=`"./assets/footera/totw/7/${player.eaId}.png"`;
  assert.ok(worker.includes(asset),`missing PWA image: ${asset}`);
  assert.ok(fs.existsSync(path.join(root,`assets/footera/totw/7/${player.eaId}.png`)),`missing portrait file: ${player.eaId}`);
 }
 const source=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const build=source.match(/const GFUT_BUILD="V(\d+)\.(\d+)";/);
 assert.ok(build,'runtime build is present');
 const asset=build[1]+build[2].padStart(3,'0');
 assert.ok(index.includes(`src="./footera-app.js?v=${asset}"`),'app script revision matches runtime');
 assert.ok(worker.includes(`"./footera-app.js?v=${asset}"`),'PWA cache and index must load the same script revision');
});

test('TOTW 7 Balerdi keeps Roma and Serie A even with old or missing base data',()=>{
 const c=setup(),week=c.WEEKS.find(w=>w.id===7),index=week.players.findIndex(p=>p.eaId==='242835');
 vm.runInContext(section('function mergeTotwWeekBase(','function mergeTotwBase('),c);
 for(const base of [null,{id:'242835',team:'Marseille',league:"Ligue 1 McDonald's"}]){
  const card=c.mergeTotwWeekBase(week,base,null,index);
  assert.equal(card.team,'Roma');assert.equal(card.league,'Serie A');
  assert.equal(card.teamId,'52');assert.match(card.clubLogo,/\/52\.png$/);
 }
});

test('server Pick catalog includes every eligible approved TOTW 7 card with Berlin release times',()=>{
 const c=setup(),week=c.WEEKS.find(w=>w.id===7);
 const sql=fs.readFileSync(path.join(root,'online/footera-pick-catalog.sql'),'utf8');
 const rows=sql.split('\n').filter(line=>line.startsWith("('totw:7:"));
 const eligible=week.players.filter(p=>p.ovr>=85);
 assert.equal(rows.length,eligible.length);
 for(const p of eligible){
  const row=rows.find(line=>line.startsWith(`('totw:7:${p.eaId}',`));
  assert.ok(row,`missing server Pick card ${p.eaId}`);
  assert.ok(row.includes("'2026-10-28 19:00'::timestamp at time zone 'Europe/Berlin'"));
  assert.ok(row.includes("interval '7 days'"));
  assert.ok(row.includes(`"displayRating":${p.ovr}`));
  assert.ok(row.includes(`"eventStats":${JSON.stringify(p.stats)}`));
 }
});
