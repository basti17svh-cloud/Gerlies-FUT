// V21.406 Comeback-Geschenk (Basti 2026-11-13): whoever was away for 7 days or longer gets a Premium Gold Pack
// + 2.000 Coins on the next start, at most once every 30 days. Both timestamps live in the save
// (state.comeback {seenAt, giftAt}) so a reload or a second device never pays twice.
// The check waits until the start has settled (cloud save loaded, no dialog open), so an old local save
// that is about to be replaced by a newer cloud save does not count as "away".
(function(root){
 "use strict";
 const DAY=864e5,AWAY_DAYS=7,COOLDOWN_DAYS=30,SETTLE_MS=25000,MODAL_ID="comebackModal",KIND="comeback";
 const REWARD={pack:"gold",qty:1,coins:2000,label:"Premium Gold Pack + 2.000 Coins"};
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const num=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):0;
 function data(s=typeof state!=="undefined"?state:null){const raw=s&&s.comeback&&typeof s.comeback==="object"?s.comeback:{};return{seenAt:num(raw.seenAt),giftAt:num(raw.giftAt)}}
 // {eligible, days away}
 function check(now=Date.now(),s){
  const d=data(s);
  if(!d.seenAt||d.seenAt>now)return{eligible:false,days:0};
  const days=Math.floor((now-d.seenAt)/DAY);
  const cooled=!d.giftAt||d.giftAt>now||now-d.giftAt>=COOLDOWN_DAYS*DAY;
  return{eligible:days>=AWAY_DAYS&&cooled,days};
 }
 function ready(){
  if(typeof state==="undefined"||!state.onboarded||(state.tutorial&&!state.tutorial.done))return false;
  if(typeof document!=="undefined"&&document.querySelector(".modal.active"))return false;
  return true;
 }
 function touch(now=Date.now()){
  if(typeof state==="undefined"||!state.onboarded)return;
  const d=data();state.comeback={seenAt:Math.max(d.seenAt>now?0:d.seenAt,now),giftAt:d.giftAt};
 }
 function claim(now=Date.now()){
  if(typeof state==="undefined")return null;
  const c=check(now);if(!c.eligible)return null;
  if(typeof grant==="function")grant({pack:REWARD.pack,qty:REWARD.qty,coins:REWARD.coins});
  state.comeback={seenAt:now,giftAt:now};
  if(typeof save==="function")save();if(typeof flushSave==="function")flushSave();
  return{days:c.days,reward:REWARD};
 }
 function showModal(res){
  if(typeof document==="undefined")return;
  let el=document.getElementById(MODAL_ID);
  if(!el){
   el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
   el.addEventListener("click",e=>{if(e.target.closest("[data-comeback-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");if(typeof renderAll==="function")renderAll()}});
   document.body.appendChild(el);
  }
  el.innerHTML=`<div class="modalinner cb-modal"><div class="cb-gift" aria-hidden="true">🎁</div><h3>Willkommen zurück!</h3><p>Du warst ${res.days} Tage weg. Als Dankeschön, dass du wieder da bist:</p><p class="cb-reward"><strong>${escText(res.reward.label)}</strong></p><p class="cb-hint">Das Pack liegt unter Store › Meine Packs.</p><button type="button" class="primary" data-comeback-close>Danke!</button></div>`;
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else el.classList.add("active");
 }
 let bootAt=Date.now(),done=false;
 function tick(){
  if(done||!ready())return;
  if(Date.now()-bootAt<SETTLE_MS)return;
  done=true;
  const res=claim();
  if(res)showModal(res);else{touch();if(typeof save==="function")save()}
 }
 function start(){
  bootAt=Date.now();
  setInterval(()=>{if(document.visibilityState!=="visible")return;if(!done)tick();else touch()},5000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&done){touch();if(typeof save==="function")save()}});
 }
 root.FooteraComeback={REWARD,AWAY_DAYS,COOLDOWN_DAYS,check,claim,touch};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
