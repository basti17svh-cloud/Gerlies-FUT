/* Event cards on the transfer market: every released promo team (EVENT_PROMO_RELEASES, e.g. HALLOWEEN Team 1/2)
   shows up in the market search by itself, gets its own "Kartentyp" option and keeps its event stats when bought. */
const {chromium}=require("playwright");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".csv":"text/csv",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{let body=fs.readFileSync(file);
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)
 }catch(_){res.writeHead(404).end()}
});
// The page clock starts at the stored instant and then runs in real time, so timers keep working.
function fakeClock(){
 const RealDate=Date,stored=Number(sessionStorage.getItem("__footeraFakeNow"));if(!Number.isFinite(stored)||!stored)return;
 let base=stored,anchor=RealDate.now();
 const now=()=>base+(RealDate.now()-anchor);
 class FakeDate extends RealDate{constructor(...args){if(args.length)super(...args);else super(now())}static now(){return now()}}
 FakeDate.parse=RealDate.parse;FakeDate.UTC=RealDate.UTC;
 globalThis.Date=FakeDate;
 globalThis.__setFooteraNow=t=>{base=t;anchor=RealDate.now();sessionStorage.setItem("__footeraFakeNow",String(t))};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const baseUrl="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",timezoneId:"Europe/Berlin",locale:"de-DE"});
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await context.route("**/*",route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
  await page.addInitScript(fakeClock);
  await page.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
  async function boot(at){
   if(page.url().startsWith(baseUrl))await page.evaluate(t=>{if(typeof flushSave==="function")flushSave();sessionStorage.setItem("__footeraFakeNow",String(t))},Date.parse(at));
   else{await page.goto(baseUrl+"/qa-blank-404",{waitUntil:"load"});await page.evaluate(t=>sessionStorage.setItem("__footeraFakeNow",String(t)),Date.parse(at))}
   await page.goto(baseUrl+"/",{waitUntil:"load"});
   await page.waitForFunction(()=>typeof PLAYERS!=="undefined"&&PLAYERS.length>10000&&typeof renderAll==="function",null,{timeout:90000});
   await page.waitForFunction(()=>document.getElementById("dbTitle")?.textContent==="Bereit für den Anpfiff",null,{timeout:90000});
   await page.addStyleTag({content:"#bootIntro,#dbGate,#onboarding,#onboard,#usernameRequiredModal,#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}"});
  }
  const market=type=>page.evaluate(type=>{
   switchView("marketView",{push:false,scroll:false});marketSection="search";refreshMarket();
   const options=[...document.getElementById("marketSpecialType").options].map(o=>({value:o.value,label:o.textContent}));
   resetMarketFilters();document.getElementById("marketSpecialType").value=type;document.getElementById("marketQuality").value=type?"special":"";refreshMarket();
   const rows=marketAllListings.map(x=>({release:x.eventReleaseId,type:x.eventType,pid:String(x.base.id),rating:listingRating(x),label:qualityLabel(x),stats:x.eventStats}));
   return{options,rows,selected:document.getElementById("marketSpecialType").value,cards:document.querySelectorAll("#marketGrid .market-row").length}
  },type);
  // Before the event: no HALLOWEEN cards and no HALLOWEEN option.
  await boot("2026-10-30T18:30:00+01:00");
  let r=await market("");
  assert.ok(!r.options.some(o=>o.value==="event:halloween"),"no Halloween filter before 30.10. 19:00");
  assert.ok(!r.rows.some(x=>x.type==="halloween"),"no Halloween offers before release");
  // Team 1 live, after the Blutmond upgrade.
  await boot("2026-10-31T20:00:00+01:00");
  r=await market("event:halloween");
  assert.equal(r.selected,"event:halloween");
  assert.deepEqual(r.options.filter(o=>o.value.startsWith("event:")),[{value:"event:halloween",label:"HALLOWEEN"}]);
  const team1=await page.evaluate(()=>HALLOWEEN_EVENT.players.map(p=>({pid:String(p.pid),ovr:p.ovr})));
  assert.ok(r.rows.length>=team1.length*3&&r.rows.every(x=>x.type==="halloween"&&x.release==="halloween-2026"&&x.label==="HALLOWEEN"),"only Halloween Team 1 offers");
  for(const p of team1){const rows=r.rows.filter(x=>x.pid===p.pid);assert.ok(rows.length>=3,"Team 1 player "+p.pid+" is on the market");assert.ok(rows.every(x=>x.rating===Math.min(99,p.ovr+1)),"Blutmond rating for "+p.pid)}
  assert.ok(r.cards>0,"market rows render");
  // Name search without type filter finds the Halloween card too (Messi).
  const messi=await page.evaluate(()=>{resetMarketFilters();document.getElementById("marketName").value="Messi";refreshMarket();return marketAllListings.filter(x=>x.eventType==="halloween").length});
  assert.ok(messi>=3,"name search lists Halloween Messi");
  // Buying keeps event stats, picture and rating.
  const bought=await page.evaluate(()=>{
   document.getElementById("marketSpecialType").value="event:halloween";document.getElementById("marketQuality").value="special";document.getElementById("marketName").value="";refreshMarket();
   const i=marketListings.findIndex(x=>x.eventType==="halloween");const x=marketListings[i];state.coins=Math.max(state.coins,x.price+1000);
   const before=state.club.length;buyMarketListing(i);const item=state.club.at(-1),info=HALLOWEEN_EVENT.players.find(p=>String(p.pid)===item.pid);
   return{added:state.club.length-before,eventType:item.eventType,release:item.eventReleaseId,tradeable:item.tradeable,rating:itemRating(item),expected:Math.min(99,info.ovr+1),dynamic:item.dynamicFace===(info.dynamicFace||info.eventFace||""),stats:JSON.stringify(item.eventStats)===JSON.stringify(info.stats)}
  });
  assert.deepEqual({...bought,rating:bought.rating===bought.expected},{added:1,eventType:"halloween",release:"halloween-2026",tradeable:true,rating:true,expected:bought.expected,dynamic:true,stats:true});
  await page.evaluate(()=>{resetMarketFilters();document.getElementById("marketSpecialType").value="event:halloween";document.getElementById("marketQuality").value="special";refreshMarket()});
  if(process.env.MARKET_SHOT){await page.waitForTimeout(2500);await page.evaluate(()=>{document.querySelector(".toast,#toast")?.remove();document.getElementById("marketResultMeta")?.scrollIntoView({block:"start"})});await page.waitForTimeout(800);}if(process.env.MARKET_SHOT)await page.screenshot({path:process.env.MARKET_SHOT,fullPage:false});
  // Team 2 joins automatically on 06.11. 19:00, Team 1 stays tradable.
  await boot("2026-11-07T20:00:00+01:00");
  r=await market("event:halloween");
  const team2=await page.evaluate(()=>HALLOWEEN_TEAM2_EVENT.players.map(p=>String(p.pid)));
  assert.ok(team2.length>0);
  for(const pid of team2)assert.ok(r.rows.some(x=>x.pid===pid&&x.release==="halloween-2026-team2"),"Team 2 player "+pid+" is on the market");
  assert.ok(r.rows.some(x=>x.release==="halloween-2026"),"Team 1 stays on the market");
  assert.equal(r.options.filter(o=>o.value==="event:halloween").length,1,"one HALLOWEEN option for both teams");
  assert.deepEqual(errors,[],"no page errors");
  console.log("market event cards ok: team1",team1.length,"team2",team2.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
