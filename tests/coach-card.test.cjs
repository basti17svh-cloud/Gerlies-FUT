'use strict';
// V21.456 Trainerkarte: own Footera card for the coach, rating and stats from what the club really did. Only reads the save.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(trophies=0){
 const ctx={window:{FooteraMuseum:{trophies:()=>Array(trophies).fill({})}},console,Math,JSON,Number,String,Array,Object};
 vm.createContext(ctx);vm.runInContext(read('footera-coach-card.js'),ctx);return ctx.window.FooteraCoachCard;
}
const H=(result,gf,ga)=>({result,gf,ga});
const save=(w,d,l,extra={})=>({stats:{matches:w+d+l,wins:w,draws:d,losses:l},clubMatchHistory:[...Array(w)].map(()=>H('win',3,1)).concat([...Array(d)].map(()=>H('draw',1,1)),[...Array(l)].map(()=>H('loss',0,2))),profile:{username:'Basti',clubName:'FC Gerlies'},...extra});

test('coach card: a new coach starts as bronze newcomer',()=>{
 const d=load().data({});
 assert.equal(d.ovr,46);assert.equal(d.cls,'bronze');assert.equal(d.type.title,'Neu an der Seitenlinie');
 assert.equal(d.name,'Trainer');assert.equal(d.stats.length,6);
 assert.deepEqual([...d.stats.map(s=>s.key)],['SIE','OFF','DEF','ERF','POK','SER']);
 for(const s of d.stats)assert.ok(s.value>=1&&s.value<=99);
});

test('coach card: wins, titles and Rivals division lift the card through the tiers, save untouched',()=>{
 const C=load(0),mid=save(30,10,10),before=JSON.stringify(mid);
 const a=C.data(mid);assert.equal(JSON.stringify(mid),before,'save is only read');
 assert.ok(a.ovr>=60&&a.ovr<75,'50 matches at 60 % wins is silver range: '+a.ovr);
 const top=load(9).data(save(220,40,40,{rivals:{division:1}}));
 assert.ok(top.ovr>=88,'long, successful career with titles is a legend: '+top.ovr);
 assert.equal(top.cls,'icon');assert.equal(top.tierLabel,'Trainer-Legende');
 assert.equal(top.name,'Basti');assert.equal(top.cups,9);
 const worse=C.data(save(10,10,30));assert.ok(worse.ovr<a.ovr,'losing coach ranks lower');
 const run=C.data({clubMatchHistory:[H('win',1,0),H('win',1,0),H('loss',0,1),...Array(6).fill(H('win',2,0))],stats:{}});
 assert.equal(run.stats.find(s=>s.key==='SER').detail,'6 Siege am Stück (Rekord)');
 assert.equal(run.matches,9);
});

test('coach card: rating never drops below 40 or above 99, next upgrade is reachable by winning',()=>{
 const C=load(30);
 for(const [w,d,l] of [[0,0,200],[1000,0,0],[3,3,3],[0,1,0]]){
  const s=save(w,d,l,{rivals:{division:w>500?1:10}}),x=C.data(s);
  assert.ok(x.ovr>=40&&x.ovr<=99,`${w}-${d}-${l}: ${x.ovr}`);
  const n=C.next(s);
  if(x.ovr<99&&n.rating){assert.ok(n.rating.ovr>x.ovr);assert.ok(n.rating.wins>=1)}
 }
 const n=load(0).next(save(20,5,5));
 assert.ok(n.rating&&n.rating.wins<=10,'a normal coach sees the next point within a few wins');
 assert.ok(n.tier&&n.tier.at>load(0).data(save(20,5,5)).ovr);
});

test('coach card: type follows the strongest stat; pill: intro once, then only on upgrade',()=>{
 const C=load(0);
 const goals=C.data({stats:{matches:40,wins:20,draws:10,losses:10},clubMatchHistory:Array(40).fill(H('draw',4,4))});
 assert.equal(goals.type.title,'Offensivgenie');
 const d={ovr:70};
 assert.equal(C.pillFor({},d).kind,'intro');
 assert.equal(C.pillFor({pillShown:true},d),null,'intro only once');
 assert.equal(C.pillFor({introduced:true,seen:70},d),null,'no pill without upgrade');
 const up=C.pillFor({introduced:true,seen:68},d);assert.equal(up.kind,'upgrade');assert.match(up.html,/68 → <b>70<\/b>/);
});

test('coach card: card markup uses the normal card frame classes and escapes names',()=>{
 const C=load(0),d=C.data({profile:{username:'<b>x</b>'}});
 const html=C.cardHTML(d);
 assert.match(html,/class="custom-card bronze coach-card"/);assert.match(html,/<div class="pos">TRN<\/div>/);
 assert.ok(!html.includes('<b>x</b>'));
});

test('coach card: wired into the app shell, service worker and match end',()=>{
 const index=read('index.html'),sw=read('service-worker.js'),app=read('footera-app.js');
 assert.match(index,/footera-coach-card\.js\?v=21456/);assert.match(index,/footera-coach-card\.css\?v=21456/);
 assert.ok(sw.includes('"./footera-coach-card.js?v=21456"')&&sw.includes('"./footera-coach-card.css?v=21456"'));
 assert.ok(app.includes('globalThis.FooteraCoachCard?.afterMatch(match)'));
 assert.ok(index.indexOf('footera-museum.js')<index.indexOf('footera-coach-card.js'),'museum (titles) loads first');
 assert.ok(!read('footera-coach-card.js').includes('state.')||!/state\.[a-zA-Z]+\s*=[^=]/.test(read('footera-coach-card.js')),'never writes to the save');
});
