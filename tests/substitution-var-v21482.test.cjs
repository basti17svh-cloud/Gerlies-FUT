// V21.482 Wechsel + VAR: a substitution ceremony at the touchline (fourth
// official, LED board, hand slap) and a rare VAR check that lets a goal stand
// or rules out a "goal" for offside. Presentation only; outcomes untouched.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('../3d-highlights.js'),A=require('../footera-match-actions.js');

test('substitution ceremony: human speeds, no collision, board and camera',async()=>{
 const C=await import('../3d-ceremony.mjs');
 assert.ok(C.CEREMONY_KINDS.includes('substitution'));
 assert.equal(C.ceremonyEnd('substitution'),C.SUB_TIMES.end);
 for(const i of [0,1,15]){
  let p=C.ceremonyActor('substitution',i,0);
  for(let n=1;n<=980;n++){const t=n/100,q=C.ceremonyActor('substitution',i,t);
   assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.z),'actor '+i+' finite');
   assert.ok(Math.hypot(q.x-p.x,q.z-p.z)/.01<8,'actor '+i+' speed at '+t);p=q}
 }
 for(let n=0;n<=980;n++){const t=n/100,a=C.ceremonyActor('substitution',0,t),b=C.ceremonyActor('substitution',1,t);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.85,'in/out apart at '+t)}
 assert.equal(C.subBoardRaise(0),0);assert.ok(C.subBoardRaise(3)>.99);assert.ok(C.subBoardRaise(9.6)<.01);
 assert.ok(C.subHighFive(C.SUB_TIMES.meet+.27)>.95&&C.subHighFive(2)===0);
 // The official stands at the touchline; the substitute runs onto the pitch.
 assert.ok(Math.abs(C.SUB_OFFICIAL[0]-34)<1);
 assert.ok(C.ceremonyActor('substitution',0,C.SUB_TIMES.end).x<30);
 for(const t of [0,2,4.5,6,9])assert.match(C.ceremonyCamera('substitution',t).phase,/substitution/);
});

test('substitution snapshot keeps names and shirt numbers only',()=>{
 const s=H.snapshot({id:'s1',type:'ceremony',ceremony:'substitution',minute:61,team:'home',playerName:'Jamal Musiala',outName:'<b>Thomas Müller</b>',inNumber:42,outNumber:250});
 assert.equal(s.ceremony,'substitution');assert.equal(s.outName,'bThomas Müller/b');assert.equal(s.inNumber,42);assert.equal(s.outNumber,0);
 assert.equal(H.snapshot({id:'x',type:'goal',varCheck:'maybe'}).varCheck,'');
});

test('VAR offside scenes: every pool scene exists and the scorer ends up beyond the line',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 assert.ok(H.VAR_OFFSIDE_SCENES.length>=10);
 const ids=new Set([...H.PLAYBOOK_SCENES,...H.VISUAL_SCENES].map(v=>v.id));
 for(const seq of H.VAR_OFFSIDE_SCENES){
  assert.ok(ids.has(seq),seq+' exists');
  const g=S.varGeometry(seq,'offside');
  assert.ok(g&&g.pass>0,seq+' pass');
  assert.ok(g.nudge>=0&&g.nudge<=2.4,seq+' nudge '+g.nudge);
  assert.ok(g.scorerZ-g.nudge<g.lastDefender-.3,seq+' offside after nudge');
  assert.equal(S.varGeometry(seq,'stands').nudge,0,seq+' no nudge when the goal stands');
 }
 const used=new Set();
 for(let n=0;n<60;n++){const p=H.choosePresentation({id:'v'+n,minute:n,type:'big_chance_missed',varCheck:'offside',playerName:'P'+n});assert.ok(H.VAR_OFFSIDE_SCENES.includes(p.sequence),p.sequence);used.add(p.sequence)}
 assert.ok(used.size>=8,'variety '+used.size);
});

test('VAR plan: stable hash, rare, never on set pieces or fouls',()=>{
 const orig=Math.random;let draws=0;Math.random=()=>{draws++;return .5};
 let stands=0,offside=0;
 try{for(let n=0;n<4000;n++){if(A.varPlan('goal','g|'+n,{actionKind:'through'})==='stands')stands++;if(A.varPlan('miss','m|'+n,{actionKind:'cross'})==='offside')offside++}}
 finally{Math.random=orig}
 assert.equal(draws,0);
 assert.ok(stands>4000*.05&&stands<4000*.13,'stands '+stands);
 assert.ok(offside>4000*.09&&offside<4000*.19,'offside '+offside);
 for(let n=0;n<300;n++){
  assert.equal(A.varPlan('goal','k'+n,{actionKind:'through',sceneKind:'corner'}),'');
  assert.equal(A.varPlan('miss','k'+n,{actionKind:'cross',creationType:'penalty'}),'');
  assert.equal(A.varPlan('miss','k'+n,{actionKind:'through',foul:true}),'');
  assert.equal(A.varPlan('miss','k'+n,{actionKind:'longshot'}),'');
 }
});

test('match bridge: substitutions are queued from the sim tick without RNG, VAR at most once per match',()=>{
 const hl=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
 const at=hl.indexOf('function queueMatchSubstitutions3D');assert.ok(at>0);
 const body=hl.slice(at,hl.indexOf('\n}',at));
 assert.doesNotMatch(body,/Math\.random/);assert.match(body,/ceremony:'substitution'/);
 const app=fs.readFileSync(path.join(__dirname,'../footera-app.js'),'utf8');
 assert.match(app,/queueMatchSubstitutions3D\(\)/);
 assert.match(app,/varOffsideShown/);assert.match(app,/varStandsShown/);
});
