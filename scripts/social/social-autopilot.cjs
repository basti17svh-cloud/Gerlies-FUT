/* Footera Social-Autopilot: builds ready-to-post social content for upcoming in-game events.
 *
 * node scripts/social/social-autopilot.cjs --out <dir> [--from <ISO>] [--days 3] [--only <id-substring>] [--no-reel]
 *
 * Reads the event schedule from the game itself (footeraEventCalendar, EVENT_PROMO_RELEASES,
 * EVENT_OBJECTIVES, TOTW_WEEKS, BLACKFRIDAY_*, seasonInfo), loads the game with a fake clock at each
 * post moment and renders the real production cards. Per post it writes <out>/<id>/:
 *   feed-N.jpg (1080x1350, Instagram carousel / X), story-N.jpg (1080x1920, TikTok photo / Story),
 *   reel.mp4 (1080x1920, 9-12 s, own soundtrack from social-sound.cjs) and post.json (time, captions per network).
 * Spoiler rule: a post only shows what is live in the game at its post time (teasers show silhouettes).
 * Needs NODE_PATH with playwright, ffmpeg on PATH and fonts-inter (else names overflow).
 */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const {buildPosts}=require("./social-captions.cjs"),{posterHTML,reelHTML,reelTiming}=require("./social-layout.cjs"),{soundtrackWav}=require("./social-sound.cjs");
const root=path.join(__dirname,"..","..");
const args=Object.fromEntries(process.argv.slice(2).reduce((acc,a,i,all)=>{if(a.startsWith("--"))acc.push([a.slice(2),all[i+1]&&!all[i+1].startsWith("--")?all[i+1]:true]);return acc},[]));
const OUT=path.resolve(args.out||"social-out"),FROM=args.from?Date.parse(args.from):Date.now(),DAYS=Number(args.days||3),ONLY=args.only&&args.only!==true?String(args.only):"",REEL=!args["no-reel"];
const FPS=30;
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".csv":"text/csv",".woff2":"font/woff2",".webmanifest":"application/manifest+json"};
const extraFiles=new Map();// served under /__social/<name>
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost");
 if(url.pathname.startsWith("/__social/")){const f=extraFiles.get(decodeURIComponent(url.pathname.slice(10)));if(!f){res.writeHead(404).end();return}res.setHeader("Content-Type",mime[path.extname(f)]||"application/octet-stream");res.end(fs.readFileSync(f));return}
 let file=path.resolve(root,"."+url.pathname);if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{const body=fs.readFileSync(file);res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}
});
function fakeClock(){const R=Date,s=Number(sessionStorage.getItem("__footeraFakeNow"));if(!s)return;const a=R.now();class F extends R{constructor(...x){if(x.length)super(...x);else super(s+(R.now()-a))}static now(){return s+(R.now()-a)}}F.parse=R.parse;F.UTC=R.UTC;globalThis.Date=F}

async function openGame(ctx,base,at){
 const p=await ctx.newPage();p.on("pageerror",e=>console.log("  page error:",e.message.slice(0,160)));
 await p.goto(base+"/x404");await p.evaluate(t=>sessionStorage.setItem("__footeraFakeNow",String(t)),at);
 await p.goto(base+"/",{waitUntil:"load"});
 await p.waitForFunction(()=>typeof PLAYERS!=="undefined"&&PLAYERS.length>1000&&typeof cardHTML==="function"&&typeof footeraEventCalendar==="function",null,{timeout:180000});
 await p.waitForFunction(()=>document.getElementById("dbTitle")?.textContent==="Bereit für den Anpfiff",null,{timeout:180000}).catch(()=>{});
 return p
}

