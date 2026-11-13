// V21.378 Login-Serie: every Berlin calendar day one reward, day 7 a bigger one, then the series starts again.
// Missing a day restarts at day 1. Progress lives in the save (state.dailyLogin) so a reload never pays twice.
(function(root){
 "use strict";
 const MODAL_ID="dailyLoginModal",KIND="daily-login";
 const REWARDS=[
  {coins:1000,label:"1.000 Coins"},
  {pack:"silver",qty:1,label:"Silber-Pack"},
  {coins:2000,label:"2.000 Coins"},
  {pack:"gold",qty:1,label:"Premium Gold Pack"},
  {coins:3000,label:"3.000 Coins"},
  {pack:"mixed6",qty:1,label:"Gemischtes Spieler-Set"},
  {pack:"82",qty:1,coins:5000,label:"82+ Players Pack + 5.000 Coins",big:true}
 ];
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const pad=n=>String(n).padStart(2,"0");
 function dayKey(at=new Date()){
  let y,m,d;
  if(typeof berlinParts==="function"){const p=berlinParts(at);y=p.year;m=p.month;d=p.day}
  else{const t=new Date(at);y=t.getFullYear();m=t.getMonth()+1;d=t.getDate()}
  return`${y}-${pad(m)}-${pad(d)}`;
 }
 function shiftKey(key,days){const [y,m,d]=key.split("-").map(Number),t=new Date(Date.UTC(y,m-1,d+days));return`${t.getUTCFullYear()}-${pad(t.getUTCMonth()+1)}-${pad(t.getUTCDate())}`}
 function data(s=typeof state!=="undefined"?state:null){
  const raw=s&&s.dailyLogin&&typeof s.dailyLogin==="object"?s.dailyLogin:{};
  const day=Number.isInteger(raw.day)&&raw.day>=1&&raw.day<=7?raw.day:0,lastKey=typeof raw.lastKey==="string"?raw.lastKey:"",total=Math.max(0,Number(raw.total)||0);
  return{day,lastKey,total};
 }
 // {claimedToday, step (1..7) that today's claim gives or gave}
 function status(at=new Date(),s){
  const d=data(s),today=dayKey(at);
  if(d.lastKey===today)return{claimedToday:true,step:d.day,today,data:d};
  // A save from the future (clock changed) must not block forever: anything not yesterday restarts.
  const step=d.lastKey===shiftKey(today,-1)?(d.day%7)+1:1;
  return{claimedToday:false,step,today,data:d};
 }
 function claim(at=new Date()){
  if(typeof state==="undefined")return null;
  const st=status(at);if(st.claimedToday)return null;
  const reward=REWARDS[st.step-1];
  if(typeof grant==="function")grant(reward);
  state.dailyLogin={day:st.step,lastKey:st.today,total:st.data.total+1};
  if(typeof save==="function")save();if(typeof flushSave==="function")flushSave();
  return{step:st.step,reward};
 }
 function tiles(st){
  return REWARDS.map((r,i)=>{const n=i+1,done=st.claimedToday?n<=st.step:n<st.step,today=!st.claimedToday&&n===st.step;
   return`<div class="dl-day ${done?"done":""} ${today?"today":""} ${r.big?"big":""}"><span>Tag ${n}</span><strong>${escText(r.label)}</strong>${done?'<b aria-label="abgeholt">✓</b>':""}</div>`}).join("");
 }
 function html(st=status()){
  const r=REWARDS[st.step-1];
  const head=st.claimedToday?`<p class="dl-lead">Heute abgeholt: <strong>${escText(r.label)}</strong>. Komm morgen wieder für Tag ${st.step%7+1}!</p>`:`<p class="dl-lead">Tag ${st.step} von 7 · Wer einen Tag auslässt, fängt wieder bei Tag 1 an.</p>`;
  return`${head}<div class="dl-grid">${tiles(st)}</div>${st.claimedToday?"":`<button type="button" class="primary dl-claim" data-dl-claim>Tag ${st.step} abholen · ${escText(r.label)}</button>`}`;
 }
 function $(sel){return document.querySelector(sel)}
 function renderHome(){
  const host=$("#dailyLoginHome");if(!host)return;
  if(typeof state==="undefined"||!state.onboarded||(state.tutorial&&!state.tutorial.done)){host.hidden=true;return}
  const st=status();
  if(st.claimedToday){host.hidden=true;host.innerHTML="";return}
  const r=REWARDS[st.step-1];
  host.hidden=false;
  host.innerHTML=`<button type="button" class="dl-banner ${r.big?"big":""}" data-daily-login-open><span class="dl-gift" aria-hidden="true">🎁</span><span class="dl-banner-copy"><small>LOGIN-SERIE · TAG ${st.step} VON 7</small><strong>${escText(r.label)} abholen</strong></span><span class="dl-arrow" aria-hidden="true">›</span></button>`;
 }
 function render(){const body=$("#dailyLoginBody");if(body)body.innerHTML=html()}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><h3>Login-Serie</h3><button type="button" class="secondary" data-dl-close>Schließen</button></div><div id="dailyLoginBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-dl-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const b=e.target.closest("[data-dl-claim]");
   if(b){b.disabled=true;const res=claim();render();renderHome();if(typeof renderAll==="function")renderAll();
    if(res&&typeof toast==="function")toast(`Tag ${res.step}: ${res.reward.label}${res.reward.pack?" (unter Store › Meine Packs)":""}`)}
  });
 }
 function open(){ensureModal();render();if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active")}
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest?.("[data-daily-login-open]"))open()});
  // A new day can start while the app stays open.
  setInterval(()=>{if(document.visibilityState==="visible")renderHome()},60000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")renderHome()});
 }
 root.FooteraDailyLogin={REWARDS,dayKey,shiftKey,status,claim,html,renderHome,open};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
