/* Desktop overview and mobile layout regression checks. */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  let body=fs.readFileSync(file);
  if(file.endsWith("index.html")){const html=body.toString(),last=html.lastIndexOf("<script>");body=Buffer.from(html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9))}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]} : {})});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:"block"});
  await page.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base,{waitUntil:"load"});
  await page.evaluate(async()=>{
   PLAYERS=await (await fetch('/players-fallback.json')).json();
   PLAYERS.forEach(p=>{for(const k of ['pac','sho','pas','dri','def','phy'])p[k]=75});
   P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));
   state.onboarded=true;state.profile.username='DesktopTest';
   state.club=PLAYERS.slice(0,23).map(p=>makeItem(p));state.squad=state.club.map(p=>p.uid);
   for(const id of ['bootIntro','dbGate','onboard','usernameRequiredModal'])document.getElementById(id)?.remove();
   const guard=document.createElement('style');guard.textContent='#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}';document.head.append(guard);
   renderSquad();switchView('squadView');
  });
  const metrics=()=>page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   return{pitch:rect('#pitch'),nav:rect('.nav'),app:rect('.app'),toolbar:rect('#squadView .toolbar'),drawer:rect('#squadDrawer'),doc:document.documentElement.scrollWidth,screen:innerWidth};
  });
  // Record actual regression size from the pre-fix stylesheet cascade.
  await page.evaluate(()=>document.querySelector('link[href*="desktop-layout"]').disabled=true);
  console.log('BEFORE',JSON.stringify(await metrics()));
  await page.screenshot({path:path.join(output,'desktop-before.png')});
  await page.evaluate(()=>document.querySelector('link[href*="desktop-layout"]').disabled=false);
  for(const [width,height] of [[900,600],[1024,768],[1366,768],[1920,1080],[2560,1440]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>{setSquadDrawer('bench');scrollTo(0,0)});
   await page.locator("#squadDrawer").evaluate(el=>el.getAnimations().forEach(a=>a.finish()));
   const m=await metrics();console.log('AFTER',width,height,JSON.stringify(m));
   assert.ok(m.doc<=width+1,'no horizontal overflow');assert.ok(m.app.width<=1140);
   assert.ok(m.pitch.width<=440.5);assert.ok(m.pitch.bottom<m.nav.y,'whole pitch visible above navigation');
   assert.ok(m.toolbar.x>=m.pitch.right,'controls beside pitch');assert.ok(m.drawer.x>=m.pitch.right,'bench beside pitch');
   assert.equal(await page.locator('#bench .benchslot').count(),7);
   const menu=await page.locator(".squad-plan-menu").boundingBox();if(height>=768)assert.ok(menu.y+menu.height<m.nav.y,"all management shortcuts above navigation");
   await page.screenshot({path:path.join(output,'desktop-'+width+'.png')});
  }
  // All formations remain within the pitch and retain eleven actual drag targets.
  await page.setViewportSize({width:1366,height:768});
  for(const formation of await page.locator('#formationSelect option').allTextContents()){
   await page.locator('#formationSelect').selectOption(formation);
   assert.equal(await page.locator('#pitch .slot').count(),11);
   const outside=await page.evaluate(()=>{const p=document.querySelector('#pitch').getBoundingClientRect();return [...document.querySelectorAll('#pitch .slot')].some(el=>{const r=el.getBoundingClientRect();return r.x<p.x-1||r.right>p.right+1||r.y<p.y-1||r.bottom>p.bottom+1})});
   assert.ok(!outside,'formation fits: '+formation);
  }
  await page.locator('#reserveDrawerTab').click();
  assert.equal(await page.locator('#squadDrawer').getAttribute('data-mode'),'reserve');
  assert.equal(await page.locator('#reserve .reserveslot').count(),5);
  // Actual mouse drag from XI to the side bench keeps the same hit targets.
  await page.evaluate(()=>{setSquadDrawer('bench');scrollTo(0,0)});
  await page.locator('#squadDrawer').evaluate(el=>el.getAnimations().forEach(a=>a.finish()));
  const slotsBefore=await page.evaluate(()=>[state.squad[0],state.squad[11]]);
  const source=await page.locator('#pitch [data-slot="0"]').boundingBox(),target=await page.locator('#bench [data-slot="11"]').boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:15});await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>[state.squad[0],state.squad[11]]),slotsBefore.reverse(),'mouse swaps XI and bench');
  // CSS must have no effect on mobile, including the bank drawer.
  for(const width of [390,768,899]){
   await page.setViewportSize({width,height:844});
   await page.locator("#squadDrawer").evaluate(el=>el.getAnimations().forEach(a=>a.finish()));
   const after=await metrics();
   await page.evaluate(()=>document.querySelector('link[href*="desktop-layout"]').disabled=true);
   const before=await metrics();for(const key of ['pitch','nav','app','toolbar','drawer'])for(const dimension of Object.keys(after[key]))assert.ok(Math.abs(after[key][dimension]-before[key][dimension])<.5,'mobile/tablet geometry unchanged at '+width+': '+key+'.'+dimension);
   await page.evaluate(()=>document.querySelector('link[href*="desktop-layout"]').disabled=false);
  }
  for(const view of ['homeView','clubView','storeView','marketView','playView']){
   await page.setViewportSize({width:1366,height:768});await page.evaluate(v=>switchView(v),view);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' fits horizontally');
  }
  console.log('PASS desktop layouts, all formations, drawers, mobile parity and main views');
 } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
