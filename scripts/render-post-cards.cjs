const {chromium}=require("playwright");const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,".."),OUT=process.argv[2],AT=process.argv[3],JOB=process.argv[4];
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".csv":"text/csv",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");try{const body=fs.readFileSync(file);res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
function fakeClock(){const R=Date,s=Number(sessionStorage.getItem("__footeraFakeNow"));if(!s)return;let a=R.now();class F extends R{constructor(...x){if(x.length)super(...x);else super(s+(R.now()-a))}static now(){return s+(R.now()-a)}}F.parse=R.parse;F.UTC=R.UTC;globalThis.Date=F}
(async()=>{await new Promise(r=>server.listen(0,"127.0.0.1",r));const base="http://127.0.0.1:"+server.address().port;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1400},deviceScaleFactor:3,serviceWorkers:"block",timezoneId:"Europe/Berlin",locale:"de-DE"});
const p=await ctx.newPage();p.on("pageerror",e=>console.log("ERR",e.message));
await ctx.route(/googletagmanager|supabase/,r=>r.abort());
await p.addInitScript(fakeClock);await p.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
await p.goto(base+"/x404");await p.evaluate(t=>sessionStorage.setItem("__footeraFakeNow",String(t)),Date.parse(AT));
await p.goto(base+"/",{waitUntil:"load"});
await p.waitForFunction(()=>typeof PLAYERS!=="undefined"&&PLAYERS.length>10000&&typeof renderAll==="function",null,{timeout:120000});
await p.waitForFunction(()=>document.getElementById("dbTitle")?.textContent==="Bereit für den Anpfiff",null,{timeout:120000});
const list=await p.evaluate(job=>{
 const H=EVENT_PROMO_RELEASES.find(e=>e.id==="halloween-2026")||HALLOWEEN_EVENT;const out=[];
 if(job==="team")for(const e of byEventRating(promoEventEntries(H)))out.push({name:"team-"+String(out.length).padStart(2,"0")+"-"+e.player.name,html:cardHTML(e.player,e.item)});
 if(job==="leao"){const o=EVENT_OBJECTIVES.find(x=>x.id==="halloween-leao");const e=promoEventEntries({...H,players:[o.player]})[0];out.push({name:"leao",html:cardHTML(e.player,e.item)})}
 if(job==="mueller"){const e=promoEventEntries({...H,players:[H.sbcPlayer]})[0];out.push({name:"mueller",html:cardHTML(e.player,e.item)})}
 if(job==="pass")for(const k of Object.keys(STORY_PASS_PLAYERS).filter(k=>k.startsWith("s2-")))out.push({name:"pass-"+k,html:storyPreviewCard(k)});
 const box=document.createElement("div");box.id="qaPost";box.style.cssText="position:fixed;inset:0;z-index:99999;background:transparent;padding:40px";document.body.appendChild(box);
 document.documentElement.style.background="transparent";document.body.style.background="transparent";
 window.__qaList=out;return out.map(x=>x.name)},JOB);
await p.addStyleTag({content:"body>*:not(#qaPost){visibility:hidden!important} #qaPost .qa-card{width:300px;display:inline-block} "});
for(let i=0;i<list.length;i++){
 await p.evaluate(i=>{const box=document.getElementById("qaPost");box.innerHTML='<div class="qa-card">'+__qaList[i].html+'</div>';box.querySelectorAll("img").forEach(im=>im.loading="eager");if(typeof fitCardPortrait==="function")box.querySelectorAll("img").forEach(im=>{try{fitCardPortrait(im)}catch(_){}})},i);
 await p.waitForFunction(()=>[...document.querySelectorAll("#qaPost img")].every(i=>i.complete),null,{timeout:30000}).catch(()=>{});
 await p.waitForTimeout(process.env.CI?2500:600);
 const el=await p.$("#qaPost .qa-card");await el.screenshot({path:path.join(OUT,list[i].replace(/[^\w-]+/g,"_")+".png"),omitBackground:true});console.log("ok",list[i]);
}
await b.close();server.close()})();
