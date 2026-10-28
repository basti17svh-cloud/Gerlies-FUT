/* Real PWA startup and draft preview with an isolated cached database and save. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),output=path.join(root,'test-artifacts');fs.mkdirSync(output,{recursive:true});
const html=require('./helpers/app-html.cjs')(root),build=html.match(/const GFUT_BUILD="([^"]+)"/)[1];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
const cache=fs.readFileSync(path.join(root,'service-worker.js'),'utf8').match(/const CACHE="([^"]+)"/)[1];
// The seeded database must carry the current revision, or the app replaces it with the real download.
const dbRevision=JSON.parse(fs.readFileSync(path.join(root,'assets','players-db-version.json'),'utf8')).revision+
 fs.readFileSync(path.join(root,'footera-app.js'),'utf8').match(/const PLAYER_DB_CLIENT_REVISION="([^"]*)"/)[1];
const weekId=Number(process.env.TOTW_PREVIEW_WEEK||5),vm=require('node:vm'),rosters={};
vm.createContext(rosters);
vm.runInContext(html.slice(html.indexOf('const TOTW_WEEK_1='),html.indexOf('function totwAddCalendarDays'))+';this.weeks=TOTW_WEEKS;',rosters);
const team=rosters.weeks.find(w=>w.id===weekId);assert.ok(team,'preview week exists');
const draftNames=team.players.map(p=>p.names[0]);
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/seed.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Isolated seed</title>');return}
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://localhost:'+server.address().port,browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Europe/Berlin',serviceWorkers:'allow'});
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await context.addInitScript(releaseDate=>{
   const NativeDate=Date,at=NativeDate.parse(releaseDate+'T12:00:00Z');
   window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[at]))}static now(){return at}};
  },team.releaseDate);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/seed.html');
  await page.evaluate(async ([names,dbRevision])=>{
   const leagues=['Bundesliga','Premier League','LALIGA EA SPORTS','Serie A','Ligue 1'];
   const rows=Array.from({length:10003},(_,i)=>({id:'pwa-qa-'+i,name:'PWA Spieler '+i,ovr:i<4000?78:i<8000?70:60,position:i%11===0?'GK':'CM',team:'QA Verein '+i%30,league:leagues[i%5],nation:'Germany',gender:'male',pac:70,sho:70,pas:70,dri:70,def:70,phy:70}));
   for(const [i,name,ovr] of [[0,'Erling Haaland',91],[1,'Kylian Mbappé',91],[2,'Lamine Yamal',90]])Object.assign(rows[i],{name,ovr,position:'ST'});
   names.forEach((name,index)=>Object.assign(rows[index+20],{name,fullName:name,ovr:78,position:index<2?"GK":"CM"}));
   await new Promise((resolve,reject)=>{
    const req=indexedDB.open('GFUTPlayerDB1856',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('players',{keyPath:'id'});req.result.createObjectStore('meta',{keyPath:'key'})};
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{const db=req.result,tx=db.transaction(['players','meta'],'readwrite');for(const row of rows)tx.objectStore('players').put(row);tx.objectStore('meta').put({key:'revision',value:dbRevision});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
   });
   localStorage.setItem('gerliesFutV9',JSON.stringify({version:128,onboarded:true,coins:43210,points:321,profile:{username:'PWA QA',clubName:'FC PWA QA',saveId:'GF-PWA-QA-21144'},club:[{uid:'pwa-owned',pid:'pwa-qa-0',tradeable:false,evo:0},{uid:'pwa-owned-keeper',pid:'pwa-qa-20',tradeable:false,evo:0}],packs:{gold:2},squad:Array(23).fill(null)}));
   const old=await caches.open('footera-v21-143-qa-old');await old.put('./index.html',new Response('<title>Footera V21.143</title>',{headers:{'Content-Type':'text/html'}}));
  },[draftNames,dbRevision]);
  await page.goto(base+'/index.html?totwPreview='+weekId,{waitUntil:'load'});
  await page.locator('#bootIntroSkip').click();
  await page.waitForFunction(()=>typeof gerliesStartupReady!=='undefined'&&gerliesStartupReady&&document.getElementById('dbGate')?.style.display==='none',{},{timeout:30000});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}'});
  assert.equal(await page.title(),'Footera '+build);
  assert.equal(await page.evaluate(()=>currentViewId()),'eventsView');
  assert.equal(await page.locator('.event-player').count(),18);
  assert.ok((await page.locator('.event-foot').innerText()).includes('Freigegeben · wartet auf den geplanten Start'));
  assert.equal(await page.evaluate(id=>TOTW_WEEKS.find(w=>w.id===id).sourceStatus,weekId),'admin-approved');
  assert.equal(await page.evaluate(()=>activeTotwWeek()?.id),weekId-1,'approved upcoming TOTW stays out of packs before Wednesday 19:00');
  assert.equal(await page.evaluate(id=>publishedTotwWeeks().some(team=>team.id===id),weekId),false);
  assert.equal(await page.evaluate(id=>TOTW_WEEKS.find(w=>w.id===id).players.every((info,index)=>{
   const original=PLAYERS.find(p=>p.id==='pwa-qa-'+(index+20)),runtime=P_BY_ID.get(original.id),review=totwReviewEntries(TOTW_WEEKS.find(w=>w.id===id))[index];
   return runtime===original&&runtime.ovr===78&&['pac','sho','pas','dri','def','phy'].every(k=>runtime[k]===70)&&review.item.pid.startsWith('totw-review-'+id+'-')&&review.player.ovr===info.ovr&&['pac','sho','pas','dri','def','phy'].every((k,i)=>review.player[k]===info.stats[i]);
  }),weekId),true,'preview uses exact TOTW stats and never overwrites actual base players');
  const before=await page.evaluate(()=>{save();flushSave();return{coins:state.coins,points:state.points,club:JSON.stringify(state.club),packs:JSON.stringify(state.packs),clubName:state.profile.clubName}});
  async function checkPortraits(){
   for(let index=0;index<18;index++){
    await page.locator('.event-player').nth(index).scrollIntoViewIfNeeded();
    await page.waitForFunction(([index,id])=>{const image=document.querySelectorAll('.event-player .face img')[index];return image?.complete&&image.naturalWidth>=100&&image.currentSrc.includes('/assets/footera/totw/'+id+'/'+byEventRating(totwReviewEntries(TOTW_WEEKS.find(w=>w.id===id)))[index].info.eaId+'.png')},[index,weekId],{timeout:10000});
   }
   console.log('PASS eighteen correct locally loaded TOTW portraits');
  }
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   await checkPortraits();
   await page.evaluate(()=>scrollTo(0,0));
   const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.event-player')].map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}})}));
   assert.ok(layout.scroll<=width+2,JSON.stringify(layout));assert.ok(layout.cards.every(r=>r.left>=0&&r.right<=width+1));
   await page.screenshot({path:path.join(output,'totw'+weekId+'-preview-'+width+'.png'),fullPage:true});
   console.log('PASS TOTW '+weekId+' read-only preview at '+width+'px');
  }
  await page.waitForFunction(async expected=>!!navigator.serviceWorker.controller&&(await caches.keys()).includes(expected),cache,{timeout:45000});
  assert.ok(!(await page.evaluate(()=>caches.keys())).includes('footera-v21-143-qa-old'));
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto(new URL(manifest.start_url+'&totwPreview='+weekId,base+'/').href,{waitUntil:'load'});
  await page.locator('#bootIntroSkip').click();
  await page.waitForFunction(()=>typeof gerliesStartupReady!=='undefined'&&gerliesStartupReady&&document.getElementById('dbGate')?.style.display==='none',{},{timeout:30000});
  assert.equal(await page.title(),'Footera '+build);
  const after=await page.evaluate(()=>({coins:state.coins,points:state.points,club:JSON.stringify(state.club),packs:JSON.stringify(state.packs),clubName:state.profile.clubName,route:DATA_ROUTE,worker:!!navigator.serviceWorker.controller}));
  for(const key of ['coins','points','club','packs','clubName'])assert.equal(after[key],before[key],key+' survives offline PWA restart');
  assert.ok(after.worker);assert.ok(after.route.includes('Cache'));
  await checkPortraits();
  if(weekId===7){
   const transition=await page.evaluate(()=>{
    const OriginalDate=Date;
    const setAt=iso=>{const at=OriginalDate.parse(iso);window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[at]))}static now(){return at}};syncTotwClock()};
    setAt('2026-10-28T17:59:59Z');const before=activeTotwWeek()?.id;
    setAt('2026-10-28T18:00:00Z');const after=activeTotwWeek()?.id,entries=liveTotwTeamEntries();
    const balerdi=entries.find(e=>e.info.eaId==='242835');
    return{before,after,count:entries.length,team:balerdi?.base.team,league:balerdi?.base.league,coins:state.coins};
   });
   assert.deepEqual(transition,{before:6,after:7,count:18,team:'Roma',league:'Serie A',coins:before.coins});
   console.log('PASS actual TOTW7 runtime 18:59:59 -> 19:00 Berlin, 18 cards and Roma/Serie A');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS real online/offline '+build+' PWA startup, old cache eviction and save preservation');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