// Everything the game knows about the posts in [from, from+days]. Runs inside the page.
function collectSchedule({from,days}){
 const until=from+days*86400000,ms=v=>Date.parse(v||""),list=[];
 const rows=footeraEventCalendar(from-1,{days:days+1,limit:500});
 const releases=typeof EVENT_PROMO_RELEASES!=="undefined"?EVENT_PROMO_RELEASES:[];
 const noon=(t,minus=0)=>{const d=new Date(t-minus*86400000);const p=berlinParts(d);return Date.parse(`${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}T12:30:00${berlinOffset(d)}`)};
 function berlinOffset(d){const s=new Intl.DateTimeFormat("en",{timeZone:"Europe/Berlin",timeZoneName:"longOffset"}).formatToParts(d).find(x=>x.type==="timeZoneName").value;return s==="GMT"?"+00:00":s.replace("GMT","")}
 for(const row of rows){
  const keys=String(row.key).split("+");
  const starts=keys.filter(k=>/^(event-start|sbc-start|obj-start|evo-start|store-deal-start|totw):/.test(k));
  if(starts.length)list.push({at:row.at,keys:starts,kind:row.kind,theme:row.theme||"",title:row.title});
  // Launch teaser at lunchtime (Basti: 12-13 Uhr), silhouettes only.
  if(keys.some(k=>k.startsWith("event-start:")))list.push({at:noon(row.at),keys:keys.filter(k=>k.startsWith("event-start:")),kind:"teaser",theme:row.theme||"",title:row.title,releaseAt:row.at});
  // Last-chance reminders on the last day.
  for(const k of keys.filter(k=>/^(sbc-end|event-end|obj-end):/.test(k)))list.push({at:noon(row.at),keys:[k],kind:"last-chance",theme:row.theme||"",title:row.title,endAt:row.at});
 }
 // Last-chance days the calendar only lists once the thing is live (needed for the Sunday week package).
 for(const ev of releases){const d=ev.sbcPlayer;if(d)list.push({at:noon(ms(d.activeUntilAt||ev.activeUntilAt)),keys:["sbc-end:"+d.id],kind:"last-chance",theme:ev.theme||"",title:`SBC ${d.name} endet`,endAt:ms(d.activeUntilAt||ev.activeUntilAt)})}
 for(const t of typeof EVENT_OBJECTIVES!=="undefined"?EVENT_OBJECTIVES:[])list.push({at:noon(ms(t.activeUntilAt)),keys:["obj-end:"+t.id],kind:"last-chance",theme:String(t.eventName||"").toLowerCase().replace(/\s+/g,""),title:`Objective ${t.player?.name||t.title} endet`,endAt:ms(t.activeUntilAt)});
 for(const d of [...(typeof BLACKFRIDAY_DEAL_SBCS!=="undefined"?BLACKFRIDAY_DEAL_SBCS:[]),...(typeof HALLOWEEN_TEAM1_SBC!=="undefined"?[HALLOWEEN_TEAM1_SBC]:[])])list.push({at:noon(ms(d.activeUntilAt)),keys:["sbc-end:"+d.id],kind:"last-chance",theme:d.id.startsWith("blackfriday")?"blackfriday":"halloween",title:`${d.name} endet`,endAt:ms(d.activeUntilAt)});
 if(typeof BLACKFRIDAY_TEASER_FROM!=="undefined")list.push({at:ms(BLACKFRIDAY_TEASER_FROM),keys:["bf-teaser"],kind:"teaser",theme:"blackfriday",title:"BLACK FRIDAY",releaseAt:ms(BLACKFRIDAY_EVENT.activeFrom)});
 try{const s=seasonInfo(new Date(from));const end=s.end?.getTime();if(end){for(const d of [7,1])list.push({at:noon(end,d),keys:["season-end:"+s.key],kind:"season-end",theme:"season",title:`Saison ${s.number} ${s.name}`,endAt:end,daysLeft:d});list.push({at:noon(end),keys:["season-end:"+s.key],kind:"season-end",theme:"season",title:`Saison ${s.number} ${s.name}`,endAt:end,daysLeft:0})}}catch(_){}
 // One post per launch minute (e.g. BLACK FRIDAY Team 1 + Lewandowski objective + shop deal at 27.11. 19:00).
 const launches=new Map();
 for(const x of list){if(["teaser","last-chance","season-end"].includes(x.kind))continue;const g=launches.get(x.at);if(!g){launches.set(x.at,x);continue}
  const keys=[...new Set([...g.keys,...x.keys])],lead=[g,x].find(y=>y.keys.some(k=>k.startsWith("event-start:")))||[g,x].find(y=>y.kind==="totw")||g;
  Object.assign(g,{...lead,keys});x.merged=true}
 for(let i=list.length-1;i>=0;i--)if(list[i].merged)list.splice(i,1);
 const seen=new Set();
 return list.filter(x=>x.at>=from&&x.at<=until).filter(x=>{const id=x.kind+"|"+x.at+"|"+x.keys.join("+").replace(/^(event-end:[^:]+):.*/,"$1");if(seen.has(id))return false;seen.add(id);return true}).sort((a,b)=>a.at-b.at);
 void releases
}

