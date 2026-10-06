/* Champions + Rivals qualification mobile integration smoke test. Run with NODE_PATH pointing to Playwright. */
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
   const positions=["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW","CM","ST","CB","GK","LB","RW","CM"];
   PLAYERS=positions.map((position,i)=>({id:"champ-"+i,name:"Champ "+i,fullName:"Champions Spieler "+i,position,ovr:84,pac:84,sho:84,pas:84,dri:84,def:84,phy:84,nation:"Germany",team:"FC Bayern München",league:"Bundesliga"}));P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.club=PLAYERS.map(p=>makeItem(p,false));state.squad=state.club.map(i=>i.uid);state.formation="4-3-3";state.profile.clubName="Champions Test";state.tactic="balanced";
   state.stats={...state.stats,championsMatches:0,championsWins:0};state.champions=null;ensureChampionsState().qualPoints=600;
   const start=new Date("2026-10-09T19:00:00+02:00"),end=new Date("2026-10-12T09:00:00+02:00");
   championsWindow=()=>({key:String(start.getTime()),start,end,open:true,lastStart:start,lastEnd:end,lastKey:String(start.getTime())});
   championsWindowText=()=>"Offen bis Mo., 12.10., 09:00";
   renderAll();switchView("playView",{push:false});
  });
  check("only one Champions mode entry exists",await page.locator('[data-play-mode="champions"]').count()===1);
  check("Champions menu tile shows qualification progress",/600 \/ 1\.000 CP/.test(await page.locator("#playChampionsSummary").innerText()));
  check("Champions menu tile progress is 60 percent",await page.locator("#playChampionsSummary .play-tile-qual i").evaluate(el=>el.getAttribute("style")?.includes("60%")));
  await page.screenshot({path:path.join(output,"champions-qualification-menu-390.png"),fullPage:true});

  await page.evaluate(()=>FooteraPlayHub.open("rivals"));
  check("Rivals has no second Champions start button",await page.locator('[data-play-panel="rivals"] [data-mode="champions"]').count()===0);
  check("Rivals shows compact Champions qualification status",/Champions-Qualifikation[\s\S]*600 \/ 1\.000 CP/.test(await page.locator("#rvRecord").innerText()));
  const rivalProgress=await page.evaluate(()=>{
   const snapshot=recordCompetitionMatch("rivals","win",1,0,null,null);
   showPostMatchProgress(snapshot);
   return{earned:snapshot.championsQualification?.earned,before:snapshot.championsQualification?.before,after:snapshot.championsQualification?.after,total:state.champions.qualPoints};
  });
  check("Rivals win grants exactly 200 Champions points",rivalProgress.earned===200&&rivalProgress.before===600&&rivalProgress.after===800&&rivalProgress.total===800);
  check("post-match shows Champions CP before and after",/CHAMPIONS-QUALIFIKATION[\s\S]*\+200 CP[\s\S]*600 → 800 \/ 1\.000/.test(await page.locator("#postMatchProgressBody").innerText()));
  await page.screenshot({path:path.join(output,"rivals-champions-cp-postmatch-390.png"),fullPage:true});
  await page.evaluate(()=>{hidePostMatchProgress();ensureChampionsState().qualPoints=1000;renderAll();FooteraPlayHub.open("champions")});

  check("Champions detail opens",await page.locator("#playDetailTitle").textContent()==="Footera Champions");
  check("qualification shows 1000 CP",/1\.000 \/ 1\.000 CP/.test(await page.locator("#championsQualification").innerText()));
  check("entry button is enabled",await page.locator('.startmode[data-mode="champions"]').isEnabled());
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth,box:document.getElementById("playView").scrollWidth}));
   check(`${width}: Champions and Rivals qualification UI has no horizontal overflow`,geometry.doc<=geometry.view+1&&geometry.box<=geometry.view+1);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.startmode[data-mode="champions"]').click();
  check("entry consumes 1000 CP and starts one run",await page.evaluate(()=>state.champions.active&&state.champions.qualPoints===0&&state.champions.participations===1));
  check("Champions match preview opens",await page.locator("#matchPreviewModalTitle").textContent()==="Footera Champions");
  check("record-based AI opponent is shown",/CHAMPIONS/.test(await page.locator("#squadBattleModalSub").innerText()+await page.locator("#squadBattleModalBody").innerText()));
  await page.screenshot({path:path.join(output,"champions-mobile-390.png"),fullPage:true});
  await page.locator("#squadBattleKickoff").click();await page.evaluate(()=>stopMatchTimer());
  check("kickoff uses Champions mode",await page.evaluate(()=>match?.mode==="champions"&&document.getElementById("matchCompetition").textContent==="Footera Champions"));
  await page.evaluate(()=>{match.minute=90;match.home=0;match.away=0;match.halftimeLogged=true;match.paused=false;resolveEndOfPhase()});
  check("90-minute draw goes to extra time",await page.evaluate(()=>match.extraTimeStarted&&!match.finished));
  await page.evaluate(()=>{match.paused=false;match.home=1;match.away=0;finishMatch()});
  check("finished Champions win advances record exactly once",await page.evaluate(()=>state.champions.games===1&&state.champions.wins===1&&state.champions.losses===0&&state.stats.championsMatches===1&&state.stats.championsWins===1&&match.competitionProgress?.mode==="champions"));
  check("no uncaught JavaScript errors in Champions/Rivals mobile flow",errors.length===0);
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
