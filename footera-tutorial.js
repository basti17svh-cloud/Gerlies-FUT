"use strict";
/* Footera Einsteiger-Tutorial (V21.328)
   Führt neue Clubs nach dem Starterset durch die ersten Minuten:
   Mannschaft, erstes Squad-Battles-Spiel, Willkommens-Pack, Transfermarkt, Ziele, SBC.
   Der Coach blockiert nichts: Er zeigt eine Sprechblase und markiert den nächsten Knopf.
   Fortschritt liegt im Spielstand (state.tutorial) und wandert mit dem Cloud-Save mit.
   Nur Clubs, die das Starterset ab dieser Version öffnen, bekommen das Tutorial. */
(function(){
 const VERSION=1;
 const PACK_ID="welcome";
 const FINISH_COINS=2500;
 const BLOCKERS=["#bootIntro","#dbGate","#onboard.active","#opening.active","#match.active","#footeraAccountDialog","#usernameRequiredModal.active","#footeraAnalyticsConsent","#footeraInstallHint"];
 const STEPS=[
  {id:"welcome",title:"Willkommen bei Footera",
   text:()=>`Dein Club <b>${esc(clubName())}</b> ist gegründet. In ein paar Minuten zeige ich dir, wie alles funktioniert. Am Ende warten ein <b>Willkommens-Pack</b> und <b>${fmtNum(FINISH_COINS)} Coins</b>.`,
   button:"Los geht's"},
  {id:"squad",view:"squadView",title:"Deine Mannschaft",
   go:"Tippe unten auf <b>Mannschaft</b>.",
   text:()=>"Das ist deine Startelf. Die große Zahl auf jeder Karte ist die <b>Gesamtstärke</b>. Die Rauten unten an der Karte zeigen die <b>Chemie</b>: Spieler aus gleicher Liga, gleichem Verein oder gleicher Nation spielen besser zusammen. Tippe eine Karte an, um Spieler zu tauschen.",
   button:"Verstanden"},
  {id:"match",title:"Dein erstes Spiel",
   text:()=>matchText(),
   targets:()=>["#squadBattleKickoff","#sbContinueLineup:not([disabled])","#squadBattleModal [data-sb-select]:not(.played)",'.startmode[data-mode="squad"]','[data-play-mode="squad"]','.nav [data-view="playView"]']},
  {id:"pack",title:"Dein Willkommens-Pack",
   text:()=>packText(),
   targets:()=>["#resultAllClub",`[data-owned="${PACK_ID}"]`,"#storeMyPacks",'.nav [data-view="storeView"]']},
  {id:"market",view:"marketView",title:"Transfermarkt",
   go:"Tippe unten auf <b>Transfers</b>.",
   text:()=>"Hier kaufst und verkaufst du Spieler. Suche gezielt nach Spielern, die zu deiner Chemie passen. Spieler, die du nicht brauchst, kannst du hier für Coins anbieten.",
   button:"Weiter"},
  {id:"objectives",view:"objectivesView",title:"Ziele",
   go:"Öffne <b>Mehr</b> und dann <b>Ziele</b>.",
   text:()=>"Ziele bringen Coins, Packs und Punkte für den Season Pass. Dein erstes Spiel zählt schon mit. Fertige Ziele holst du mit <b>Abholen</b> ab.",
   button:"Weiter"},
  {id:"sbc",view:"sbcView",title:"SBC",
   go:"Öffne <b>Mehr</b> und dann <b>SBC</b>.",
   text:()=>"In SBCs tauschst du Spieler, die du nicht brauchst, gegen Packs und besondere Karten. Der <b>Assistent</b> füllt eine Aufgabe mit deinen günstigsten Karten, deine besten Spieler bleiben dabei geschont.",
   button:"Weiter"},
  {id:"done",title:"Geschafft!",
   text:()=>`Du kennst jetzt die Grundlagen. Spiele Squad Battles und Rivals, hol dir deine Ziele ab und bau dir deine Ära. Hier ist dein Abschlussbonus.`,
   button:`${fmtNum(FINISH_COINS)} Coins abholen`}
 ];
 const STEP_IDS=STEPS.map(s=>s.id);
 let root=null,ring=null,timer=0,confirmSkip=false,lastTarget=null,lastKey="",offscreenTicks=0,scrolledFor=null;

 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
 function fmtNum(n){return Number(n||0).toLocaleString("de-DE")}
 function app(){try{return state}catch(e){return null}}
 function clubName(){return app()?.profile?.clubName||"Footera Club"}
 function tut(){const s=app();return s&&s.tutorial&&typeof s.tutorial==="object"?s.tutorial:null}
 function active(){const t=tut();return !!(t&&!t.done&&STEP_IDS.includes(t.step))}
 function step(){const t=tut();return STEPS.find(s=>s.id===t?.step)||null}
 function persist(){try{save()}catch(e){}}
 function currentView(){try{return currentViewId()}catch(e){return document.querySelector(".view.active")?.id||""}}

 function visible(el){
  if(!el||!el.isConnected||el.hidden)return false;
  const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;
  for(let n=el;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0)return false;if(n.hidden)return false}
  return true;
 }
 function blocked(){return BLOCKERS.some(sel=>{const el=document.querySelector(sel);return el&&visible(el)})}
 function resultsOpen(){const el=document.getElementById("results");return !!(el&&el.classList.contains("active"))}
 function ownedWelcome(){return Number(app()?.packs?.[PACK_ID]||0)}

 function matchText(){
  const view=currentView(),modal=document.getElementById("squadBattleModal");
  if(modal&&modal.classList.contains("active")){
   if(document.getElementById("squadBattleKickoff"))return "Das ist deine Spielvorschau mit Aufstellung und Gegner. Tippe auf <b>Anpfiff</b>. Während des Spiels siehst du die wichtigsten Szenen in 3D.";
   const cont=document.getElementById("sbContinueLineup");
   if(cont&&!cont.disabled)return "Gute Wahl! Tippe jetzt auf <b>Zur Aufstellung</b>.";
   return "Such dir einen Gegner aus. Für dein erstes Spiel ist ein schwacher Gegner ideal.";
  }
  if(view==="playView")return "Hier findest du alle Spielmodi. Starte mit <b>Squad Battles</b>: Dort spielst du gegen die KI und sammelst Coins und Wochenpunkte.";
  return "Zeit für dein erstes Spiel! Tippe unten auf <b>Spielen</b>.";
 }
 function packText(){
  if(resultsOpen())return "Stark! Füge die neuen Spieler mit <b>Zum Verein hinzufügen</b> deinem Club hinzu. Danach geht es weiter.";
  if(ownedWelcome()>0){
   return currentView()==="storeView"?"Dein Willkommens-Pack liegt unter <b>Meine Packs</b>. Tippe auf <b>Öffnen</b>.":"Stark gespielt! Als Geschenk liegt ein <b>Willkommens-Pack</b> im Store: 5 Goldspieler, mindestens einer mit 81+. Tippe unten auf <b>Store</b>.";
  }
  return "Einen Moment …";
 }

 function grantPack(){
  const s=app(),t=tut();if(!s||!t||t.packGranted)return false;
  t.packGranted=true;
  s.packs=s.packs||{};s.packs[PACK_ID]=(Number(s.packs[PACK_ID])||0)+1;
  if(!Array.isArray(s.rewardPackQueue))s.rewardPackQueue=[];
  s.rewardPackQueue.push({id:PACK_ID,tradeable:false});
  return true;
 }
 function setStep(id){
  const t=tut();if(!t)return;
  t.step=id;confirmSkip=false;
  if(id==="match")t.matchBase=Number(app()?.stats?.matches||0);
  if(id==="pack"&&grantPack()){try{renderAll()}catch(e){}}
  persist();render(true);
 }
 function next(){const t=tut();if(!t)return;const i=STEP_IDS.indexOf(t.step);if(i>=0&&i<STEP_IDS.length-1)setStep(STEP_IDS[i+1])}
 function finish(){
  const s=app(),t=tut();if(!s||!t||t.done)return;
  if(!t.coinsGranted){t.coinsGranted=true;s.coins=(Number(s.coins)||0)+FINISH_COINS}
  t.done=true;t.finishedAt=Date.now();t.step="done";
  persist();try{renderAll()}catch(e){}
  hide();
  try{toast(`Tutorial geschafft · +${fmtNum(FINISH_COINS)} Coins`)}catch(e){}
 }
 function skip(){
  const t=tut();if(!t)return;
  const gotPack=grantPack();
  t.done=true;t.skipped=true;t.finishedAt=Date.now();
  persist();try{renderAll()}catch(e){}
  hide();
  if(gotPack)try{toast("Dein Willkommens-Pack liegt im Store unter Meine Packs.")}catch(e){}
 }

 function autoAdvance(){
  const t=tut(),s=app();if(!t||!s)return;
  if(t.step==="match"&&Number(s.stats?.matches||0)>Number(t.matchBase||0)&&!blocked()){
   const post=document.getElementById("postMatchProgress");
   if(post&&visible(post))return;
   setStep("pack");
  }else if(t.step==="pack"&&t.packGranted&&ownedWelcome()===0&&!resultsOpen()&&!blocked()){
   const pending=Array.isArray(s.pendingPack)?s.pendingPack.length:0;
   if(!pending)setStep("market");
  }
 }

 function targetsFor(st){
  if(st.targets)return st.targets();
  if(!st.view||currentView()===st.view)return [];
  const secondary=["evolutionView","objectivesView","seasonPassView","sbcView","clubView","socialView","extrasView"];
  if(secondary.includes(st.view))return [`.more-item[data-go="${st.view}"]`,'.nav [data-view="moreView"]'];
  return [`.nav [data-view="${st.view}"]`];
 }
 function findTarget(st){for(const sel of targetsFor(st)){for(const el of document.querySelectorAll(sel)){if(visible(el))return el}}return null}

 function ensureDom(){
  if(root)return;
  root=document.createElement("aside");root.id="footeraTutorial";root.className="ft-coach";root.hidden=true;
  root.setAttribute("role","dialog");root.setAttribute("aria-live","polite");root.setAttribute("aria-label","Footera Tutorial");
  ring=document.createElement("div");ring.className="ft-ring";ring.hidden=true;ring.setAttribute("aria-hidden","true");
  document.body.append(ring,root);
  root.addEventListener("click",e=>{
   const b=e.target.closest("[data-ft]");if(!b)return;
   const a=b.dataset.ft;
   if(a==="next"){const st=step();if(st?.id==="done")finish();else next()}
   else if(a==="skip"){if(confirmSkip)skip();else{confirmSkip=true;render(true)}}
   else if(a==="keep"){confirmSkip=false;render(true)}
  });
 }
 function hide(){if(root)root.hidden=true;if(ring)ring.hidden=true;lastTarget=null}

 function render(force){
  if(!active()){hide();return}
  ensureDom();
  autoAdvance();if(!active()){hide();return}
  const st=step();if(!st){hide();return}
  if(blocked()){hide();return}
  const idx=STEP_IDS.indexOf(st.id),here=!st.view||currentView()===st.view;
  const body=here?st.text():(st.go||st.text());
  const showButton=!!st.button&&here;
  const key=[st.id,body,showButton,confirmSkip].join("|");
  if(force||key!==lastKey||root.hidden){
   lastKey=key;
   const dots=STEPS.map((s,i)=>`<i class="${i<idx?"done":i===idx?"on":""}"></i>`).join("");
   root.innerHTML=confirmSkip
    ?`<div class="ft-head"><span class="ft-kicker">TUTORIAL</span></div><strong class="ft-title">Tutorial überspringen?</strong><p class="ft-text">Dein Willkommens-Pack bekommst du trotzdem. Den Abschlussbonus von ${fmtNum(FINISH_COINS)} Coins gibt es nur, wenn du das Tutorial beendest.</p><div class="ft-actions"><button type="button" class="secondary" data-ft="skip">Überspringen</button><button type="button" class="primary" data-ft="keep">Weiter lernen</button></div>`
    :`<div class="ft-head"><span class="ft-kicker">TUTORIAL · ${idx+1}/${STEPS.length}</span><span class="ft-dots">${dots}</span>${st.id==="done"?"":'<button type="button" class="ft-skip" data-ft="skip">Überspringen</button>'}</div><strong class="ft-title">${esc(st.title)}</strong><p class="ft-text">${body}</p>${showButton?`<div class="ft-actions"><button type="button" class="primary" data-ft="next">${esc(st.button)}</button></div>`:""}`;
  }
  root.hidden=false;
  const target=confirmSkip?null:findTarget(st);
  placeRing(target);
  placeCoach(target);
 }
 function placeRing(el){
  if(!el){ring.hidden=true;lastTarget=null;return}
  if(el!==lastTarget){lastTarget=el;offscreenTicks=0;scrolledFor=null}
  {
   // Erst nach zwei Takten scrollen: Ein Ansichtswechsel scrollt selbst nach oben und darf nicht unterbrochen werden.
   const r=el.getBoundingClientRect(),inNav=!!el.closest(".nav"),off=!inNav&&(r.top<70||r.bottom>window.innerHeight-90);
   offscreenTicks=off?offscreenTicks+1:0;
   if(off&&offscreenTicks>=2&&scrolledFor!==el){scrolledFor=el;try{el.scrollIntoView({block:"center",behavior:"smooth"})}catch(e){}}
  }
  positionRing(el);
 }
 function positionRing(el){
  const r=el.getBoundingClientRect(),pad=4;
  ring.style.left=(r.left-pad)+"px";ring.style.top=(r.top-pad)+"px";ring.style.width=(r.width+pad*2)+"px";ring.style.height=(r.height+pad*2)+"px";
  ring.hidden=false;
 }
 function placeCoach(el){
  const nav=document.querySelector(".nav"),navH=nav&&visible(nav)?nav.getBoundingClientRect().height:0;
  let top=false;
  if(el){const r=el.getBoundingClientRect();top=r.top+r.height/2>window.innerHeight*0.5}
  root.classList.toggle("ft-top",top);
  root.style.setProperty("--ft-nav",navH+"px");
 }

 function tick(){if(active())render(false);else hide()}
 function startLoop(){if(timer)return;timer=setInterval(tick,400);addEventListener("resize",()=>render(false));addEventListener("scroll",()=>{if(active()&&lastTarget&&ring&&!ring.hidden)positionRing(lastTarget)},{passive:true})}

 function begin(){
  const s=app();if(!s)return;
  if(s.tutorial&&typeof s.tutorial==="object")return;
  s.tutorial={v:VERSION,step:"welcome",startedAt:Date.now(),packGranted:false,done:false};
  persist();
  startLoop();
  setTimeout(()=>render(true),600);
 }

 window.FooteraTutorial=Object.freeze({begin,active,steps:STEP_IDS.slice(),packId:PACK_ID,finishCoins:FINISH_COINS,
  _render:render,_next:next,_skip:skip,_finish:finish});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startLoop,{once:true});else startLoop();
})();
