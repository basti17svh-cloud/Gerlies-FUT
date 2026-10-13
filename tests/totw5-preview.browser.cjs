/* Real PWA startup and draft preview with an isolated cached database and save. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),output=path.join(root,'test-artifacts');fs.mkdirSync(output,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),build=html.match(/const GFUT_BUILD="([^"]+)"/)[1];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
const cache=fs.readFileSync(path.join(root,'service-worker.js'),'utf8').match(/const CACHE="([^"]+)"/)[1];
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
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/seed.html');
  await page.evaluate(async()=>{
   const leagues=['Bundesliga','Premier League','LALIGA EA SPORTS','Serie A','Ligue 1'];
   const rows=Array.from({length:10003},(_,i)=>({id:'pwa-qa-'+i,name:'PWA Spieler '+i,ovr:i<4000?78:i<8000?70:60,position:i%11===0?'GK':'CM',team:'QA Verein '+i%30,league:leagues[i%5],nation:'Germany',gender:'male',pac:70,sho:70,pas:70,dri:70,def:70,phy:70}));
   for(const [i,name,ovr] of [[0,'Erling Haaland',91],[1,'Kylian Mbappé',91],[2,'Lamine Yamal',90]])Object.assign(rows[i],{name,ovr,position:'ST'});
   await new Promise((resolve,reject)=>{
    const req=indexedDB.open('GFUTPlayerDB1856',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('players',{keyPath:'id'});req.result.createObjectStore('meta',{keyPath:'key'})};
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{const db=req.result,tx=db.transaction('players','readwrite');for(const row of rows)tx.objectStore('players').put(row);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
   });
   localStorage.setItem('gerliesFutV9',JSON.stringify({version:128,onboarded:true,coins:43210,points:321,profile:{username:'PWA QA',clubName:'FC PWA QA',saveId:'GF-PWA-QA-21144'},club:[{uid:'pwa-owned',pid:'pwa-qa-0',tradeable:false,evo:0}],packs:{gold:2},squad:Array(23).fill(null)}));
   const old=await caches.open('footera-v21-143-qa-old');await old.put('./index.html',new Response('<title>Footera V21.143</title>',{headers:{'Content-Type':'text/html'}}));
  });
  await page.goto(base+'/index.html?totwPreview=5',{waitUntil:'load'});
  await page.locator('#bootIntroSkip').click();
  await page.waitForFunction(()=>typeof gerliesStartupReady!=='undefined'&&gerliesStartupReady&&document.getElementById('dbGate')?.style.display==='none',{},{timeout:30000});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}'});
  assert.equal(await page.title(),'Footera '+build);
  assert.equal(await page.evaluate(()=>currentViewId()),'eventsView');
  assert.equal(await page.locator('.event-player').count(),18);
  assert.ok((await page.locator('.event-foot').innerText()).includes('wartet auf deine Freigabe'));
  assert.equal(await page.evaluate(()=>TOTW_WEEK_5.sourceStatus),'pending-approval');
  const before=await page.evaluate(()=>{save();flushSave();return{coins:state.coins,points:state.points,club:JSON.stringify(state.club),packs:JSON.stringify(state.packs),clubName:state.profile.clubName}});
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.event-player')].map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}})}));
   assert.ok(layout.scroll<=width+2,JSON.stringify(layout));assert.ok(layout.cards.every(r=>r.left>=0&&r.right<=width+1));
   await page.screenshot({path:path.join(output,'totw5-preview-'+width+'.png'),fullPage:true});
   console.log('PASS TOTW 5 read-only preview at '+width+'px');
  }
  await page.waitForFunction(async expected=>!!navigator.serviceWorker.controller&&(await caches.keys()).includes(expected),cache,{timeout:45000});
  assert.ok(!(await page.evaluate(()=>caches.keys())).includes('footera-v21-143-qa-old'));
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto(new URL(manifest.start_url,base+'/').href,{waitUntil:'load'});
  await page.locator('#bootIntroSkip').click();
  await page.waitForFunction(()=>typeof gerliesStartupReady!=='undefined'&&gerliesStartupReady&&document.getElementById('dbGate')?.style.display==='none',{},{timeout:30000});
  assert.equal(await page.title(),'Footera '+build);
  const after=await page.evaluate(()=>({coins:state.coins,points:state.points,club:JSON.stringify(state.club),packs:JSON.stringify(state.packs),clubName:state.profile.clubName,route:DATA_ROUTE,worker:!!navigator.serviceWorker.controller}));
  for(const key of ['coins','points','club','packs','clubName'])assert.equal(after[key],before[key],key+' survives offline PWA restart');
  assert.ok(after.worker);assert.ok(after.route.includes('Cache'));
  assert.deepEqual(errors,[]);
  console.log('PASS real online/offline '+build+' PWA startup, old cache eviction and save preservation');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
