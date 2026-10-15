/* Real WebGL play() lifecycle: cold start, stalled RAF, complete build-up,
 * deferred result reveal and cancellation. No match/account writes. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {server}=require('./3d-highlights.browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url+'/3d-highlights.css');
  await page.setContent('<link rel="stylesheet" href="/3d-highlights.css"><div id="match"><div id="matchLiveStage" style="position:relative;width:390px;height:560px"></div></div>');
  await page.addScriptTag({url:url+'/3d-highlights.js'});
  const results=await page.evaluate(async()=>{
   Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>4});
   const M=await import('./3d-highlights-scene.mjs');
   await M.prepareFooteraPlayerModel();
   const frames=new Map();let id=0;
   window.requestAnimationFrame=cb=>(frames.set(++id,cb),id);
   window.cancelAnimationFrame=i=>frames.delete(i);
   const step=now=>{const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(now));return Number(document.querySelector('.fh3d')?.dataset.playbackTime)};
   const results=[];
   for(const [type,sequence] of [['goal','central'],['ball_won','defense_interception']]){
    const signal=new AbortController();
    const event=FooteraHighlights.snapshot({id:type,type,sequence,minute:27,team:'home',period:1,playerName:'Musiala',defenderName:'Tah',defenseKind:'interception',playSeconds:8});
    const playing=M.play(event,signal.signal);
    const first=step(performance.now()),ready=!!document.querySelector('.fh3d-ready');
    let now=performance.now()+6000;
    const afterStall=step(now);
    // 6.6 visible seconds in total. Both actions must still be ahead.
    for(let i=0;i<65;i++){now+=100;step(now)}
    const beforeAction=Number(document.querySelector('.fh3d').dataset.playbackTime);
    const revealedEarly=!!document.querySelector('.fh3d-name').textContent;
    for(let i=0;i<8;i++){now+=100;step(now)}
    const afterAction=Number(document.querySelector('.fh3d').dataset.playbackTime);
    signal.abort();const outcome=await playing;
    results.push({type,first,ready,afterStall,beforeAction,afterAction,revealedEarly,outcome,removed:!document.querySelector('.fh3d')});
   }
   return results;
  });
  for(const r of results){
   const action=r.type==='ball_won'?4.4:5.4;
   assert.equal(r.first,0);assert.ok(r.ready);assert.ok(r.afterStall<.1);
   assert.ok(r.beforeAction<action);assert.ok(r.afterAction>action);assert.equal(r.revealedEarly,false);
   assert.equal(r.outcome,'skipped');assert.ok(r.removed);
   console.log('PASS actual WebGL start, seven-second build-up and cancellation',JSON.stringify(r));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
