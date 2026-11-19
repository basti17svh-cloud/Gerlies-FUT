// Reel capture (temporary branch, never merge): replays one recorded 3D scene of the
// simulated match Best of TOTW vs Icons (rec.json, recorded by the real match engine)
// frame by frame on a virtual clock. node reel-render/cap.cjs <outDir> <sceneId> [coach]
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const {server}=require(path.join(__dirname,'..','tests','3d-highlights.browser.cjs'));
const [out,sceneId,coachVariant='']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const REC=JSON.parse(fs.readFileSync(path.join(__dirname,'rec.json'),'utf8'))[sceneId];if(!REC)throw new Error('no scene '+sceneId);
const MAXF=Number(process.env.MAXF||1100),FROM=Number(process.env.FROM||0);
const COACHES={
 totw:{manager:{name:'Lennart Hofmann',gender:'male',skin:'#e6bf9c',hair:'short04',hairColor:'#3b2a1f',beard:'Full_beard',glasses:'none',age:'prime',build:'normal',outfit:'suit',top:'#111318',trousers:'#111318',accent:'#f2f2f2',tie:'#c4122f'},label:'TRAINER · BEST OF TOTW'},
 icons:{manager:{name:'Paolo Ferrante',gender:'male',skin:'#c88f69',hair:'short04',hairColor:'#e9e6df',beard:'none',glasses:'gold',age:'veteran',build:'normal',outfit:'suit',top:'#0d2a5c',trousers:'#0d2a5c',accent:'#f2f2f2',tie:'#f4c20d'},label:'TRAINER · ICONS'}
};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:432,height:1000},deviceScaleFactor:2.6471,serviceWorkers:'block'});
 page.on('pageerror',e=>console.log('pageerror',e.message));
 await page.addInitScript(()=>{window.__FOOTERA_WEATHER='klar';window.__FOOTERA_SOUND_LOG=[];try{localStorage.setItem('footera-sound-v1','on')}catch(e){}
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)}});
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||!/supabase\.co\/(rest|auth|realtime|functions)|googletag/.test(u))return r.continue();return r.abort()});
 await page.goto(url);await page.waitForTimeout(4000);
 await page.addStyleTag({content:`.fh3d-sound{display:none!important}#match.highlight3d-pending .match-live-stage{height:791px!important;max-height:none!important;min-height:0!important}`});
 await page.addScriptTag({path:path.join(__dirname,'setup.js')});
 await page.evaluate(()=>{const s=__reelSetup();startMatch('friendly-random',s.opp);cancelMatch3D();stopMatchTimer();match.injuryTriggered=true;match.redTriggered=true;matchSpeed=50000});
 const SCENEV=(fs.readFileSync(path.join(__dirname,'..','3d-highlights.js'),'utf8').match(/3d-highlights-scene\.mjs\?v=(\d+)/)||[])[1];
 console.log('models',await page.evaluate(async v=>{const m=await import('./3d-highlights-scene.mjs?v='+v);await m.prepareFooteraPlayerModel().catch(e=>String(e));await (m.prepareFooteraHumanModel?.()||Promise.resolve()).catch(e=>String(e));return [m.isFooteraPlayerModelReady(),m.isFooteraHumanModelReady()]},SCENEV));
 // The coach at the bench (kick-off) / at the change: our two named managers.
 const ev=REC.ev;
 // Club kits of the two teams (presentation only).
 Object.assign(ev,{homeColor:'#16161a',homeSecondary:'#e3202b',homePattern:'solid',homeShorts:'#16161a',homeSocks:'#16161a',homeKitConfigured:true,
  awayColor:'#efe6c8',awaySecondary:'#b8902f',awayPattern:'solid',awayShorts:'#efe6c8',awaySocks:'#efe6c8',awayKitConfigured:true});
 if(ev.ceremony==='kickoff'||ev.ceremony==='substitution'){
  const c=COACHES[coachVariant||'totw'];
  ev.coach=await page.evaluate(async c=>{state.profile.manager=c.manager;try{localStorage.removeItem(FooteraManager.PORTRAIT_KEY)}catch(e){}
   await Promise.race([FooteraManager.ensurePortrait(),new Promise(r=>setTimeout(r,90000))]).catch(()=>{});
   const k=FooteraManager.forKickoff();if(k){k.label=c.label}return k},c);
  console.log('coach',ev.coach?.name,ev.coach?.cardHTML?.length);
 }
 await page.evaluate(()=>{const original=requestAnimationFrame;window.qaPresent=()=>new Promise(resolve=>original(()=>original(resolve)));window.qaFrames=new Map();let id=1000000;window.qaHold=false;window.requestAnimationFrame=cb=>qaHold?(qaFrames.set(++id,cb),id):original(cb);const cancel=cancelAnimationFrame;window.cancelAnimationFrame=i=>qaFrames.delete(i)||cancel(i);const timeout=setTimeout,clear=clearTimeout;window.qaTimers=new Map();window.setTimeout=(cb,ms,...args)=>qaHold&&ms>=12000?(qaTimers.set(++id,cb),id):timeout(cb,ms,...args);window.clearTimeout=i=>qaTimers.delete(i)||clear(i);window.qaStep=t=>{const callbacks=[...qaFrames.values()];qaFrames.clear();callbacks.forEach(cb=>cb(t))}});
 await page.evaluate(()=>{qaFrames.clear();qaHold=true});
 const ok=await page.evaluate(({ev,at})=>{
  match.home=at.home;match.away=at.away;match.minute=at.minute;match.halftimeLogged=at.minute>45;match.extraTimeStarted=at.minute>90;match.extraTimeBreakLogged=at.minute>105;
  if(ev.ceremony==='fulltime')match.finished=true;
  updateMatchUI(true);
  if(ev.type==='goal')match.highlight3DScoreHold={id:String(ev.id),home:Number(ev.scoreBeforeHome),away:Number(ev.scoreBeforeAway)};
  const q=ensureMatch3DQueue(match);const r=q.enqueue(ev);
  const sc=document.getElementById('matchScore');if(sc&&match.highlight3DScoreHold)sc.textContent=`${match.highlight3DScoreHold.home} : ${match.highlight3DScoreHold.away}`;
  const cl=document.getElementById('matchMinute');if(cl)cl.textContent=`${ev.minute}'`;return r},{ev,at:REC.at});
 console.log('enqueued',ok);
 await page.waitForSelector('.fh3d canvas',{state:'attached',timeout:120000});
 await page.evaluate(async()=>{document.getElementById('matchLiveStage').scrollIntoView({block:'center',behavior:'instant'});await qaPresent();qaStep(performance.now());window.qaVirtualNow=performance.now()});
 const box=await page.locator('#matchLiveStage').boundingBox();const clip={x:box.x,y:box.y+66,width:box.width,height:box.height-66};console.log('clip',JSON.stringify(clip));
 let pt=0;while(pt<FROM){pt=await page.evaluate(()=>{window.qaVirtualNow+=200;qaStep(window.qaVirtualNow);const l=document.querySelector('.fh3d');return l?Number(l.dataset.playbackTime):99})}
 const t0=Date.now();let n=0;const frames=[];
 for(let f=0;f<MAXF;f++){
  const st=await page.evaluate(async dt=>{window.qaVirtualNow+=dt;qaStep(window.qaVirtualNow);await qaPresent();const l=document.querySelector('.fh3d');if(!l)return null;
   return{t:Number(l.dataset.playbackTime),hud:!!document.querySelector('.fh3d-hud.visible'),replay:!!document.querySelector('.fh3d-replay-on'),snd:window.__FOOTERA_SOUND_LOG.length}},1000/30);
  if(st===null){console.log('scene ended at frame',f);break}
  frames.push(st);
  await page.screenshot({path:path.join(out,`f${String(n++).padStart(4,'0')}.jpg`),clip,type:'jpeg',quality:90,timeout:180000});
  if(n%30===0)console.log(n,(Date.now()-t0)/n|0,'ms/frame',JSON.stringify(st))}
 const sound=await page.evaluate(()=>window.__FOOTERA_SOUND_LOG);
 fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({id:sceneId,coach:coachVariant,type:ev.type,ceremony:ev.ceremony||'',minute:ev.minute,team:ev.team,who:ev.playerName,sequence:ev.sequence,varCheck:ev.varCheck||'',foulCard:ev.foulCard||'',at:REC.at,from:FROM,fps:30,frames,sound}));
 console.log('frames',n,'total s',(Date.now()-t0)/1000);
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
