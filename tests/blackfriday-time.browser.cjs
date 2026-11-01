/* BLACK FRIDAY across its real time boundaries (Europe/Berlin): teaser 20.11., start + shop deals 27.11., one Deal des Tages
   per evening until Cyber Monday 30.11., deals end 01.12., Team 2 on 04.12., end on 11.12. Real app, simulated clock, save kept. */
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
 let context;
 try{
  context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",timezoneId:"Europe/Berlin",locale:"de-DE"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>{errors.push(e.message);if(process.env.DEBUG_TIME)console.log("PAGEERR",e.stack)});if(process.env.DEBUG_TIME)page.on("console",m=>console.log("console:",m.text().slice(0,300)));
  await context.route("**/*",route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
  await page.addInitScript(fakeClock);
  await page.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
  async function boot(at){
   if(page.url().startsWith(baseUrl))await page.evaluate(t=>{if(typeof flushSave==="function")flushSave();sessionStorage.setItem("__footeraFakeNow",String(t))},Date.parse(at));
   else{await page.goto(baseUrl+"/qa-blank-404",{waitUntil:"load"});await page.evaluate(t=>sessionStorage.setItem("__footeraFakeNow",String(t)),Date.parse(at))}
   await page.goto(baseUrl+"/",{waitUntil:"load"});
   await page.waitForFunction(()=>typeof PLAYERS!=="undefined"&&PLAYERS.length>10000&&typeof renderAll==="function",null,{timeout:90000});
   await page.waitForFunction(()=>document.getElementById("dbTitle")?.textContent==="Bereit für den Anpfiff",null,{timeout:90000});
   await page.addStyleTag({content:"#bootIntro,#dbGate,#onboarding,#usernameRequiredModal,#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}"});
   await page.evaluate(()=>renderAll());
   const now=await page.evaluate(()=>Date.now());
   assert.ok(Math.abs(now-Date.parse(at))<60000,"simulated clock is "+at);
  }
  const SECRET=/Kvaratskhelia|Ronaldo|De Bruyne|Lewandowski|(Ø|O)degaard/;
  const snapshot=()=>page.evaluate(()=>{
   const views=["homeView","sbcView","objectivesView","storeView","eventsView"],out=[];
   for(const id of views){try{switchView(id,{push:false,scroll:false})}catch(_){}out.push(document.getElementById(id)?.innerText||"")}
   switchView("homeView",{push:false,scroll:false});
   const store=Object.fromEntries(activeStorePacks().map(p=>[p.id,p.coins]));
   return{
    promo:activePromoEvent()?.id||"",store,deal:blackFridayStoreDealActive(),
    sbcs:[...new Set(activeEventPlayerSBCs().map(s=>s.eventPlayerId))].sort(),deals:activeBlackFridayDealSBCs().map(s=>s.id),
    objectives:activeEventObjectives().map(t=>t.id),evos:activeEvolutionDefinitions().filter(e=>e.design==="blackfriday").map(e=>e.id),
    hero:blackFridayHeroSlide()?{kicker:blackFridayHeroSlide().kicker,teaser:!!blackFridayHeroSlide().teaser,event:blackFridayHeroSlide().event?.id}:null,
    heroShown:document.getElementById("homeHeroCard")?.dataset.theme||"",coins:state.coins,text:out.join("\n"),season:seasonInfo().key
   }
  });

  await boot("2026-11-20T18:59:00+01:00");
  await page.evaluate(()=>{const s=state;s.onboarded=true;s.profile.username="Deals";s.profile.clubName="Deals FC";s.profile.saveId="blackfriday-time-test";s.coins=200000;save();flushSave()});
  let snap=await snapshot();
  assert.equal(snap.hero,null,"no Black Friday teaser before 20.11. 19:00");

  await boot("2026-11-20T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.hero?.teaser,true,"teaser from 20.11. 19:00");assert.equal(snap.heroShown,"blackfriday","teaser is the first home slide");
  assert.doesNotMatch(snap.text,SECRET,"20.11.: deal and objective players stay secret");
  const preview=await page.evaluate(()=>{openBlackFridayPreview();return{text:document.getElementById("opponentTeamModalBody").innerText,cards:document.querySelectorAll("#opponentTeamModalBody .custom-card.blackfriday").length}});
  assert.equal(preview.cards,3,"preview shows three silhouettes in the Black Friday design");assert.doesNotMatch(preview.text,SECRET);
  assert.match(preview.text,/Deal des Tages/);

  await boot("2026-11-27T18:59:00+01:00");
  snap=await snapshot();
  const fullPrice=snap.store;
  assert.equal(snap.promo,"");assert.equal(snap.deal,false);assert.equal(snap.sbcs.length,0);assert.equal(snap.hero?.teaser,true);
  assert.doesNotMatch(snap.text,SECRET,"27.11. 18:59: still secret");

  // App left open across 27.11. 19:00: the home hero switches to the live event by itself.
  await page.evaluate(t=>__setFooteraNow(t),Date.parse("2026-11-27T19:00:00+01:00")-1500);
  await page.waitForFunction(()=>activePromoEvent()?.id==="blackfriday-2026",null,{timeout:5000});
  await page.waitForFunction(()=>footeraRenderedClockPhase===footeraClockPhase()&&/BLACK FRIDAY/.test(document.getElementById("homeHeroKicker")?.textContent||""),null,{timeout:65000});
  assert.match(await page.evaluate(()=>document.getElementById("homeHeroKicker").textContent),/DEALS LAUFEN/,"open app shows the live deals");

  await boot("2026-11-27T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.promo,"blackfriday-2026");assert.equal(snap.deal,true);
  for(const [id,coins] of Object.entries(fullPrice))if(coins&&snap.store[id]!==undefined)assert.equal(snap.store[id],Math.max(50,Math.round(coins*0.7/50)*50),`${id} costs 30 % less`);
  assert.equal(snap.sbcs.join(),"blackfriday-kvaratskhelia-91","Deal des Tages #1");assert.equal(snap.deals.length,0);
  assert.equal(snap.objectives.join(),"blackfriday-lewandowski");assert.equal(snap.evos.join(),"blackfriday_neon");
  assert.match(snap.text,/−30 %/,"store shows the deal");
  assert.doesNotMatch(snap.text,/Ronaldo|De Bruyne|(Ø|O)degaard/,"later deals stay secret");
  // Buying a coin pack charges exactly the shown deal price.
  const bought=await page.evaluate(async()=>{storeTab="standard";switchView("storeView",{push:false,scroll:false});renderStore();const btn=document.querySelector('#packGrid [data-buy="gold"][data-cur="coins"]');const before=state.coins,shown=activeStorePacks().find(p=>p.id==="gold").coins,old=document.querySelector('#packGrid .store-deal-old')?.textContent||"";btn.click();await new Promise(r=>setTimeout(r,300));return{paid:before-state.coins,shown,old}});
  assert.equal(bought.paid,bought.shown,"charged the discounted price");assert.ok(bought.old,"old price is crossed out");
  // Pack cards from Team 1 use the Black Friday design and the card label.
  const drawn=await page.evaluate(()=>{const e=promoEventEntries(BLACKFRIDAY_EVENT)[0];const base=eventResolveBase(e.info,0,BLACKFRIDAY_EVENT.id);const item=makePromoPackItem(base,{event:BLACKFRIDAY_EVENT,info:e.info},true);state.club.push(item);save();flushSave();const box=document.createElement("div");box.innerHTML=cardHTML(displayBase(item),item);return{cls:!!box.querySelector(".custom-card.blackfriday"),rating:itemRating(item),printed:e.info.ovr,uid:item.uid}});
  assert.equal(drawn.cls,true);assert.equal(drawn.rating,drawn.printed);

  await boot("2026-11-28T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.deals.join(),"blackfriday_pick_20261128","Deal des Tages #2");
  const pick=await page.evaluate(()=>generatePack("blackfriday-team1-player",false).map(i=>({type:i.eventType,release:i.eventReleaseId})));
  assert.equal(pick.length,1);assert.equal(pick[0].type,"blackfriday");assert.equal(pick[0].release,"blackfriday-2026");
  assert.doesNotMatch(snap.text,/Ronaldo/,"Sunday deal still secret on Saturday");

  await boot("2026-11-29T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.sbcs.join(),"blackfriday-kvaratskhelia-91,blackfriday-ronaldo-87","Deal des Tages #3");
  await boot("2026-11-30T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.deals.join(),"blackfriday_pick_20261128,blackfriday_cyber_20261130","Cyber Monday deal");
  const cyber=await page.evaluate(()=>{const items=generatePack("pass-84x10",false);return{n:items.length,min:Math.min(...items.map(itemRating))}});
  assert.equal(cyber.n,10);assert.ok(cyber.min>=84);

  await boot("2026-12-01T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.deal,false,"shop deals end Di 01.12. 19:00");
  for(const [id,coins] of Object.entries(snap.store))if(fullPrice[id]!==undefined)assert.equal(coins,fullPrice[id],`${id} back to full price`);
  assert.equal(snap.promo,"blackfriday-2026");

  await boot("2026-12-04T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.promo,"blackfriday-2026-team2","Team 2 in packs");
  assert.equal(snap.sbcs.join(),"blackfriday-debruyne-89,blackfriday-ronaldo-87");
  assert.equal(snap.objectives.join(),"blackfriday-odegaard");assert.equal(snap.evos.join(),"blackfriday_cyber");
  assert.equal(snap.hero.event,"blackfriday-2026-team2");
  const kept=await page.evaluate(uid=>{const i=state.club.find(x=>x.uid===uid);const box=document.createElement("div");box.innerHTML=cardHTML(displayBase(i),i);return!!box.querySelector(".custom-card.blackfriday")},drawn.uid);
  assert.equal(kept,true,"Team 1 cards keep their design");
  const market=await page.evaluate(()=>marketPromoReleases().map(e=>e.id));
  assert.ok(market.includes("blackfriday-2026")&&market.includes("blackfriday-2026-team2"),"both teams on the transfer market");

  await boot("2026-12-11T19:00:00+01:00");
  snap=await snapshot();
  assert.equal(snap.promo,"");assert.equal(snap.hero,null);assert.equal(snap.sbcs.length,0);assert.equal(snap.objectives.length,0);
  assert.deepEqual(errors,[],"no JavaScript errors");
  console.log("black friday time test ok");
 }finally{await context?.close();await browser.close();server.close()}
})().catch(err=>{console.error(err);process.exit(1)});
