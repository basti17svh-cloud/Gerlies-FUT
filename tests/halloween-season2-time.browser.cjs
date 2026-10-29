/* HALLOWEEN · BLUTMOND + Season Pass S2 across the real time boundaries (Europe/Berlin).
   Loads the real app with a simulated clock, keeps the save in localStorage across reloads and checks:
   30.10. 18:59 locked -> 19:00 event + S2 live, S1 settled exactly once, Blutmond upgrade on 31.10. 19:00
   exactly once (reload, offline, cloud save round trip, app left open), no spoilers, 06.11. Team 2 handover keeps cards. */
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
const T={
 before:"2026-10-30T18:59:00+01:00",morning:"2026-10-30T06:00:00+01:00",start:"2026-10-30T19:00:00+01:00",
 beforeUpgrade:"2026-10-31T18:59:30+01:00",upgrade:"2026-10-31T19:00:00+01:00",
 beforeWeekSbc:"2026-11-02T18:59:00+01:00",weekSbc:"2026-11-02T19:00:00+01:00",beforeEnd:"2026-11-06T18:59:00+01:00",end:"2026-11-06T19:00:00+01:00",team2Sbc:"2026-11-07T19:00:00+01:00",weekSbcEnd:"2026-11-09T19:00:00+01:00",later:"2026-11-20T12:00:00+01:00"
};
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
  const snapshot=()=>page.evaluate(()=>{
   const visibleText=()=>{const out=[];for(const id of ["homeView","sbcView","objectivesView","storeView","eventsView"]){try{switchView(id,{push:false,scroll:false})}catch(_){}out.push(document.getElementById(id)?.innerText||"")}switchView("homeView",{push:false,scroll:false});return out.join("\n")};
   const hw=state.club.filter(i=>String(i.eventType||"").startsWith("halloween"));
   const saved=JSON.parse(localStorage.getItem("gerliesFutV9")||"null");
   return{
    season:seasonInfo().key,passKey:state.seasonPass?.key,sp:state.sp,coins:state.coins,packs:{...state.packs},storyGranted:{...(state.storyPassGranted||{})},
    promo:activePromoEvent()?.id||"",storePacks:activePromoPacks().map(p=>p.id),
    evo:activeEvolutionDefinitions().some(e=>e.id==="halloween_blutmond"),
    objectives:activeEventObjectives().map(t=>t.id),
    eventSbcs:[...new Set(activeEventPlayerSBCs().map(s=>s.eventPlayerId))],
    upgrade:!!halloweenUpgradeFor({eventType:"halloween"}),
    hero:typeof halloweenHeroSlide==="function"?halloweenHeroSlide():null,
    cards:hw.map(i=>({uid:i.uid,type:i.eventType,stored:i.displayRating,rating:itemRating(i),pac:displayBase(i).pac,storedStats:Array.isArray(i.eventStats)?i.eventStats[0]:null})),
    savedCards:(saved?.club||[]).filter(i=>String(i.eventType||"").startsWith("halloween")).map(i=>({uid:i.uid,stored:i.displayRating,stats:Array.isArray(i.eventStats)?i.eventStats[0]:null})),
    text:visibleText()
   }
  });
  const noSpoilers=(snap,label)=>{
   assert.doesNotMatch(snap.text,/M(ü|u)ller/,label+": Müller SBC stays secret");
   assert.doesNotMatch(snap.text,/Le(ã|a)o/,label+": Leão objective stays secret");
  };
  const noLaterSpoilers=(snap,label)=>{
   assert.doesNotMatch(snap.text,/Gy(ö|o)keres/,label+": Gyökeres SBC stays secret");
   assert.doesNotMatch(snap.text,/Mbeumo/,label+": Team 2 SBC stays secret");
   assert.doesNotMatch(snap.text,/Son Heung/,label+": Team 2 objective stays secret");
  };

  // 30.10. 06:00: the teaser must say "heute", not "morgen".
  await boot(T.morning);
  await page.evaluate(()=>{
   localStorage.removeItem("gerliesFutV9");
   const s=state;s.onboarded=true;s.profile.username="Zeittest";s.profile.clubName="Zeittest FC";s.profile.saveId="halloween-time-test";
   s.coins=100000;s.points=0;s.sp=17000;s.seasonPass={key:"s1",premium:true,freeClaims:{1:true,2:true},premiumClaims:{1:true}};
   s.storyPassGranted={};s.storyPassPending=[];save();flushSave();
  });
  let snap=await snapshot();
  assert.equal(snap.hero?.teaser,true,"teaser runs on the event morning");
  assert.match(snap.hero.text,/Heute Abend/,"30.10. 06:00 teaser says 'Heute Abend' ("+snap.hero.text+")");

  // 30.10. 18:59: everything still locked, still Season 1.
  await boot(T.before);
  snap=await snapshot();
  assert.equal(await page.evaluate(()=>SEASON_REWARDS.at(-1).sp),26500,"S1 keeps the old SP ladder");
  assert.equal(snap.season,"s1");assert.equal(snap.passKey,"s1");assert.equal(snap.sp,17000,"S1 SP untouched before the handover");
  assert.equal(snap.promo,"","no Halloween promo at 18:59");
  assert.ok(!snap.storePacks.includes("halloween-pack"),"Blutmond pack not in store at 18:59");
  assert.equal(snap.evo,false,"Blutmond evo locked at 18:59");
  assert.deepEqual(snap.objectives,[],"Leão objective locked at 18:59");
  assert.deepEqual(snap.eventSbcs,[],"no event SBC at 18:59");
  assert.equal(snap.hero?.teaser,true,"home shows the teaser");
  noSpoilers(snap,"30.10. 18:59");noLaterSpoilers(snap,"30.10. 18:59");
  const coinsBeforeHandover=snap.coins,packsBeforeHandover=snap.packs;

  // 30.10. 19:00: Halloween and Season 2 live, S1 rewards settled once.
  await boot(T.start);
  snap=await snapshot();
  assert.equal(snap.season,"s2");assert.equal(snap.passKey,"s2","pass moved to S2");assert.equal(snap.sp,0,"S2 starts at 0 SP");
  assert.equal(await page.evaluate(()=>SEASON_REWARDS.at(-1).sp),39750,"S2 level 30 costs 50 % more SP");
  const passPacks=await page.evaluate(()=>["pass-83x10","pass-84x10","pass-84x5","pass-85x7"].map(id=>{const items=generatePack(id,false);return{id,count:items.length,min:Math.min(...items.map(i=>itemRating(i)))}}));
  assert.deepEqual(passPacks.map(p=>[p.id,p.count]),[["pass-83x10",10],["pass-84x10",10],["pass-84x5",5],["pass-85x7",7]],"Season pass packs have the promised size");
  for(const [p,floor] of passPacks.map((p,i)=>[p,[83,84,84,85][i]]))assert.ok(p.min>=floor,`${p.id} only holds ${floor}+ players`);
  const passLevels=await page.evaluate(()=>[16,28].map(level=>{const tier=SEASON_REWARDS.find(t=>t.level===level);return[seasonTierReward(tier,"free","s2").pack,seasonTierReward(tier,"premium","s2").pack]}));
  assert.deepEqual(passLevels,[["pass-83x10","pass-84x10"],["pass-84x5","pass-85x7"]],"S2 free/premium pack pairs on levels 16 and 28");
  assert.equal(snap.promo,"halloween-2026");
  assert.ok(snap.storePacks.includes("halloween-pack"),"Blutmond pack in store at 19:00");
  assert.equal(snap.evo,true,"Blutmond evo open at 19:00");
  assert.deepEqual(snap.objectives,["halloween-leao"],"Leão objective live at 19:00");
  assert.deepEqual(snap.eventSbcs,[],"Müller SBC not before 31.10.");
  assert.equal(snap.upgrade,false,"no Blutmond upgrade on 30.10.");
  assert.equal(snap.hero?.teaser,undefined,"home shows the live event");
  assert.doesNotMatch(snap.text,/M(ü|u)ller/,"30.10. 19:00: Müller SBC stays secret");
  assert.ok(snap.coins>coinsBeforeHandover,"unclaimed S1 rewards were paid out");
  assert.equal(snap.storyGranted["s1-15"],true,"S1 story player at level 15 was delivered");
  const settled={coins:snap.coins,packs:snap.packs};
  assert.notDeepEqual(settled.packs,packsBeforeHandover,"unclaimed S1 pack rewards were paid out");
  await boot(T.start);
  snap=await snapshot();
  assert.equal(snap.coins,settled.coins,"S1 settlement does not repeat on reload");
  assert.deepEqual(snap.packs,settled.packs,"S1 pack settlement does not repeat on reload");

  // Draw a Halloween card from the real pack, earn the Leão objective, collect a Halloween pack from S2 level 4.
  const drawn=await page.evaluate(()=>{
   const pack=generatePack("halloween-pack",true),card=pack.find(i=>i.eventType==="halloween");
   state.club.push(...pack);
   state.eventObjectives={"halloween-leao":{progress:8,matchIds:[1,2,3,4,5,6,7,8],claimed:false}};
   const ok=claimEventObjective(EVENT_OBJECTIVES.find(t=>t.id==="halloween-leao"));
   state.sp=SEASON_REWARDS.find(t=>t.level===4).sp;save();flushSave();
   return{size:pack.length,card:card&&{uid:card.uid,rating:itemRating(card),stored:card.displayRating},objective:ok}
  });
  assert.equal(drawn.size,6);assert.ok(drawn.card,"pack holds a Halloween card");assert.equal(drawn.card.rating,drawn.card.stored,"pack card shows its printed rating");
  assert.equal(drawn.objective,true,"Leão objective claimed");
  const s2Level4=await page.evaluate(()=>{const tier=SEASON_REWARDS.find(t=>t.level===4);return{reward:seasonTierReward(tier,"free"),sp:tier.sp}});
  assert.deepEqual(s2Level4.reward,{pack:"halloween-pack"},"S2 free level 4 is the Blutmond pack");

  // 31.10. 18:59: still no upgrade, Müller hidden.
  await boot(T.beforeUpgrade);
  snap=await snapshot();
  assert.equal(snap.upgrade,false);assert.deepEqual(snap.eventSbcs,[]);
  assert.doesNotMatch(snap.text,/M(ü|u)ller/,"31.10. 18:59: Müller SBC stays secret");
  const pre=Object.fromEntries(snap.cards.map(c=>[c.uid,c]));
  assert.equal(snap.cards.length,2,"pack card + Leão in the club");
  for(const c of snap.cards)assert.equal(c.rating,c.stored,"no upgrade before 31.10. 19:00");

  // App left open across 31.10. 19:00 and offline: the open app must pick up the upgrade by itself.
  await context.setOffline(true);
  await page.evaluate(t=>{__setFooteraNow(t);switchView("clubView",{push:false,scroll:false})},Date.parse(T.upgrade)-1500);
  await page.waitForFunction(()=>!!halloweenUpgradeFor({eventType:"halloween"}),null,{timeout:5000});
  assert.equal(await page.evaluate(()=>activeEventPlayerSBCs().length>0),true,"Müller SBC opens at 19:00");
  await page.waitForFunction(()=>typeof footeraClockPhase==="function"&&footeraRenderedClockPhase===footeraClockPhase(),null,{timeout:65000});
  snap=await snapshot();
  for(const c of snap.cards){assert.equal(c.rating,pre[c.uid].rating+1,"open app: +1 exactly once ("+c.type+")");assert.equal(c.pac,pre[c.uid].pac+1,"open app: +1 stats")}
  await context.setOffline(false);

  // Reloads after the upgrade: still exactly +1, the save itself is never rewritten.
  for(let i=0;i<2;i++){
   await boot(T.upgrade);
   snap=await snapshot();
   for(const c of snap.cards){assert.equal(c.rating,pre[c.uid].rating+1,"reload "+(i+1)+": +1 exactly once ("+c.type+")");assert.equal(c.stored,pre[c.uid].stored,"stored rating unchanged")}
   for(const c of snap.savedCards)assert.equal(c.stored,pre[c.uid].stored,"localStorage save keeps the printed rating");
  }
  assert.deepEqual(snap.eventSbcs,["halloween-mueller-88"],"Müller SBC live after the reload");

  // Cloud round trip: the cloud row stores the save JSON verbatim. A save uploaded before the upgrade and
  // one uploaded after it must both show +1 once on another device.
  const cloud=await page.evaluate(()=>{save();flushSave();return localStorage.getItem("gerliesFutV9")});
  await page.evaluate(raw=>{localStorage.clear();localStorage.setItem("gerliesFutV9",raw)},cloud);
  await boot(T.upgrade);
  snap=await snapshot();
  for(const c of snap.cards)assert.equal(c.rating,pre[c.uid].rating+1,"cloud restore: +1 exactly once");
  const friend=await page.evaluate(uid=>{const item=state.club.find(i=>i.uid===uid),fp=friendSnapshotItem(item);return{sent:fp.ovr,shown:itemRating(friendItem(fp))}},drawn.card.uid);
  assert.equal(friend.sent,pre[drawn.card.uid].rating+1);assert.equal(friend.shown,friend.sent,"friend/online view shows +1 once");

  // Season Pass S2 level 4: Blutmond pack claimed during the event.
  const claimed=await page.evaluate(()=>{const before=Number(state.packs["halloween-pack"]||0);renderSeasonPass();const btn=document.querySelector('[data-pass-claim="free"][data-pass-level="4"]');if(!btn)return -1;btn.click();btn.click();return Number(state.packs["halloween-pack"]||0)-before});
  assert.equal(claimed,1,"S2 level 4 gives one Blutmond pack");

  // 02.11.: the second Halloween SBC (Gyökeres) runs one full week.
  await boot(T.beforeWeekSbc);
  snap=await snapshot();
  assert.deepEqual(snap.eventSbcs,["halloween-mueller-88"],"02.11. 18:59: Gyökeres not yet");noLaterSpoilers(snap,"02.11. 18:59");
  await boot(T.weekSbc);
  snap=await snapshot();
  assert.deepEqual(snap.eventSbcs.sort(),["halloween-gyokeres-88","halloween-mueller-88"],"02.11. 19:00: Gyökeres SBC live next to Müller");
  assert.match(snap.text,/Gy(ö|o)keres/,"Gyökeres SBC is shown");

  // 06.11. 18:59 Team 1; 19:00 Team 2 takes over the packs.
  await boot(T.beforeEnd);
  snap=await snapshot();
  assert.equal(snap.promo,"halloween-2026");assert.ok(snap.storePacks.includes("halloween-pack"));assert.deepEqual(snap.objectives,["halloween-leao"]);
  await boot(T.end);
  snap=await snapshot();
  assert.equal(snap.season,"s2","Season Pass S2 is unaffected by Halloween Team 2");
  assert.equal(snap.promo,"halloween-2026-team2","Team 2 replaces Team 1 at 19:00");
  assert.ok(snap.storePacks.includes("halloween-pack"),"event pack remains available with Team 2");
  assert.equal(snap.evo,false,"no new Blutmond evo signups");
  assert.equal(await page.evaluate(()=>activeEvolutionDefinitions().some(e=>e.id==="halloween_blutmond_2")),true,"Blutmond evolution II opens");
  assert.deepEqual(snap.objectives,["halloween-son"],"Son objective replaces Leão");assert.deepEqual(snap.eventSbcs,["halloween-gyokeres-88"],"Müller ends, Gyökeres keeps running");
  assert.ok(snap.hero,"Halloween hero is still present");
  assert.match(snap.hero.text,/Team 2/,"hero announces Team 2");
  const team2Card=await page.evaluate(()=>{const pack=generatePack("halloween-pack",false),card=pack.find(i=>String(i.eventType||"").startsWith("halloween"));return card?{release:card.eventReleaseId,rating:itemRating(card),stored:card.displayRating}:null});
  assert.equal(team2Card?.release,"halloween-2026-team2","new Blutmond packs contain a Team 2 card");assert.equal(team2Card.rating,team2Card.stored+1,"Team 2 cards carry the Blutmond upgrade");
  for(const c of snap.cards)assert.equal(c.rating,pre[c.uid].rating+1,"06.11. 19:00: card keeps its Blutmond upgrade");
  // A Blutmond pack still unopened from the pass keeps its promise after the event.
  const late=await page.evaluate(()=>{const pack=generatePack("halloween-pack",false),card=pack.find(i=>i.eventType==="halloween");return{size:pack.length,rating:card?itemRating(card):0,stored:card?.displayRating||0}});
  assert.equal(late.size,6,"Blutmond pack still opens after the handover");assert.equal(late.rating,late.stored+1,"its Halloween card carries the upgrade");

  await boot(T.team2Sbc);
  snap=await snapshot();
  assert.deepEqual(snap.eventSbcs.sort(),["halloween-gyokeres-88","halloween-mbeumo-87"],"07.11. 19:00: Team 2 SBC opens");
  await boot(T.weekSbcEnd);
  snap=await snapshot();
  assert.deepEqual(snap.eventSbcs,["halloween-mbeumo-87"],"09.11. 19:00: Gyökeres week is over");

  await boot(T.later);
  snap=await snapshot();
  assert.equal(snap.promo,"","the provisional second-week window has ended by 20.11.");
  for(const c of snap.cards)assert.equal(c.rating,pre[c.uid].rating+1,"weeks later: still +1");
  assert.deepEqual(errors,[],"no JavaScript errors");
  console.log("halloween + season 2 time test ok");
 }finally{await context?.close();await browser.close();server.close()}
})().catch(err=>{console.error(err);process.exit(1)});
