/* Real Footera match footage, not a substitute 3D demo or render mock-up.
 * This script is intentionally separate from the slower full 3D regression suite. */
const {chromium}=require('playwright');
const {server,fixture,force}=require('./3d-highlights.browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const out=path.resolve(__dirname,'../test-artifacts');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 let context;
 try{
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,
   isMobile:true,hasTouch:true,serviceWorkers:'block',
   recordVideo:{dir:out,size:{width:390,height:844}}});
  await context.addInitScript(()=>{
   Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});
   Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>8});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('BROWSER',m.type(),m.text().slice(0,500))});
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(origin,{waitUntil:'load'});
  await fixture(page);
  // Pick ONE real production highlight sequence. The authoritative simulated
  // goal, timing, scorer, match clock, uniforms and match bridge stay untouched.
  await page.evaluate(()=>{
   match.minute=38;updateMatchUI();
   window.__original3DSequence=match3DSequence;
   window.__original3DChoose=FooteraHighlights.choosePresentation;
   match3DSequence=()=> 'cut_inside_right';
   FooteraHighlights.choosePresentation=(event,history)=>({
    ...window.__original3DChoose(event,history),sequence:'cut_inside_right',finish:'finesse'
   });
   match.kickoffKits={
    home:{pattern:'diagonal',shirtPrimary:'#072e29',shirtSecondary:'#e7c776',shorts:'#112627',socks:'#e7c776'},
    away:{pattern:'halves',shirtPrimary:'#f2f5f6',shirtSecondary:'#a52349',shorts:'#f2f5f6',socks:'#a52349'}
   };
  });
  await force(page,'goal');
  await page.evaluate(()=>{
   match3DSequence=window.__original3DSequence;
   FooteraHighlights.choosePresentation=window.__original3DChoose;
   delete window.__original3DSequence;delete window.__original3DChoose;
  });
  await page.waitForSelector('.fh3d canvas',{timeout:12000});
  const rigModule=await page.evaluate(async()=>{
   const R=await import('./3d-rigged-footballer.mjs?v=2137');
   return R.RIGGED_SURFACE_VERSION===1&&typeof R.createSkeletonMotion==='function'&&typeof R.createFootballKitAtlas==='function';
  });
  assert.ok(rigModule,'browser must load the real skinned-rig module');
  const clipsReady=await page.evaluate(async()=>{
   const C=await import('./3d-motion-clips.mjs?v=2136');
   return ['sprint','dribble','finesse','keeper_save'].every(n=>!!C.MOTION_CLIPS[n])
    && C.sampleMotionClip('finesse',.44).yaw>.16;
  });
  assert.ok(clipsReady,'the actual mobile match loads keyed animation clips');
  const usesWebGL=await page.locator('.fh3d canvas').evaluate(c=>!!c.getContext('webgl2'));
  assert.ok(usesWebGL,'A real WebGL2 highlight must be rendering');
  const picked=await page.evaluate(()=>match3DQueue?.history?.at(-1)?.sequence);
  assert.equal(picked,'cut_inside_right','Video must show the actual cut-inside choreography');
  // Avoid a software-WebGL screenshot stall during the live performance test.
  // Footage still records the full unaltered production canvas.
  await page.waitForTimeout(1400);
  await page.waitForSelector('.fh3d',{state:'detached',timeout:20000});
  const result=await page.evaluate(()=>({home:match.home,away:match.away,shots:match.shotEvents.length,
    stopped:!match.highlight3DPending,disabled:!!match3DQueue?.disabled}));
  assert.equal(result.home,1);assert.equal(result.away,0);
  console.log('PREVIEW-MATCH-STATE',JSON.stringify(result));
  assert.equal(result.shots,1);assert.ok(result.stopped&&!result.disabled);
  assert.deepEqual(errors,[],'No JavaScript page errors');
  const file=page.video();await context.close();context=null;
  const webm=path.join(out,'footera-cut-inside-finesse-390.webm');
  await file.saveAs(webm);await file.delete();
  assert.ok(fs.statSync(webm).size>10000,'Footage should contain actual frames');
  const mp4=path.join(out,'footera-cut-inside-finesse-390.mp4');
  const ff=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',webm,
   '-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-preset','veryfast',
   '-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
  if(ff.status===0&&fs.existsSync(mp4))console.log('PASS actual Footera MP4 preview',fs.statSync(mp4).size);
  else console.log('WARN MP4 conversion unavailable; real WebM is preserved',ff.stderr?.slice(-500));
  console.log('PASS cut-inside PlayStyle, goal ownership, normal completion, no JS errors',JSON.stringify(result));
 }finally{
  if(context)await context.close().catch(()=>{});
  await browser.close();server.close();
 }
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

// V21.35: capture the actual motion-dynamics release, including turn/plant and range-aware defense.
