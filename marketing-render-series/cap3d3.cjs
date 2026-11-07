// node cap3d.cjs <outDir> <fromSec> <toSec> [fps] [width]
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const {server,fixture,force}=require(require('path').join(__dirname,'..','tests','3d-highlights.browser.cjs'));
const [out,from,to,fps='30',width='432',team='home',minute='22',seq='',scorer='']=process.argv.slice(2);const PROBE=process.env.PROBE==='1';fs.mkdirSync(out,{recursive:true});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:+width,height:960},deviceScaleFactor:2.4,serviceWorkers:'block'});
 page.on('pageerror',e=>console.log('pageerror',e.message));
 await page.addInitScript(()=>{window.__FOOTERA_WEATHER='klar';Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)}});
 const NETD=require('path').join(__dirname,'net');const NI=fs.existsSync(NETD+'/index.json')?JSON.parse(fs.readFileSync(NETD+'/index.json','utf8')):{};let hits=0,miss=new Set();
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||process.env.NET_LIVE==='1'&&!/supabase\.co\/(rest|auth|realtime|functions)|googletag/.test(u))return r.continue();const e=NI[u];if(e){hits++;return r.fulfill({status:200,contentType:e.type,body:fs.readFileSync(NETD+'/'+e.f),headers:{'access-control-allow-origin':'*'}})}miss.add(u.slice(0,90));return r.abort()});await page.goto(url);
 await page.evaluate(()=>{const original=requestAnimationFrame;window.qaPresent=()=>new Promise(resolve=>original(()=>original(resolve)));window.qaDraw=t=>new Promise(resolve=>original(()=>{if(t===0){qaStep(performance.now());window.qaVirtualNow=performance.now()}else{for(let i=0;i<600&&document.querySelector(".fh3d")&&Number(document.querySelector(".fh3d").dataset.playbackTime)<t/1000;i++){window.qaVirtualNow+=1000/30;qaStep(window.qaVirtualNow)}}resolve()}));window.qaFrames=new Map();let id=1000000;window.qaHold=false;window.requestAnimationFrame=cb=>qaHold?(qaFrames.set(++id,cb),id):original(cb);const cancel=cancelAnimationFrame;window.cancelAnimationFrame=i=>qaFrames.delete(i)||cancel(i);const timeout=setTimeout,clear=clearTimeout;window.qaTimers=new Map();window.setTimeout=(cb,ms,...args)=>qaHold&&ms>=12000?(qaTimers.set(++id,cb),id):timeout(cb,ms,...args);window.clearTimeout=i=>qaTimers.delete(i)||clear(i);window.qaStep=t=>{const callbacks=[...qaFrames.values()];qaFrames.clear();callbacks.forEach(cb=>cb(t))}});

 const fsx=require('fs');const xi=JSON.parse(fsx.readFileSync(__dirname+'/xi-full.json','utf8'));
 await fixture(page);
 await page.evaluate(({xi,minute})=>{
  cancelMatch3D();stopMatchTimer();dismissMatchGoalMoment(false);
  const mk=(r)=>({id:r.id,name:r.name,fullName:r.full||r.name,position:r.pos,alt:'',ovr:r.ovr,pac:r.pac,sho:r.sho,pas:r.pas,dri:r.dri,def:r.def,phy:r.phy,nation:r.nation,team:r.club,league:r.league,gender:"Men's Football",face:r.face||''});
  PLAYERS=xi.home.map(mk);const away=xi.away.map(mk);P_BY_ID=new Map([...PLAYERS,...away].map(p=>[p.id,p]));
  const homeIdentity=defaultClubIdentity(),awayIdentity=defaultClubIdentity();
  homeIdentity.crest={...homeIdentity.crest,initials:'BL',symbol:'f',primary:'#e3202b',secondary:'#1a0507',accent:'#ffffff',borderColor:'#e3202b'};
  awayIdentity.crest={...awayIdentity.crest,initials:'PL',symbol:'diamond',primary:'#6b2bd9',secondary:'#160a2b',accent:'#ffffff',borderColor:'#6b2bd9'};
  state.club=PLAYERS.map(p=>makeItem(p,false));state.squad=state.club.map(i=>i.uid);state.formation='4-3-3';state.profile.clubName=xi.homeName;state.profile.clubIdentity=homeIdentity;state.tactic='balanced';
  FooteraHighlights.setMode('important');
  startMatch('rivals',{name:xi.awayName,rating:87,chem:33,power:90,formation:'4-3-3',tactic:'balanced',squad:away.slice(0,11),clubIdentity:awayIdentity});
  cancelMatch3D();stopMatchTimer();
  match.kickoffKits={home:{pattern:'solid',shirtPrimary:'#f4f4f6',shirtSecondary:'#e3202b',shorts:'#141418',socks:'#f4f4f6'},away:{pattern:'solid',shirtPrimary:'#3d0f73',shirtSecondary:'#c6ff3d',shorts:'#f4f4f6',socks:'#3d0f73'}};
  match.injuryTriggered=true;match.redTriggered=true;matchSpeed=5000;match.minute=Number(minute);updateMatchUI();document.getElementById('match').scrollTop=0;
 },{xi,minute});
 console.log('models',await page.evaluate(async()=>{const m=await import('./3d-highlights-scene.mjs?v=21341');await m.prepareFooteraPlayerModel().catch(e=>String(e));await (m.prepareFooteraHumanModel?.()||Promise.resolve()).catch(e=>String(e));return [m.isFooteraPlayerModelReady(),m.isFooteraHumanModelReady()]}));
 if(scorer)await page.evaluate(want=>{const o=chooseMatchAttacker;chooseMatchAttacker=function(side,kind,ex){const rows=matchActorRows(side);const r=rows.find(r=>(r.base?.name||r.name||'')===want);return r||o.apply(this,arguments)}},scorer);
 if(seq)await page.evaluate(seq=>{window.__s=match3DSequence;match3DSequence=()=>seq},seq);
 await page.evaluate(()=>{qaFrames.clear();qaHold=true});
 const TYPE=process.env.TYPE||'goal',SCORE=(process.env.SCORE||'0:0').split(':').map(Number);
 await page.evaluate(sc=>{match.home=sc[0];match.away=sc[1];updateMatchUI()},SCORE);
 let forced;
 if(TYPE==='goal')forced=await force(page,'goal',team);
 else if(TYPE==='kickoff')forced=await page.evaluate(()=>{match.minute=0;return queueMatchCeremony3D('kickoff')});
 else if(TYPE==='fulltime')forced=await page.evaluate(()=>{match.minute=90;match.finished=true;return queueMatchCeremony3D('fulltime')});
 else forced=await page.evaluate(({TYPE,team,who})=>{const random=Math.random;Math.random=()=>TYPE==='save'?.2:.99;try{const row=matchActorRows(team).find(r=>(r.base?.name||r.name)===who);const shot={side:team,minute:Math.floor(match.minute),at:match.minute,xg:.42,playerName:who,shooter:who.split(' ').pop(),shooterUid:team==='home'?row?.uid:undefined,shooterIndex:team==='away'?row?.index:undefined,shooting:88,goal:false};match.shotEvents.push(shot);if(team==='home'){match.shotsHome++;match.xgHome+=shot.xg}else{match.shotsAway++;match.xgAway+=shot.xg}resolveMissedMatchShot(shot,team==='home'?matchHomeTeamName():matchAwayTeamName());updateMatchUI();return{shots:match.shotEvents.length,row:!!row}}finally{Math.random=random}},{TYPE,team,who:scorer});console.log('forced',JSON.stringify(forced));
