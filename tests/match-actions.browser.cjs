/* Live integration smoke: production scripts, simulated action metadata and WebGL. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {server,fixture}=require('./3d-highlights.browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.FOOTERA_CHROMIUM?{executablePath:process.env.FOOTERA_CHROMIUM}:{}),args:['--no-sandbox','--no-zygote','--single-process','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url,{waitUntil:'load'});
  await page.evaluate(()=>{const enqueue=FooteraHighlights.Queue.prototype.enqueue;FooteraHighlights.Queue.prototype.enqueue=function(event){window.qaActionEvent=event;return enqueue.call(this,event)}});
  for(const [width,kind] of [[360,'distance'],[390,'cross'],[412,'through']]){
   await page.setViewportSize({width,height:844});await fixture(page);
   const data=await page.evaluate(kind=>{
    const original=FooteraMatchActions,random=Math.random;
    // Pin only scenario selection/result to exercise each production bridge and renderer path.
    FooteraMatchActions={...original,pick:()=>kind,goalChance:()=>1};Math.random=()=>.1;
    try{simAttack(true);return{shot:match.shotEvents.at(-1),goal:match.goalEvents.at(-1),event:window.qaActionEvent}}finally{FooteraMatchActions=original;Math.random=random}
   },kind);
   assert.equal(data.shot.actionKind,kind);assert.equal(data.event.actionKind,kind);assert.equal(data.goal.finish,data.shot.finish);assert.equal(data.event.finish,data.shot.finish);
   assert.equal(data.event.playerId,data.shot.shooterUid);assert.equal(data.event.creatorUid,data.shot.creatorUid);
   // V21.195 star moments: a screamer (long_shot, power_drive, finesse_halfspace) may show too.
   if(kind==='distance')assert.ok(['layoff_distance','switch_distance_left','edge_pullback_right','long_shot','power_drive','finesse_halfspace','edge_rocket','recycle_rocket_left','recycle_curler_right','halfvolley_drive'].includes(data.event.sequence),data.event.sequence);
   if(kind==='cross')assert.equal(data.event.finish,'header');
   await page.waitForSelector('.fh3d canvas',{timeout:30000});
   assert.ok(await page.locator('.fh3d canvas').evaluate(c=>c.width>0&&c.height>0&&!c.getContext('webgl2').isContextLost()));
   if(process.env.FOOTERA_ACTION_SCREENSHOT)await page.locator('#matchLiveStage').screenshot({path:process.env.FOOTERA_ACTION_SCREENSHOT+'-'+kind+'.png'});
   await page.evaluate(()=>{match.paused=true;match3DQueue.skip();stopMatchTimer()});
   await page.waitForSelector('.fh3d',{state:'detached'});
   console.log('PASS',width,kind,data.event.sequence,data.event.finish);
  }
  assert.deepEqual(errors,[]);console.log('PASS app initialization and WebGL without runtime errors');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
