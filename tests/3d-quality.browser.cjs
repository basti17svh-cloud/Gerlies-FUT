// Focused regression: shed stadium work without blurring the match or its boards.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {server,fixture}=require('./3d-highlights.browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await page.addInitScript(()=>{
   Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
   Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});
  });
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url);await fixture(page);
  const result=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),M=await import('./3d-highlights-scene.mjs');
   const event=FooteraHighlights.snapshot({id:'quality-test',type:'goal',playerName:'Testspieler',team:'home',period:1,minute:41,sequence:'central'});
   const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(2);renderer.shadowMap.enabled=true;
   let scene;
   const render=renderer.render.bind(renderer);renderer.render=(s,c)=>{scene=s;render(s,c)};
   const world=M.makeScene(renderer,event,false,false,true);world.resize(390,300);
   const snapshot=()=>{
    const lights=[],boards=new Map();
    scene.traverse(o=>{
     if(o.isLight)lights.push([o.uuid,o.intensity]);
     for(const material of [].concat(o.material||[])){
      const m=material.map;
      if(m?.image?.width===2048&&m.image.height===256)boards.set(m.uuid,[m.uuid,m.image.width,m.image.height,m.anisotropy,m.minFilter,m.magFilter]);
     }
    });
    return {buffer:[renderer.domElement.width,renderer.domElement.height],shadows:renderer.shadowMap.enabled,lights,boards:[...boards.values()],...world.inspect()};
   };
   world.update(1);const before=snapshot();world.reduceQuality();world.update(1);const after=snapshot();
   world.update(2);const later=snapshot();world.dispose();renderer.dispose();renderer.forceContextLoss();
   // Trigger the actual frame-time policy, rather than only calling its helper.
   const original=requestAnimationFrame,cancel=cancelAnimationFrame,queue=new Map();let seq=0;
   window.requestAnimationFrame=fn=>(queue.set(++seq,fn),seq);window.cancelAnimationFrame=id=>queue.delete(id);
   const step=now=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(now))};
   const abort=new AbortController(),playing=M.play(event,abort.signal);
   step(performance.now());
   const canvas=document.querySelector('.fh3d canvas'),initial=[canvas.width,canvas.height];
   let now=performance.now();for(let i=0;i<40;i++){now+=60;step(now)}
   const adaptive={quality:document.querySelector('.fh3d')?.dataset.quality,buffer:[canvas.width,canvas.height]};
   abort.abort();await playing;window.requestAnimationFrame=original;window.cancelAnimationFrame=cancel;
   return {before,after,later,initial,adaptive};
  });
  const {before,after,later,initial,adaptive}=result;
  assert.ok(before.boards.length>=2,'Real perimeter board textures are present');
  for(const key of ['buffer','boards','lights','shadows','playerPositions','ball','fieldPlayers'])assert.deepEqual(after[key],before[key],key+' must remain unchanged');
  assert.ok(after.crowdFans<before.crowdFans*.4,'Spectator geometry reduced');
  assert.equal(after.crowdAnimated,0);assert.equal(after.crowdFlags,0);
  assert.equal(later.crowdSampleY,after.crowdSampleY,'Crowd animation work stopped');
  assert.notDeepEqual(later.ball,after.ball,'Match continues moving');
  assert.equal(adaptive.quality,'adaptive');assert.deepEqual(adaptive.buffer,initial,'Slow frames must not lower rendering resolution');
  console.log('PASS slow-frame adaptation: same resolution, board textures, lighting, shadows and players; reduced static crowd; match keeps moving');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
