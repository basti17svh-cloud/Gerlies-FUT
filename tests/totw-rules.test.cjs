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
