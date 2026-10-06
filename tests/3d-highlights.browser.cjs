/* Run with NODE_PATH pointing to a Playwright installation. Isolated local save; no online writes. */
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),output=path.join(root,'test-artifacts');fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let activePage;
const results=[];const check=(label,value)=>{assert.ok(value,label);results.push(label);console.log('PASS',label)};
// Keep all production scripts, but don't run account/database startup in this isolated match fixture.
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith('index.html')){let html=body.toString();const last=html.lastIndexOf('<script>');html=html.slice(0,last)+html.slice(html.indexOf('</script>',last)+9);body=Buffer.from(html)}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body)}catch(_){res.writeHead(404).end()}});
async function fixture(page,mode='important'){
 await page.evaluate(mode=>{
  cancelMatch3D();stopMatchTimer();dismissMatchGoalMoment(false);
  for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
  const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW','CM','ST','CB','GK','LB','RW','CM'];
  PLAYERS=positions.map((position,i)=>({id:'qa-'+i,name:'Musiala',fullName:'Jamal Musiala',position,ovr:84,pac:84,sho:84,pas:84,dri:84,def:84,phy:84,nation:'Germany',team:'FC Bayern München',league:'Bundesliga'}));P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
  state.club=PLAYERS.map(p=>makeItem(p,false));state.squad=state.club.map(i=>i.uid);state.formation='4-3-3';state.profile.clubName='Heimteam';state.tactic='balanced';
  FooteraHighlights.setMode(mode);document.querySelectorAll('[data-highlight-mode]').forEach(s=>s.value=mode);
  const awaySquad=PLAYERS.slice(0,11).map((p,i)=>i===0?{...p,id:'away-gk',name:'Maignan',fullName:'Mike Maignan',nation:'France',team:'AC Milan',league:'Serie A'}:{...p,id:'away-'+i});
  startMatch('rivals',{name:'Auswärtsteam',rating:84,chem:33,power:88,formation:'4-3-3',tactic:'balanced',squad:awaySquad});stopMatchTimer();
  match.minute=41;match.injuryTriggered=true;match.redTriggered=true;matchSpeed=5000;updateMatchUI();document.getElementById('match').scrollTop=0;
 },mode);
}
async function force(page,type,team='home'){
 return page.evaluate(({type,team})=>{
  const random=Math.random;Math.random=()=>type==='goal'?.001:type==='big_chance_saved'?.2:type==='shot_post'?.99:.94;
  try{
   if(type==='goal')simAttack(team==='home');
   else{const shot={side:team,minute:Math.floor(match.minute),at:match.minute,xg:.35,playerName:'Jamal Musiala',shooter:'Musiala',shooterUid:match.lineup[9],shooting:84,goal:false};match.shotEvents.push(shot);if(team==='home'){match.shotsHome++;match.xgHome+=shot.xg}else{match.shotsAway++;match.xgAway+=shot.xg}resolveMissedMatchShot(shot,'Heimteam');updateMatchUI()}
   return{score:[match.home,match.away],goals:match.goalEvents.length,shots:match.shotEvents.length,minute:match.minute,name:match.goalEvents.at(-1)?.playerName||match.shotEvents.at(-1)?.playerName};
  }finally{Math.random=random}
 },{type,team});
}
if(require.main===module)(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>4});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4})});
  const page=await context.newPage(),errors=[];activePage=page;page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.goto(url,{waitUntil:'load'});check('app initializes without JS errors',errors.length===0);
  check('3D stays unloaded before first highlight',await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>r.name.includes('three.module'))));
  await fixture(page);
  const kickoffKitFreeze=await page.evaluate(()=>{
   const before=JSON.stringify(match.kickoffKits?.home||null);
   state.profile.clubIdentity.kits.home={pattern:'solid',shirtPrimary:'#ffffff',shirtSecondary:'#ffffff',shorts:'#ffffff',socks:'#ffffff'};
   return{before,after:JSON.stringify(match.kickoffKits?.home||null),live:JSON.stringify(state.profile.clubIdentity.kits.home)}
  });
  check('kickoff kit is frozen and cannot be replaced by a later profile edit',kickoffKitFreeze.before===kickoffKitFreeze.after&&kickoffKitFreeze.after!==kickoffKitFreeze.live);
  await page.evaluate(()=>stopMatchTimer());
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});await fixture(page);const before=await force(page,'goal');
   await page.waitForSelector('.fh3d canvas',{timeout:12000});
   check(`${width}: actual WebGL canvas`,await page.locator('.fh3d canvas').evaluate(c=>!!c.getContext('webgl2')));
   check(`${width}: goal counted exactly once`,before.goals===1&&before.score[0]===1&&before.shots===1);
   check(`${width}: authoritative score is synchronized while result label stays hidden`,await page.evaluate(()=>document.getElementById('matchScore').textContent==='1 : 0'&&document.getElementById('matchShots').textContent==='1 : 0'&&!document.querySelector('.fh3d-name').textContent));
   const geometry=await page.evaluate(()=>{const layer=document.querySelector('.fh3d'),r=layer.getBoundingClientRect(),button=layer.querySelector('button').getBoundingClientRect(),canvas=layer.querySelector('canvas').getBoundingClientRect(),body=getComputedStyle(document.body);return{overflow:document.documentElement.scrollWidth>innerWidth||document.getElementById('match').scrollWidth>innerWidth,left:r.left,right:r.right,button:button.height,buttonBottom:button.bottom,canvasTop:canvas.top,width:innerWidth,locked:document.documentElement.classList.contains('fh3d-scroll-lock')&&body.position==='fixed',touch:getComputedStyle(layer.querySelector('canvas')).touchAction}});
   check(`${width}: no horizontal scroll; skip stays entirely in broadcast bar`,!geometry.overflow&&geometry.left>=0&&geometry.right<=geometry.width+1&&geometry.button>=44&&geometry.buttonBottom<=geometry.canvasTop+1);
   check(`${width}: live scene locks document scrolling and canvas panning`,geometry.locked&&geometry.touch==='none');
   await page.waitForSelector('.fh3d-hud.visible');
   check(`${width}: matchday and highlight clock agree`,await page.evaluate(()=>document.querySelector('.fh3d-brand small').textContent.endsWith(document.getElementById('matchMinute').textContent)));
   const hud=await page.locator('.fh3d-hud').evaluate(h=>({name:h.querySelector('.fh3d-name').textContent,event:h.querySelector('.fh3d-event').textContent,text:h.textContent}));
   console.log('HUD',JSON.stringify(hud));await page.screenshot({path:path.join(output,`goal-${width}.png`)});
   check(`${width}: full event name, minute, type and no rating`,hud.name===before.name&&hud.name==='Jamal Musiala'&&hud.event==="TOR · 41'"&&!/84|GES|OVR/.test(hud.text));
   await page.evaluate(()=>document.querySelector('.fh3d-skip')?.click());await page.waitForSelector('.fh3d',{state:'detached'});
   check(`${width}: skip or natural completion resumes once without duplicate goal`,await page.evaluate(()=>!match.highlight3DPending&&!match.highlightActive&&match.goalEvents.length===1&&match.home===1&&matchTimer!==null));
   check(`${width}: viewport lock is completely released after highlight`,await page.evaluate(()=>!document.documentElement.classList.contains('fh3d-scroll-lock')&&getComputedStyle(document.body).position!=='fixed'));
   await page.evaluate(()=>{stopMatchTimer();const minute=match.minute;simTick();if(match.minute<=minute)throw Error('Ticker did not continue');stopMatchTimer()});
  }
  await page.setViewportSize({width:390,height:844});
  for(const type of ['big_chance_saved','big_chance_missed','shot_post']){
   await fixture(page);const before=await force(page,type);check(`${type}: does not change score`,before.score[0]===0&&before.score[1]===0&&before.goals===0);
   await page.waitForSelector('.fh3d-hud.visible');
   const hudState=await page.locator('.fh3d-hud').evaluate(h=>({name:h.querySelector('.fh3d-name').textContent,event:h.querySelector('.fh3d-event').textContent}));
   check(`${type}: correct event label`,hudState.event.includes({big_chance_saved:'PARIERT VON MIKE MAIGNAN',big_chance_missed:'VORBEI',shot_post:'PFOSTEN'}[type]));if(type==='big_chance_saved')check('saved chance keeps shooter as primary actor',hudState.name==='Jamal Musiala');
   await page.screenshot({path:path.join(output,type+'.png')});
   await page.waitForSelector('.fh3d',{state:'detached',timeout:12000});
   check(`${type}: natural completion resumes match without duplicate events`,await page.evaluate(()=>!match.highlight3DPending&&match.home===0&&match.away===0&&match.shotEvents.length===1&&matchTimer!==null));await page.evaluate(()=>stopMatchTimer());
  }
  await fixture(page,'off');await force(page,'goal');check('Off: legacy goal moment, no 3D or pending queue',await page.evaluate(()=>document.getElementById('matchGoalMoment').classList.contains('active')&&!document.querySelector('.fh3d')&&!match.highlight3DPending));await page.evaluate(()=>dismissMatchGoalMoment());
  await fixture(page,'goals');await force(page,'big_chance_saved');check('Only goals: saved chance stays in text flow',await page.evaluate(()=>!match.highlight3DPending&&!document.querySelector('.fh3d')));
  // A context loss must release the pending highlight and allow the legacy text scene to continue.
  await fixture(page);await force(page,'big_chance_saved');await page.waitForSelector('.fh3d canvas');
  await page.locator('.fh3d canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('.fh3d',{state:'detached'});check('WebGL context failure resumes fallback',await page.evaluate(()=>!match.highlight3DPending&&matchTimer!==null&&match.home===0));
  await fixture(page);await force(page,'goal');await page.waitForSelector('.fh3d canvas');
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'))});
  await page.waitForSelector('.fh3d',{state:'detached'});check('back/forward page restore cannot strand an active goal',await page.evaluate(()=>!match.highlight3DPending&&!match.highlightActive&&matchTimer!==null&&match.home===1));
  // No supported WebGL context at all (separate page so the prototype can be restored safely).
  const fallback=await context.newPage();await fallback.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await fallback.goto(url,{waitUntil:'load'});await fixture(fallback);await force(fallback,'goal');
  await fallback.waitForFunction(()=>!match.highlight3DPending&&document.getElementById('matchGoalMoment').classList.contains('active'));
  check('No WebGL: one goal, original 2D card fallback',await fallback.evaluate(()=>match.home===1&&match.goalEvents.length===1&&!document.querySelector('.fh3d')));await fallback.close();
  // A real click while the result is still hidden, followed by exactly one resume.
  await fixture(page);await page.evaluate(()=>{match.minute=38;document.getElementById('matchMinute').textContent="37'"});await force(page,'goal');await page.waitForSelector('.fh3d canvas');
  check('38-minute highlight updates previous 37-minute matchday clock',await page.evaluate(()=>document.getElementById('matchMinute').textContent==="38'"&&document.querySelector('.fh3d-brand small').textContent==="LIVE · 38'"));
  await page.getByRole('button',{name:'Überspringen',exact:true}).click();await page.waitForSelector('.fh3d',{state:'detached'});
  check('early Skip: no duplicate goal or shot; ticker resumes',await page.evaluate(()=>match.home===1&&match.goalEvents.length===1&&match.shotEvents.length===1&&!match.highlightActive&&matchTimer!==null));await page.evaluate(()=>stopMatchTimer());
  // Fail the actual dynamic module request on a fresh page (no cached loader).
  const loadFailure=await context.newPage();await loadFailure.route('**/*',r=>r.request().url().includes('3d-highlights-scene.mjs')||!r.request().url().startsWith(url)?r.abort():r.continue());
  await loadFailure.goto(url);await fixture(loadFailure);await force(loadFailure,'goal');await loadFailure.waitForFunction(()=>!match.highlight3DPending&&document.getElementById('matchGoalMoment').classList.contains('active'));
  check('module load failure: original 2D goal exactly once',await loadFailure.evaluate(()=>match.home===1&&match.goalEvents.length===1&&match.shotEvents.length===1&&!document.querySelector('.fh3d')));
  await loadFailure.evaluate(()=>dismissMatchGoalMoment());check('module load failure: timer resumes after fallback',await loadFailure.evaluate(()=>matchTimer!==null&&!match.highlightActive));await loadFailure.close();
  // Exercise the real bridge with a renderer that never resolves.
  await fixture(page);await page.evaluate(()=>{window.OriginalHighlightQueue=FooteraHighlights.Queue;FooteraHighlights.Queue=class extends OriginalHighlightQueue{constructor(options){super({...options,play:()=>new Promise(()=>{}),timeout:30})}}});
  await force(page,'big_chance_saved');await page.waitForFunction(()=>!match.highlight3DPending);
  check('watchdog releases actual match without duplicate shots or goals',await page.evaluate(()=>matchTimer!==null&&match.home===0&&match.shotEvents.length===1));
  await page.evaluate(()=>{stopMatchTimer();FooteraHighlights.Queue=OriginalHighlightQueue});
  // Production bridge snapshots for consecutive home/away events in all periods.
  await page.evaluate(()=>{window.directionEvents=[];FooteraHighlights.Queue=class extends OriginalHighlightQueue{constructor(options){super({...options,play:async e=>{directionEvents.push(e);return 'played'}})}}});
  for(const period of [1,2,3,4]){
   await fixture(page);await page.evaluate(p=>{match.halftimeLogged=p>1;match.extraTimeStarted=p>2;match.extraTimeBreakLogged=p>3;match.minute=p===1?45:p===2?90:p===3?105:120},period);
   for(const team of ['home','away','home','away']){await force(page,'goal',team);await page.waitForFunction(()=>!match.highlight3DPending);await page.evaluate(()=>stopMatchTimer())}
  }
  const directions=await page.evaluate(()=>directionEvents);
  check('16 consecutive bridge events: fixed home/away directions and correct HT/ET switches',directions.length===16&&directions.every((e,i)=>e.period===Math.floor(i/4)+1&&e.attackDirection===(e.team==='home'?1:-1)*(e.period%2?1:-1)));
  await page.evaluate(()=>{FooteraHighlights.Queue=OriginalHighlightQueue});
  // Boundaries cannot overtake a queued event.
  for(const minute of [45,90]){await fixture(page);await page.evaluate(m=>{match.minute=m;match.halftimeLogged=m>=90},minute);await force(page,'goal');check(`${minute}: phase boundary waits for highlight`,await page.evaluate(()=>resolveEndOfPhase()&&!match.finished&&!match.halftimeActive));await page.waitForSelector('.fh3d canvas');await page.getByRole('button',{name:'Überspringen',exact:true}).click();await page.waitForSelector('.fh3d',{state:'detached'});await page.evaluate(()=>{stopMatchTimer();resolveEndOfPhase()});check(`${minute}: correct phase resumes`,await page.evaluate(m=>m===45?match.halftimeActive:match.finished,minute));}
  check('no uncaught JavaScript errors during mobile matches',errors.length===0);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:results.length,results,errors},null,2));
 }catch(error){if(activePage)await activePage.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();server.close()}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.txt'),error.stack);console.error(error);server.close();process.exitCode=1});

module.exports={server,fixture,force};
