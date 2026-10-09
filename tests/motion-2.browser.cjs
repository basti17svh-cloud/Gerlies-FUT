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
   captures.push({plant,shot,shotBall});
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
  assert.ok(Math.hypot(...newScene.plant.squadMotion[0].map((v,i)=>v-oldScene.plant.squadMotion[0][i]))>.2,'visible 3D pose improvement');
  assert.ok(Math.hypot(...newScene.shot.squadMotion[0].map((v,i)=>v-oldScene.shot.squadMotion[0][i]))>.15,'shooting stance visibly differs');
  assert.ok(Math.hypot(...oldScene.shotBall.map((v,i)=>v-newScene.shotBall[i]))<1e-6,'same far-post result and ball flight');
  console.log('PASS Motion 2.0 A/B: distinct plant and finish, identical match-authoritative ball flight');
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
   assert.deepEqual(errors,[],'mirrored motion has no JavaScript exceptions');
  }finally{await ctx.close()}

 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
