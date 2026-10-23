/* QA only (untracked): one frame of the real highlight scene. HW=1 forces the Halloween look. Usage: T=ms TYPE=goal OUT=x.png node tests/.qa-halloween3d.cjs */
const {chromium}=require('/opt/node-tools/node_modules/playwright'),path=require('node:path');
const {server,fixture,force}=require('./3d-highlights.browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:+(process.env.W||1280),height:1000},deviceScaleFactor:1,serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(hw=>{if(hw)window.__FOOTERA_HALLOWEEN=hw==='1';Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)}},process.env.HW||'');
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url);
  await page.evaluate(()=>{const original=requestAnimationFrame;window.qaPresent=()=>new Promise(resolve=>original(()=>original(resolve)));window.qaDraw=t=>new Promise(resolve=>original(()=>{if(t===0){qaStep(performance.now());window.qaVirtualNow=performance.now()}else{for(let i=0;i<300&&document.querySelector(".fh3d")&&Number(document.querySelector(".fh3d").dataset.playbackTime)<t/1000;i++){window.qaVirtualNow+=100;qaStep(window.qaVirtualNow)}}resolve()}));window.qaFrames=new Map();let id=1000000;window.qaHold=false;window.requestAnimationFrame=cb=>qaHold?(qaFrames.set(++id,cb),id):original(cb);const cancel=cancelAnimationFrame;window.cancelAnimationFrame=i=>qaFrames.delete(i)||cancel(i);const timeout=setTimeout,clear=clearTimeout;window.qaTimers=new Map();window.setTimeout=(cb,ms,...args)=>qaHold&&ms>=12000?(qaTimers.set(++id,cb),id):timeout(cb,ms,...args);window.clearTimeout=i=>qaTimers.delete(i)||clear(i);window.qaStep=t=>{const callbacks=[...qaFrames.values()];qaFrames.clear();callbacks.forEach(cb=>cb(t))}});
  await fixture(page);
  await page.evaluate(()=>{match.minute=38;updateMatchUI();qaFrames.clear();qaHold=true});
  await force(page,process.env.TYPE||'goal');await page.waitForSelector('.fh3d canvas',{state:'attached'});await page.waitForTimeout(+(process.env.LOADWAIT||8000));
  await page.evaluate(async()=>{document.getElementById('matchLiveStage').scrollIntoView({block:'center',behavior:'instant'});await qaPresent();await qaDraw(0)});
  for(const t of String(process.env.T||'1300').split(',')){
   await page.evaluate(async t=>{await qaDraw(+t);await qaPresent()},t);
   const clip=await page.locator('#matchLiveStage').boundingBox();
   await page.screenshot({path:(process.env.OUT||'qa3d').replace('.png','')+'-'+t+'.png',clip});
  }
  console.log(errors.join('\n'));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