// Content of one post at its moment (page clock = post time + 2 min). Runs inside the page.
function collectContent(entry){
 const releases=EVENT_PROMO_RELEASES,out={cards:[],silhouette:false,facts:{}},card=(e,role)=>out.cards.push({role,name:e.player.name,ovr:Number(e.player.ovr||e.item.displayRating),position:e.player.position,html:cardHTML(e.player,e.item)});
 const eventById=id=>releases.find(e=>e.id===id);
 const sbcEntry=(ev)=>{const e=promoEventEntries({...ev,players:[ev.sbcPlayer]})[0];return e};
 for(const key of entry.keys){
  const [type,...rest]=key.split(":"),id=rest.join(":");
  if(type==="event-start"){const ev=eventById(id);if(!ev)continue;const list=byEventRating(promoEventEntries(ev));list.forEach(e=>card(e,"team"));Object.assign(out.facts,{event:ev.name,team:String(ev.subtitle||"").split("·").pop().trim(),count:list.length,until:ev.activeUntilAt,top:list.slice(0,3).map(e=>({name:e.player.name,ovr:Number(e.player.ovr||e.item.displayRating)}))})}
  if(type==="sbc-start"){const ev=releases.find(e=>e.sbcPlayer?.id===id);if(ev){const e=sbcEntry(ev);card(e,"sbc");out.facts.sbc={name:ev.sbcPlayer.name,ovr:Number(e.player.ovr||ev.sbcPlayer.ovr),parts:(ev.sbcPlayer.segments||[]).length||1,until:ev.sbcPlayer.activeUntilAt||ev.activeUntilAt,event:ev.name,segments:(ev.sbcPlayer.segments||[]).map(s=>s.name)}}
   else{const def=(typeof BLACKFRIDAY_DEAL_SBCS!=="undefined"?BLACKFRIDAY_DEAL_SBCS:[]).concat(typeof HALLOWEEN_TEAM1_SBC!=="undefined"?[HALLOWEEN_TEAM1_SBC]:[]).find(d=>d.id===id);if(def)out.facts.deal={name:def.name,desc:def.desc,req:def.req,until:def.activeUntilAt,theme:def.id.startsWith("blackfriday")?"blackfriday":"halloween"}}}
  if(type==="obj-start"){const task=EVENT_OBJECTIVES.find(t=>t.id===id);if(task){const item=makeEventObjectiveItem(task),pl=displayBase(item)||eventObjectivePlayerBase(task);out.cards.push({role:"objective",name:task.player.name,ovr:Number(pl.ovr||task.player.ovr),position:task.player.position,html:cardHTML(pl,item)});out.facts.objective={name:task.player.name,ovr:Number(pl.ovr||task.player.ovr),desc:task.desc,target:task.target,mode:task.mode,until:task.activeUntilAt,event:task.eventName}}}
  if(type==="evo-start"){const evo=EVOLUTION_POOL.find(e=>e.id===id);if(evo)out.facts.evo={name:evo.name,band:evo.band||evo.subtitle||"",desc:evo.desc||evo.description||""}}
  if(type==="store-deal-start"&&typeof BLACKFRIDAY_STORE_DEAL!=="undefined")out.facts.storeDeal={pct:Math.round(Number(BLACKFRIDAY_STORE_DEAL.coinDiscount||0)*100),until:BLACKFRIDAY_STORE_DEAL.until};
  if(type==="totw"){const want=Number(String(entry.title).match(/\d+/)?.[0]||0),team=latestPublishedTotw(new Date());if(!team||Number(team.id)!==want){out.skip=`TOTW ${want} ist noch nicht freigegeben`;continue}
   const list=totwEventEntries(team).sort((a,b)=>Number(b.info.ovr)-Number(a.info.ovr));list.forEach(e=>card(e,"team"));Object.assign(out.facts,{totw:Number(team.id),count:list.length,top:list.slice(0,5).map(e=>({name:e.info.names?.[0]||e.player.name,ovr:Number(e.info.ovr),nation:e.player.nation||e.base.nation||""}))})}
  if(type==="bf-teaser"){byEventRating(promoEventEntries(BLACKFRIDAY_EVENT)).forEach(e=>card(e,"team"));out.silhouette=true;out.facts.count=BLACKFRIDAY_EVENT.players.length}
  if(type==="sbc-end"){const ev=releases.find(e=>e.sbcPlayer?.id===id);if(ev){const e=sbcEntry(ev);card(e,"sbc");out.facts.sbc={name:ev.sbcPlayer.name,ovr:Number(e.player.ovr||ev.sbcPlayer.ovr)}}else{const def=[...(typeof BLACKFRIDAY_DEAL_SBCS!=="undefined"?BLACKFRIDAY_DEAL_SBCS:[]),...(typeof HALLOWEEN_TEAM1_SBC!=="undefined"?[HALLOWEEN_TEAM1_SBC]:[])].find(d=>d.id===id);if(def)out.facts.deal={name:def.name}}}
  if(type==="obj-end"){const task=EVENT_OBJECTIVES.find(t=>t.id===id);if(task){const item=makeEventObjectiveItem(task),pl=displayBase(item)||eventObjectivePlayerBase(task);out.cards.push({role:"objective",name:task.player.name,ovr:Number(pl.ovr||task.player.ovr),html:cardHTML(pl,item)});out.facts.objective={name:task.player.name,ovr:Number(pl.ovr||task.player.ovr),desc:task.desc}}}
  if(type==="event-end"){const theme=id.split(":")[0];const evs=releases.filter(e=>(e.theme||"")===theme&&(e.players||[]).length);const list=evs.flatMap(ev=>byEventRating(promoEventEntries(ev)));byEventRating(list).slice(0,9).forEach(e=>card(e,"team"));out.facts.event=evs[0]?.name||theme.toUpperCase();out.facts.count=list.length}
  if(type==="season-end"){const s=seasonInfo(new Date());out.facts.season={number:s.number,name:s.name};const keys=Object.keys(STORY_PASS_PLAYERS).filter(k=>k.startsWith(s.key+"-")).sort((a,b)=>Number(b.split("-").pop())-Number(a.split("-").pop()));for(const k of keys.slice(0,4))out.cards.push({role:"pass",name:STORY_PASS_PLAYERS[k].name||k,html:storyPreviewCard(k)})}
 }
 if(entry.kind==="teaser")out.silhouette=true;
 return out
}

