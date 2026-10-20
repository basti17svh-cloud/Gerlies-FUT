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
  assert.deepEqual(team.players.map(p=>p.names[0]).filter(n=>before.has(key(n))),[],`TOTW ${team.id}`);
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
  assert.deepEqual(team.players.map(p=>p.names[0]).filter(n=>busy.has(key(n))),[],`TOTW ${team.id}`);
 }
});
