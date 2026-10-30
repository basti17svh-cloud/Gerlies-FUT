/* V21.246 online friendly matchday: club names/crests survive realtime updates,
   friends see the real cards, and goals/chances play the Rivals 3D scenes.
   Supabase is replaced by an in-page fake so no network is used. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".glb":"model/gltf-binary",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
const check=(label,value)=>{assert.ok(value,label);console.log("PASS",label)};
const ME="11111111-1111-4111-8111-111111111111",FRIEND="22222222-2222-4222-8222-222222222222";
// Minimal supabase-js stand-in: tables, RPCs and one realtime channel.
const fakeSdk=`window.supabase={createClient(){
 const handlers=[];window.__fakeDuels=window.__fakeDuels||[];
 window.__realtime=payload=>handlers.forEach(h=>h(payload));
 const result=data=>Promise.resolve({data,error:null});
 const query=table=>{const q={select(){return q},eq(){return q},in(){return q},or(){return q},is(){return q},order(){return q},
  limit(){return result(table==="footera_duels"?window.__fakeDuels.slice():[])},range(){return result([])},
  upsert(row){if(table==="footera_online_profiles")window.__profile=row;return result(null)},insert(){return q},update(){return q},single(){return result(null)},
  then(ok,fail){return result(table==="footera_duels"?window.__fakeDuels.slice():[]).then(ok,fail)}};return q};
 return{auth:{getSession:async()=>({data:{session:{user:{id:"${ME}"}}},error:null}),signInAnonymously:async()=>({data:{session:{user:{id:"${ME}"}}},error:null}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}},
  from:query,
  rpc:async(name)=>name==="footera_tick"?{data:null,error:null}:name==="footera_my_friend_code"?{data:"ABC123",error:null}:{data:null,error:null},
  channel(){const ch={on(_a,_b,h){if(h)handlers.push(h);return ch},subscribe(){return ch}};return ch},removeChannel(){}}
}};`;
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",timezoneId:"Europe/Berlin"});
  const page=await context.newPage(),errors=[];page.on("console",m=>{if(/SCENE|Online-3D/.test(m.text()))console.log("CONSOLE",m.text().slice(0,300))});page.on("pageerror",e=>{errors.push(e.message);console.log("PAGEERROR",e.message)});
  await page.route("**/*",route=>{const u=route.request().url();if(u.includes("supabase-js"))return route.fulfill({contentType:"text/javascript",body:fakeSdk});return u.startsWith(url)?route.continue():route.abort()});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>4});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});globalThis.FOOTERA_TEST_REALTIME_3D=true});
  await page.goto(url,{waitUntil:"load"});
  await page.addStyleTag({content:"#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}"});
  const setup=await page.evaluate(async({ME,FRIEND})=>{
   for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
   FooteraHighlights.setMode("important");
   const Base=FooteraHighlights.Queue;FooteraHighlights.Queue=class extends Base{constructor(o){super(o);const play=this.play;this.play=async(e,sig)=>{const r=await play(e,sig);console.log("SCENE",e.type,e.ceremony||"",r);return r}}};
   const positions=["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW","LM","ST","CB","GK","LB","RW","CM"];
   PLAYERS=positions.map((position,i)=>({id:"om-"+i,name:"Online "+i,fullName:"Online Spieler "+i,position,alt:"",ovr:85,pac:84,sho:82,pas:80,dri:83,def:70,phy:82,nation:"Germany",team:"Test FC",league:"Bundesliga"}));
   P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));P_BY_ID.set(String(FOUNDER_PLAYER_ID),FOUNDER_BASE);
   const items=PLAYERS.map(p=>makeItem(p,false));
   // Special designs that only live on the item, not in the player database.
   items[10]={...items[10],variant:"special",cosmeticDesign:"momentum",eventName:"MOMENTUM"};
   items[8]={...items[8],variant:"special",eventType:"halloween-team",eventName:"HALLOWEEN"};
   items[12]={...items[12],evoDesign:true,evo:2,evoPlaystyles:["finesse-shot"]};
   state.club=items;state.squad=items.map(i=>i.uid);state.formation="4-3-3";state.tactic="balanced";
   state.profile.clubName="FC Gerlies";state.profile.username="Basti";state.onboarded=true;state.roles={};state.focus={};
   const strip=html=>String(html).replace(/friend-[^"' ]+/g,"").replace(/uid-[^"' ]+/g,"");
   const pairs=items.map(item=>{const fp=friendSnapshotItem(item);return[strip(friendCard(fp,displayBase(item).position,false)),strip(cardHTML(displayBase(item),item,false,displayBase(item).position))]});
   const same=pairs.map(([a,b])=>a===b);
   const diff=pairs.map(([a,b],i)=>{if(a===b)return null;let k=0;while(a[k]===b[k])k++;return{i,friend:a.slice(Math.max(0,k-80),k+160),own:b.slice(Math.max(0,k-80),k+160)}}).filter(Boolean);
   const awayIdentity={...defaultClubIdentity(),crest:{...defaultClubIdentity().crest,primary:"#0a66c2",borderColor:"#0a66c2",initials:"HSV"},kits:{home:{pattern:"solid",shirtPrimary:"#ffffff",shirtSecondary:"#0a66c2",shorts:"#ffffff",socks:"#0a66c2"},away:{pattern:"solid",shirtPrimary:"#0a66c2",shirtSecondary:"#ffffff",shorts:"#0a66c2",socks:"#ffffff"}}};
   const lineup=items.slice(0,18).map(friendSnapshotItem);
   const duel={id:"duel-1",home_user:ME,away_user:FRIEND,status:"live",minute:0,home_score:0,away_score:0,home_shots:0,away_shots:0,home_xg:0,away_xg:0,home_possession:50,
    home_profile:{club_name:"FC Gerlies",club_identity:clubIdentitySnapshot(),formation:"4-3-3",rating:86,chem:30},away_profile:{club_name:"HSV FC",club_identity:awayIdentity,formation:"4-3-3",rating:84,chem:28},
    home_lineup:lineup,away_lineup:lineup.map(p=>p&&{...p}),home_subs:0,away_subs:0,home_used_bench:[],away_used_bench:[],home_tactic:"balanced",away_tactic:"balanced",
    events:[{minute:0,kind:"kickoff",text:"Anpfiff"}],clock_at:new Date().toISOString(),created_at:new Date().toISOString()};
   window.__fakeDuels=[duel];
   await FooteraOnline.init();await FooteraOnline.syncProfile();
   const profileSquad=window.__profile?.squad||[];
   return{same,diff,profileCosmetic:profileSquad[10]?.cosmeticDesign,profileEvent:profileSquad[8]?.eventType,ready:FooteraOnline.ready};
  },{ME,FRIEND});
  check("online profile is registered",setup.ready);
  if(!setup.same.every(Boolean))console.log(JSON.stringify(setup.diff,null,1).slice(0,4000));
  check("every friend card renders exactly like the owner's card",setup.same.every(Boolean));
  check("the live profile keeps cosmetic designs and event types",setup.profileCosmetic==="momentum"&&setup.profileEvent==="halloween-team");
  await page.evaluate(()=>{switchView("socialView");document.querySelector('[data-online-open="duel-1"]').click()});
  await page.waitForSelector("#onlineMatch");
  check("kick-off walk-out starts the 3D stage",await page.waitForFunction(()=>document.getElementById("onlineMatch")?.classList.contains("highlight3d-pending"),null,{timeout:8000}).then(()=>true,()=>false));
  // The skip button only appears once the 3D scene runs (V21.252); on slow
  // runners a click right after "pending" missed it and the full walk-out ran.
  await page.waitForSelector("#onlineMatchLiveStage .fh3d-skip",{timeout:20000}).then(b=>b.click(),()=>{});
  await page.waitForFunction(()=>!document.getElementById("onlineMatch").classList.contains("highlight3d-pending"),null,{timeout:20000});
  // Realtime UPDATE: unchanged TOASTed columns (profiles, lineups) are missing.
  await page.evaluate(({ME,FRIEND})=>{
   const d=window.__fakeDuels[0],scorer=d.home_lineup[9],creator=d.home_lineup[6];
   window.__realtime({eventType:"UPDATE",new:{id:d.id,home_user:ME,away_user:FRIEND,status:"live",minute:23,home_score:1,away_score:0,home_shots:2,away_shots:1,home_xg:.6,away_xg:.1,home_possession:55,
    events:[...d.events,{minute:23,kind:"chance",side:"home",text:"Abschluss",player:scorer,xg:.31},{minute:23,kind:"goal",side:"home",text:scorer.name,player:scorer,creator,xg:.31}]}});
  },{ME,FRIEND});
  const names=await page.evaluate(()=>[...document.querySelectorAll('#onlineMatch .match-score-line .online-team-label')].map(n=>n.textContent));
  check("club names stay after a realtime update",names[0]==="FC Gerlies"&&names[1]==="HSV FC");
  check("both clubs show their crest",await page.locator("#onlineMatch .match-score-line .online-team-crest .club-crest").count()===2);
  check("the goal plays as a 3D scene",await page.waitForFunction(()=>document.getElementById("onlineMatch").classList.contains("highlight3d-pending"),null,{timeout:8000}).then(()=>true,()=>false));
  check("score is held at 0:0 until the ball crosses the line",(await page.locator('#onlineMatch [data-online="score"]').textContent()).trim()==="0 : 0");
  const rendered=await page.waitForSelector("#onlineMatchLiveStage .fh3d.fh3d-ready",{timeout:30000}).then(()=>true,()=>false);
  if(!rendered)console.log(await page.evaluate(()=>[document.getElementById("onlineMatch").className,[...document.getElementById("onlineMatchLiveStage").children].map(c=>c.className).join("|"),document.querySelectorAll(".fh3d").length]),errors);
  check("the 3D renderer mounts inside the online stage",rendered);
  await page.waitForTimeout(3500);
  await page.screenshot({path:path.join(output,"online-matchday-goal-3d.png")});
  await page.evaluate(()=>document.querySelector("#onlineMatchLiveStage .fh3d-skip")?.click());
  await page.waitForFunction(()=>!document.getElementById("onlineMatch").classList.contains("highlight3d-pending"),null,{timeout:20000});
  check("score updates after the scene",(await page.locator('#onlineMatch [data-online="score"]').textContent()).trim()==="1 : 0");
  await page.evaluate(()=>document.getElementById("onlineMatch").scrollIntoView());
  await page.screenshot({path:path.join(output,"online-matchday-header.png")});
  await page.evaluate(()=>document.getElementById("onlineManageTeamBtn").click());
  await page.waitForSelector(".online-standard-manager");
  await page.evaluate(()=>document.querySelector(".online-standard-manager").scrollIntoView());
  await page.screenshot({path:path.join(output,"online-matchday-manager.png")});
  // Friend list: the crest sits beside the club name, not over the chemistry line.
  await page.evaluate(({FRIEND})=>{closeUiLayer("onlineDuelModal","online-duel");removeUiLayer("onlineDuelModal");state.friends=[{v:5,onlineUid:FRIEND,clubName:"HSV FC",username:"HSV",clubIdentity:window.__fakeDuels[0].away_profile.club_identity,rating:81,chem:27,formation:"4-3-3",squad:[]}];switchView("socialView");window.FooteraFriendsHub?.render()},{FRIEND});
  const crestBox=await page.evaluate(()=>{const card=document.querySelector("#socialView .friends-person"),crest=card.querySelector(".friends-avatar .club-crest").getBoundingClientRect(),avatar=card.querySelector(".friends-avatar").getBoundingClientRect(),meta=card.querySelector(".friends-team-meta").getBoundingClientRect();card.scrollIntoView({block:"center"});return{inside:crest.left>=avatar.left-1&&crest.right<=avatar.right+1&&crest.top>=avatar.top-2&&crest.bottom<=avatar.bottom+2,clear:crest.bottom<=meta.top}});
  await page.screenshot({path:path.join(output,"online-friends-crest.png")});
  check("friend crest sits in its avatar slot above the chemistry line",crestBox.inside&&crestBox.clear);
  check("no page errors",errors.length===0||(console.log(errors),false));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
