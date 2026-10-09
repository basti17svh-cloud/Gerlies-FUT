/* Actual mobile WebGL check for side-on containing versus closing distance. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1'),target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return}
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res)
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/motion-lab-v2159.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__footeraMotionLab?.getState()?.metrics?.defenderTrackingVersion,{timeout:25000});
  const seek=seconds=>page.evaluate(s=>{const el=document.querySelector('#time');el.value=String(s);el.dispatchEvent(new Event('input',{bubbles:true}))},seconds);
  const metrics=()=>page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
  await page.locator('#test-jockey').click();
  await seek(1.7);const jStart=await metrics();
  await seek(3.4);const jMid=await metrics();
  assert.equal(jStart.trackingAction,'jockey');
  assert.ok(jStart.trackingReaction>.3,'defender uses a reaction delay');
  assert.ok(jMid.trackingGap>2.8&&jMid.trackingGap<5.5,'defender shadows carrier with independent reaction gap');
  assert.ok(Math.abs(jMid.contactPelvisLean)<.06,'no fall while moving laterally');
  assert.ok(Math.abs(jMid.trackingPoseLean)<.22,'upright torso while accompanying');
  await page.screenshot({path:path.join(out,'v2159-lateral-tracking.png')});
  await page.locator('#test-close').click();
  await seek(.9);const cStart=await metrics();
  await seek(4.1);const cEnd=await metrics();
  assert.equal(cEnd.trackingAction,'close_down');
  assert.ok(cEnd.trackingSpeed<=6.25,'close-down has capped sprint speed');
  assert.ok(cStart.trackingGap>7.0,'press begins significantly farther away');
  assert.ok(cEnd.trackingGap<cStart.trackingGap-4.0&&cEnd.trackingGap>1.6,'press visibly closes while braking naturally');
  assert.ok(cStart.trackingGap>cEnd.trackingGap+4,'visible closing trajectory');
  assert.ok(Math.abs(cEnd.contactPelvisLean)<.06,'no falling on approach');
  assert.ok(Math.abs(cEnd.trackingPoseLean)<.22,'pressing runner stays upright');
  await page.screenshot({path:path.join(out,'v2159-close-down.png')});
  await page.locator('#test-slide').click();await seek(3.62);
  const slide=await metrics();
  assert.ok(slide.contactPelvisLean< -1.14&&slide.contactExtension>1.7,'existing clean slide remains intact');
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth,view:innerWidth}));
   assert.ok(layout.body<=width+1,'mobile no overflow '+width)}
  assert.deepEqual(errors,[],'browser runtime error-free');
  console.log('PASS V21.59 independent tracking, closing and unchanged slide, WebGL mobile 360/390/412');
  await page.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
