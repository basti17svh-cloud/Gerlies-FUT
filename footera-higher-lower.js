// V21.379 Höher oder tiefer: guess whether the next real player has a higher or lower GES.
// Rewards only for a new personal record: 200 Coins per point above the old record (max 5.000 per round)
// and one-time packs at a streak of 10, 20 and 30. The record lives in the save (state.higherLower),
// every record step is saved at once, so a reload or a closed app never pays twice.
(function(root){
 "use strict";
 const MODAL_ID="higherLowerModal",KIND="higher-lower";
 const PER_POINT=200,ROUND_MAX=5000,MIN_OVR=75;
 const MILESTONES=[
  {at:10,pack:"gold",label:"Premium Gold Pack"},
  {at:20,pack:"mixed6",label:"Gemischtes Spieler-Set"},
  {at:30,pack:"82",label:"82+ Players Pack"}
 ];
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=n=>Number(n||0).toLocaleString("de-DE");
 function getState(){return typeof state!=="undefined"?state:null}
 function data(s=getState()){
  const raw=s&&s.higherLower&&typeof s.higherLower==="object"?s.higherLower:{};
  const best=Math.max(0,Math.floor(Number(raw.best)||0)),rounds=Math.max(0,Math.floor(Number(raw.rounds)||0));
  const milestones=Array.isArray(raw.milestones)?[...new Set(raw.milestones.map(Number).filter(n=>MILESTONES.some(m=>m.at===n)))]:[];
  return{best,rounds,milestones};
 }
 function newRound(){return{streak:0,paid:0,coins:0,packs:[],oldBest:data().best,record:false,over:false}}
 // Called after every correct answer (round.streak already counts it). Pays only above the stored record.
 function recordStep(round){
  const s=getState();if(!s||!round)return null;
  const d=data(s);
  if(round.streak<=d.best)return null;
  const coins=Math.max(0,Math.min(PER_POINT*(round.streak-d.best),ROUND_MAX-round.paid));
  const ms=MILESTONES.find(m=>m.at===round.streak&&!d.milestones.includes(m.at))||null;
  s.higherLower={best:round.streak,rounds:d.rounds,milestones:ms?[...d.milestones,ms.at]:d.milestones};
  const reward={};if(coins)reward.coins=coins;if(ms){reward.pack=ms.pack;reward.qty=1}
  if((coins||ms)&&typeof grant==="function")grant(reward);
  round.paid+=coins;round.coins+=coins;round.record=true;if(ms)round.packs.push(ms.label);
  if(typeof save==="function")save();
  return{coins,pack:ms};
 }
 function finishRound(round){
  const s=getState();if(!s||!round||round.over)return;
  round.over=true;const d=data(s);
  s.higherLower={...d,rounds:d.rounds+1};
  if(typeof save==="function")save();if(typeof flushSave==="function")flushSave();
 }
 // Real players, 75+ GES, one name only once. A different GES than the shown card, so there is never a tie.
 function pool(){
  const list=typeof PLAYERS!=="undefined"&&Array.isArray(PLAYERS)?PLAYERS:[];
  const seen=new Set(),out=[];
  for(const p of list){const r=Number(p?.ovr)||0,n=String(p?.name||"");if(r<MIN_OVR||!n||seen.has(n))continue;seen.add(n);out.push(p)}
  return out;
 }
 function pickNext(list,current,rand=Math.random){
  const cand=current?list.filter(p=>Number(p.ovr)!==Number(current.ovr)&&p.name!==current.name):list;
  if(!cand.length)return null;
  return cand[Math.floor(rand()*cand.length)%cand.length];
 }
 function judge(left,right,guess){const a=Number(left.ovr),b=Number(right.ovr);return guess==="higher"?b>a:b<a}

 // ---------- UI ----------
 let round=null,left=null,right=null,busy=false,revealed=null;
 function $(sel){return document.querySelector(sel)}
 function card(p,hide){
  if(typeof cardHTML!=="function")return`<div class="hl-fallback"><b>${hide?"?":escText(p.ovr)}</b><span>${escText(p.name)}</span></div>`;
  let h=cardHTML(p,null,false,p.position);
  if(hide)h=h.replace(/<div class="ovr">[^<]*<\/div>/,'<div class="ovr">?</div>');
  return h;
 }
 function recordHint(){
  const d=data(),next=d.best+1;
  const ms=MILESTONES.map(m=>`<span class="hl-ms ${d.milestones.includes(m.at)?"done":""}">${m.at}er-Serie · ${escText(m.label)}${d.milestones.includes(m.at)?" ✓":""}</span>`).join("");
  return`<p class="hl-rule">Belohnung nur bei neuem Rekord: ab Serie ${next} gibt es ${fmt(PER_POINT)} Coins pro Treffer über deinem Rekord (max. ${fmt(ROUND_MAX)} pro Runde).</p><div class="hl-ms-row">${ms}</div>`;
 }
 function startHTML(){
  const d=data();
  return`<div class="hl-start"><p class="hl-lead">Hat der nächste Spieler eine <b>höhere</b> oder <b>tiefere</b> GES? Jeder Treffer verlängert deine Serie, ein Fehler beendet die Runde.</p><div class="hl-stats"><div><small>DEIN REKORD</small><strong>${d.best}</strong></div><div><small>RUNDEN</small><strong>${d.rounds}</strong></div></div>${recordHint()}<button type="button" class="primary hl-go" data-hl-start>Los geht's</button></div>`;
 }
 function gameHTML(){
  const d=data(),show=revealed;
  const rightCls=show?(show.ok?"ok":"bad"):"";
  const status=round.record?`<span class="hl-new">NEUER REKORD</span>`:`<span>Rekord ${d.best}</span>`;
  return`<div class="hl-bar"><div><small>SERIE</small><strong>${round.streak}</strong></div>${status}</div>
  <div class="hl-cards"><div class="hl-side"><div class="hl-card">${card(left,false)}</div><small>${escText(left.name)} · GES ${escText(left.ovr)}</small></div>
  <div class="hl-side ${rightCls}"><div class="hl-card">${card(right,!show)}</div><small>${escText(right.name)} · GES ${show?escText(right.ovr):"?"}</small></div></div>
  <p class="hl-q">Ist <b>${escText(right.name)}</b> höher oder tiefer als <b>${escText(left.ovr)}</b>?</p>
  <div class="hl-actions"><button type="button" class="primary hl-up" data-hl-guess="higher" ${busy?"disabled":""}>▲ Höher</button><button type="button" class="primary hl-down" data-hl-guess="lower" ${busy?"disabled":""}>▼ Tiefer</button></div>
  ${round.coins||round.packs.length?`<p class="hl-earned">Diese Runde: ${round.coins?`+${fmt(round.coins)} Coins`:""}${round.coins&&round.packs.length?" · ":""}${round.packs.map(escText).join(" · ")}</p>`:""}`;
 }
 function endHTML(){
  const d=data();
  const reward=round.record?`<div class="hl-reward"><small>NEUER REKORD: ${round.streak}</small><strong>${round.coins?`+${fmt(round.coins)} Coins`:"Rekord gesichert"}</strong>${round.packs.length?`<span>${round.packs.map(escText).join(" · ")} (unter Store › Meine Packs)</span>`:""}</div>`:`<div class="hl-reward none"><small>KEIN NEUER REKORD</small><strong>Serie ${round.streak}</strong><span>Dein Rekord bleibt ${d.best}. Belohnungen gibt es nur über deinem Rekord.</span></div>`;
  return`<div class="hl-end"><p class="hl-lead">${escText(right.name)} hat GES <b>${escText(right.ovr)}</b>, ${escText(left.name)} hat <b>${escText(left.ovr)}</b>.</p>${reward}${recordHint()}<button type="button" class="primary hl-go" data-hl-start>Nochmal spielen</button></div>`;
 }
 function render(){
  const body=$("#higherLowerBody");if(!body)return;
  body.innerHTML=!round?startHTML():round.over?endHTML():gameHTML();
 }
 function start(){
  const list=pool();
  if(list.length<2){const body=$("#higherLowerBody");if(body)body.innerHTML=`<p class="hl-lead">Die Spielerdatenbank lädt noch. Versuch es gleich nochmal.</p>`;return}
  round=newRound();revealed=null;busy=false;left=pickNext(list,null);right=pickNext(list,left);render();
 }
 function guess(dir){
  if(!round||round.over||busy)return;
  busy=true;const ok=judge(left,right,dir);revealed={ok};
  if(ok){round.streak++;recordStep(round)}
  render();
  setTimeout(()=>{
   if(!round)return;
   if(ok){const list=pool();left=right;right=pickNext(list,left)||right;revealed=null;busy=false;render();renderTile()}
   else{finishRound(round);busy=false;render();renderTile();if(typeof renderAll==="function")renderAll()}
  },ok?900:1100);
 }
 function close(){
  // Leaving mid-round ends the round; record steps were already saved.
  if(round&&!round.over)finishRound(round);
  round=null;revealed=null;busy=false;renderTile();if(typeof renderAll==="function")renderAll();
 }
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><h3>Höher oder tiefer</h3><button type="button" class="secondary" data-hl-close>Schließen</button></div><div id="higherLowerBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-hl-close]")){close();typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   if(e.target.closest("[data-hl-start]")){start();return}
   const g=e.target.closest("[data-hl-guess]");if(g)guess(g.dataset.hlGuess);
  });
  // Escape/backdrop close the modal through the shared layer code; end the round when it disappears.
  new MutationObserver(()=>{if(!el.classList.contains("active")&&round)close()}).observe(el,{attributes:true,attributeFilter:["class"]});
 }
 function open(){ensureModal();round=null;render();if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active")}
 function renderTile(){const el=$("#playHigherLowerSummary");if(!el)return;const d=data();el.textContent=d.best?`Dein Rekord: ${d.best}`:"Noch kein Rekord"}
 function boot(){
  document.addEventListener("click",e=>{
   if(e.target.closest?.("[data-higher-lower-open]")){open();return}
   if(e.target.closest?.('[data-view="playView"]'))renderTile();
  });
  renderTile();
 }
 root.FooteraHigherLower={PER_POINT,ROUND_MAX,MILESTONES,data,newRound,recordStep,finishRound,pool,pickNext,judge,open,renderTile};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot()}
})(typeof window!=="undefined"?window:globalThis);
