/* V21.12 usability/mobile visual smoke test. */
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
   const positions=["GK","LB","CB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST"];
   PLAYERS=Array.from({length:30},(_,i)=>({id:"ux-"+i,name:"UX Spieler "+i,fullName:"UX Testspieler "+i,position:positions[i%positions.length],alt:i%3===0?"CM,ST":"",ovr:72+(i%18),pac:78,sho:76,pas:79,dri:80,def:72,phy:77,nation:i%2?"Germany":"France",team:i%3===0?"UX München":i%3===1?"UX Berlin":"UX Hamburg",league:i%2?"Bundesliga":"Premier League"}));
   P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.club=PLAYERS.map(p=>makeItem(p,false));state.club[0].chemBoost={id:FooteraChemBoosts.DEFINITIONS[0].id,appliedAt:Date.now()};state.transferList=[state.club[0].uid,state.club[1].uid];state.sbcStorage=state.club.slice(2,7).map(x=>({...x,uid:x.uid+"-sbc"}));state.activeEvos=[];
   switchView("clubView");renderClub();
  });
  await page.locator('[data-club-area="pros"]').click();
  check("club status strip is visible",await page.locator("#clubOverviewStrip").isVisible());
  check("Chemie-Boost badge is absent from club collection",await page.locator("#clubGrid .cb-player-badge").count()===0);
  const cardSizing=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll("#clubGrid .club-card-preview .card-shell")].slice(0,2).map(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height}});
   const item=state.club[0],base=displayBase(item),bio=playerBiographyHTML(resolvedPlayer(base),item);
   return{cards,bioHasBoost:bio.includes("cb-profile")}
  });
  check("boosted and normal club cards have identical dimensions",cardSizing.cards.length===2&&Math.abs(cardSizing.cards[0].width-cardSizing.cards[1].width)<=1&&Math.abs(cardSizing.cards[0].height-cardSizing.cards[1].height)<=1);
  check("390px club cards keep the Kahn-size width",cardSizing.cards[0].width>=141&&cardSizing.cards[0].width<=143);
  check("Chemie-Boost remains visible in player biography",cardSizing.bioHasBoost);
  check("club status reflects current club size",await page.locator("#clubUxPlayers").textContent()==="30");
  check("club mobile filter panel starts compact",!(await page.locator("#clubFilterPanel").isVisible()));
  await page.locator("#clubFilterToggle").click();
  check("club filter panel opens on demand",await page.locator("#clubFilterPanel").isVisible());
  await page.locator("#clubPosition").selectOption("ST");
  check("club filter summary reflects active selection",(await page.locator("#clubFilterSummary").textContent()).includes("ST+"));
  await page.locator("#clubFilterToggle").click();
  check("club browsing returns to compact state",!(await page.locator("#clubFilterPanel").isVisible()));

  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth,status:document.getElementById("clubOverviewStrip")?.scrollWidth,statusClient:document.getElementById("clubOverviewStrip")?.clientWidth,toggle:document.getElementById("clubFilterToggle")?.scrollWidth,toggleClient:document.getElementById("clubFilterToggle")?.clientWidth}));
   check(`${width}: club overview has no horizontal overflow`,geometry.doc<=geometry.view+1&&geometry.status<=geometry.statusClient+1&&geometry.toggle<=geometry.toggleClient+1);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,"ux-overview-v2112-club-390.png"),fullPage:false});

  await page.evaluate(()=>{switchView("marketView");renderMarket()});
  await page.locator('[data-market-section="search"]').click();
  check("market search opens with filters available",await page.locator("#marketFilterPanel").isVisible());
  await page.locator("#marketName").fill("UX Spieler 8");
  await page.locator("#refreshMarket").click();
  check("explicit market search compacts filters on mobile",!(await page.locator("#marketFilterPanel").isVisible()));
  check("market compact summary keeps the search context",(await page.locator("#marketFilterSummary").textContent()).includes("UX Spieler 8"));
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth,toggle:document.getElementById("marketFilterToggle")?.scrollWidth,toggleClient:document.getElementById("marketFilterToggle")?.clientWidth}));
   check(`${width}: market compact filters have no horizontal overflow`,geometry.doc<=geometry.view+1&&geometry.toggle<=geometry.toggleClient+1);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,"ux-overview-v2112-market-390.png"),fullPage:false});
  check("no uncaught JavaScript errors in usability flow",errors.length===0);
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
