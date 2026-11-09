// V21.376 Wochenrückblick: on the first visit of a new week (Monday 00:00 Berlin) a small card sums up last week:
// matches, W/D/L, goals, player of the week, top scorer, best pack pull. Shareable as a picture.
// Results come from state.clubMatchHistory (part of the save). Player performances and pack pulls are kept in a small
// device-local log (localStorage), so nothing in the save changes.
(function(root){
 "use strict";
 const KEY="footera-week-recap-v1",KEEP_WEEKS=6,MODAL_ID="weekRecapModal",KIND="week-recap";
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(e){return{}}};
 const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}};
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const DAY=86400000;

 // Monday 00:00 Europe/Berlin of the week that contains `at`.
 function weekStart(at=new Date()){
  if(typeof berlinWeekStart==="function")return berlinWeekStart(at,1,0);
  const d=new Date(at);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;
 }
 function weekKey(at=new Date()){return weekStart(at).toISOString()}
 function previousWeekStart(at=new Date()){return weekStart(new Date(weekStart(at).getTime()-DAY))}

 function log(){const v=read();v.weeks=v.weeks&&typeof v.weeks==="object"?v.weeks:{};return v}
 function bucket(v,key){
  const w=v.weeks[key]||(v.weeks[key]={players:{},packs:0,best:[],sbcs:0});
  w.players=w.players&&typeof w.players==="object"?w.players:{};w.best=Array.isArray(w.best)?w.best:[];return w;
 }
 // Small copy of a card so it can still be drawn after it was sold or used in an SBC.
 function snapshot(item){
  if(!item||typeof item!=="object")return null;
  try{const out={};for(const [k,v] of Object.entries(item)){if(k==="clubStats"||typeof v==="function")continue;out[k]=v}return JSON.parse(JSON.stringify(out))}catch(e){return null}
 }
 function liveItem(entry){
  if(!entry)return null;
  const club=(typeof state!=="undefined"&&Array.isArray(state.club))?state.club:[];
  return (entry.uid&&club.find(x=>String(x.uid)===String(entry.uid)))||entry.item||null;
 }
 function prune(v){const keys=Object.keys(v.weeks).sort();while(keys.length>KEEP_WEEKS)delete v.weeks[keys.shift()]}

 /* ---------- recording ---------- */
 function afterMatch(m){
  try{
   if(!m||m.weekRecapRecorded||typeof matchReportPerformanceRows!=="function")return;
   m.weekRecapRecorded=true;
   const rows=matchReportPerformanceRows("home"),potm=typeof matchReportPotm==="function"?matchReportPotm():null;
   const v=log(),w=bucket(v,weekKey());
   for(const row of rows){
    const played=num(row.minutes)>0||num(row.goals)>0||num(row.assists)>0;if(!played)continue;
    const id=String(row.uid||row.base?.id||row.name);
    const p=w.players[id]||(w.players[id]={name:String(row.base?.name||row.name||"Spieler"),pid:String(row.base?.id||""),uid:String(row.uid||""),goals:0,assists:0,rSum:0,n:0,potm:0});
    if(row.item)p.item=snapshot(row.item);
    p.goals+=num(row.goals);p.assists+=num(row.assists);
    if(num(row.rating)>0){p.rSum+=num(row.rating);p.n+=1}
    if(potm&&potm.side==="home"&&String(potm.uid)===String(row.uid))p.potm+=1;
   }
   prune(v);write(v);
  }catch(e){console.warn("Wochenrückblick:",e)}
 }
 function afterPack(items){
  try{
   if(!Array.isArray(items)||!items.length)return;
   const v=log(),w=bucket(v,weekKey());w.packs+=1;
   for(const item of items){
    const b=typeof displayBase==="function"?displayBase(item):null;if(!b)continue;
    const ovr=num(typeof itemRating==="function"?itemRating(item):b.ovr)||num(b.ovr);
    w.best.push({name:String(b.name||"Spieler"),ovr,pos:String(b.position||""),special:item.variant==="special"||item.variant==="icon-mid",event:String(item.eventName||""),uid:String(item.uid||""),item:snapshot(item)});
   }
   w.best.sort((a,c)=>c.ovr-a.ovr||(c.special?1:0)-(a.special?1:0));w.best=w.best.slice(0,3);
   prune(v);write(v);
  }catch(e){console.warn("Wochenrückblick:",e)}
 }
 function afterSbc(){try{const v=log(),w=bucket(v,weekKey());w.sbcs+=1;prune(v);write(v)}catch(e){}}

 /* ---------- summary ---------- */
 function summary(startAt){
  const start=weekStart(startAt),end=new Date(start.getTime()+7*DAY+3*3600000),from=start.getTime();
  // Real end = next Monday 00:00 Berlin (DST-safe).
  const endAt=weekStart(end).getTime();
  const history=(typeof state!=="undefined"&&Array.isArray(state.clubMatchHistory))?state.clubMatchHistory:[];
  const games=history.filter(x=>num(x?.ts)>=from&&num(x?.ts)<endAt);
  const s={start,endAt,matches:games.length,wins:0,draws:0,losses:0,gf:0,ga:0,cleanSheets:0,players:[],packs:0,best:null,sbcs:0};
  for(const g of games){if(g.result==="win")s.wins++;else if(g.result==="draw")s.draws++;else s.losses++;s.gf+=num(g.gf);s.ga+=num(g.ga);if(num(g.ga)===0)s.cleanSheets++}
  const w=log().weeks[start.toISOString()];
  if(w){
   s.players=Object.values(w.players||{}).map(p=>({...p,avg:p.n?p.rSum/p.n:0}));
   s.packs=num(w.packs);s.best=(w.best||[])[0]||null;s.sbcs=num(w.sbcs);
  }
  // Player of the week: best average rating over at least 2 games (1 if only one game was played).
  const minGames=Math.min(2,Math.max(1,...s.players.map(p=>p.n),1));
  s.playerOfWeek=s.players.filter(p=>p.n>=minGames).sort((a,b)=>b.avg-a.avg||b.goals-a.goals||b.potm-a.potm)[0]||null;
  s.topScorer=s.players.filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals||b.assists-a.assists)[0]||null;
  s.hasContent=s.matches>0||s.packs>0||s.sbcs>0;
  return s;
 }
 function dateLabel(d){return new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit"}).format(d)}
 function rangeLabel(s){return`${dateLabel(s.start)} – ${dateLabel(new Date(s.endAt-DAY/2))}`}
 function headline(s){
  if(!s.matches)return s.packs?"Eine Woche voller Packs.":"Ruhige Woche.";
  if(s.wins===s.matches&&s.matches>=3)return"Perfekte Woche. Nur Siege!";
  if(s.wins>s.losses)return"Starke Woche für deinen Club.";
  if(s.wins===s.losses)return"Ausgeglichene Woche.";
  return"Schwierige Woche. Nächste Woche wird besser.";
 }

 function cardThumb(entry){
  const item=liveItem(entry);if(!item||typeof displayBase!=="function"||typeof cardHTML!=="function")return"";
  try{const b=displayBase(item);if(!b)return"";return`<div class="wr-thumb">${cardHTML(b,item,false,b.position)}</div>`}catch(e){return""}
 }
 function html(s,{current=false}={}){
  const tile=(v,l,cls="")=>`<div class="wr-tile ${cls}"><b>${v}</b><span>${l}</span></div>`;
  const pow=s.playerOfWeek,ts=s.topScorer,best=s.best,powCard=pow?cardThumb(pow):"",bestCard=best?cardThumb(best):"";
  const facts=[
   pow?`<div class="wr-fact pow ${powCard?"has-card":""}">${powCard}<small>SPIELER DER WOCHE</small><strong>${escText(pow.name)}</strong><span>Ø ${pow.avg.toFixed(1)} · ${pow.n} ${pow.n===1?"Spiel":"Spiele"}${pow.goals?` · ${pow.goals} ${pow.goals===1?"Tor":"Tore"}`:""}${pow.potm?` · ${pow.potm}× Spieler des Spiels`:""}</span></div>`:"",
   ts&&(!pow||ts.name!==pow.name)?`<div class="wr-fact top"><small>TORJÄGER</small><strong>${escText(ts.name)}</strong><span>${ts.goals} ${ts.goals===1?"Tor":"Tore"}${ts.assists?` · ${ts.assists} Vorlagen`:""}</span></div>`:"",
   best?`<div class="wr-fact pull ${bestCard?"has-card":""}">${bestCard}<small>BESTE ZIEHUNG</small><strong>${escText(best.name)} <em>${best.ovr}</em></strong><span>${escText(best.event||(best.special?"Spezialkarte":"aus "+s.packs+" "+(s.packs===1?"Pack":"Packs")))}</span></div>`:""
  ].join("");
  const record=s.matches?`<div class="wr-record"><span class="w">${s.wins} S</span><span class="d">${s.draws} U</span><span class="l">${s.losses} N</span></div>`:"";
  return`<div class="wr-card"><div class="wr-head"><span>${current?"DIESE WOCHE BISHER":"WOCHENRÜCKBLICK"}</span><small>${rangeLabel(s)}</small></div><h2>${escText(headline(s))}</h2><div class="wr-tiles">${tile(s.matches,s.matches===1?"Spiel":"Spiele")}${tile(`${s.gf}:${s.ga}`,"Tore")}${tile(s.packs,s.packs===1?"Pack":"Packs")}${tile(s.sbcs,s.sbcs===1?"SBC":"SBCs")}</div>${record}${facts?`<div class="wr-facts">${facts}</div>`:""}${!s.hasContent?`<p class="wr-empty">In dieser Woche ist noch nichts passiert. Spiel ein paar Matches und öffne Packs, dann füllt sich dein Rückblick.</p>`:""}</div>`;
 }

 /* ---------- share picture ---------- */
 function loadImage(src){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.onerror=()=>r(null);img.src=src;setTimeout(()=>r(null),4000)})}
 async function picture(s){
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const bg=g.createRadialGradient(W/2,H*.3,40,W/2,H*.3,H*.9);bg.addColorStop(0,"#123a2a");bg.addColorStop(1,"#030605");g.fillStyle=bg;g.fillRect(0,0,W,H);
  const stadium=await loadImage("./assets/footera/stadion.webp");if(stadium){g.globalAlpha=.18;const r=Math.max(W/stadium.width,H/stadium.height);g.drawImage(stadium,(W-stadium.width*r)/2,(H-stadium.height*r)/2,stadium.width*r,stadium.height*r);g.globalAlpha=1}
  const emblem=await loadImage("./assets/footera/emblem.png");if(emblem)g.drawImage(emblem,W/2-55,60,110,110);
  try{await document.fonts?.ready}catch(e){}
  const F=(w,px)=>`${w} ${px}px Inter,system-ui,sans-serif`;
  g.textAlign="center";g.fillStyle="#7dffb2";g.font=F(900,40);g.fillText("WOCHENRÜCKBLICK",W/2,230);
  g.fillStyle="#ffffffb0";g.font=F(700,32);g.fillText(rangeLabel(s),W/2,280);
  g.fillStyle="#fff";g.font=F(900,56);g.fillText(headline(s),W/2,370,W-100);
  const tiles=[[s.matches,"SPIELE"],[`${s.gf}:${s.ga}`,"TORE"],[`${s.wins}-${s.draws}-${s.losses}`,"S-U-N"],[s.packs,"PACKS"]];
  const tw=220,gap=26,x0=(W-(tw*4+gap*3))/2;
  tiles.forEach(([v,l],i)=>{const x=x0+i*(tw+gap);g.fillStyle="#ffffff12";roundRect(g,x,430,tw,170,24);g.fill();g.fillStyle="#fff";g.font=F(900,64);g.fillText(String(v),x+tw/2,530,tw-20);g.fillStyle="#9fc7b3";g.font=F(800,26);g.fillText(l,x+tw/2,575)});
  const showScorer=s.topScorer&&s.topScorer.name!==s.playerOfWeek?.name;
  const withCards=[s.playerOfWeek,s.best].filter(Boolean).length+(showScorer?1:0)<=2;// room for cards only with 2 boxes
  let y=650;
  const fact=async(label,name,detail,color,entry)=>{
   const item=withCards?liveItem(entry):null,h=item?250:150,cw=160;
   g.fillStyle="#ffffff0d";roundRect(g,90,y,W-180,h,24);g.fill();
   const textY=y+(h-150)/2;
   g.textAlign="left";g.fillStyle=color;g.font=F(900,26);g.fillText(label,130,textY+48);
   g.fillStyle="#fff";g.font=F(900,46);g.fillText(name,130,textY+100,item?W-260-cw-30:W-260);
   g.fillStyle="#ffffffa8";g.font=F(700,28);
   if(item){g.fillText(detail,130,textY+142,W-260-cw-30);await drawCardAt(item,W-90-24-cw,y+(h-cw*1.43)/2,cw)}
   else{g.textAlign="right";g.fillText(detail,W-130,y+48,420)}
   g.textAlign="center";y+=h+22;
  };
  if(s.playerOfWeek)await fact("SPIELER DER WOCHE",s.playerOfWeek.name,`Ø ${s.playerOfWeek.avg.toFixed(1)}${s.playerOfWeek.goals?` · ${s.playerOfWeek.goals} Tore`:""}`,"#7dffb2",s.playerOfWeek);
  if(showScorer)await fact("TORJÄGER",s.topScorer.name,`${s.topScorer.goals} Tore`,"#f5d36b",null);
  if(s.best)await fact("BESTE ZIEHUNG",`${s.best.name} ${s.best.ovr}`,s.best.event||"aus "+s.packs+" Packs","#ffb36b",s.best);
  async function drawCardAt(item,x,cy,width){
   const draw=root.FooteraShare?.drawCard;if(!draw||typeof cardHTML!=="function"||typeof displayBase!=="function")return;
   const host=document.createElement("div");host.className="footera-share-stage";host.setAttribute("aria-hidden","true");
   try{const b=displayBase(item);if(!b)return;host.innerHTML=cardHTML(b,item);document.body.append(host);
    const card=host.querySelector(".card-shell")||host.firstElementChild;if(!card)return;
    host.querySelectorAll("img").forEach(img=>{img.loading="eager";if(img.dataset.pendingSrc&&!img.getAttribute("src")){img.src=img.dataset.pendingSrc;img.style.display=""}});
    await Promise.all([...host.querySelectorAll("img")].map(img=>img.complete?0:new Promise(r=>{img.addEventListener("load",r,{once:true});img.addEventListener("error",r,{once:true});setTimeout(r,4000)})));
    g.save();await draw(g,card,x,cy,width);g.restore();
   }catch(e){console.warn("Wochenrückblick Karte:",e)}finally{host.remove()}
  }
  g.fillStyle="#ffffffb0";g.font=F(700,32);g.fillText("FOOTERA – BUILD YOUR ERA",W/2,H-110);
  g.fillStyle="#ffffff80";g.font=F(600,26);g.fillText("Insta @official_footera · TikTok @footera_official",W/2,H-62);
  const blob=await new Promise(r=>{try{c.toBlob(r,"image/png")}catch(e){r(null)}});
  return blob?new File([blob],"footera-wochenrueckblick.png",{type:"image/png"}):null;
 }
 function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

 /* ---------- modal ---------- */
 let shown=null;
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><h3>Wochenrückblick</h3><button type="button" class="secondary" data-wr-close>Schließen</button></div><div id="weekRecapBody"></div><div class="wr-actions"><button type="button" class="primary" data-wr-share>Rückblick teilen</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async e=>{
   if(e.target.closest("[data-wr-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const btn=e.target.closest("[data-wr-share]");if(!btn||!shown)return;
   btn.disabled=true;
   try{const file=await picture(shown);const share=root.FooteraShare?.share;const url=root.FooteraShare?.inviteUrl?root.FooteraShare.inviteUrl("","recap"):location.href;
    const s=shown,text=`Meine Footera-Woche: ${s.matches} Spiele, ${s.wins} Siege, ${s.gf}:${s.ga} Tore${s.best?`, beste Ziehung ${s.best.name} ${s.best.ovr}`:""}. ⚽`;
    if(share)await share({title:"Footera Wochenrückblick",text,url,file});}
   catch(err){console.warn("Wochenrückblick teilen:",err)}
   finally{btn.disabled=false}
  });
 }
 function $(sel){return document.querySelector(sel)}
 function open({at=new Date(),current=false}={}){
  ensureModal();
  const s=summary(current?weekStart(at):previousWeekStart(at));shown=s;
  $("#weekRecapBody").innerHTML=html(s,{current});
  const share=$("[data-wr-share]");if(share)share.hidden=!s.hasContent;
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
  return s;
 }
 // Extras button: last week when there is something to show, otherwise this week so far.
 function openLatest(at=new Date()){const last=summary(previousWeekStart(at));return last.hasContent?open({at}):open({at,current:true})}

 /* ---------- automatic Monday card ---------- */
 function dueFor(at=new Date()){
  const v=read(),prev=previousWeekStart(at).toISOString();
  if(v.seen===prev)return null;
  const s=summary(previousWeekStart(at));return s.hasContent?prev:null;
 }
 function idle(){
  try{
   if(typeof gerliesStartupReady!=="undefined"&&!gerliesStartupReady)return false;
   if(document.getElementById("bootIntro"))return false;
   if(document.querySelector(".modal.active, #opening.active, #results.active, #match.active"))return false;
   if(root.FooteraTutorial?.active?.())return false;
   if(typeof packFlowInProgress==="function"&&packFlowInProgress())return false;
   return true;
  }catch(e){return false}
 }
 let timer=0,tries=0;
 function check(){
  clearTimeout(timer);
  const due=dueFor();if(!due)return;
  if(!idle()){if(++tries<80)timer=setTimeout(check,3000);return}
  const v=read();v.seen=due;write(v);open();
 }
 function start(){document.addEventListener("click",e=>{if(e.target.closest?.("[data-week-recap-open]"))openLatest()});tries=0;timer=setTimeout(check,4000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){tries=0;clearTimeout(timer);timer=setTimeout(check,2500)}})}

 root.FooteraWeekRecap={afterMatch,afterPack,afterSbc,summary,picture,open,openLatest,dueFor,weekStart,previousWeekStart,html,start};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})(window);
