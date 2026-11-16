// V21.447 Vereinsmuseum: a 3D museum of the user's own club, opened from the Verein hub. Every won cup stands in the
// glass cabinet with its plaque, the newest title turns on the pedestal, record boards (top scorer, most matches,
// biggest win, player of the match) and the club record, win milestones as medals. Data comes from the save
// (tournament titles, Halloween cup, match history, card statistics) and is only read, never written.
(function(root){
 "use strict";
 const MODAL_ID="clubMuseumModal",KIND="club-museum",MODULE="./3d-museum.mjs?v=21447";
 const MILESTONES=[[10,"bronze"],[25,"bronze"],[50,"silver"],[100,"silver"],[250,"gold"],[500,"gold"]];
 const HALLOWEEN={id:"halloween-team1",title:"Halloween-Cup",sub:"Blutmond 2026",at:Date.parse("2026-11-06T19:00:00+01:00")};
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=n=>Math.round(num(n)).toLocaleString("de-DE");
 function weekLabel(key){const m=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`Woche ab ${m[3]}.${m[2]}.${m[1]}`:String(key||"")}
 function cups(){try{return Array.isArray(root.FooteraTournaments?.CUPS)?root.FooteraTournaments.CUPS:[]}catch(e){return[]}}
 // All titles, newest first: one trophy per won tournament (week), the Halloween cup as a special one.
 function trophies(s,cupList=cups()){
  const out=[];
  for(const c of cupList){
   const weeks=s?.tournaments?.[c.id];if(!weeks||typeof weeks!=="object")continue;
   for(const [key,p] of Object.entries(weeks)){
    const n=Math.max(0,Math.floor(num(p?.titles)));if(!n)continue;
    const at=Date.parse(key+"T12:00:00Z")||0;
    for(let i=0;i<n;i++)out.push({id:c.id,tone:c.tone==="open"?"gold":c.tone,title:c.name,sub:weekLabel(key)+(n>1?` · ${i+1}. Titel`:""),at:at+i});
   }
  }
  const hw=s?.eventChallenges?.[HALLOWEEN.id]?.wins;
  if(Array.isArray(hw)&&hw.length>=3)out.push({id:"halloween",tone:"gold",title:HALLOWEEN.title,sub:HALLOWEEN.sub,at:HALLOWEEN.at});
  return out.sort((a,b)=>b.at-a.at);
 }
 function nameOf(item){try{const b=typeof displayBase==="function"?displayBase(item):null;return String(b?.name||"")}catch(e){return""}}
 // Records over the club's cards (the same player on several cards counts together).
 function records(s){
  const by=new Map();
  for(const item of Array.isArray(s?.club)?s.club:[]){
   const o=item?.clubStats?.overall;if(!o)continue;const name=nameOf(item);if(!name)continue;
   const r=by.get(name)||{name,goals:0,matches:0,motm:0,assists:0};
   r.goals+=num(o.goals);r.matches+=num(o.matches);r.motm+=num(o.motm);r.assists+=num(o.assists);by.set(name,r);
  }
  const top=k=>{let best=null;for(const r of by.values())if(r[k]>0&&(!best||r[k]>best[k]))best=r;return best};
  return{scorer:top("goals"),apps:top("matches"),motm:top("motm"),assists:top("assists")};
 }
 function balance(s){
  const h=Array.isArray(s?.clubMatchHistory)?s.clubMatchHistory:[];
  const b={matches:h.length,wins:0,draws:0,losses:0,gf:0,ga:0,best:null};
  for(const r of h){
   if(r.result==="win")b.wins++;else if(r.result==="draw")b.draws++;else if(r.result==="loss")b.losses++;
   b.gf+=num(r.gf);b.ga+=num(r.ga);
   if(r.result==="win"){const d=num(r.gf)-num(r.ga),bd=b.best?num(b.best.gf)-num(b.best.ga):-1;if(d>bd||(d===bd&&num(r.gf)>num(b.best.gf)))b.best=r}
  }
  return b;
 }
 function data(s=(typeof state!=="undefined"?state:{})){
  const t=trophies(s),r=records(s),b=balance(s);
  let club="Mein Verein",kit=null,crest="";
  try{if(typeof matchHomeTeamName==="function")club=String(matchHomeTeamName()||club);else if(s?.profile?.clubName)club=String(s.profile.clubName)}catch(e){}
  try{const id=typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot():null;const k=id?.kits?.home;if(k)kit={shirt:k.shirtPrimary,shirtSecondary:k.shirtSecondary};if(id&&typeof crestHTML==="function")crest=String(crestHTML(id,true)||"")}catch(e){}
  const dash="–";
  return{club,kit,crestHTML:crest,trophies:t,hero:t[0]||null,records:r,balance:b,
   boards:[
    {title:"REKORDE",rows:[
     {label:"Rekordtorschütze",value:r.scorer?`${r.scorer.name} · ${fmt(r.scorer.goals)}`:dash},
     {label:"Rekordspieler",value:r.apps?`${r.apps.name} · ${fmt(r.apps.matches)} Spiele`:dash},
     {label:"Höchster Sieg",value:b.best?`${num(b.best.gf)}:${num(b.best.ga)} gegen ${b.best.opponent||"Gegner"}`:dash},
     {label:"Spieler des Spiels",value:r.motm?`${r.motm.name} · ${fmt(r.motm.motm)}×`:dash}]},
    {title:"BILANZ",rows:[
     {label:"Spiele",value:fmt(b.matches)},
     {label:"Siege · Remis · Niederlagen",value:`${fmt(b.wins)} · ${fmt(b.draws)} · ${fmt(b.losses)}`},
     {label:"Tore",value:`${fmt(b.gf)} : ${fmt(b.ga)}`},
     {label:"Titel",value:fmt(t.length)}]}
   ],
   medals:MILESTONES.map(([wins,tone])=>({wins,tone,reached:b.wins>=wins}))};
 }

 /* ---------- UI ---------- */
 let scene=null,opening=0;
 function ensureModal(){
  if(document.getElementById(MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal mu-modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><div><h3>Vereinsmuseum</h3><div class="mu-sub">Pokale, Rekorde und Meilensteine deines Vereins</div></div><button type="button" class="secondary" data-museum-close>Schließen</button></div><div class="mu-stage"><canvas id="clubMuseumCanvas" aria-label="Vereinsmuseum in 3D"></canvas><div class="mu-loading" id="clubMuseumLoading"><span aria-hidden="true">🏛️</span><small>Die Vitrinen werden aufgeschlossen …</small></div><span class="mu-hint">↔ Ziehen zum Umsehen</span></div><div class="mu-actions"><button type="button" class="primary" data-museum-share>Foto teilen</button></div><div id="clubMuseumBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-museum-close]")){close();return}
   if(e.target.closest("[data-museum-share]"))share();
  });
 }
 function listHTML(d){
  const t=d.trophies,b=d.balance;
  const cupsHTML=t.length?`<ol class="mu-cups">${t.map(x=>`<li class="mu-${esc(x.tone)}"><b aria-hidden="true">🏆</b><span>${esc(x.title)}<small>${esc(x.sub)}</small></span></li>`).join("")}</ol>`
   :`<p class="mu-empty">Noch kein Pokal in der Vitrine. Gewinne ein Turnier unter Spielen → Turniere, dann steht er hier.</p>`;
  const next=d.medals.find(m=>!m.reached);
  return`<section class="mu-section"><h4>Pokale <span>${t.length}</span></h4>${cupsHTML}</section>
<section class="mu-section"><h4>Rekorde</h4><dl class="mu-records">${d.boards[0].rows.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join("")}</dl></section>
<section class="mu-section"><h4>Bilanz</h4><dl class="mu-records">${d.boards[1].rows.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join("")}</dl></section>
<section class="mu-section"><h4>Meilensteine</h4><div class="mu-medals">${d.medals.map(m=>`<span class="mu-medal ${m.reached?"on "+m.tone:""}">${m.wins}<small>Siege</small></span>`).join("")}</div><p class="mu-note">${next?`Noch ${fmt(next.wins-b.wins)} Siege bis zur ${next.wins}er-Medaille.`:"Alle Medaillen gesammelt. Legende!"}</p></section>`;
 }
 async function open(){
  ensureModal();
  const d=data(),ticket=++opening;
  document.getElementById("clubMuseumBody").innerHTML=listHTML(d);
  document.getElementById("clubMuseumLoading").hidden=false;
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else document.getElementById(MODAL_ID).classList.add("active");
  try{
   const mod=await import(MODULE);
   const crestImg=d.crestHTML?await mod.loadMuseumCrest(d.crestHTML):null;
   if(ticket!==opening||!isOpen())return;
   disposeScene();
   scene=mod.createMuseum(document.getElementById("clubMuseumCanvas"),{...d,crestImg});
   scene.start();
   document.getElementById("clubMuseumLoading").hidden=true;
  }catch(e){
   console.warn("Vereinsmuseum:",e);
   const l=document.getElementById("clubMuseumLoading");if(l)l.innerHTML='<span aria-hidden="true">🏛️</span><small>Das 3D-Museum konnte auf diesem Gerät nicht geladen werden. Deine Pokale und Rekorde stehen unten.</small>';
  }
  watchClose();
  return true;
 }
 function isOpen(){const el=document.getElementById(MODAL_ID);return!!el&&el.classList.contains("active")}
 // Stop the 3D loop as soon as the modal is closed in any way (button, back gesture, Escape).
 let watcher=null;
 function watchClose(){
  if(watcher||typeof MutationObserver==="undefined")return;
  const el=document.getElementById(MODAL_ID);
  watcher=new MutationObserver(()=>{if(!el.classList.contains("active")){disposeScene()}});
  watcher.observe(el,{attributes:true,attributeFilter:["class"]});
 }
 function disposeScene(){if(scene){try{scene.dispose()}catch(e){}scene=null}}
 function close(){opening++;try{if(typeof closeUiLayer==="function")closeUiLayer(MODAL_ID,KIND);else document.getElementById(MODAL_ID)?.classList.remove("active")}catch(e){}disposeScene()}
 async function share(){
  if(!scene)return;
  try{const url=scene.snapshot(),blob=await (await fetch(url)).blob(),file=new File([blob],"footera-vereinsmuseum.jpg",{type:"image/jpeg"});
   if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"Footera Vereinsmuseum",text:"🏆 Mein Vereinsmuseum in #Footera"});
   else{const a=document.createElement("a");a.href=url;a.download="footera-vereinsmuseum.jpg";a.click()}}catch(e){}
 }
 /* ---------- entry in the Verein hub ---------- */
 function hubCardHTML(){
  const n=(()=>{try{return trophies(typeof state!=="undefined"?state:{}).length}catch(e){return 0}})();
  return`<button type="button" class="club-hub-card club-hub-museum" data-museum-open><span class="club-hub-kicker">NEU · 3D</span><strong>Vereinsmuseum</strong><small data-museum-count>${n?`${n} ${n===1?"Pokal":"Pokale"} · Rekorde · Meilensteine`:"Pokale · Rekorde · Meilensteine"}</small><i>›</i></button>`;
 }
 function decorateHub(){
  const hub=document.getElementById("clubStatsHub");if(!hub)return;
  const card=hub.querySelector("[data-museum-open]");
  if(!card){const grid=hub.querySelector(".club-hub-grid");if(grid)grid.insertAdjacentHTML("beforebegin",hubCardHTML());else hub.insertAdjacentHTML("beforeend",hubCardHTML());return}
  const small=card.querySelector("[data-museum-count]"),fresh=/(\d+) Pokal/.exec(hubCardHTML());
  if(small&&fresh&&!small.textContent.startsWith(fresh[1]+" "))small.outerHTML=hubCardHTML().match(/<small[\s\S]*?<\/small>/)[0];
 }
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest("[data-museum-open]")){e.preventDefault();open()}});
  decorateHub();
  if(typeof MutationObserver!=="undefined"){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateHub()})}).observe(document.body,{childList:true,subtree:true})}
 }
 root.FooteraMuseum={open,close,data,trophies,records,balance,weekLabel,MILESTONES,MODULE};
 if(typeof document!=="undefined"&&document.addEventListener){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(window);
