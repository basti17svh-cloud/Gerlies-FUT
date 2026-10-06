const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),H=require('../3d-highlights.js');
const event=(type='goal',id='one')=>({id,type,minute:67,team:'home',playerId:'p9',playerName:'Jamal Musiala'});
const turn=()=>new Promise(r=>setImmediate(r));
test('modes select all four important types; unknown future events safely fall back',()=>{
 assert.equal(H.getMode(),'important');for(const type of H.TYPES){assert.equal(H.accepts(type,'off'),false);assert.equal(H.accepts(type,'important'),true);assert.equal(H.accepts(type,'all'),true);assert.equal(H.accepts(type,'goals'),type==='goal')}
 assert.equal(H.accepts('corner','all'),false);
});
test('queue serializes, deduplicates and only passes immutable display snapshots',async()=>{
 const played=[],releases=[];let active=0,max=0,idle=0,busy=0;
 const q=new H.Queue({play:e=>{active++;max=Math.max(max,active);played.push(e);return new Promise(r=>releases.push(()=>{active--;r('played')}))},onBusy:()=>busy++,onIdle:()=>idle++});
 const live={...event(),match:{home:1}};assert.equal(q.enqueue(live),true);live.playerName='Changed';assert.equal(q.enqueue(live),false);q.enqueue(event('big_chance_saved','two'));
 await turn();assert.equal(played[0].playerName,'Jamal Musiala');assert.equal('match' in played[0],false);assert.ok(Object.isFrozen(played[0]));releases.shift()();await turn();releases.shift()();await turn();
 assert.equal(max,1);assert.equal(played.length,2);assert.equal(busy,1);assert.equal(idle,1);assert.equal(q.busy,false);
});
test('skip settles immediately even when rendering never resolves; event is never replayed',async()=>{
 let idle=0;const q=new H.Queue({play:()=>new Promise(()=>{}),onIdle:()=>idle++});q.enqueue(event());await turn();q.skip();await turn();assert.equal(idle,1);assert.equal(q.enqueue(event()),false);
});
test('load failures, context failures and watchdog timeouts return to fallback without hanging',async()=>{
 for(const play of [()=>{throw Error('WebGL unavailable')},()=>Promise.resolve('fallback'),()=>new Promise(()=>{})]){
  let idle=0,fail=0;const q=new H.Queue({play,timeout:15,onIdle:()=>idle++,onFallback:()=>fail++});q.enqueue(event());await new Promise(r=>setTimeout(r,30));assert.equal(idle,1);assert.equal(fail,1);assert.equal(q.disabled,true);assert.equal(q.enqueue(event('goal','next')),false);
 }
});
test('cancelling an old match prevents a stale completion resuming a new match',async()=>{
 let idle=0,resolve;const q=new H.Queue({play:()=>new Promise(r=>resolve=r),onIdle:()=>idle++});q.enqueue(event());await turn();q.cancel();resolve('played');await turn();assert.equal(idle,0);assert.equal(q.busy,false);
});
test('four trajectories share the entire build-up and have distinct physical endings',async()=>{
 const {ballPosition,cameraIndex}=await import('../3d-highlights-scene.mjs');
 for(const t of [0,1,2,3.09])for(const type of H.TYPES)assert.deepEqual(ballPosition(type,t),ballPosition('goal',t));
 const goal=ballPosition('goal',5),save=ballPosition('big_chance_saved',5.7),miss=ballPosition('big_chance_missed',5.7),post=ballPosition('shot_post',4.35),rebound=ballPosition('shot_post',5.7);
 assert.ok(goal[2]<-32&&goal[2]>-34&&Math.abs(goal[0])<3.66&&goal[1]<2.44);
 assert.ok(save[2]>-32);assert.ok(miss[0]>3.66&&miss[2]<-32);assert.ok(Math.abs(post[0]-3.66)<.2&&Math.abs(post[2]+32)<.2);assert.ok(rebound[2]>-32);
 for(const type of H.TYPES)assert.equal(cameraIndex(event(type)),cameraIndex(event('goal')),'camera must not disclose result');
});
test('Three resource UUIDs cannot consume the simulation random stream',async()=>{
 let calls=0;const original=Math.random;Math.random=()=>{calls++;return .5};
 try{const T=await import('../vendor/three/three.module.min.js');new T.Scene();new T.BoxGeometry();new T.MeshLambertMaterial();assert.equal(calls,0)}finally{Math.random=original}
});
test('current simulation reproduces pre-integration goals, shots, cards, fitness and RNG for 24 seeds',()=>{
 const old=require('node:child_process').execFileSync('git',['show','a5094f7:index.html'],{cwd:root,encoding:'utf8',maxBuffer:3e6});
 const current=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const fixtureSource=fs.readFileSync(path.join(__dirname,'matchday.test.cjs'),'utf8').split('function fixture(')[1].split("\ntest('")[0];
 function run(html,seed){
  const extract=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to,html.indexOf(from)));
  const fixture=vm.runInNewContext('(function fixture('+fixtureSource+')',{vm,extract,assert});const {ctx}=fixture(seed);
  let ticks=0;while(!ctx.match.finished&&ticks++<160){if(ctx.match.paused){ctx.match.paused=false;ctx.match.halftimeActive=false;ctx.match.forcedOut=null}ctx.simTick()}
  assert.ok(ctx.match.finished);const m=ctx.match;
  return JSON.parse(JSON.stringify({home:m.home,away:m.away,minute:m.minute,shots:m.shotEvents,goals:m.goalEvents,defense:m.defensiveEvents,red:m.redCards,yellow:m.yellowCards,fitness:m.fitnessLoss,nextRandom:ctx.Math.random()},(key,value)=>['highlightType','playerName'].includes(key)?undefined:value));
 }
 for(let seed=1;seed<=24;seed++)assert.deepEqual(run(current,seed),run(old,seed),'seed '+seed);
});
test('scripts, module, stylesheet and pinned Three are in the new offline shell; inline JS parses',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const file of ['3d-highlights.js?v=2090','3d-highlights-match.js?v=2090','3d-highlights-scene.mjs?v=2090','3d-highlights.css?v=2090','vendor/three/three.module.min.js'])assert.ok(sw.includes('./'+file),file);
 assert.ok(sw.includes('footera-v20-90'));assert.ok(html.includes('service-worker.js?v=2090'));
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
 for(const file of ['card-layout.css','legacy-card.css','chem-boosts.js','chem-boosts-ui.js','chem-boosts.css','playstyles.js','playstyles.css']){
  const old=require('node:child_process').execFileSync('git',['show','a5094f7:'+file],{cwd:root});assert.deepEqual(fs.readFileSync(path.join(root,file)),old,file+' remains byte-identical');
 }
});