async function renderCards(page,cards,dir){
 await page.evaluate(()=>{
  let box=document.getElementById("socialCardBox");if(!box){box=document.createElement("div");box.id="socialCardBox";box.style.cssText="position:fixed;left:0;top:0;z-index:2147483647;background:transparent;padding:40px";document.body.appendChild(box)}
  document.documentElement.style.background="transparent";document.body.style.background="transparent";
  if(!document.getElementById("socialCardStyle")){const s=document.createElement("style");s.id="socialCardStyle";s.textContent="body>*:not(#socialCardBox){visibility:hidden!important} #socialCardBox .social-card{width:340px;display:inline-block} #socialCardBox .card-shell{width:320px!important;max-width:320px!important;margin:0!important}";document.head.appendChild(s)}
 });
 const files=[];
 for(let i=0;i<cards.length;i++){
  await page.evaluate(html=>{const box=document.getElementById("socialCardBox");box.innerHTML='<div class="social-card">'+html+"</div>";box.querySelectorAll("img").forEach(im=>{im.loading="eager"});if(typeof fitCardPortrait==="function")box.querySelectorAll("img").forEach(im=>{try{fitCardPortrait(im)}catch(_){}})},cards[i].html);
  await page.waitForFunction(()=>[...document.querySelectorAll("#socialCardBox img")].every(i=>i.complete),null,{timeout:30000}).catch(()=>{});
  await page.waitForTimeout(process.env.CI?1500:500);
  const file=path.join(dir,`card-${String(i).padStart(2,"0")}.png`);
  await (await page.$("#socialCardBox .card-shell")||await page.$("#socialCardBox .social-card > *")).screenshot({path:file,omitBackground:true});files.push(file);
 }
 return files
}

async function shoot(ctx,base,html,size,file){
 const p=await ctx.newPage();await p.setViewportSize(size);
 await p.setContent(html.replace("<head>",`<head><base href="${base}/">`),{waitUntil:"load"});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
 await p.screenshot({path:file,type:"jpeg",quality:90});await p.close()
}

