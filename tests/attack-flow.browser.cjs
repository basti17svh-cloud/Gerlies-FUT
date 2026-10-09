/* Mobile WebGL verification of continuous running through shot preparation. */
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
  await page.goto('http://127.0.0.1:'+server.address().port+'/motion-lab-v2160.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__footeraMotionLab?.getState()?.metrics?.attackFlowVersion,{timeout:25000});
  const seek=t=>page.evaluate(s=>{const el=document.querySelector('#time');el.value=String(s);el.dispatchEvent(new Event('input',{bubbles:true}))},t);
  const metrics=()=>page.evaluate(()=>window.__footeraMotionLab.getState().metrics);
  await page.locator('#test-flow').click();
  const values=[];
  for(const t of [2.05,3.2,4.2,5.38,5.4]){
   await seek(t);const m=await metrics();
   assert.match(m.attackFlowVersion,/continuous-carrier/);
   assert.ok(m.attackFlowSpeed>1,'no zero-foot-rush at '+t+': '+m.attackFlowSpeed);
   values.push([t,+m.attackFlowSpeed.toFixed(2)]);
  }
  await page.screenshot({path:path.join(out,'v2160-continuous-cut.png'),fullPage:true});
  await page.locator('#scene').selectOption('dribble');
  for(const t of [1.89,3.78,5.4]){
   await seek(t);const m=await metrics();
   assert.ok(m.attackFlowSpeed>1,'dribble never stops at '+t+': '+m.attackFlowSpeed);
  }
  await page.screenshot({path:path.join(out,'v2160-continuous-dribble.png'),fullPage:true});
  await page.locator('#test-slide').click();await seek(3.62);
  const slide=await metrics();
  assert.ok(slide.contactPelvisLean< -1.14&&slide.contactExtension>1.7,'existing slide is retained');
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth,view:innerWidth}));
   assert.ok(layout.body<=width+1,'no horizontal overflow at '+width)
  }
  assert.deepEqual(errors,[],'no runtime exceptions');
  console.log('PASS V21.60 continuous mobile runner and slide, speeds '+JSON.stringify(values));
  await page.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
