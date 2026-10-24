/* Two real browser sessions play one online friendly against a Postgres that
   runs the production Supabase functions (footera_invite/respond/tick/command,
   online/footera-online-matchday-v21.246.sql) with Supabase-like auth and RLS.
   A tiny PostgREST/Realtime stand-in forwards the app's calls; realtime UPDATEs
   leave out unchanged large JSON columns exactly like Supabase does (TOAST).
   Needs the `pg` module and QA_PG_URL pointing at an empty Postgres 15+ database
   loaded with tests/fixtures/online-qa/schema.sql, then functions.sql (live
   footera_invite/command as of 2026-10-24 plus the V21.246 migration).
   Not part of CI: it plays a whole match (~10 min). */
const {chromium}=require("playwright"),{Pool}=require("pg"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const pool=new Pool({connectionString:process.env.QA_PG_URL||"postgres://postgres@localhost:5433/qa"});
const A="aaaaaaaa-1111-4111-8111-00000000a246",B="bbbbbbbb-2222-4222-8222-00000000b246";
const check=(label,value,extra="")=>{assert.ok(value,label+(extra?` (${extra})`:""));console.log("PASS",label,extra)};
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".glb":"model/gltf-binary",".csv":"text/csv",".webmanifest":"application/manifest+json"};
const LARGE=new Set(["home_profile","away_profile","home_lineup","away_lineup","events","home_used_bench","away_used_bench"]);
const subscribers=new Map(),log=[];
function push(uid,payload){for(const res of subscribers.get(uid)||[])res.write(`data: ${JSON.stringify(payload)}\n\n`)}
// Supabase Realtime (REPLICA IDENTITY default): unchanged TOASTed values are not sent.
function realtime(oldRow,newRow){
 if(!newRow)return;
 const payload={eventType:oldRow?"UPDATE":"INSERT",new:{}};
 for(const [k,v] of Object.entries(newRow)){if(oldRow&&LARGE.has(k)&&JSON.stringify(oldRow[k])===JSON.stringify(v)&&JSON.stringify(v).length>2000)continue;payload.new[k]=v}
 for(const uid of new Set([newRow.home_user,newRow.away_user]))push(uid,payload);
}
async function asUser(uid,fn){
 const c=await pool.connect();
 try{await c.query("begin");await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role:"authenticated"})]);const r=await fn(c);await c.query("commit");return r}
 catch(e){await c.query("rollback").catch(()=>{});throw e}finally{c.release()}
}
const RPCS={footera_invite:["p_away"],footera_respond:["p_id","p_accept"],footera_tick:["p_id"],footera_command:["p_id","p_command","p_value","p_out","p_in"]};
async function rpc(uid,name,args){
 const params=RPCS[name];
 if(!params)return{data:null,error:{code:"PGRST202",message:`Could not find the function public.${name} in the schema cache`}};
 const before=args.p_id?(await pool.query("select to_jsonb(d) j from public.footera_duels d where id=$1",[args.p_id])).rows[0]?.j:null;
 try{
  const row=await asUser(uid,c=>c.query(`select to_jsonb(r) j from public.${name}(${params.map((p,i)=>`${p}=>$${i+1}`).join(",")}) r`,params.map(p=>args[p]??null)).then(r=>r.rows[0]?.j));
  if(JSON.stringify(before)!==JSON.stringify(row))realtime(before,row);
  log.push({uid,name,minute:row?.minute,status:row?.status});
  return{data:row,error:null}
 }catch(e){return{data:null,error:{code:e.code,message:e.message}}}
}
async function from(uid,q){
 if(q.table==="footera_online_profiles"&&q.op==="upsert"){
  const v=q.values,code=crypto.createHash("md5").update(uid).digest("hex").replace(/[^a-h]/g,"").toUpperCase().padEnd(8,"K").slice(0,8);
  await pool.query("insert into auth.users values($1) on conflict do nothing",[uid]);
  await pool.query(`insert into public.footera_online_profiles(user_id,username,club_name,rating,chem,formation,squad,squads,active_preset,friend_code,club_short_name,club_identity)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict(user_id) do update set username=excluded.username,club_name=excluded.club_name,rating=excluded.rating,chem=excluded.chem,formation=excluded.formation,squad=excluded.squad,squads=excluded.squads,active_preset=excluded.active_preset,club_short_name=excluded.club_short_name,club_identity=excluded.club_identity,updated_at=now()`,
   [uid,v.username||"QA",v.club_name,v.rating,v.chem,v.formation,JSON.stringify(v.squad),JSON.stringify(v.squads||[]),v.active_preset||0,code,v.club_short_name||"FTR",JSON.stringify(v.club_identity||{})]);
  return{data:null,error:null}
 }
 if(q.table==="footera_duels"&&q.op==="select"){
  const rows=await asUser(uid,async c=>{await c.query("set local role authenticated");return(await c.query("select to_jsonb(d) j from public.footera_duels d order by created_at desc limit 60")).rows.map(r=>r.j)});
  return{data:rows,error:null}
 }
 return{data:q.single?null:[],error:null}
}
const fakeSdk=`window.supabase={createClient(){const uid=window.__QA_UID;
 const post=(p,b)=>fetch('/qa/'+p,{method:'POST',headers:{'content-type':'application/json','x-uid':uid},body:JSON.stringify(b)}).then(r=>r.json()).catch(e=>({data:null,error:{message:'TypeError: Failed to fetch'}}));
 const query=table=>{const st={table,op:'select'};const q={select(c){if(st.op==='select')st.columns=c;return q},eq(){return q},in(){return q},or(){return q},is(){return q},order(){return q},limit(n){st.limit=n;return q},range(){return q},single(){st.single=true;return q},
  upsert(v){st.op='upsert';st.values=v;return q},update(v){st.op='update';st.values=v;return q},insert(v){st.op='insert';st.values=v;return q},then(ok,fail){return post('from',st).then(ok,fail)}};return q};
 return{auth:{getSession:async()=>({data:{session:{user:{id:uid}}},error:null}),getUser:async()=>({data:{user:{id:uid,is_anonymous:true}},error:null}),signInAnonymously:async()=>({data:{session:{user:{id:uid}}},error:null}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}},
  from:query,rpc:(name,args)=>post('rpc/'+name,args||{}),
  channel(){const hs=[];const ch={on(_t,f,h){if(f&&f.table==='footera_duels')hs.push(h);return ch},subscribe(cb){const es=new EventSource('/qa/events?uid='+uid);es.onmessage=m=>{const p=JSON.parse(m.data);hs.forEach(h=>h(p))};es.onopen=()=>cb&&cb('SUBSCRIBED');ch.es=es;return ch},unsubscribe(){ch.es&&ch.es.close()}};return ch},
  removeChannel(ch){ch&&ch.es&&ch.es.close()}}}};`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,"http://localhost");
 if(url.pathname==="/qa/events"){const uid=url.searchParams.get("uid");res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-cache"});res.write(":ok\n\n");if(!subscribers.has(uid))subscribers.set(uid,new Set());subscribers.get(uid).add(res);req.on("close",()=>subscribers.get(uid).delete(res));return}
 if(url.pathname.startsWith("/qa/")){
  let body="";for await(const chunk of req)body+=chunk;const uid=req.headers["x-uid"],args=body?JSON.parse(body):{};
  const out=url.pathname.startsWith("/qa/rpc/")?await rpc(uid,url.pathname.slice(8),args):await from(uid,args);
  res.setHeader("content-type","application/json");res.end(JSON.stringify(out));return
 }
 let file=path.resolve(root,"."+url.pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{let data=fs.readFileSync(file);if(file.endsWith("index.html")){let html=data.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);data=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(data)}catch(_){res.writeHead(404).end()}
});
async function session(browser,url,uid,club,colors){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:"block",timezoneId:"Europe/Berlin"});
 await context.addInitScript(uid=>{window.__QA_UID=uid;Object.defineProperty(navigator,"deviceMemory",{get:()=>4});Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>4});globalThis.FOOTERA_TEST_REALTIME_3D=true},uid);
 const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{const t=m.text();if(/QA_SCENE/.test(t))page.__scenes.push(JSON.parse(t.slice(9)))});page.__scenes=[];
 await page.route("**/*",route=>{const u=route.request().url();if(u.includes("supabase-js"))return route.fulfill({contentType:"text/javascript",body:fakeSdk});return u.startsWith(url)?route.continue():route.abort()});
 await page.goto(url,{waitUntil:"load"});
 await page.addStyleTag({content:"#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}"});
 await page.evaluate(async({club,colors})=>{
  for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
  FooteraHighlights.setMode("important");
  const hash=s=>{let n=0;for(const ch of String(s))n=(n*31+ch.charCodeAt(0))|0;return n};
  const Base=FooteraHighlights.Queue;FooteraHighlights.Queue=class extends Base{constructor(o){super({...o,timeout:240000,replayTimeout:60000});const play=this.play;this.play=async(e,sig)=>{const t0=performance.now();const r=await play(e,sig),ms=Math.round(performance.now()-t0);console.log("QA_SCENE "+JSON.stringify({id:e.id,type:e.type,sequence:e.sequence,player:e.playerName,team:e.teamName,card:hash(e.playerCardHTML),result:r,ms}));return r}}};
  window.__toasts=[];new MutationObserver(()=>{const t=document.getElementById("toast")?.textContent;if(t&&window.__toasts.at(-1)!==t)window.__toasts.push(t)}).observe(document.getElementById("toast"),{childList:true,characterData:true,subtree:true});
  const positions=["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW","LM","ST","CB","GK","LB","RW","CM"];
  // Both sessions share one player database, like the real app.
  const clubPlayers=name=>positions.map((position,i)=>({id:name.slice(0,3)+"-"+i,name:name.slice(0,3)+" Spieler "+i,fullName:name+" Spieler "+i,position,alt:"",ovr:84+(i%4),pac:84,sho:82,pas:80,dri:83,def:70,phy:82,nation:"Germany",team:name,league:"Bundesliga"}));
  const mine=clubPlayers(club);PLAYERS=[...clubPlayers("FC Gerlies"),...clubPlayers("HSV FC")];
  P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));
  const items=mine.map(p=>makeItem(P_BY_ID.get(String(p.id)),false));
  items[10]={...items[10],variant:"special",cosmeticDesign:"momentum",eventName:"MOMENTUM"};
  items[8]={...items[8],variant:"special",eventType:"halloween-team",eventName:"HALLOWEEN"};
  items[12]={...items[12],evoDesign:true,evo:2,evoPlaystyles:["finesse-shot"]};
  state.club=items;state.squad=items.map(i=>i.uid);state.formation="4-3-3";state.tactic="balanced";
  state.profile.clubName=club;state.profile.username=club.slice(0,8);state.onboarded=true;state.roles={};state.focus={};
  const ci=ensureClubIdentityState();state.profile.clubIdentity={...ci,crest:{...ci.crest,primary:colors[0],borderColor:colors[0],initials:club.slice(0,3).toUpperCase()},kits:{home:{pattern:"solid",shirtPrimary:colors[0],shirtSecondary:colors[1],shorts:colors[1],socks:colors[0]},away:{pattern:"solid",shirtPrimary:colors[1],shirtSecondary:colors[0],shorts:colors[0],socks:colors[1]}}};
  await FooteraOnline.init();await FooteraOnline.syncProfile();
  window.__ownCards=state.squad.slice(0,18).map(uid=>{const item=state.club.find(x=>x.uid===uid);return cardHTML(displayBase(item),item,true,displayBase(item).position).replace(/uid-[^"' ]+/g,"")});
 },{club,colors});
 return{context,page,errors}
}
const view=page=>page.evaluate(()=>{
 const q=s=>document.querySelector(s);
 return{names:[...document.querySelectorAll("#onlineMatch .match-score-line .online-team-label")].map(n=>n.textContent),crests:document.querySelectorAll("#onlineMatch .match-score-line .club-crest").length,
  score:q('#onlineMatch [data-online="score"]')?.textContent.trim(),minute:q('#onlineMatch [data-online="minute"]')?.textContent,state:q("#onlineMatch")?.dataset.state,
  timeline:[...document.querySelectorAll('#onlineMatch [data-online="timeline"] .match-timeline-event')].map(n=>n.textContent),result:q("#onlineMatch .online-standard-result strong")?.textContent||"",
  pending:q("#onlineMatch")?.classList.contains("highlight3d-pending")}
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 await pool.query("delete from public.footera_duels where home_user in ($1,$2) or away_user in ($1,$2)",[A,B]);
 const browser=await chromium.launch({headless:true,args:["--enable-unsafe-swiftshader","--use-angle=swiftshader"]});
 try{
  const a=await session(browser,url,A,"FC Gerlies",["#d8ff3e","#173627"]),b=await session(browser,url,B,"HSV FC",["#0a66c2","#ffffff"]);
  check("both sessions registered their online profile",(await pool.query("select count(*)::int n from public.footera_online_profiles where user_id in ($1,$2)",[A,B])).rows[0].n===2);
  const stored=(await pool.query("select squad from public.footera_online_profiles where user_id=$1",[A])).rows[0].squad;
  check("stored lineup keeps special designs",stored[10].cosmeticDesign==="momentum"&&stored[8].eventType==="halloween-team"&&stored[12].evoDesign===true);
  const cardsMatch=await b.page.evaluate(lineup=>lineup.slice(0,18).every(fp=>{const html=friendCard(fp,fp.position,true).replace(/friend-[^"' ]+/g,"");return html.includes("custom-card")||html.includes("card-shell")}),stored);
  const ownA=await a.page.evaluate(()=>window.__ownCards),viewB=await b.page.evaluate(lineup=>lineup.slice(0,18).map(fp=>friendCard(fp,fp.position,true).replace(/friend-[^"' ]+/g,"").replace(/uid-[^"' ]+/g,"")),stored);
  check("B renders A's 18 cards exactly like A's own cards",cardsMatch&&ownA.every((h,i)=>h.replace(/friend-[^"' ]+/g,"")===viewB[i]),`${ownA.map((h,i)=>h.replace(/friend-[^"' ]+/g,"")===viewB[i]?"":`\n#${i} own: ${h.slice(0,700)}\n#${i} B:   ${viewB[i].slice(0,700)}`).join("")} ${ownA.filter((h,i)=>h.replace(/friend-[^"' ]+/g,"")===viewB[i]).length}/18`);
  const unknownOvr=await b.page.evaluate(fp=>friendCard({...fp,pid:"not-in-this-database"},fp.position,true).match(/class="ovr">(\d+)/)?.[1],stored[12]);
  check("an evo card keeps its rating when the viewer's database lacks the player",unknownOvr===String(stored[12].ovr),`${unknownOvr} vs ${stored[12].ovr}`);
  // A invites B through the app, B accepts in the real invite dialog.
  await a.page.evaluate(B=>FooteraOnline.invite({onlineUid:B,clubName:"HSV FC"}),B);
  await b.page.waitForSelector("#incomingInviteModal.active",{timeout:10000});
  await b.page.click("#incomingInviteAccept");
  for(const [name,s] of [["A",a],["B",b]])await s.page.waitForSelector("#onlineMatch",{timeout:15000}).catch(async e=>{
   console.log("NO MATCH VIEW "+name,await s.page.evaluate(()=>({modal:document.getElementById("onlineDuelModal")?.className,body:document.getElementById("onlineDuelBody")?.textContent.slice(0,300),toasts:window.__toasts})),JSON.stringify((await pool.query("select status,minute from public.footera_duels where home_user=$1",[A])).rows));throw e});
  const first=[await view(a.page),await view(b.page)];
  check("both sessions show the same real club names",JSON.stringify(first[0].names)===JSON.stringify(["FC Gerlies","HSV FC"])&&JSON.stringify(first[1].names)===JSON.stringify(["FC Gerlies","HSV FC"]),first.map(v=>v.names.join(" – ")).join(" | "));
  const stages=await Promise.all([a,b].map(s=>s.page.evaluate(()=>({modal:document.getElementById("onlineDuelModal")?.className,layer:document.body.dataset.uiLayer||"",stage:!!FooteraHighlights.stage(),hidden:document.hidden}))));
  check("both sessions have the live 3D stage",stages.every(s=>s.stage),JSON.stringify(stages));
  check("both sessions show both crests",first[0].crests===2&&first[1].crests===2);
  // Reconnect: B drops offline mid-match and comes back.
  await a.page.waitForFunction(()=>parseInt(document.querySelector('#onlineMatch [data-online="minute"]')?.textContent)>=25,null,{timeout:300000});
  await b.context.setOffline(true);await a.page.waitForTimeout(12000);await b.context.setOffline(false);
  const caughtUp=await b.page.waitForFunction(async()=>true,null).then(()=>a.page.waitForTimeout(6000)).then(async()=>{const [x,y]=[await view(a.page),await view(b.page)];return{a:x.minute,b:y.minute,ok:Math.abs(parseInt(x.minute)-parseInt(y.minute))<=1}});
  check("B catches up after a 12 s connection loss",caughtUp.ok,`A ${caughtUp.a} / B ${caughtUp.b}`);
  // Half-time: both confirm.
  for(const s of [a,b]){await s.page.waitForSelector("#onlineReadyBtn",{timeout:300000});await s.page.click("#onlineReadyBtn")}
  await a.page.waitForFunction(()=>document.querySelector("#onlineMatch")?.dataset.state==="finished"&&!document.querySelector("#onlineMatch").classList.contains("highlight3d-pending"),null,{timeout:600000});
  await b.page.waitForFunction(()=>document.querySelector("#onlineMatch")?.dataset.state==="finished"&&!document.querySelector("#onlineMatch").classList.contains("highlight3d-pending"),null,{timeout:120000});
  const last=[await view(a.page),await view(b.page)],row=(await pool.query("select * from public.footera_duels where home_user=$1 and away_user=$2",[A,B])).rows;
  check("exactly one duel row, finished once",row.length===1&&row[0].status==="finished"&&log.filter(x=>x.status==="finished").length>=1);
  check("both sessions show the database score",last.every(v=>v.score===`${row[0].home_score} : ${row[0].away_score}`),last.map(v=>v.score).join(" | "));
  check("both sessions show the same timeline",JSON.stringify(last[0].timeline)===JSON.stringify(last[1].timeline),`${last[0].timeline.length} entries`);
  const results=last.map(v=>v.result),hs=row[0].home_score,as=row[0].away_score;
  check("results are mirrored",hs===as?results.every(r=>r==="Unentschieden"):results[0]===(hs>as?"Sieg":"Niederlage")&&results[1]===(hs>as?"Niederlage":"Sieg"),results.join(" | "));
  const sa=a.page.__scenes.filter(s=>!s.id.includes(":ceremony:kickoff")||true),sb=b.page.__scenes;
  const key=s=>`${s.id}|${s.type}|${s.sequence}|${s.player}|${s.team}|${s.card}`;
  console.log("SCENES A",JSON.stringify(sa));console.log("SCENES B",JSON.stringify(sb));
  const common=sa.filter(s=>sb.some(t=>t.id===s.id));
  check("both sessions play the same 3D scenes (same scene, player, card)",common.length>=2&&common.every(s=>key(s)===key(sb.find(t=>t.id===s.id))),`${sa.length} / ${sb.length} scenes, ${common.length} shared`);
  const goals=(row[0].events||[]).filter(e=>e.kind==="goal").length;
  check("every goal was shown as a 3D scene in A",sa.filter(s=>s.type==="goal").length===goals,`${goals} goals`);
  // Each side sees the other's real cards (goal HUD): compare with the owner's own card HTML.
  await a.page.screenshot({path:path.join(output,"two-sessions-a-final.png")});await b.page.screenshot({path:path.join(output,"two-sessions-b-final.png")});
  // Missing RPC: the matchday says so instead of pretending to run.
  for(const s of [a,b])await s.page.route("**/qa/rpc/footera_tick",route=>route.fulfill({contentType:"application/json",body:JSON.stringify({data:null,error:{code:"PGRST202",message:"Could not find the function public.footera_tick(p_id) in the schema cache"}})}));
  for(const s of [a,b])await s.page.evaluate(()=>document.getElementById("onlineMatchCloseBtn")?.click());
  await a.page.evaluate(B=>FooteraOnline.invite({onlineUid:B,clubName:"HSV FC"}),B);
  await b.page.waitForSelector("#incomingInviteModal.active",{timeout:10000});await b.page.click("#incomingInviteAccept");
  await a.page.waitForTimeout(15000);
  const toasts=await a.page.evaluate(()=>window.__toasts),stuck=await view(a.page);
  check("a missing match RPC is reported, not hidden",toasts.some(t=>/Matchday: .*footera_tick/.test(t))&&stuck.minute==="0'",toasts.slice(-2).join(" / "));
  const errs=[...a.errors,...b.errors];check("no page errors in either session",errs.length===0,errs.join(" | "));
 }finally{await browser.close();server.close();await pool.query("delete from public.footera_duels where home_user in ($1,$2) or away_user in ($1,$2)",[A,B]).catch(()=>{});await pool.end()}
})().catch(e=>{console.error(e);process.exitCode=1});
