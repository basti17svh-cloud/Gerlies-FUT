/* Real browser smoke test + two stills of exactly the same paused sequence.
 * Does not require loading the production app, saving a game, or changing scores.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||'/', 'http://127.0.0.1');
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return}
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/motion-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__footeraMotionLab?.getState()?.metrics?.riggedActors===2,{timeout:25000});
  const seek=async seconds=>page.evaluate(seconds=>{const s=document.querySelector('#time');s.value=String(seconds);s.dispatchEvent(new Event('input',{bubbles:true}))},seconds);
  await seek(3.06);
  const a=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
  await page.screenshot({path:path.join(out,'motion-lab-A.png'),fullPage:true});
  await page.locator('#pilot').click();
  const b=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
  await page.screenshot({path:path.join(out,'motion-lab-B.png'),fullPage:true});
  assert.equal(a.riggedActors,2);assert.equal(b.riggedActors,3);
  assert.equal(a.sequence,b.sequence);assert.equal(a.cameraPhase,b.cameraPhase);
  assert.ok(Math.hypot(...a.squadMotion[0].map((n,i)=>n-b.squadMotion[0][i]))>.20,'attacker has a visible new pose');
  assert.ok(Math.hypot(...a.squadMotion[10].map((n,i)=>n-b.squadMotion[10][i]))>.16,'defender changes pose');
  await seek(6.5);
  const ballB=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
  await page.locator('#current').click();
  const ballA=await page.evaluate(()=>window.__footeraMotionLab.getState().metrics.ball);
  assert.ok(Math.hypot(...ballA.map((n,i)=>n-ballB[i]))<1e-6,'same goal-bound flight after the shot');
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth,canvas:document.querySelector('canvas').getBoundingClientRect().width}));
   assert.ok(layout.body<=width+1&&layout.canvas>width*.7,'no horizontal clip at '+width+': '+JSON.stringify(layout));
  }
  // One-tap controls must work on an actual mobile viewport and keep the
  // isolated preview outcome separate from match simulation.
  await page.locator('#test-slide').click();
  const slide=await page.evaluate(()=>window.__footeraMotionLab.getState());
  assert.equal(slide.mode,'pilot');
  assert.equal(slide.defense,'slide_attempt');
  await seek(4.22);
  assert.equal((await page.evaluate(()=>window.__footeraMotionLab.getState())).metrics.contactBallDeflected,true);
  await page.locator('#test-block').click();
  const block=await page.evaluate(()=>window.__footeraMotionLab.getState());
  assert.equal(block.mode,'pilot');
  assert.equal(block.defense,'block_attempt');
  await seek(6.55);
  assert.equal((await page.evaluate(()=>window.__footeraMotionLab.getState())).metrics.contactBallDeflected,true);
  assert.ok(await page.locator('#outcome').isVisible(),'result appears for both quick previews');
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS Motion Lab: distinct striker/defender poses, same shot, 360/390/412px, reference + pilot screenshots');
  await page.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
