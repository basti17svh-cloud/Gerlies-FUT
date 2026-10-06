/* Full pre-match editor mobile smoke test. */
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
   const defs=[
    ["GK",""],["LB","LWB"],["CB",""],["CB",""],["RB","RWB"],
    ["CM","CDM"],["CM","CDM"],["CM","CAM"],["LW","CAM,LM"],["ST","CF"],["RW","CAM,RM"],
    ["CAM","CM"],["ST","CF"],["CDM","CM"],["GK",""],["LB","LWB"],["RB","RWB"],["CM","CAM,CDM"]
   ];
   PLAYERS=defs.map(([position,alt],i)=>({id:"pre-"+i,name:"Preview "+i,fullName:"Preview Spieler "+i,position,alt,ovr:84,pac:84,sho:82,pas:84,dri:84,def:78,phy:82,nation:"Germany",team:"Preview FC",league:"Bundesliga"}));
   P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.club=PLAYERS.map(p=>makeItem(p,false));state.squad=state.club.map(i=>i.uid);while(state.squad.length<23)state.squad.push(null);
   state.formation="4-3-3";state.tactic="balanced";state.roles={5:"Box to Box"};state.focus={5:"Attack"};state.profile.clubName="Preview Test";
   renderAll();
   renderMatchPreview("rivals",{name:"RIVALS TEST",rating:84,chem:25,power:87,squad:PLAYERS.slice(0,11),formation:"4-3-3",items:[]});
  });
  check("pre-match preview opens with formation control",await page.locator("#previewFormationSelect").isVisible());
  check("pre-match preview exposes tactic control",await page.locator("#previewTacticSelect").isVisible());
  check("4-2-2-2 can be selected before kickoff",await page.locator('#previewFormationSelect option[value="4-2-2-2"]').count()===1);
  await page.locator("#previewFormationSelect").selectOption("4-2-2-2");
  check("formation change is persisted and roles reset for the new shape",await page.evaluate(()=>state.formation==="4-2-2-2"&&Object.keys(state.roles).length===0&&Object.keys(state.focus).length===0));
  check("chemistry and lineup are recalculated after formation change",await page.evaluate(()=>squadMetrics().filled===18&&document.getElementById("squadBattleModalSub").textContent.includes("4-2-2-2")));
  await page.locator(".preview-role-editor summary").click();
  check("all eleven starter role rows are available",await page.locator(".preview-role-row").count()===11);
  await page.locator('[data-preview-role="5"]').selectOption("Deep Lying Playmaker");
  await page.locator('[data-preview-focus="5"]').selectOption("Defend");
  await page.locator("#previewTacticSelect").selectOption("attacking");
  check("role, focus and tactic are saved before kickoff",await page.evaluate(()=>state.roles[5]==="Deep Lying Playmaker"&&state.focus[5]==="Defend"&&state.tactic==="attacking"));
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>{
    const editor=document.querySelector(".preview-team-editor"),controls=document.querySelector(".preview-team-controls"),rows=[...document.querySelectorAll(".preview-role-row")];
    return{doc:document.documentElement.scrollWidth,view:innerWidth,editor:editor.scrollWidth,editorClient:editor.clientWidth,controls:controls.scrollWidth,controlsClient:controls.clientWidth,rowsOk:rows.every(row=>row.scrollWidth<=row.clientWidth+1)}
   });
   check(`${width}: pre-match editor has no horizontal overflow`,geometry.doc<=geometry.view+1&&geometry.editor<=geometry.editorClient+1&&geometry.controls<=geometry.controlsClient+1&&geometry.rowsOk);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,"prematch-editor-v2109-390.png"),fullPage:true});
  await page.locator("#squadBattleKickoff").click();
  await page.evaluate(()=>stopMatchTimer());
  check("kickoff uses edited formation, tactic, role and focus",await page.evaluate(()=>match?.formation==="4-2-2-2"&&match?.tactic==="attacking"&&match?.roles?.[5]==="Deep Lying Playmaker"&&match?.focus?.[5]==="Defend"));
  check("no uncaught JavaScript errors in pre-match editor",errors.length===0);
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
