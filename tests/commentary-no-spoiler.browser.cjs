/* V21.365: the live commentary must not tell a 3D chance before it is shown. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
const check=(label,value)=>{assert.ok(value,label);console.log("PASS",label)};
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:"block",timezoneId:"Europe/Berlin"});
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.goto(url,{waitUntil:"load"});
  await page.addStyleTag({content:"#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}"});
  const during=await page.evaluate(async()=>{
   for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
   const positions=["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW","LM","ST","CB","GK","LB","RW","CM"];
   PLAYERS=positions.map((position,i)=>({id:"ns-"+i,name:"Spieler "+i,fullName:"Spieler "+i,position,alt:"",ovr:86,pac:84,sho:82,pas:80,dri:83,def:70,phy:82,nation:"Germany",team:"Test FC",league:"Bundesliga",rarity:"gold"}));
   P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));
   const items=PLAYERS.map(p=>makeItem(p,false));
   state.club=items;state.squad=items.map(i=>i.uid);state.formation="4-3-3";state.tactic="balanced";state.profile.clubName="FC Test";state.roles={};state.focus={};
   FooteraHighlights.setMode("all");
   startMatch("rivals",{name:"RIVALS XI",rating:84,chem:22,power:86,squad:PLAYERS.slice(0,11).map((p,i)=>({...p,id:"op-"+i,name:"Gegner "+i})),formation:"4-3-3",items:[]});
   stopMatchTimer();
   if(typeof cancelMatch3D==="function")cancelMatch3D();
   let guard=0;
   while(!match.highlight3DPending&&guard++<400){simTick()}
   await new Promise(r=>setTimeout(r,30));
   const last=match.commentary?.at(-1)?.text||"",ticker=document.getElementById("matchTicker").textContent,caption=document.getElementById("matchSceneText").textContent;
   return{pending:!!match.highlight3DPending,last,lastScene:match.lastScene?.text||"",tickerHas:!!last&&ticker.includes(last),captionShows:caption===match.lastScene?.text};
  });
  check("a 3D chance is queued",during.pending);
  check("ticker does not show the chance line while 3D is pending",!during.tickerHas);
  check("caption does not show the outcome while 3D is pending",!during.captionShows);
  const after=await page.evaluate(async()=>{
   match3DQueue.skip();
   for(let i=0;i<100&&match.highlight3DPending;i++)await new Promise(r=>setTimeout(r,50));
   const last=match.commentary?.at(-1)?.text||"";
   return{pending:!!match.highlight3DPending,tickerHas:document.getElementById("matchTicker").textContent.includes(last),caption:document.getElementById("matchSceneText").textContent===match.lastScene?.text};
  });
  check("after the scene the ticker shows the line",!after.pending&&after.tickerHas);
  check("after the scene the caption shows the outcome",after.caption);
  // A miss shown as a goal-line clearance names a defender of the defending team.
  const line=await page.evaluate(async()=>{
   const enqueue=FooteraHighlights.Queue.prototype.enqueue;FooteraHighlights.Queue.prototype.enqueue=function(e){(window.qaQueued||(window.qaQueued=[])).push(e);return enqueue.call(this,e)};
   const opp={name:"RIVALS XI",rating:84,chem:22,power:86,squad:PLAYERS.slice(0,11).map((p,i)=>({...p,id:"op-"+i,name:"Gegner "+i})),formation:"4-3-3",items:[]};
   for(let game=0;game<12;game++){
    cancelMatch3D();startMatch("rivals",opp);stopMatchTimer();cancelMatch3D();
    let guard=0;
    while(!match.finished&&guard++<400){
     if(match.highlight3DPending)cancelMatch3D();
     if(match.paused){match.paused=false;match.halftimeActive=false;match.extraTimeManagementActive=false;match.forcedOut=null;document.getElementById("managerPanel").classList.remove("active")}
     if(match.highlightActive)dismissMatchGoalMoment(false);
     const n=match.shotEvents.length;simTick();
     const s=match.shotEvents.at(-1);
     if(s&&s.lineClear3D&&match.shotEvents.length===n+1&&!match.finished){
      const ev=(window.qaQueued||[]).find(e=>e.keeperAction==="line_clear");
      const cards=(ev?.defendCardsHTML||[]).map(h=>{const d=document.createElement("div");d.innerHTML=h;return d.textContent});
      return{found:true,side:s.side,shooter:s.shooter,names:ev?.defendNames||[],cards,caption:match.lastScene?.text||"",ticker:match.commentary.slice(-3).map(x=>x.text).join(" | ")};
     }
    }
   }
   return{found:false};
  });
  console.log("line clear:",JSON.stringify(line));
  if(line.found){
   const own=line.side==="home"?/^Gegner \d+$/:/^Spieler \d+$/;
   check("3D clearance gets the defending team's names",line.names.length>=4&&line.names.filter(Boolean).every(n=>own.test(n)));
   check("the shooter is not among the clearers",!line.names.includes(line.shooter));
   // V21.414: the card of a goal-line clearance is the clearing defender's card, not the shooter's.
   check("every defending actor has its own card",line.cards.length===8&&line.names.every((n,i)=>!n||line.cards[i].includes(n)));
   check("no clearance card shows the shooter",line.cards.every(t=>!t.includes(line.shooter+" ")&&!t.endsWith(line.shooter)));
   check("commentary calls it a clearance on the line",/Linie/.test(line.caption)&&/Linie/.test(line.ticker));
  }else check("a goal-line clearance was simulated",false);
  check("no uncaught errors",!errors.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
