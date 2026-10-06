/* Deterministic frame capture of the production play() loop inside the actual
 * Footera match fixture. The capture clock is frozen, including watchdogs; real watchdogs run in the
 * companion browser suite. PreserveDrawingBuffer prevents an empty GPU readback. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,fixture,force}=require('./3d-highlights.browser.cjs');
const out=path.join(__dirname,'../test-artifacts');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const evidence=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)}});
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url);
  await page.evaluate(()=>{const original=requestAnimationFrame;window.qaPresent=()=>new Promise(resolve=>original(()=>original(resolve)));window.qaDraw=t=>new Promise(resolve=>original(()=>{qaStep(t);resolve()}));window.qaFrames=new Map();let id=1000000;window.qaHold=false;window.requestAnimationFrame=cb=>qaHold?(qaFrames.set(++id,cb),id):original(cb);const cancel=cancelAnimationFrame;window.cancelAnimationFrame=i=>qaFrames.delete(i)||cancel(i);const timeout=setTimeout,clear=clearTimeout;window.qaTimers=new Map();window.setTimeout=(cb,ms,...args)=>qaHold&&ms>=12000?(qaTimers.set(++id,cb),id):timeout(cb,ms,...args);window.clearTimeout=i=>qaTimers.delete(i)||clear(i);window.qaStep=t=>{const callbacks=[...qaFrames.values()];qaFrames.clear();callbacks.forEach(cb=>cb(t))}});
  async function capture(name,type,time,period=1,width=1280,configuredKits=false){
   await page.setViewportSize({width,height:1000});await fixture(page);
   if(configuredKits)await page.evaluate(()=>{
    // Reproduce the saved FC Gerlies-style dark green/bordeaux diagonal kit at
    // kickoff; V21.04 intentionally ignores later profile mutations mid-match.
    match.kickoffKits={
     home:{pattern:'diagonal',shirtPrimary:'#053300',shirtSecondary:'#800000',shorts:'#111714',socks:'#ffffff'},
     away:{pattern:'halves',shirtPrimary:'#f1f4f2',shirtSecondary:'#173627',shorts:'#f1f4f2',socks:'#173627'}
    };
   });
   await page.evaluate(p=>{match.halftimeLogged=p>1;match.extraTimeStarted=p>2;match.extraTimeBreakLogged=p>3;match.minute=p===1?38:p===2?67:p===3?98:113;updateMatchUI();qaFrames.clear();qaHold=true},period);
   // The real simulation fixture creates the immutable authoritative event.
   await force(page,type);await page.waitForSelector('.fh3d canvas');const sharp=await page.locator('.fh3d canvas').evaluate(c=>({bw:c.width,bh:c.height,cw:c.clientWidth,ch:c.clientHeight}));assert.ok(sharp.bw>=sharp.cw*1.9&&sharp.bh>=sharp.ch*1.9,'high-DPI backing buffer: '+JSON.stringify(sharp));
   await page.evaluate(async()=>{document.getElementById('matchLiveStage').scrollIntoView({block:'center',behavior:'instant'});await qaPresent();await qaDraw(0)});await page.evaluate(async t=>{await qaPresent();await qaDraw(t*1000);await qaPresent()},time);
   if(process.env.FOOTERA_RENDER_DEBUG)console.log(await page.evaluate(()=>{const c=document.querySelector('.fh3d canvas'),gl=c.getContext('webgl2'),pixels=new Uint8Array(4);gl.readPixels(c.width/2,c.height/2,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return{frames:qaFrames.size,period:document.querySelector('.fh3d').dataset,attrs:gl.getContextAttributes(),pixel:Array.from(pixels),data:c.toDataURL().length,rect:c.getBoundingClientRect().toJSON(),style:getComputedStyle(c).visibility,canvas:[c.width,c.height],lost:gl.isContextLost()}}));
   const clip=await page.locator('#matchLiveStage').boundingBox();const bytes=await page.screenshot({path:path.join(out,name+'.png'),clip});const png={data:bytes.toString('base64')};
   const pitchCoverage=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let green=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]>pixels[i]*1.12&&pixels[i+1]>pixels[i+2]*1.12&&pixels[i+1]>50)green++;return green/(pixels.length/4)},png.data);assert.ok(pitchCoverage>.2,'nonempty pitch pixels: '+name);
   const state=await page.evaluate(()=>({period:document.querySelector('.fh3d').dataset.period,direction:document.querySelector('.fh3d').dataset.direction,clock:document.getElementById('matchMinute').textContent,highlight:document.querySelector('.fh3d-brand small').textContent,goals:match.goalEvents.length,shots:match.shotEvents.length}));
   assert.equal(Number(state.period),period);assert.equal(Number(state.direction),period%2?1:-1);assert.ok(state.highlight.endsWith(state.clock));evidence.push({name,type,time,width,...state});
   await page.evaluate(()=>{qaStep(10401);qaHold=false});await page.waitForSelector('.fh3d',{state:'detached'});await page.evaluate(()=>stopMatchTimer());
  }
  if(!process.env.FOOTERA_GEOMETRY_ONLY){
  if(!process.env.FOOTERA_SKIP_CAPTURES){
  await capture('01-open-play','goal',1.3);
  await capture('02-penalty-area','goal',4.8);
  await capture('03-goal-net','goal',6.86);
  await capture('04-keeper-save','big_chance_saved',6.65);
  await capture('05-home-first-half','goal',4.8,1);
  await capture('06-home-second-half','goal',4.8,2);
  await capture('07-mobile-open-play-390','goal',2,1,390);
  await capture('08-mobile-save-390','big_chance_saved',6.82,2,390);
  await capture('09-mobile-configured-kits-390','goal',2.7,1,390,true);
  }
  // High-DPI quality is verified by the captures above. The software-only CI GPU
  // is not representative of a capable handset for a real-time DPR 2 run, so the
  // watchdog/lifecycle check below uses a 1x backing buffer while remaining STANDARD.
  await page.evaluate(()=>Object.defineProperty(window,'devicePixelRatio',{configurable:true,get:()=>1}));
  // STANDARD also has to complete in real time, without an abort or fallback.
  await page.setViewportSize({width:390,height:844});await fixture(page);await force(page,'big_chance_saved');await page.waitForSelector('.fh3d canvas');
  assert.equal(await page.locator('.fh3d').getAttribute('data-quality'),'standard');
  await page.waitForSelector('.fh3d',{state:'detached',timeout:18000});
  const natural=await page.evaluate(()=>({disabled:match3DQueue.disabled,pending:match.highlight3DPending,timer:matchTimer!==null,shots:match.shotEvents.length}));
  assert.deepEqual(natural,{disabled:false,pending:false,timer:true,shots:1});await page.evaluate(()=>stopMatchTimer());
  // Sustained <4fps, driven only by RAF timestamps, must release the real bridge.
  await fixture(page);await page.evaluate(()=>{qaHold=true;qaFrames.clear()});await force(page,'big_chance_saved');await page.waitForSelector('.fh3d canvas');
  await page.evaluate(()=>{qaStep(0);for(let i=1;i<=26;i++)qaStep(i*300);qaHold=false});await page.waitForSelector('.fh3d',{state:'detached'});
  assert.ok(await page.evaluate(()=>match3DQueue.disabled&&!match.highlight3DPending&&matchTimer!==null&&match.home===0&&match.shotEvents.length===1));await page.evaluate(()=>stopMatchTimer());
  }
  // Independently inspect actual rendered meshes, projection and glove contact.
  const checks=await page.evaluate(async()=>{
   const originalRandom=Math.random;let randomCalls=0;Math.random=()=>{randomCalls++;return originalRandom()};
   const T=await import('./vendor/three/three.module.min.js'),M=await import('./3d-highlights-scene.mjs?v=2105'),rows=[];
   const canvas=document.createElement('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:false});renderer.setPixelRatio(1);
   for(const weak of [true,false])for(const period of [1,2,3,4]){
    const event=FooteraHighlights.snapshot({id:'qa',type:'big_chance_saved',playerName:'Jamal Musiala',keeperName:'Mike Maignan',team:'home',period});
    const world=M.makeScene(renderer,event,weak);world.resize(390,300);
    for(const time of [0,2,4.8,5.4,6.65,8.5]){world.update(time);rows.push({scenario:'baseline',weak,period,time,...world.inspect()})}world.dispose();
   }
   for(const sequence of M.PLAY_SEQUENCES){
    const event=FooteraHighlights.snapshot({id:'seq-'+sequence,type:'goal',playerName:'Jamal Musiala',team:'home',period:1,sequence});
    const world=M.makeScene(renderer,event,false);world.resize(390,300);
    for(const time of [2.7,4.3,5.35]){world.update(time);rows.push({scenario:'sequence',weak:false,period:1,time,...world.inspect()})}world.dispose();
   }
   renderer.dispose();renderer.forceContextLoss();Math.random=originalRandom;if(randomCalls)throw Error('Renderer consumed simulation RNG: '+randomCalls);return rows;
  });
  fs.writeFileSync(path.join(out,'geometry-results.json'),JSON.stringify(checks,null,2));
  for(const row of checks){assert.ok(row.visibleFieldPlayers>=(row.scenario==='sequence'?10:12),JSON.stringify(row));assert.ok(row.cameraDistance>=61&&row.cameraDistance<=74);assert.ok(row.drawCalls<110,'batched renderer draw calls');assert.equal(Math.sign(row.goalScreenX-row.shooterScreenX),row.period%2?1:-1);if(row.time===6.65){const distance=Math.min(...row.gloves.map(g=>Math.hypot(...g.map((v,i)=>v-row.ball[i]))));assert.ok(distance<.16,'glove/ball contact: '+distance)}}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,process.env.FOOTERA_SKIP_CAPTURES?'render-check-results.json':'render-results.json'),JSON.stringify({screenshots:evidence,checks,errors},null,2));console.log('PASS STANDARD natural end, extreme-performance fallback and zero simulation RNG draws');console.log('PASS',evidence.length,'production screenshots;',checks.length,'WebGL geometry checks');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
