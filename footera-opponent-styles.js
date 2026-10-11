/* Footera V21.108 – seeded CPU opponent identities, using the existing tactics engine. */
(function(root){
 "use strict";
 const profiles=Object.freeze([
  {id:"possession",label:"Ballbesitz",hint:"Geduldiger Aufbau",tactic:"balanced",tactics:{width:54,depth:55,pressing:43,buildUp:"patient",attackFocus:"inside",dribbling:44,crossing:38,longShots:35}},
  {id:"counter",label:"Konter",hint:"Schnelle Umschaltmomente",tactic:"balanced",tactics:{width:55,depth:39,pressing:39,buildUp:"fast",attackFocus:"inside",dribbling:59,crossing:45,longShots:45}},
  {id:"wing",label:"Flügelspiel",hint:"Breite Angriffe und Flanken",tactic:"balanced",tactics:{width:70,depth:49,pressing:49,buildUp:"balanced",attackFocus:"wide",dribbling:58,crossing:75,longShots:33}},
  {id:"press",label:"Pressing",hint:"Hohe Linie, frühes Anlaufen",tactic:"balanced",tactics:{width:56,depth:72,pressing:78,buildUp:"fast",attackFocus:"balanced",dribbling:52,crossing:51,longShots:48}},
  {id:"block",label:"Kompakte Defensive",hint:"Tief stehen und Räume schließen",tactic:"defensive",tactics:{width:37,depth:30,pressing:32,buildUp:"patient",attackFocus:"balanced",dribbling:45,crossing:44,longShots:39}}
 ]);
 function hash(value){let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
 // Small, asymmetric *real simulation* effects. All chance deltas are additive
 // probability points, never ratings or hidden guaranteed goals.
 const EFFECTS=Object.freeze({
  possession:{attack:{build:.033,duel:-.016,xg:-.008},defend:{build:-.004,duel:0},possession:-.068},
  counter:{attack:{build:-.022,duel:.043,xg:.012},defend:{build:.010,duel:.009},possession:.036},
  wing:{attack:{build:.014,duel:.012,xg:.002},defend:{build:0,duel:0},possession:-.012},
  press:{attack:{build:.018,duel:.008,xg:0},defend:{build:-.028,duel:-.018},possession:-.028},
  block:{attack:{build:-.025,duel:-.026,xg:-.011},defend:{build:-.016,duel:-.026},possession:.046}
 });
 const NEUTRAL=Object.freeze({build:0,duel:0,xg:0});
 function activeId(opponent){
  if(opponent?.kind!=="generated")return"";
  const id=String(opponent.styleProfile?.id||"");
  return Object.hasOwn(EFFECTS,id)?id:"";
 }
 function matchTuning(opponent,attackingSide,minute=0){
  const id=activeId(opponent);
  if(!id)return NEUTRAL;
  const base=EFFECTS[id],attacking=attackingSide==="away";
  const src=attacking?base.attack:base.defend;
  // Intensive press gradually loses its advantage as the match wears on;
  // fitness penalties are handled separately by advanceMatchFitness.
  const late=id==="press"?Math.max(0,Math.min(1,(Number(minute)-62)/28)):0;
  return Object.freeze({
   build:src.build+(attacking?-.006:.020)*late,
   duel:src.duel+(attacking?-.006:.014)*late,
   xg:attacking?src.xg:0
  });
 }
 function possessionBias(opponent){
  const id=activeId(opponent);
  return id?EFFECTS[id].possession:0;
 }
 function styleFor(opponent,index=0){
  if(!opponent||opponent.kind!=="generated")return opponent;
  const old=opponent.styleProfile;
  if(old&&profiles.some(x=>x.id===old.id)){
   const existing=profiles.find(x=>x.id===old.id);
   if(!opponent.customTactics)opponent.customTactics={...existing.tactics};
   if(!["balanced","attacking","defensive"].includes(opponent.tactic))opponent.tactic=existing.tactic;
   return opponent;
  }
  const seed=String(opponent.seed||opponent.battleId||opponent.name||"cpu");
  // Rotation makes all four standard Squad Battles opponents distinct within their set.
  const group=seed.includes("|set-")?seed.split("|").slice(0,2).join("|"):seed;
  const offset=hash(group)%profiles.length,position=Number.isInteger(index)?index:hash(seed)%profiles.length;
  const chosen=profiles[(offset+position)%profiles.length];
  opponent.styleProfile={id:chosen.id,label:chosen.label,hint:chosen.hint};
  opponent.tactic=chosen.tactic;
  opponent.customTactics={...chosen.tactics};
  return opponent;
 }
 function install(){
  if(typeof getSquadBattleOpponents==="function"){
   const raw=getSquadBattleOpponents;
   getSquadBattleOpponents=function(){
    const list=raw.apply(this,arguments);
    if(Array.isArray(list))list.forEach((p,index)=>styleFor(p,index));
    return list;
   };
  }
  if(typeof oneOffOpponent==="function"){
   const raw=oneOffOpponent;
   oneOffOpponent=function(mode){
    const opponent=raw.apply(this,arguments);
    if(mode==="rivals"||mode==="friendly-random")styleFor(opponent,hash(opponent?.seed||"cpu")%5);
    return opponent;
   };
  }
  if(typeof renderSquadBattleSelection==="function"){
   const raw=renderSquadBattleSelection;
   renderSquadBattleSelection=function(){
    const result=raw.apply(this,arguments);
    const list=typeof getSquadBattleOpponents==="function"?getSquadBattleOpponents():[];
    root.document.querySelectorAll(".sb-opponent").forEach((button,i)=>{
     const p=list[i]?.styleProfile;if(!p||button.querySelector(".sb-playstyle"))return;
     const badge=root.document.createElement("span");badge.className="sb-playstyle";badge.textContent=p.label+" · "+p.hint;
     button.querySelector("p")?.insertAdjacentElement("afterend",badge);
    });
    return result;
   };
  }
  if(typeof refreshOpenMatchPreview==="function"){
   const raw=refreshOpenMatchPreview;
   refreshOpenMatchPreview=function(){
    const result=raw.apply(this,arguments),style=typeof pendingMatchContext!=="undefined"?pendingMatchContext?.opponent?.styleProfile:null;
    if(style){
     const title=root.document.querySelector("#squadBattleModalBody .friend-team-title p");
     if(title)title.textContent+=" · Spielstil: "+style.label;
    }
    return result;
   };
  }
  // High pressing visibly costs more stamina. No RNG draw and no mutation of ratings.
  if(typeof advanceMatchFitness==="function"){
   const raw=advanceMatchFitness;
   advanceMatchFitness=function(minutes){
    const result=raw.apply(this,arguments);
    if(typeof match!=="undefined"&&match?.opponentProfile?.styleProfile?.id==="press"){
     const loss=match.fitnessLoss?.away;
     if(loss)for(const key of Object.keys(loss))loss[key]+=Math.max(0,Number(minutes)||0)*.055;
    }
    return result;
   };
  }
 }
 root.FooteraOpponentStyles={profiles,hash,styleFor,activeId,matchTuning,possessionBias};
 install();
})(globalThis);
