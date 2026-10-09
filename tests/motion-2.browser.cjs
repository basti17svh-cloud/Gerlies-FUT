/* Real WebGL Motion 2.0 A/B – same right-wing run and saved match outcome.
 * Two actual mobile browser recordings, NOT an illustrated mock-up.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1'),target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('missing');return}
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
 fs.createReadStream(target).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const makeContext=()=>browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
  const seek=async(page,seconds)=>page.evaluate(t=>{const s=document.querySelector('#time');s.value=String(t);s.dispatchEvent(new Event('input',{bubbles:true}))},seconds);
  const captures=[];
  for(const mode of ['old','new']){
   const ctx=await makeContext(),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/motion-lab.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__footeraMotionLab?.getState()?.metrics?.riggedActors,{timeout:25000});
   if(mode==='new')await page.locator('#pilot').click();
   await page.locator('#scene').selectOption('cut_inside_right');
   await seek(page,1.12);
   const first=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
   if(mode==='new'){
    assert.equal(first.motion2Stage,'first-touch');assert.ok(first.motion2Touch>.7);
    await page.screenshot({path:path.join(out,'motion-22-first-touch-new.png'),fullPage:true});
   }else await page.screenshot({path:path.join(out,'motion-22-first-touch-old.png'),fullPage:true});
   await seek(page,4.52);
   const aim=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
   if(mode==='new'){
    assert.equal(aim.motion2Stage,'spot-far-corner');assert.ok(aim.motion2Aim>.5);
    await page.screenshot({path:path.join(out,'motion-22-far-corner-new.png'),fullPage:true});
   }else await page.screenshot({path:path.join(out,'motion-22-far-corner-old.png'),fullPage:true});
   await seek(page,3.08);
   const plant=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
   if(mode==='new'){
    assert.equal(plant.motion2,true);
    assert.equal(plant.motion2Stage,'outside-foot-lock');
    assert.ok(plant.motion2CutBoot?.every(Number.isFinite));
    assert.ok(plant.motion2CutBoot[1]>-.12&&plant.motion2CutBoot[1]<.35,'outside ankle stays near planted turf: '+plant.motion2CutBoot[1]);
    await page.screenshot({path:path.join(out,'motion-2-cut.png'),fullPage:true});
   }else {assert.equal(plant.motion2,false);await page.screenshot({path:path.join(out,'motion-2-old-cut.png'),fullPage:true})}
   await seek(page,5.30);
   const shot=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
   if(mode==='new'){
    assert.equal(shot.motion2Stage,'shooting-plant');
    assert.ok(shot.motion2PlantBoot?.every(Number.isFinite));
    assert.ok(shot.motion2PlantBoot[1]>-.12&&shot.motion2PlantBoot[1]<.35,'shooting support ankle stays on pitch: '+shot.motion2PlantBoot[1]);
    await page.screenshot({path:path.join(out,'motion-2-shot.png'),fullPage:true});
   }else await page.screenshot({path:path.join(out,'motion-2-old-shot.png'),fullPage:true});
   await seek(page,6.65);
   const shotBall=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
   assert.ok(shotBall.every(Number.isFinite));
   captures.push({first,aim,plant,shot,shotBall});
   await seek(page,0);
   await page.locator('#toggle').click();
   // Capture one full authored 10.4-second highlight at native mobile width.
   await page.waitForTimeout(10850);
   assert.deepEqual(errors,[],'no WebGL/browser errors '+mode);
   const recording=page.video();
   await ctx.close();
   const filename=path.join(out,'motion-2-'+mode+'.webm');
   await recording.saveAs(filename);await recording.delete();
   assert.ok(fs.statSync(filename).size>12000,'video frames exist '+mode);
   console.log('PASS Motion 2.0 '+mode+' 390px WebGL video '+fs.statSync(filename).size+' bytes');
  }
  const [oldScene,newScene]=captures;
  assert.ok(Math.hypot(...newScene.first.squadMotion[0].map((v,i)=>v-oldScene.first.squadMotion[0][i]))>.10,'visible first-touch silhouette');
  assert.ok(Math.hypot(...newScene.aim.squadMotion[0].map((v,i)=>v-oldScene.aim.squadMotion[0][i]))>.10,'visible pre-shot silhouette');
  assert.ok(Math.hypot(...newScene.plant.squadMotion[0].map((v,i)=>v-oldScene.plant.squadMotion[0][i]))>.2,'visible 3D pose improvement');
  assert.ok(Math.hypot(...newScene.shot.squadMotion[0].map((v,i)=>v-oldScene.shot.squadMotion[0][i]))>.15,'shooting stance visibly differs');
  assert.ok(Math.hypot(...oldScene.shotBall.map((v,i)=>v-newScene.shotBall[i]))<1e-6,'same far-post result and ball flight');
  console.log('PASS Motion 2.2 A/B: first touch and pre-shot poses, identical ball flight');
  // V21.46: exercise all remaining mirrored and double-feint variants in
  // real WebGL with the identical camera, ball flight, 390px viewport.
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  try{
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/motion-lab.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__footeraMotionLab?.getState()?.metrics?.riggedActors,{timeout:25000});
   for(const sequence of ['cut_inside_left','double_feint_right','double_feint_left']){
    await page.locator('#scene').selectOption(sequence);
    await page.locator('#current').click();
    await seek(page,3.08);
    const before=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    await page.screenshot({path:path.join(out,'motion-21-'+sequence+'-old.png')});
    await page.locator('#pilot').click();
    await seek(page,3.08);
    const after=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(after.motion2,true,sequence+' enabled');
    assert.equal(after.motion2Stage,'outside-foot-lock');
    assert.equal(after.motion2Side,sequence.endsWith('_left')?-1:1);
    assert.ok(after.motion2CutBoot?.every(Number.isFinite),'mirrored planted ankle');
    assert.ok(after.motion2CutBoot[1]>-.16&&after.motion2CutBoot[1]<.39,'boot within grounded window '+sequence+': '+after.motion2CutBoot[1]);
    assert.ok(Math.hypot(...after.squadMotion[0].map((v,i)=>v-before.squadMotion[0][i]))>.16,'changed biomechanics '+sequence);
    await page.screenshot({path:path.join(out,'motion-21-'+sequence+'-new.png')});
    if(sequence.startsWith('double_feint')){
     await seek(page,2.22);
     const fake=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
     assert.equal(fake.motion2Stage,'sell-feint');
     assert.ok(fake.motion2Feint>.45,sequence+' sells a genuine feint');
    }
    await seek(page,5.40);
    const atContact=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.ok(atContact.motion2PlantBoot?.every(Number.isFinite));
    await seek(page,6.65);
    const ballB=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    await page.locator('#current').click();
    const ballA=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    assert.ok(Math.hypot(...ballA.map((v,i)=>v-ballB[i]))<1e-6,'same far-post flight '+sequence);
    console.log('PASS Motion 2.1 '+sequence+' matched ballistic outcome and mirrored plant');
   }
   // Motion 2.3 extends real gameplay beyond the winger-only pilot.
   for(const [sequence,t,field,phase,key] of [
    ['dribble',2.52,'motion23Brake','brake-to-control','brake'],
    ['dribble',3.25,'motion23Launch','accelerate-away','launch'],
    ['through_ball',4.56,'motion23Cushion','cushion-pass','receive']
   ]){
    await page.locator('#scene').selectOption(sequence);
    await page.locator('#current').click();await seek(page,t);
    const before=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(before.motion23,false,'baseline does not receive Motion 2.3');
    await page.screenshot({path:path.join(out,'motion-23-'+key+'-old.png')});
    await page.locator('#pilot').click();await seek(page,t);
    const after=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(after.motion23,true);
    assert.equal(after.motion23Phase,phase);
    assert.ok(after[field]>.7,sequence+' '+phase+' has visibly strong transition');
    assert.ok(Math.hypot(...after.squadMotion[0].map((v,i)=>v-before.squadMotion[0][i]))>.12,
      'Motion 2.3 silhouette differs in real WebGL');
    await page.screenshot({path:path.join(out,'motion-23-'+key+'-new.png')});
    await seek(page,6.65);
    const ballAfter=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    await page.locator('#current').click();
    const ballBefore=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    assert.ok(Math.hypot(...ballBefore.map((v,i)=>v-ballAfter[i]))<1e-6,'canonical ball flight unchanged '+sequence);
    console.log('PASS Motion 2.3 '+sequence+' '+phase+' matched ball flight and 390px pose');
   }
   // Motion 2.4–2.6: review defensive footwork, existing-action blocking
   // and post-shot recovery in the SAME real mobile WebGL scene.
   for(const scenario of [
    {name:'jockey-right',sequence:'double_feint_right',action:'jockey',at:3.25,key:'motionDuelShuffle',min:.08,actor:'defender'},
    {name:'jockey-left',sequence:'double_feint_left',action:'jockey',at:3.25,key:'motionDuelShuffle',min:.08,actor:'defender'},
    {name:'block',sequence:'cut_inside_right',action:'block_attempt',at:5.08,key:'motionDuelBlock',min:.10,actor:'defender'},
    {name:'recovery',sequence:'cut_inside_right',action:'close_down',at:6.08,key:'motionDuelRecovery',min:.10,actor:'defender'},
    {name:'shot-balance',sequence:'dribble',action:'jockey',at:6.25,key:'motionFinishBalance',min:.65,actor:'striker'}
   ]){
    await page.locator('#scene').selectOption(scenario.sequence);
    await page.locator('#defense').selectOption(scenario.action);
    await page.locator('#current').click();await seek(page,scenario.at);
    const before=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(before.motionDuels,false,scenario.name+' old pose has no Motion 2.6');
    await page.screenshot({path:path.join(out,'motion-26-'+scenario.name+'-old.png')});
    await page.locator('#pilot').click();await seek(page,scenario.at);
    const after=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(after.motionDuels,true,scenario.name+' enabled');
    assert.ok(after[scenario.key]>scenario.min,
      scenario.name+' active: '+scenario.key+'='+after[scenario.key]);
    const actor=scenario.actor==='defender'?(scenario.sequence.endsWith('_left')?9:10):0;
    const poseDiff=Math.hypot(...after.squadMotion[actor].map((v,i)=>v-before.squadMotion[actor][i]));
    assert.ok(poseDiff>.08,scenario.name+' posture visibly changes '+poseDiff);
    await page.screenshot({path:path.join(out,'motion-26-'+scenario.name+'-new.png')});
    await seek(page,6.65);
    const ballAfter=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    await page.locator('#current').click();
    const ballBefore=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
    assert.ok(Math.hypot(...ballBefore.map((v,i)=>v-ballAfter[i]))<1e-6,
      scenario.name+' cannot change goal flight');
    console.log('PASS Motion 2.6 '+scenario.name+' WebGL pose, same ball flight');
   }
   // Contact-accurate proof: a pose difference alone is NOT acceptance.
   // Both rendered feet and the staged ball must converge before a deflection.
   for(const scenario of [
    {name:'tackle-contact',sequence:'cut_inside_right',action:'slide_attempt',contact:3.55,check:3.62},
    {name:'blocked-shot',sequence:'cut_inside_right',action:'block_attempt',contact:5.74,check:5.76}
   ]){
    await page.locator('#scene').selectOption(scenario.sequence);
    await page.locator('#defense').selectOption(scenario.action);
    await page.locator('#pilot').click();
    await seek(page,scenario.contact);
    const collision=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(collision.motionDuelPreview,true,'only sandbox choreographs outcomes');
    assert.ok(collision.contactBallDistance<1.1,
      scenario.name+' defender must reach the actual ball: '+collision.contactBallDistance);
    await seek(page,scenario.check);
    const action=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    if(scenario.action==='slide_attempt'){
     assert.ok(Math.abs(action.contactTilt)>1.14,'torso must be near horizontal, not a sitting fall');
     assert.ok(action.contactExtension>1.7,'fully straightened slide into ball');
    }else{
     assert.ok(action.contactExtension>.95,'blocking leg extends across shot lane');
    }
    await page.screenshot({path:path.join(out,'motion-contact-'+scenario.name+'.png'),fullPage:true});
    await seek(page,scenario.action==='slide_attempt'?4.22:6.55);
    const deflected=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.equal(deflected.contactBallDeflected,true,'not a cosmetic block');
    assert.ok(deflected.ball[2]>-52,
      'contact demonstration must not show a goal after a successful defensive action');
    assert.equal(await page.locator('#outcome').isVisible(),true,'outcome must be readable');
    await page.screenshot({path:path.join(out,'motion-contact-'+scenario.name+'-result.png'),fullPage:true});
    await page.locator('#current').click();
    const same=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
    assert.ok(Math.hypot(...same.ball.map((v,i)=>v-deflected.ball[i]))<1e-6,
      'A/B share the same declared demo outcome');
    console.log('PASS '+scenario.name+': contact distance '+collision.contactBallDistance+
      ', full animation '+action.contactExtension+', actually deflected ball');
   }
   assert.deepEqual(errors,[],'live contact choreography has no browser exceptions');
  }finally{await ctx.close()}
  // True frame-by-frame evidence, NOT Playwright's wall-clock video.
  // SwiftShader may be 3 FPS. A screenshot forces the actual rendered canvas
  // at every seek time; no action can disappear between recording frames.
  const {createHash}=require('node:crypto');
  for(const [action,start,end,name] of [
   ['slide_attempt',2.66,4.68,'slide'],
   ['block_attempt',4.85,6.70,'block']
  ]){
   const movieCtx=await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true
   });
   const movie=await movieCtx.newPage(),errors=[];movie.on('pageerror',e=>errors.push(e.message));
   await movie.goto(origin+'/motion-lab.html',{waitUntil:'domcontentloaded'});
   await movie.waitForFunction(()=>!!window.__footeraMotionLab?.getState()?.metrics?.riggedActors,{timeout:25000});
   await movie.locator('#defense').selectOption(action);
   await movie.locator('#pilot').click();
   const dir=path.join(out,'contact-frames-'+name);
   fs.mkdirSync(dir,{recursive:true});
   const hashes=new Set(),frames=25;
   for(let i=0;i<frames;i++){
    const t=start+(end-start)*i/(frames-1);
    await seek(movie,t);
    const png=path.join(dir,String(i).padStart(4,'0')+'.png');
    await movie.locator('#picture').screenshot({path:png});
    assert.ok(fs.statSync(png).size>10000,'real rendered image '+name+' '+i);
    hashes.add(createHash('sha256').update(fs.readFileSync(png)).digest('hex'));
   }
   const final=await movie.evaluate(()=>window.__footeraMotionLab.getState());
   assert.ok(final.metrics.contactBallDeflected,
    name+' final frame must show the ball deflected');
   assert.ok(hashes.size>=20,'most frames must be visually distinct, not a static pose');
   assert.deepEqual(errors,[],name+' no WebGL browser exceptions');
   await movieCtx.close();
   console.log('PASS '+name+' 25 actual sequential WebGL canvas frames, '+hashes.size+' distinct');
  }

 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