async function renderReel(ctx,base,reel,file,seed){
 const html=reelHTML(reel),tm=reelTiming(reel);
 const tmp=file+".frames";fs.rmSync(tmp,{recursive:true,force:true});fs.mkdirSync(tmp,{recursive:true});
 const p=await ctx.newPage();await p.setViewportSize({width:1080,height:1920});
 await p.setContent(html.replace("<head>",`<head><base href="${base}/">`),{waitUntil:"load"});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
 const total=Math.round(tm.seconds*FPS);
 for(let f=0;f<total;f++){
  await p.evaluate(t=>{for(const a of document.getAnimations()){a.pause();a.currentTime=t}},f*1000/FPS);
  await p.screenshot({path:path.join(tmp,`f${String(f).padStart(4,"0")}.jpg`),type:"jpeg",quality:88});
 }
 await p.close();
 const wav=path.join(tmp,"sound.wav");fs.writeFileSync(wav,soundtrackWav({seconds:tm.seconds,theme:reel.theme,seed,hits:{flash:1.6,wall:tm.wall?tm.wallAt:null,end:tm.endAt}}));
 execFileSync("ffmpeg",["-y","-loglevel","error","-framerate",String(FPS),"-i",path.join(tmp,"f%04d.jpg"),"-i",wav,"-shortest","-c:v","libx264","-pix_fmt","yuv420p","-profile:v","high","-crf","20","-preset","medium","-c:a","aac","-b:a","96k","-movflags","+faststart",file]);
 fs.rmSync(tmp,{recursive:true,force:true})
}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch();
 const ctx=await browser.newContext({viewport:{width:1200,height:1400},deviceScaleFactor:3,serviceWorkers:"block",timezoneId:"Europe/Berlin",locale:"de-DE"});
 await ctx.route(/googletagmanager|supabase|google-analytics/,r=>r.abort());
 await ctx.addInitScript(fakeClock);await ctx.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
 const plain=await browser.newContext({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 const index=[];
 try{
  const first=await openGame(ctx,base,FROM);
  let schedule=await first.evaluate(collectSchedule,{from:FROM,days:DAYS});await first.close();
  if(ONLY)schedule=schedule.filter(s=>(s.kind+"|"+s.keys.join("+")).includes(ONLY));
  console.log(`${schedule.length} Post-Termine zwischen ${new Date(FROM).toISOString()} und +${DAYS} Tagen`);
  for(const entry of schedule){
   const page=await openGame(ctx,base,entry.at+120000);
   const content=await page.evaluate(collectContent,entry);
   if(content.skip){console.log("skip",entry.title,"-",content.skip);await page.close();continue}
   const posts=buildPosts(entry,content);
   for(const post of posts){
    const dir=path.join(OUT,post.id);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
    const cardDir=path.join(dir,"_cards");fs.mkdirSync(cardDir);
    const files=await renderCards(page,content.cards.filter(c=>!post.cardRoles||post.cardRoles.includes(c.role)),cardDir);
    files.forEach((f,i)=>extraFiles.set(`${post.id}/${i}`,f));
    const cardUrls=files.map((_,i)=>`/__social/${encodeURIComponent(post.id+"/"+i)}`);
    post.media={feed:[],story:[]};
    for(let s=0;s<post.slides.length;s++){
     const slide={...post.slides[s],cards:(post.slides[s].cardIdx||[]).map(i=>cardUrls[i]).filter(Boolean)};
     await shoot(plain,base,posterHTML(slide,"feed"),{width:1080,height:1350},path.join(dir,`feed-${s+1}.jpg`));post.media.feed.push(`feed-${s+1}.jpg`);
     await shoot(plain,base,posterHTML(slide,"story"),{width:1080,height:1920},path.join(dir,`story-${s+1}.jpg`));post.media.story.push(`story-${s+1}.jpg`);
    }
    if(REEL&&post.reel){await renderReel(plain,base,{...post.reel,cards:(post.reel.cardIdx||[]).map(i=>cardUrls[i]).filter(Boolean)},path.join(dir,"reel.mp4"),post.id);post.media.reel="reel.mp4"}
    fs.rmSync(cardDir,{recursive:true,force:true});
    delete post.slides;delete post.reel;delete post.cardRoles;
    fs.writeFileSync(path.join(dir,"post.json"),JSON.stringify(post,null,2)+"\n");
    index.push({id:post.id,postAt:post.postAt,title:post.title,kind:post.kind});
    console.log("ok",post.id,post.title);
   }
   await page.close();
  }
 }finally{await browser.close();server.close()}
 const indexFile=path.join(OUT,"index.json");
 let old=[];try{old=JSON.parse(fs.readFileSync(indexFile,"utf8"))}catch(_){}
 const merged=new Map(old.map(x=>[x.id,x]));for(const x of index)merged.set(x.id,x);
 fs.writeFileSync(indexFile,JSON.stringify([...merged.values()].sort((a,b)=>String(a.postAt).localeCompare(String(b.postAt))),null,2)+"\n");
})().catch(e=>{console.error(e);process.exitCode=1;try{server.close()}catch(_){}});
