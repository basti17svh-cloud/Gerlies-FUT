// V21.458 Trainerkarte: the user gets an own Footera card as the coach of the club. The rating and six stats come
// from what the club really did (matches, win rate, goals, goals against, titles, best winning run, Rivals division).
// Wins make it grow: bronze -> silver -> gold -> Trainer-Legende. After a match a small pill shows an upgrade.
// The save is only read. The last rating the user has seen is kept on this device (localStorage), nothing else.
(function(root){
 "use strict";
 const KEY="footera-coach-card-v1",MODAL_ID="coachCardModal",KIND="coach-card",LEGEND=88;
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const escText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const pct=v=>Math.round(v*100)+" %";
 const dec=v=>v.toFixed(1).replace(".",",");
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(e){return{}}};
 const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}};

 const TYPES={
  SIE:["Siegertyp","Bei dir zählt nur der Dreier."],
  OFF:["Offensivgenie","Deine Teams schießen aus allen Lagen."],
  DEF:["Abwehrstratege","Hinten steht bei dir die Null."],
  ERF:["Dauerbrenner","Kaum ein Trainer stand öfter an der Linie."],
  POK:["Titelsammler","Deine Vitrine wird langsam zu klein."],
  SER:["Serienkiller","Wenn dein Team einmal läuft, hält es keiner auf."]
 };
 const TIERS=[[LEGEND,"icon","Trainer-Legende"],[75,"gold","Gold"],[65,"silver","Silber"],[0,"bronze","Bronze"]];

 function trophyCount(s){try{const t=root.FooteraMuseum?.trophies;return typeof t==="function"?t(s).length:0}catch(e){return 0}}
 function bestRun(history){let run=0,best=0;for(const h of history){if(h?.result==="win"){run++;if(run>best)best=run}else run=0}return best}

 // Pure: everything the card shows, from a save-like object. `extra` adds hypothetical wins (for "next upgrade").
 function data(s,{extraWins=0,titles}={}){
  s=s&&typeof s==="object"?s:{};
  const st=s.stats||{},history=(Array.isArray(s.clubMatchHistory)?s.clubMatchHistory:[]).concat(Array.from({length:extraWins},()=>({result:"win",gf:2,ga:1})));
  const counted={w:0,d:0,l:0};for(const h of history){if(h?.result==="win")counted.w++;else if(h?.result==="loss")counted.l++;else if(h)counted.d++}
  // stats.* count every match ever; the history keeps the last 400. Use whichever knows more.
  const wins=Math.max(num(st.wins)+extraWins,counted.w),draws=Math.max(num(st.draws),counted.d),losses=Math.max(num(st.losses),counted.l);
  const matches=Math.max(num(st.matches)+extraWins,wins+draws+losses,history.length);
  const winRate=matches?wins/matches:0,conf=matches/(matches+15);
  const hm=history.length,gf=history.reduce((n,h)=>n+num(h?.gf),0),ga=history.reduce((n,h)=>n+num(h?.ga),0);
  const gpm=hm?gf/hm:0,gapm=hm?ga/hm:0,hconf=hm/(hm+15);
  const cups=titles==null?trophyCount(s):num(titles),run=bestRun(history);
  const division=clamp(Math.round(num(s.rivals?.division)||10),1,10);
  const stat=v=>clamp(Math.round(v),1,99);
  const stats=[
   {key:"SIE",label:"Siege",value:stat(lerp(40,20+79*winRate,conf)),detail:matches?`${pct(winRate)} Siege (${wins}-${draws}-${losses})`:"Noch kein Spiel"},
   {key:"OFF",label:"Offensive",value:stat(lerp(40,25+22*gpm,hconf)),detail:hm?`${dec(gpm)} Tore pro Spiel`:"Noch keine Tore"},
   {key:"DEF",label:"Defensive",value:stat(lerp(40,99-25*gapm,hconf)),detail:hm?`${dec(gapm)} Gegentore pro Spiel`:"Noch keine Spiele"},
   {key:"ERF",label:"Erfahrung",value:stat(15+28*Math.log10(1+matches)),detail:`${matches} ${matches===1?"Spiel":"Spiele"} an der Linie`},
   {key:"POK",label:"Pokale",value:stat(30+12*Math.sqrt(cups)),detail:cups?`${cups} ${cups===1?"Titel":"Titel"} im Museum`:"Noch kein Titel"},
   {key:"SER",label:"Serie",value:stat(30+13*Math.sqrt(run)),detail:run?`${run} Siege am Stück (Rekord)`:"Noch keine Siegesserie"}
  ];
  const ovr=clamp(Math.round(46+Math.min(20,7*Math.log10(1+matches))+Math.max(-6,(winRate-.33)*40*conf)+Math.min(10,2.5*Math.sqrt(cups))+(10-division)*.6),40,99);
  const tier=TIERS.find(t=>ovr>=t[0]);
  let type;
  if(matches<5)type={key:"NEU",title:"Neu an der Seitenlinie",line:"Die ersten Spiele entscheiden, was für ein Trainer du wirst."};
  else{const score=x=>x.value-(x.key==="ERF"?12:0);const top=[...stats].sort((a,b)=>score(b)-score(a)||a.key.localeCompare(b.key))[0];type={key:top.key,title:TYPES[top.key][0],line:TYPES[top.key][1]}}
  const profile=s.profile||{};
  return{name:String(profile.username||"").trim()||"Trainer",club:String(profile.clubName||"Footera Club"),ovr,cls:tier[1],tierLabel:tier[2],stats,type,matches,wins,cups,division};
 }
 // How many wins (2:1) until the rating goes up, and until the next design. null when out of reach in 80 wins.
 function next(s){
  const base=data(s),titles=base.cups,out={rating:null,tier:null};
  const nextTier=[...TIERS].reverse().find(t=>t[0]>base.ovr);
  for(let k=1;k<=80&&(!out.rating||(nextTier&&!out.tier));k++){
   const d=data(s,{extraWins:k,titles});
   if(!out.rating&&d.ovr>base.ovr)out.rating={wins:k,ovr:d.ovr};
   if(nextTier&&!out.tier&&d.ovr>=nextTier[0])out.tier={wins:k,label:nextTier[2],at:nextTier[0]};
  }
  return out;
 }

 /* ---------- card ---------- */
 function crest(){
  try{if(typeof crestHTML==="function"&&typeof clubIdentitySnapshot==="function")return crestHTML(clubIdentitySnapshot())}catch(e){}
  return`<img src="./assets/footera/emblem.png" alt="">`;
 }
 function miniCrest(){
  try{if(typeof crestHTML==="function"&&typeof clubIdentitySnapshot==="function")return crestHTML(clubIdentitySnapshot(),true)}catch(e){}
  return"";
 }
 const WHISTLE=`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.5 7H20a1 1 0 0 1 1 1v2.2a1 1 0 0 1-.7.95L15 12.8A5.5 5.5 0 1 1 9.5 7Zm0 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM10 3h2v3h-2z"/></svg>`;
 function cardHTMLFor(d){
  const name=d.name.length>15?d.name.slice(0,14)+"…":d.name,scale=name.length>12?.82:1;
  return`<div class="card-shell coach-card-shell"><div class="custom-card ${d.cls} coach-card" data-coach-tier="${d.cls}"><div class="card-top"><div class="ovr">${d.ovr}</div><div class="pos">TRN</div></div><div class="card-icons"><div class="card-flag coach-whistle" title="Trainer">${WHISTLE}</div><div class="card-club coach-mini-crest" title="${escText(d.club)}">${miniCrest()}</div><div class="card-league" title="Footera"><img src="./assets/footera/emblem.png" alt=""></div></div><div class="face coach-face">${crest()}</div><div class="card-bottom"><div class="pname" title="${escText(d.name)}" style="--card-name-scale:${scale}">${escText(name)}</div><div class="stats">${d.stats.map(x=>`<span><small>${x.key}</small><b>${x.value}</b></span>`).join("")}</div></div></div></div>`;
 }

 /* ---------- modal ---------- */
 let shown=null;
 function $(sel){return document.querySelector(sel)}
 function ensureModal(){
  if(document.getElementById(MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><div><h3>Deine Trainerkarte</h3><div class="cc-sub">Jeder Sieg zählt. Deine Karte wächst mit deinem Verein.</div></div><button type="button" class="secondary" data-cc-close>Schließen</button></div><div id="coachCardBody"></div><div class="cc-actions"><button type="button" class="primary" data-cc-share>Karte teilen</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-cc-close]")||e.target===el){close();return}
   if(e.target.closest("[data-cc-share]"))shareCard(e.target.closest("[data-cc-share]"));
  });
 }
 function bodyHTML(d,n,upgrade){
  const tierLine=d.cls==="icon"?"Höchste Stufe erreicht":n.tier?`${n.tier.label} ab GES ${n.tier.at}: noch etwa ${n.tier.wins} ${n.tier.wins===1?"Sieg":"Siege"}`:"";
  const rateLine=n.rating?`Mit ${n.rating.wins===1?"dem nächsten Sieg":`${n.rating.wins} weiteren Siegen`} steigt deine Karte auf ${n.rating.ovr}.`:"Deine Karte ist am Limit. Respekt!";
  return`<div class="cc-stage${upgrade?" cc-upgrade":""}">${upgrade?`<div class="cc-burst" aria-hidden="true"></div><div class="cc-upgrade-tag">UPGRADE ${upgrade.from} → ${d.ovr}</div>`:""}<div class="cc-card">${cardHTMLFor(d)}</div><span class="cc-tier cc-tier-${d.cls}">${escText(d.tierLabel)}</span></div>
  <div class="cc-type"><small>DEIN TRAINERTYP</small><strong>${escText(d.type.title)}</strong><span>${escText(d.type.line)}</span></div>
  <div class="cc-next"><b>${escText(rateLine)}</b>${tierLine?`<small>${escText(tierLine)}</small>`:""}</div>
  <ul class="cc-stats">${d.stats.map(x=>`<li><span class="cc-key">${x.key}</span><span class="cc-bar"><i style="width:${x.value}%"></i></span><b>${x.value}</b><small>${escText(x.label)} · ${escText(x.detail)}</small></li>`).join("")}</ul>
  <p class="cc-note">Die Gesamtwertung kommt aus Spielen, Siegquote, Titeln und deiner Rivals-Division. Die Karte ist nur zum Anschauen und Teilen, sie spielt nicht mit.</p>`;
 }
 function open(){
  if(typeof document==="undefined")return null;
  ensureModal();
  const s=typeof state!=="undefined"?state:{},d=data(s),n=next(s),log=read();
  const upgrade=num(log.seen)&&d.ovr>num(log.seen)?{from:num(log.seen)}:null;
  shown=d;
  document.getElementById("coachCardBody").innerHTML=bodyHTML(d,n,upgrade);
  write({...log,seen:d.ovr,best:Math.max(num(log.best),d.ovr),introduced:true});
  hidePill();
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else document.getElementById(MODAL_ID).classList.add("active");
  decorateHub();
  return d;
 }
 function close(){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):document.getElementById(MODAL_ID)?.classList.remove("active")}

 /* ---------- share picture ---------- */
 function loadImage(src){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.onerror=()=>r(null);img.src=src;setTimeout(()=>r(null),4000)})}
 async function picture(d){
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const glow={icon:"#cfe0ff",gold:"#d8ff3e",silver:"#e4e9ee",bronze:"#e0a26a"}[d.cls]||"#d8ff3e";
  const bg=g.createRadialGradient(W/2,H*.38,40,W/2,H*.38,H*.85);bg.addColorStop(0,"#14302a");bg.addColorStop(1,"#030605");g.fillStyle=bg;g.fillRect(0,0,W,H);
  const stadium=await loadImage("./assets/footera/stadion.webp");if(stadium){g.globalAlpha=.16;const r=Math.max(W/stadium.width,H/stadium.height);g.drawImage(stadium,(W-stadium.width*r)/2,(H-stadium.height*r)/2,stadium.width*r,stadium.height*r);g.globalAlpha=1}
  try{await document.fonts?.ready}catch(e){}
  const F=(w,px)=>`${w} ${px}px Inter,system-ui,sans-serif`;
  g.textAlign="center";g.fillStyle=glow;g.font=F(900,40);g.fillText("MEINE TRAINERKARTE",W/2,110);
  g.fillStyle="#ffffffb8";g.font=F(700,32);g.fillText(d.club,W/2,160,W-120);
  const cw=470,cx=(W-cw)/2,cy=210;
  const halo=g.createRadialGradient(W/2,cy+cw*.7,20,W/2,cy+cw*.7,cw*.95);halo.addColorStop(0,glow+"55");halo.addColorStop(1,glow+"00");g.fillStyle=halo;g.fillRect(0,cy-60,W,cw*1.6);
  const host=document.createElement("div");host.className="footera-share-stage";host.setAttribute("aria-hidden","true");host.innerHTML=cardHTMLFor(d);document.body.append(host);
  try{const card=host.querySelector(".card-shell");if(card&&root.FooteraShare?.drawCard)await root.FooteraShare.drawCard(g,card,cx,cy,cw)}catch(e){console.warn("Trainerkarte Bild:",e)}finally{host.remove()}
  const ty=cy+cw/.7+70;
  g.fillStyle="#ffffff90";g.font=F(800,26);g.fillText("TRAINERTYP",W/2,ty);
  g.fillStyle="#fff";g.font=F(900,60);g.fillText(d.type.title,W/2,ty+66,W-120);
  g.fillStyle="#ffffffb0";g.font=F(700,30);g.fillText(`${d.matches} Spiele · ${d.wins} Siege · ${d.cups} Titel`,W/2,ty+118,W-120);
  g.fillStyle="#9fc7b3";g.font=F(800,24);g.fillText("FOOTERA – BUILD YOUR ERA · Insta @official_footera",W/2,H-50,W-80);
  return await new Promise(r=>c.toBlob(b=>r(b?new File([b],"footera-trainerkarte.jpg",{type:"image/jpeg"}):null),"image/jpeg",.92));
 }
 async function shareCard(btn){
  if(!shown)return;btn.disabled=true;
  try{const file=await picture(shown),url=root.FooteraShare?.inviteUrl?root.FooteraShare.inviteUrl("","coach"):location.href,
   text=`Meine Footera-Trainerkarte: ${shown.ovr} GES, ${shown.type.title}. Wer kommt ran? ⚽`;
   if(root.FooteraShare?.share)await root.FooteraShare.share({title:"Footera Trainerkarte",text,url,file});
   else if(file){const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;a.click()}}
  catch(e){console.warn("Trainerkarte teilen:",e)}
  finally{btn.disabled=false}
 }

 /* ---------- after a match: upgrade pill ---------- */
 let pillTimer=0;
 function hidePill(){const p=document.getElementById("coachCardPill");if(p)p.remove();clearTimeout(pillTimer)}
 function showPill(text){
  hidePill();
  const p=document.createElement("button");p.type="button";p.id="coachCardPill";p.className="cc-pill";p.innerHTML=text;
  p.addEventListener("click",()=>open());document.body.appendChild(p);
  requestAnimationFrame(()=>p.classList.add("on"));
  pillTimer=setTimeout(hidePill,9000);
 }
 // What the pill says after a match, or null. Pure (tested).
 function pillFor(log,d){
  if(!log.introduced&&!log.pillShown)return{kind:"intro",html:`<span class="cc-pill-tag">NEU</span> Deine Trainerkarte ist da · <b>${d.ovr}</b> ›`};
  if(num(log.seen)&&d.ovr>num(log.seen))return{kind:"upgrade",html:`<span class="cc-pill-tag">▲ UPGRADE</span> Trainerkarte ${num(log.seen)} → <b>${d.ovr}</b> ›`};
  return null;
 }
 function afterMatch(){
  if(typeof document==="undefined")return;
  setTimeout(()=>{try{
   const log=read(),d=data(typeof state!=="undefined"?state:{}),pill=pillFor(log,d);
   if(!pill)return;
   if(pill.kind==="intro")write({...log,pillShown:true});
   showPill(pill.html);
  }catch(e){}},1600);
 }

 /* ---------- entry in the Verein hub ---------- */
 function hubCardHTML(){
  let d=null;try{d=data(typeof state!=="undefined"?state:{})}catch(e){}
  return`<button type="button" class="club-hub-card club-hub-coach" data-coach-card-open><span class="club-hub-kicker">NEU · DEINE KARTE</span><strong>Trainerkarte</strong><small data-coach-card-summary>${d?`GES ${d.ovr} · ${escText(d.type.title)}`:"Deine eigene Footera-Karte"}</small><i>›</i></button>`;
 }
 function decorateHub(){
  const hub=document.getElementById("clubStatsHub");if(!hub)return;
  const card=hub.querySelector("[data-coach-card-open]");
  if(!card){const museum=hub.querySelector("[data-museum-open]"),grid=hub.querySelector(".club-hub-grid");
   if(museum)museum.insertAdjacentHTML("afterend",hubCardHTML());else if(grid)grid.insertAdjacentHTML("beforebegin",hubCardHTML());else hub.insertAdjacentHTML("beforeend",hubCardHTML());return}
  const small=card.querySelector("[data-coach-card-summary]"),fresh=hubCardHTML().match(/data-coach-card-summary>([^<]*)</)?.[1];
  if(small&&fresh!=null&&small.innerHTML!==fresh)small.innerHTML=fresh;
 }
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest("[data-coach-card-open]")){e.preventDefault();open()}});
  decorateHub();
  if(typeof MutationObserver!=="undefined"){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateHub()})}).observe(document.body,{childList:true,subtree:true})}
 }
 root.FooteraCoachCard={data,next,pillFor,open,close,afterMatch,cardHTML:cardHTMLFor,KEY,LEGEND};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
