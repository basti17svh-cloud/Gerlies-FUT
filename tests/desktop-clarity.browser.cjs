/* Desktop clarity and unchanged mobile/match rendering checks. */
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
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage"]}: {})});
 try {
  for(const dpr of [1,1.25,2]){
   const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:dpr,serviceWorkers:"block"});
   const page=await context.newPage();
   await page.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
   await page.goto(base,{waitUntil:"load"});
   await page.evaluate(async()=>{
    PLAYERS=await (await fetch('/players-fallback.json')).json();
    for(const p of PLAYERS){p.face='./assets/footera/founder-max-portrait.webp';for(const k of ['pac','sho','pas','dri','def','phy'])p[k]=75}
    P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));state.onboarded=true;state.profile.username='ClarityTest';state.club=PLAYERS.slice(0,23).map(p=>makeItem(p));state.squad=state.club.map(p=>p.uid);
    for(const id of ['bootIntro','dbGate','onboard','usernameRequiredModal'])document.getElementById(id)?.remove();
    const guard=document.createElement('style');guard.textContent='#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}';document.head.append(guard);
    renderAll();switchView('clubView');
   });
   await page.locator(".club-hub-pros").click();
   await page.waitForFunction(()=>document.querySelector('#clubView .card-shell'));
   await page.locator('.club-card-preview').first().scrollIntoViewIfNeeded();
   await page.evaluate(()=>scrollBy(0,260));
   const sample=()=>page.evaluate(()=>{
    const card=document.querySelector('#clubView .card-shell'),name=card.querySelector('.pname'),label=document.querySelector('#clubView .club-item p');
    const nav=document.querySelector('.nav');return{cardFilter:getComputedStyle(card).filter,nameShadow:getComputedStyle(name).textShadow,cardWidth:card.getBoundingClientRect().width,labelSize:parseFloat(getComputedStyle(label).fontSize),navTransform:getComputedStyle(nav).transform,backdrop:getComputedStyle(nav).backdropFilter,scroll:document.documentElement.scrollWidth};
   });
   await page.evaluate(()=>document.querySelector('link[href*="desktop-clarity"]').disabled=true);
   const before=await sample();
   await page.screenshot({path:path.join(output,'clarity-before-dpr-'+dpr+'.png')});
   await page.evaluate(()=>document.querySelector('link[href*="desktop-clarity"]').disabled=false);
   await page.waitForFunction(()=>getComputedStyle(document.querySelector("#clubView .card-shell")).filter==="none");
   const after=await sample();
   assert.notEqual(before.cardFilter,'none');assert.equal(after.cardFilter,'none');

   assert.equal(after.nameShadow,'none');assert.equal(after.cardWidth,before.cardWidth);assert.ok(after.labelSize>=12);assert.equal(after.navTransform,'none');assert.equal(after.backdrop,'none');assert.ok(after.scroll<=1366);
   await page.screenshot({path:path.join(output,'clarity-after-dpr-'+dpr+'.png')});
   // UI clarity must not change even a single computed style inside the match.
   const matchSnapshot=()=>page.evaluate(()=>[...document.querySelectorAll('#match,#match *')].map(el=>Array.from(getComputedStyle(el),p=>[p,getComputedStyle(el).getPropertyValue(p)])));
   const withClarity=await matchSnapshot();await page.evaluate(()=>document.querySelector('link[href*="desktop-clarity"]').disabled=true);
   assert.deepEqual(await matchSnapshot(),withClarity,'match CSS unchanged');
   await context.close();console.log('PASS desktop clarity at DPR '+dpr);
  }
  for(const device of [{width:390,mobile:true},{width:844,mobile:true},{width:1024,mobile:true},{width:768,mobile:false}]){
   const context=await browser.newContext({viewport:{width:device.width,height:844},isMobile:device.mobile,hasTouch:device.mobile,serviceWorkers:'block'}),page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base,{waitUntil:'load'});
   // Freeze animations before comparing the native style cascade.
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
   const snapshot=()=>page.evaluate(()=>[...document.querySelectorAll('.nav,.topbar,.brand small,.walletbox span,.club-item,.card-shell,.pname,.headline p')].map(el=>Array.from(getComputedStyle(el),p=>[p,getComputedStyle(el).getPropertyValue(p)])));
   const before=await snapshot();await page.evaluate(()=>document.querySelector('link[href*="desktop-clarity"]').disabled=true);assert.deepEqual(await snapshot(),before,'phone/tablet CSS unchanged at '+device.width);
   await context.close();
  }
  console.log('PASS phone/tablet style parity and unchanged match styles');
 } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