await page.waitForSelector('.fh3d canvas',{state:'attached'});
 await page.evaluate(async()=>{document.getElementById('matchLiveStage').scrollIntoView({block:'center',behavior:'instant'});await qaPresent();await qaDraw(0)});
 const box=await page.locator('#matchLiveStage').boundingBox();const clip={x:box.x,y:box.y+66,width:box.width,height:box.height-66};console.log('clip',JSON.stringify(clip));
 if(PROBE){let last='';for(let i=0;i<400;i++){const st=await page.evaluate(()=>{window.qaVirtualNow+=100;qaStep(window.qaVirtualNow);const l=document.querySelector('.fh3d');if(!l)return null;const h=document.querySelector('.fh3d-hud');return l.dataset.playbackTime+' hud='+(h?.classList.contains('visible')?1:0)+' '+(document.querySelector('.fh3d-name')?.textContent||'')+' img='+[...document.querySelectorAll('.fh3d-player-card img')].map(i=>i.naturalWidth).join(',')});if(st===null){console.log('end at step',i);break}if(i%5===0)console.log(st)}console.log('hits',hits,'miss',[...miss].slice(0,8));await page.screenshot({path:out+'/probe.jpg',clip});await browser.close();server.close();return}
 const t0=Date.now();let n=0;const count=Math.round(+to);
 let pt=0;while(pt<+from){pt=await page.evaluate(async()=>{window.qaVirtualNow+=200;qaStep(window.qaVirtualNow);const l=document.querySelector('.fh3d');return l?Number(l.dataset.playbackTime):99});}
 console.log('start at playback',pt);
 for(let f=0;f<count;f++){
  const st=await page.evaluate(async dt=>{window.qaVirtualNow+=dt;qaStep(window.qaVirtualNow);await qaPresent();const l=document.querySelector('.fh3d');return l?l.dataset.playbackTime:null},1000/(+fps));
  if(st===null){console.log('scene ended at frame',f);break}
  await page.screenshot({path:path.join(out,`f${String(n++).padStart(4,'0')}.jpg`),clip,type:'jpeg',quality:90,timeout:180000});
  if(n%30===0)console.log(n,(Date.now()-t0)/n|0,'ms/frame','pt',st)}
 console.log('frames',n,'total s',(Date.now()-t0)/1000);
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
