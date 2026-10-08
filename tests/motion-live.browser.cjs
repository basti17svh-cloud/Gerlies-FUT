/* Verify Footera's actual match queue now enables fluid motion on capable
 * devices while keeping the low-tier and user fallback fully playable. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {server,fixture,force}=require('./3d-highlights.browser.cjs');
const out=path.resolve(__dirname,'../test-artifacts');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const setup of [
   {name:'capable-phone',memory:8,cores:8,preference:'auto',expect:'fluid'},
   {name:'manual-legacy',memory:8,cores:8,preference:'legacy',expect:'legacy'},
   {name:'weak-phone',memory:4,cores:4,preference:'auto',expect:'legacy'}]){
   const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await ctx.addInitScript(({memory,cores,preference})=>{
    Object.defineProperty(navigator,'deviceMemory',{get:()=>memory});
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>cores});
    if(preference==='legacy')localStorage.setItem('footera-3d-motion-mode','legacy');
   },setup);
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
   await page.goto(url,{waitUntil:'load'});await fixture(page);
   const goal=await force(page,'goal');
   assert.deepEqual(goal.score,[1,0]);assert.equal(goal.goals,1);
   await page.waitForSelector('.fh3d canvas',{timeout:15000});
   const layer=page.locator('.fh3d');
   const motion=await layer.getAttribute('data-motion');
   assert.equal(motion,setup.expect,setup.name+' expected motion route');
   assert.equal(await page.locator('.fh3d canvas').evaluate(c=>!!c.getContext('webgl2')),true);
   await page.waitForTimeout(900);
   const live=await page.evaluate(()=>({score:[match.home,match.away],goals:match.goalEvents.length,minute:match.minute,quality:document.querySelector('.fh3d')?.dataset.quality}));
   assert.deepEqual(live.score,[1,0]);assert.equal(live.goals,1);
   assert.equal(live.quality,setup.memory<=4?'low':'standard');
   if(setup.name==='capable-phone'){
    await page.screenshot({path:path.join(out,'footera-v2142-live-motion.png')});
    await page.waitForSelector('.fh3d-hud.visible',{timeout:14000});
    const visible=await page.evaluate(()=>document.getElementById('matchScore').textContent);
    assert.equal(visible,'1 : 0','real goal appears only after 3D impact');
   }
   // The autonomous 10.4s replay can complete while Chromium waits for a
   // stable clickable button under software WebGL. DOM click is race-safe:
   // if the overlay has already disappeared, natural completion is valid.
   await page.evaluate(()=>document.querySelector('.fh3d-skip')?.click());
   await page.waitForSelector('.fh3d',{state:'detached',timeout:12000});
   const result=await page.evaluate(()=>({score:[match.home,match.away],goals:match.goalEvents.length,pending:!!match.highlight3DPending,disabled:!!match3DQueue.disabled}));
   assert.deepEqual(result.score,[1,0]);assert.equal(result.goals,1);
   assert.equal(result.pending,false);assert.equal(result.disabled,false);
   assert.deepEqual(errors,[],'no browser errors');
   console.log('PASS V21.42 LIVE '+setup.name+' motion='+motion+' same goal, safe cleanup, no errors');
   await ctx.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
