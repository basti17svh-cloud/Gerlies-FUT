/* Event calendar ("Demnächst") in the real app with a simulated Berlin clock:
   rows appear in the Zentrale, no unreleased player names, layout fits 360/390/412 px. */
const {chromium}=require("playwright");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".csv":"text/csv",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{const body=fs.readFileSync(file);res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}
});
function fakeClock(){
 const RealDate=Date,stored=Number(sessionStorage.getItem("__footeraFakeNow"));if(!Number.isFinite(stored)||!stored)return;
 const base=stored,anchor=RealDate.now(),now=()=>base+(RealDate.now()-anchor);
 class FakeDate extends RealDate{constructor(...args){if(args.length)super(...args);else super(now())}static now(){return now()}}
 FakeDate.parse=RealDate.parse;FakeDate.UTC=RealDate.UTC;globalThis.Date=FakeDate;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const baseUrl="http://127.0.0.1:"+server.address().port,shots=process.env.CALENDAR_SHOTS||"";
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const [width,at] of [[390,"2026-11-01T14:00:00+01:00"],[360,"2026-11-03T12:00:00+01:00"],[412,"2026-11-08T12:00:00+01:00"]]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:"block",timezoneId:"Europe/Berlin",locale:"de-DE"});
   const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await context.route("**/*",route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
   await page.addInitScript(fakeClock);
   await page.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
   await page.goto(baseUrl+"/qa-blank-404",{waitUntil:"load"});await page.evaluate(t=>sessionStorage.setItem("__footeraFakeNow",String(t)),Date.parse(at));
   await page.goto(baseUrl+"/",{waitUntil:"load"});
   await page.waitForFunction(()=>typeof PLAYERS!=="undefined"&&PLAYERS.length>10000&&typeof renderAll==="function",null,{timeout:90000});
   await page.waitForFunction(()=>document.getElementById("dbTitle")?.textContent==="Bereit für den Anpfiff",null,{timeout:90000});
   await page.addStyleTag({content:"#bootIntro,#dbGate,#onboarding,#onboard,#usernameRequiredModal,#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}"});
   await page.evaluate(()=>{renderAll();switchView("homeView",{push:false,scroll:false})});
   const info=await page.evaluate(()=>{const panel=document.getElementById("homeCalendarPanel"),rows=[...document.querySelectorAll("#homeCalendarList .home-calendar-item")];
    return{hidden:panel.hidden,text:panel.innerText,all:document.getElementById("homeCalendarList").textContent,visible:rows.filter(r=>r.offsetParent).length,count:rows.length,overflow:document.documentElement.scrollWidth>window.innerWidth,clipped:rows.some(r=>r.getBoundingClientRect().right>window.innerWidth+1)}});
   const label=`${width}px ${at}`;
   assert.equal(info.hidden,false,label+": calendar shown");
   assert.ok(info.count>=3,label+": rows "+info.count);
   assert.ok(info.visible<=6,label+": at most 5 rows + season visible before expanding");
   assert.equal(info.overflow,false,label+": no horizontal scroll");assert.equal(info.clipped,false,label+": rows fit");
   assert.match(info.all,/Season/);
   if(at.startsWith("2026-11-01")){
    assert.match(info.all,/Team der Woche 8/);assert.match(info.all,/HALLOWEEN · TEAM 2/);assert.match(info.all,/Geheime Spieler-SBC/);assert.match(info.all,/Kürbis-Pick/);
    assert.doesNotMatch(info.all,/Gy(ö|o)keres|Mbeumo|Son Heung|Semenyo/,label+": no spoilers");
   }
   if(at.startsWith("2026-11-03")){assert.match(info.all,/SBC Viktor Gyökeres endet/);assert.doesNotMatch(info.all,/Mbeumo|Son Heung|Semenyo/,label+": Team 2 stays secret")}
   if(at.startsWith("2026-11-08"))assert.match(info.all,/HALLOWEEN endet/);
   if(info.count>5){await page.evaluate(()=>document.getElementById("homeCalendarMore").click());const v=await page.evaluate(()=>[...document.querySelectorAll("#homeCalendarList .home-calendar-item")].filter(r=>r.offsetParent).length);assert.equal(v,info.count,label+": expand shows all")}
   if(shots){await page.locator("#homeCalendarPanel").scrollIntoViewIfNeeded();await page.locator("#homeCalendarPanel").screenshot({path:path.join(shots,`kalender-${width}.png`)})}
   assert.deepEqual(errors,[],label+": no page errors");
   console.log("ok",label,info.count,"rows");
   await context.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
