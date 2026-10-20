const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {server,fixture}=require('./3d-highlights.browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.FOOTERA_CHROMIUM?{executablePath:process.env.FOOTERA_CHROMIUM}:{}),args:['--no-sandbox','--no-zygote','--single-process','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url,{waitUntil:'load'});
  await page.evaluate(()=>{FooteraHighlights.Queue.prototype.enqueue=function(event){window.qaExtendedEvent=FooteraHighlights.snapshot(event);return false}});
  for(const [n,kind] of ['keeper_buildout','turnover_counter','corner','free_kick','penalty','throw_in'].entries()){
   const width=[360,390,412][n%3];await page.setViewportSize({width,height:844});await fixture(page);
   const proof=await page.evaluate(async({kind,n,width})=>{
    match.paused=false;match.halftimeLogged=n%3===1;match.minute=n%2?65:24;delete match.nextRestart;delete match.nextCounter;
    const away=n%2===1,side=away?'away':'home';
    if(['keeper_buildout','corner','throw_in'].includes(kind))match.nextRestart={side,kind,flank:n%2?'right':'left',at:match.minute};
    if(kind==='turnover_counter')match.nextCounter={side,at:match.minute};
    const original=FooteraMatchActions,random=Math.random;let draws=0;
    FooteraMatchActions={...original,goalChance:()=>1};Math.random=()=>++draws===3?(kind==='penalty'?.002:kind==='free_kick'?.02:.1):.1;
    try{simAttack(!away)}finally{FooteraMatchActions=original;Math.random=random}
    stopMatchTimer();dismissMatchGoalMoment(false);
    const shot=match.shotEvents.at(-1),event=window.qaExtendedEvent;
    // The scripted turnover counter is retired in 3D only (3d-highlights-match.js):
    // the match keeps its event, the highlight plays an ordinary attack instead.
    if(kind==='turnover_counter'){
     if(shot?.sceneKind!==kind||event?.sceneKind!==''||String(event?.sequence||'').startsWith('extended_'))throw Error('Counter not retired '+JSON.stringify({kind,event:event&&{sceneKind:event.sceneKind,sequence:event.sequence},shot:shot?.sceneKind}));
     return{kind,width,retired:true};
    }
    if(event?.sceneKind!==kind)throw Error('Wrong production event '+JSON.stringify({kind,event,shot}));
    const M=await import('../3d-highlights-scene.mjs?v=21160'),T=await import('../vendor/three/three.module.min.js');
    await M.prepareFooteraPlayerModel();
    const host=document.getElementById('matchLiveStage'),canvas=document.createElement('canvas');canvas.id='extended-proof';host.append(canvas);
    const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
    const world=M.makeScene(renderer,event,n%2===1,false,true,false,true,true);world.resize(width-16,500);
    const frames=[];for(const time of [0,1.7,3.5,5.2,5.4,6.65,8.5]){world.update(time);const x=world.inspect();frames.push({time,ball:x.ball,screen:x.ballScreen,visible:x.visibleFieldPlayers,phase:x.extendedPhase,keeper:x.buildKeeperPosition,positions:x.playerPositions,draws:x.drawCalls,goal:x.goalFrameScreen,shot:x.cameraShot});}
    world.update(kind==='throw_in'?.9:kind==='keeper_buildout'?.8:kind==='corner'?3.4:4.8);
    window.qaExtendedCleanup=()=>{world.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove()};
    return{kind,width,event,shot,frames};
   },{kind,n,width});
   if(process.env.FOOTERA_EXTENDED_PROOF)await page.locator('#extended-proof').screenshot({path:process.env.FOOTERA_EXTENDED_PROOF+'-'+kind+'.png'});
   if(proof.retired){console.log('PASS',kind,width,'retired in 3D, match event kept');continue}
   assert.equal(proof.shot.sceneKind,kind);assert.equal(proof.event.finish,proof.shot.finish);
   // Since 16.10 long highlights use the close 40 m TV camera. On a portrait
   // phone it follows the ball (and its taker) rather than showing the whole
   // block, and it frames the entire goal once the ball arrives.
   // V21.195: after a goal the scorer close-up (as in open play) takes over.
   for(const f of proof.frames){assert.ok(f.ball.every(Number.isFinite));if(f.time<5.4)assert.ok(f.visible>=1,kind+' actors '+f.visible);if(f.time>=6.65&&f.shot!=='scorer-close-up')for(const g of f.goal)assert.ok(Math.abs(g[0])<1&&Math.abs(g[1])<1,kind+' goal cropped');if(f.shot!=='scorer-close-up')assert.ok(Math.abs(f.screen[0])<1&&Math.abs(f.screen[1])<1,kind+' ball outside '+JSON.stringify([f.time,width,f.shot,f.screen]));}
   assert.ok(Math.max(...proof.frames.map(f=>f.visible))>=2,kind+' never shows a second player');
   if(kind==='keeper_buildout')assert.ok(proof.frames[0].keeper);
   if(kind==='turnover_counter'){assert.notEqual(proof.frames[0].phase.team,proof.event.team);assert.equal(proof.frames[3].phase.team,proof.event.team)}
   if(process.env.FOOTERA_EXTENDED_PROOF)await page.locator('#extended-proof').screenshot({path:process.env.FOOTERA_EXTENDED_PROOF+'-'+kind+'.png'});
   await page.evaluate(()=>qaExtendedCleanup());console.log('PASS',kind,width,proof.event.team,proof.event.attackDirection,proof.frames.map(x=>x.visible).join(','));
  }
  assert.deepEqual(errors,[]);console.log('PASS all six simulation → queue → WebGL paths');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
