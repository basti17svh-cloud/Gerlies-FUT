/* Matchday team-management mobile smoke test. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
const check=(label,value)=>{assert.ok(value,label);console.log("PASS",label)};
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",timezoneId:"Europe/Berlin"});
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.goto(url,{waitUntil:"load"});
  await page.evaluate(()=>{
   for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
   const positions=["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW","LM","ST","CB","GK","LB","RW","CM"];
   PLAYERS=positions.map((position,i)=>({id:"md-"+i,name:i===11?"A. Semenyo":"Matchday "+i,fullName:i===11?"Antoine Semenyo":"Matchday Spieler "+i,position,alt:"",ovr:86,pac:84,sho:82,pas:80,dri:83,def:70,phy:82,nation:"Germany",team:"Test FC",league:"Bundesliga"}));
   P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));P_BY_ID.set(String(FOUNDER_PLAYER_ID),FOUNDER_BASE);
   const items=PLAYERS.map(p=>makeItem(p,false));
   const founder=founderItem();items[9]=founder;items[11].chemBoost={id:"dynamo"};
   state.club=items;state.squad=items.map(i=>i.uid);state.formation="4-3-3";state.tactic="balanced";state.profile.clubName="FC Gerlies";
   state.roles={};state.focus={};state.stats={...state.stats,rivalsMatches:0,rivalsWins:0};
   startMatch("rivals",{name:"RIVALS XI",rating:84,chem:22,power:86,squad:PLAYERS.slice(0,11),formation:"4-3-3",items:[]});
   stopMatchTimer();match.minute=78;
   const incoming=state.squad[11],outgoing=state.squad[10];
   match.lineup[10]=incoming;match.lineup[11]=null;match.subsUsed=1;match.subbedOut=[outgoing];
   match.substitutionEvents=[{minute:65,at:65,side:"home",incoming:[{uid:incoming,name:"A. Semenyo",position:"RW"}],outgoing:[{uid:outgoing,name:"Matchday 10"}]}];
   match.paused=true;initMatchManagerDraft();renderMatchManager();document.getElementById("managerPanel").classList.add("active");setMatchPill(true);
  });
  check("Semenyo remains marked out of position after substitution",await page.locator('[data-match-slot="10"].out .poswarn').isVisible());
  const overlap=await page.evaluate(()=>{
   const slot=document.querySelector('[data-match-slot="10"]'),warning=slot.querySelector(".poswarn"),rating=slot.querySelector(".match-live-rating");
   const a=warning.getBoundingClientRect(),b=rating.getBoundingClientRect();
   return !(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
  });
  check("wrong-position warning does not hide behind live rating",!overlap);
  check("Founder has the same chemistry indicator",await page.locator('[data-match-slot="9"] .match-manager-chem i.on').count()===3);
  check("equipped Chemie-Boost is external to card art",await page.locator('[data-match-slot="10"] .match-manager-card-meta .match-manager-boost').count()===1);
  check("embedded Chemie-Boost badge is hidden in match manager",await page.locator('[data-match-slot="10"] > .mini > .cb-player-badge').evaluate(el=>getComputedStyle(el).display==="none"));
  const managerCardSizes=await page.evaluate(()=>{
   const boosted=document.querySelector('[data-match-slot="10"] .card-shell')?.getBoundingClientRect(),plain=document.querySelector('[data-match-slot="8"] .card-shell')?.getBoundingClientRect();
   const dragSize=selector=>{
    const el=document.querySelector(selector),r=el.getBoundingClientRect();
    startMatchManagerDrag({target:el,clientX:r.left+r.width/2,clientY:r.top+r.height/2});
    moveMatchManagerDrag({clientX:r.left+r.width/2+18,clientY:r.top+r.height/2+18,preventDefault(){}});
    const ghost=document.querySelector(".match-manager-dragghost"),card=ghost?.querySelector(".card-shell"),box=card?.getBoundingClientRect();
    const result={width:box?.width||0,height:box?.height||0,children:ghost?.children.length||0,boostBadge:!!ghost?.querySelector(".cb-player-badge"),meta:!!ghost?.querySelector(".match-manager-card-meta")};
    clearMatchManagerDrag();document.body.style.userSelect="";return result
   };
   return{boosted:{width:boosted?.width||0,height:boosted?.height||0},plain:{width:plain?.width||0,height:plain?.height||0},boostDrag:dragSize('[data-match-slot="10"]'),plainDrag:dragSize('[data-match-slot="8"]')}
  });
  check("Chemie-Boost does not change the resting manager card size",Math.abs(managerCardSizes.boosted.width-managerCardSizes.plain.width)<=1&&Math.abs(managerCardSizes.boosted.height-managerCardSizes.plain.height)<=1);
  check("Chemie-Boost drag preview stays the same fixed size as a normal card",Math.abs(managerCardSizes.boostDrag.width-managerCardSizes.plainDrag.width)<=1&&Math.abs(managerCardSizes.boostDrag.height-managerCardSizes.plainDrag.height)<=1&&managerCardSizes.boostDrag.width>=65&&managerCardSizes.boostDrag.width<=72);
  check("drag preview contains only the card and no Chemie-Boost sizing wrapper",managerCardSizes.boostDrag.children===1&&!managerCardSizes.boostDrag.boostBadge&&!managerCardSizes.boostDrag.meta);
  check("all seven bench slots remain rendered",await page.locator("#matchManagerBench [data-match-slot]").count()===7);
  check("unused bench rating and redundant 100 percent fitness badges are hidden",await page.evaluate(()=>[...document.querySelectorAll("#matchManagerBench .match-live-fitness,#matchManagerBench .match-live-rating.unused")].every(el=>getComputedStyle(el).display==="none")));
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>{
    const host=document.getElementById("match");host.scrollTop=host.scrollHeight;
    const last=[...document.querySelectorAll("#matchManagerBench [data-match-slot]")].at(-1)?.getBoundingClientRect();
    const actions=document.querySelector(".match-manager-actions")?.getBoundingClientRect();
    return{doc:document.documentElement.scrollWidth,view:innerWidth,host:host.scrollWidth,benchClear:!!last&&!!actions&&last.bottom<=actions.top-8};
   });
   check(`${width}: manager has no horizontal overflow`,geometry.doc<=geometry.view+1&&geometry.host<=geometry.view+1);
   check(`${width}: last bench card can scroll fully above fixed actions`,geometry.benchClear);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,"matchday-manager-v2112-390.png"),fullPage:true});
  check("no uncaught JavaScript errors in team management",errors.length===0);
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
