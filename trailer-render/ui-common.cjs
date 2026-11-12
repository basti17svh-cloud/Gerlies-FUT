// Shared setup for trailer UI captures (marketing only, never merged).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const {server}=require(path.join(__dirname,'..','tests','3d-highlights.browser.cjs'));
async function open({width=360,height=640,dpr=3}={}){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('footera-analytics-consent-v1','denied');localStorage.setItem('footera-account-welcome-v1','1');localStorage.setItem('footera-3d-weather','0')}catch(_){}window.__FOOTERA_WEATHER='klar'});
 const page=await ctx.newPage();page.on('pageerror',e=>console.log('pageerror',e.message));
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||process.env.NET_LIVE==='1'&&!/supabase\.co\/(rest|auth|realtime|functions)|googletag/.test(u))return r.continue();return r.abort()});
 await page.goto(url,{waitUntil:'load'});
 await page.evaluate(()=>{
  for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
  const g=document.createElement('style');g.textContent='#footeraAccountDialog,#footeraAnalyticsConsent,.toast,#toast,.install-hint,.footera-install-hint{display:none!important}*{scrollbar-width:none!important}::-webkit-scrollbar{display:none}';document.head.append(g);
 });
 await page.evaluate(async()=>{const t=await (await fetch('./assets/players-db.csv')).text();PLAYERS=parseCSV(t).map(normCSV).filter(p=>p.id&&p.name&&p.ovr);P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));});
 return {browser,ctx,page,url,close:async()=>{await browser.close();server.close()}};
}
// Deterministic frame stepping: rAF/timers via injected clock, CSS animations via the Web Animations API.
async function installStepper(page){
 await page.evaluate(()=>{
  const raf=requestAnimationFrame;window.__T=performance.now();const realNow=performance.now.bind(performance),realDate=Date.now;const off0=realDate()-realNow();
  performance.now=()=>window.__T;Date.now=()=>Math.round(off0+window.__T);
  const frames=new Map();let id=5e6;window.requestAnimationFrame=cb=>{frames.set(++id,cb);return id};window.cancelAnimationFrame=i=>frames.delete(i);
  const timers=new Map();const st=setTimeout,ct=clearTimeout,si=setInterval,ci=clearInterval;
  window.setTimeout=(cb,ms=0,...a)=>{const k=++id;timers.set(k,{at:window.__T+(+ms||0),cb:()=>typeof cb==='function'?cb(...a):0});return k};window.clearTimeout=k=>timers.delete(k);
  window.setInterval=(cb,ms=0,...a)=>{const k=++id;const run=()=>{timers.set(k,{at:window.__T+Math.max(16,+ms||0),cb:()=>{run();cb(...a)}})};run();return k};window.clearInterval=k=>timers.delete(k);
  const seen=new WeakSet();
  window.__step=dt=>{const end=window.__T+dt;
   for(let guard=0;guard<500;guard++){let next=null,nk=null;for(const [k,t] of timers)if(t.at<=end&&(!next||t.at<next.at)){next=t;nk=k}if(!next)break;timers.delete(nk);window.__T=Math.max(window.__T,next.at);try{next.cb()}catch(e){console.error(e)}}
   window.__T=end;const cbs=[...frames.values()];frames.clear();cbs.forEach(cb=>{try{cb(window.__T)}catch(e){console.error(e)}});
   for(const a of document.getAnimations()){if(!seen.has(a)){seen.add(a);try{a.pause()}catch(_){}}else{try{a.currentTime=(a.currentTime||0)+dt}catch(_){}}}
  };
 });
}
module.exports={open,installStepper};
