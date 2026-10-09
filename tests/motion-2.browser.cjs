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
    await page.screenshot({path:path.join(out,'motion-2-cut.png'),fullPage:true});
   }else assert.equal(plant.motion2,false);
   await seek(page,5.30);
   const shot=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
   if(mode==='new'){
    assert.equal(shot.motion2Stage,'shooting-plant');
    assert.ok(shot.motion2PlantBoot?.every(Number.isFinite));
    await page.screenshot({path:path.join(out,'motion-2-shot.png'),fullPage:true});
   }
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
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
