// V21.406 Adventskalender (Basti 2026-11-13): 1.–24.12. one door per Berlin calendar day.
// Only today's door opens; a missed door stays closed for good. Progress lives in the save
// (state.advent[year].opened) so a reload, a second tab or a device change never pays twice.
// 24.12.: Weihnachtsspieler Lautaro Martínez 90 in the winter card design + 10.000 Coins.
(function(root){
 "use strict";
 const YEAR=2026,MODAL_ID="adventModal",KIND="advent";
 const XMAS_PLAYER={pid:"231478",name:"Lautaro Martínez",ovr:90,baseOvr:87,position:"ST",alt:"",baseAlt:"",team:"Inter",league:"Serie A Enilive",nation:"Argentina",
  baseStats:[80,88,76,85,51,74],stats:[83,91,79,88,53,78],playstylePlusAdds:["acrobatic"],dynamicFace:"assets/footera/events/advent/dynamic/231478.webp"};
 const XMAS_TASK={id:"advent-2026-lautaro",eventType:"winter-christmas",eventName:"WEIHNACHTEN",releaseId:"advent-2026-lautaro",player:XMAS_PLAYER};
 // Sundays (2.–4. Advent) and Christmas Eve are the big doors.
 const DOORS=[null,
  {coins:1000,label:"1.000 Coins"},
  {pack:"silver",qty:1,label:"Silber-Pack"},
  {coins:1500,label:"1.500 Coins"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {pack:"mixed6",qty:1,label:"Gemischtes Spieler-Set"},
  {pack:"82",qty:1,label:"82+ Players Pack",big:true,note:"2. Advent"},
  {coins:2000,label:"2.000 Coins"},
  {pack:"silver",qty:1,label:"Silber-Pack"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {coins:2500,label:"2.500 Coins"},
  {pack:"mixed6",qty:1,label:"Gemischtes Spieler-Set"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {pack:"reward-84-1",ratingPack:[84,1],qty:1,label:"84+ Spieler-Pack",big:true,note:"3. Advent"},
  {coins:2000,label:"2.000 Coins"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {coins:3000,label:"3.000 Coins"},
  {pack:"mixed6",qty:1,label:"Gemischtes Spieler-Set"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {coins:3000,label:"3.000 Coins"},
  {pack:"85",qty:1,label:"85+ Players Pack",big:true,note:"4. Advent"},
  {pack:"mixed6",qty:1,label:"Gemischtes Spieler-Set"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {coins:5000,label:"5.000 Coins"},
  {xmas:true,coins:10000,label:"Weihnachtsspieler Lautaro Martínez 90 + 10.000 Coins",big:true,note:"Heiligabend"}
 ];
 // Fixed, shuffled door positions like a real calendar (same for everyone).
 const LAYOUT=[7,15,2,21,11,4,18,9,24,13,1,20,6,16,10,23,3,12,19,8,14,22,5,17];
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function berlinDate(at){
  if(typeof berlinParts==="function"){const p=berlinParts(new Date(at));return{y:p.year,m:p.month,d:p.day}}
  const t=new Date(at);return{y:t.getFullYear(),m:t.getMonth()+1,d:t.getDate()};
 }
 // Door number (1..24) for the given moment, 0 outside 1.–24.12.
 function doorOn(at=Date.now()){const b=berlinDate(at);return b.y===YEAR&&b.m===12&&b.d>=1&&b.d<=24?b.d:0}
 function isActive(at=Date.now()){return doorOn(at)>0}
 function data(s=typeof state!=="undefined"?state:null){
  const raw=s&&s.advent&&typeof s.advent==="object"&&s.advent[YEAR]&&typeof s.advent[YEAR]==="object"?s.advent[YEAR]:{};
  const opened=Array.isArray(raw.opened)?[...new Set(raw.opened.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=24))].sort((a,b)=>a-b):[];
  return{opened,xmasGranted:raw.xmasGranted===true};
 }
 function doorState(n,at=Date.now(),s){
  const today=doorOn(at),d=data(s);
  if(d.opened.includes(n))return"open";
  if(!today){const b=berlinDate(at);return b.y>YEAR||(b.y===YEAR&&b.m===12&&b.d>24)?"missed":"locked"}
  return n===today?"today":n<today?"missed":"locked";
 }
 function status(at=Date.now(),s){const today=doorOn(at),d=data(s);return{today,openedToday:!!today&&d.opened.includes(today),opened:d.opened}}
 function xmasItem(){
  if(typeof makeEventObjectiveItem!=="function")return null;
  const item=makeEventObjectiveItem(XMAS_TASK);if(!item)return null;
  item.acquisitionSource="Adventskalender";return item;
 }
 function grantDoor(reward){
  const r={...reward};
  if(r.ratingPack&&typeof ratingRewardPack==="function")r.pack=ratingRewardPack(...r.ratingPack);
  delete r.ratingPack;delete r.xmas;delete r.label;delete r.big;delete r.note;
  if(typeof grant==="function")grant(r);
 }
 function claim(at=Date.now()){
  if(typeof state==="undefined")return null;
  const n=doorOn(at);if(!n)return null;
  const d=data();if(d.opened.includes(n))return null;
  const reward=DOORS[n];
  let item=null;
  if(reward.xmas&&!d.xmasGranted){item=xmasItem();if(!item)return null;state.club=state.club||[];state.club.push(item)}
  grantDoor(reward);
  state.advent=state.advent&&typeof state.advent==="object"?state.advent:{};
  state.advent[YEAR]={opened:[...d.opened,n].sort((a,b)=>a-b),xmasGranted:d.xmasGranted||!!item};
  if(typeof save==="function")save();if(typeof flushSave==="function")flushSave();
  return{door:n,reward,item};
 }
 const dateLabel=n=>`${n}.12.`;
 function doorHTML(n,at){
  const st=doorState(n,at),r=DOORS[n];
  const inner=st==="open"?`<strong>${escText(r.xmas?"Lautaro Martínez 90":r.label)}</strong><b aria-label="geöffnet">✓</b>`:
   st==="today"?`<strong>Heute öffnen</strong>`:st==="missed"?`<strong>verpasst</strong>`:`<strong>${dateLabel(n)}</strong>`;
  const tag=st==="today"?"button":"div";
  return`<${tag} ${tag==="button"?'type="button" data-advent-claim':""} class="adv-door ${st} ${r.big?"big":""} ${n===24?"xmas":""}" aria-label="Türchen ${n}: ${st==="open"?escText(r.label):st==="today"?"heute öffnen":st==="missed"?"verpasst":"ab "+dateLabel(n)}"><span class="adv-num">${n}</span>${inner}</${tag}>`;
 }
 function html(at=Date.now()){
  const st=status(at);
  const lead=!st.today?`<p class="adv-lead">Vom 1. bis 24. Dezember öffnest du jeden Tag ein Türchen. Ein verpasstes Türchen bleibt zu.</p>`:
   st.openedToday?`<p class="adv-lead">Türchen ${st.today} ist offen: <strong>${escText(DOORS[st.today].label)}</strong>. ${st.today<24?"Morgen wartet das nächste.":"Frohe Weihnachten!"}</p>`:
   `<p class="adv-lead">Heute ist Türchen <strong>${st.today}</strong> dran. Ein verpasstes Türchen bleibt zu.</p>`;
  return`${lead}<div class="adv-grid">${LAYOUT.map(n=>doorHTML(n,at)).join("")}</div>`;
 }
 function $(sel){return document.querySelector(sel)}
 function renderHome(at=Date.now()){
  const host=$("#adventHome");if(!host)return;
  if(typeof state==="undefined"||!state.onboarded||(state.tutorial&&!state.tutorial.done)){host.hidden=true;return}
  const st=status(at);
  if(!st.today){host.hidden=true;host.innerHTML="";return}
  const r=DOORS[st.today];
  host.hidden=false;
  host.innerHTML=`<button type="button" class="adv-banner ${st.openedToday?"done":""} ${r.big?"big":""}" data-advent-open><span class="adv-gift" aria-hidden="true">🎄</span><span class="adv-banner-copy"><small>ADVENTSKALENDER · TÜRCHEN ${st.today} VON 24</small><strong>${st.openedToday?"Heute schon geöffnet":r.xmas?"Dein Weihnachtsspieler wartet":"Türchen "+st.today+" öffnen"}</strong></span><span class="adv-arrow" aria-hidden="true">›</span></button>`;
 }
 function render(){const body=$("#adventBody");if(body)body.innerHTML=html()}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner adv-modal"><div class="modalhead"><h3>Adventskalender</h3><button type="button" class="secondary" data-advent-close>Schließen</button></div><div id="adventBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-advent-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const b=e.target.closest("[data-advent-claim]");
   if(b){b.disabled=true;const res=claim();render();renderHome();if(typeof renderAll==="function")renderAll();
    if(!res)return;
    if(res.item&&typeof cardHTML==="function"&&typeof displayBase==="function"){const body=$("#adventBody");if(body)body.insertAdjacentHTML("afterbegin",`<div class="adv-xmas-reveal"><p><strong>Frohe Weihnachten!</strong> Lautaro Martínez ist jetzt in deinem Verein.</p><div class="adv-xmas-card">${cardHTML(displayBase(res.item),res.item)}</div></div>`)}
    if(typeof toast==="function")toast(`Türchen ${res.door}: ${res.reward.label}${res.reward.pack||res.reward.ratingPack?" (unter Store › Meine Packs)":""}`)}
  });
 }
 function open(){ensureModal();render();if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active")}
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest?.("[data-advent-open]"))open()});
  setInterval(()=>{if(document.visibilityState==="visible")renderHome()},60000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")renderHome()});
 }
 root.FooteraAdvent={YEAR,DOORS,LAYOUT,XMAS_PLAYER,XMAS_TASK,doorOn,isActive,doorState,status,claim,html,renderHome,open};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
