/* Footera V21.108 – seeded CPU opponent identities, using the existing tactics engine.
   V21.472 – the CPU coach reacts during the match (score, flanks, fatigue).
   V21.473 – Gegner-Scouting before kick-off (danger man, weak flank, plan). */
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

 // V21.472: the CPU coach thinks during the match. It reads the score, the
 // clock, where the user's dangerous chances come from and how tired its own
 // players are, then changes tactics, secures a flank or substitutes. It never
 // draws random numbers and never touches ratings; only tactics, the bench and
 // a bounded flank effect change. Only generated CPU opponents with a style.
 const PERSONALITY=Object.freeze({
  possession:{chase:60,protect:78},counter:{chase:62,protect:68},wing:{chase:58,protect:72},press:{chase:55,protect:75},block:{chase:68,protect:65}
 });
 const MODES=Object.freeze({
  chase:{tactic:"attacking",d:{depth:12,pressing:10,width:6,longShots:8,crossing:6},buildUp:"fast",label:"Mehr Risiko"},
  allin:{tactic:"attacking",d:{depth:20,pressing:16,width:10,longShots:14,crossing:12},buildUp:"fast",label:"Alles nach vorne"},
  protect:{tactic:"defensive",d:{depth:-14,pressing:-12,width:-8,longShots:-6},buildUp:"patient",label:"Führung verteidigen"},
  hold:{tactic:"",d:{depth:-6,pressing:-6},buildUp:"patient",label:"Führung verwalten"},
  base:{tactic:"",d:{},buildUp:"",label:"Grundstil"}
 });
 // Minute, max substitutions, fitness threshold: spread like a real coach (1-2-1-1).
 const SUB_WINDOWS=[[60,1,78],[68,2,76],[76,1,75],[84,1,80],[96,2,80],[106,1,82]];
 const WIDE_SLOTS=new Set(["LW","RW","LM","RM","LB","RB","LWB","RWB"]);
 const POS_GROUP={GK:"GK",CB:"DEF",LB:"FB",RB:"FB",LWB:"FB",RWB:"FB",CDM:"MID",CM:"MID",CAM:"MID",LM:"WING",RM:"WING",LW:"WING",RW:"WING",ST:"ATT",CF:"ATT"};
 const NEAR={DEF:["FB","MID"],FB:["DEF","WING"],MID:["DEF","WING","ATT"],WING:["FB","ATT","MID"],ATT:["WING","MID"]};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 function fn(name){return typeof root[name]==="function"?root[name]:null}
 function teamName(){const f=fn("matchAwayTeamName");return f?f():"Der Gegner"}
 function flankOf(slot){slot=String(slot||"");return /^L/.test(slot)?"left":/^R/.test(slot)?"right":""}
 // Which flank a user attack runs down. Presentation-neutral metadata.
 function attackFlank(kind,creator,attacker,count=0){
  const wide=kind==="cross"||kind==="cutback";
  const f=wide?(flankOf(creator?.slot)||flankOf(attacker?.slot)):(flankOf(attacker?.slot)&&WIDE_SLOTS.has(attacker?.slot)?flankOf(attacker.slot):"");
  if(f)return f;
  return wide?(count%2?"left":"right"):"";
 }
 function brainActive(match){return !!match&&activeId(match.opponentProfile)!==""&&match.mode!=="friendly-friend"}
 function ensureBrain(match){
  if(match.aiBrain)return match.aiBrain;
  const p=match.opponentProfile;
  // Own copy: the cached Squad Battles/Rivals opponent must stay unchanged.
  match.opponentProfile={...p,squad:Array.isArray(p.squad)?[...p.squad]:p.squad,items:Array.isArray(p.items)?[...p.items]:p.items,customTactics:{...(p.customTactics||{})}};
  return match.aiBrain={mode:"base",changedAt:-99,guard:"",guardAt:-99,subs:0,usedBench:[],windows:[],decisions:[],base:{tactic:p.tactic||"balanced",tactics:{...(p.customTactics||{})}}};
 }
 function say(match,kind,text,tone="analysis"){
  const brain=match.aiBrain,minute=Math.min(120,Math.floor(match.minute));
  brain.decisions.push({minute,kind,text});if(brain.decisions.length>16)brain.decisions.shift();
  const ticker=fn("matchCommentaryTicker");if(ticker)ticker((kind==="sub"?"↔ ":kind==="flank"?"🛡 ":"🧠 ")+text,tone);
  const log=fn("addLog");if(log)log(text);
 }
 function desiredMode(match,id){
  const min=match.minute,diff=Number(match.away||0)-Number(match.home||0),pers=PERSONALITY[id]||PERSONALITY.possession;
  if(diff<=-2&&min>=pers.chase-10)return min>=75?"allin":"chase";
  if(diff===-1&&min>=pers.chase)return min>=82?"allin":"chase";
  if(diff>=2&&min>=pers.protect)return "hold";
  if(diff===1&&min>=pers.protect)return "protect";
  return "base";
 }
 function applyMode(match,mode){
  const brain=match.aiBrain,p=match.opponentProfile,cfg=MODES[mode],base=brain.base.tactics,t={...base};
  for(const [k,v] of Object.entries(cfg.d))t[k]=Math.round(clamp((Number(base[k])||50)+v,0,100));
  if(cfg.buildUp)t.buildUp=cfg.buildUp;
  p.customTactics=t;p.tactic=cfg.tactic||brain.base.tactic;
  brain.mode=mode;brain.changedAt=match.minute;
 }
 function modeText(match,mode){
  const team=teamName(),score=`${match.away}:${match.home}`,label=match.opponentProfile?.styleProfile?.label||"Grundstil";
  return mode==="chase"?`${team} stellt um: höhere Linie, früheres Pressing, schnelles Umschalten. Hinten wird es luftiger.`:
   mode==="allin"?`${team} macht hinten auf – alles nach vorne! Platz für eure Konter.`:
   mode==="protect"?`${team} zieht sich zurück und will das ${score} über die Zeit bringen.`:
   mode==="hold"?`${team} nimmt Tempo raus und verwaltet die Führung.`:
   `${team} kehrt zum gewohnten Spielstil zurück (${label}).`;
 }
 function thinkTactics(match,id){
  const brain=match.aiBrain,want=desiredMode(match,id);
  if(want===brain.mode)return;
  const lastGoal=Math.max(-99,...(match.goalEvents||[]).map(e=>Number(e.at??e.minute)||0));
  // A coach reacts after a short moment, not every minute.
  if(match.minute-brain.changedAt<5||match.minute-lastGoal<2)return;
  applyMode(match,want);say(match,"tactic",modeText(match,want));
 }
 function thinkFlank(match){
  const brain=match.aiBrain;if(match.minute<20||match.minute-brain.guardAt<15)return;
  const threat={left:{xg:0,n:0,names:{}},right:{xg:0,n:0,names:{}}};
  for(const s of match.shotEvents||[]){
   if(s.side!=="home"||!threat[s.attackFlank])continue;
   const t=threat[s.attackFlank];t.n++;t.xg+=Number(s.xg||0)+(s.goal?.12:0);
   const who=s.attackFlankPlayer||s.creator||s.shooter;if(who)t.names[who]=(t.names[who]||0)+1;
  }
  const pick=threat.left.xg>=threat.right.xg?"left":"right",other=pick==="left"?"right":"left",t=threat[pick];
  if(pick===brain.guard||t.n<2||t.xg<.22||t.xg<threat[other].xg*1.7)return;
  brain.guard=pick;brain.guardAt=match.minute;
  const star=Object.entries(t.names).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
  say(match,"flank",`${teamName()} sichert ${pick==="left"?"eure linke":"eure rechte"} Seite ab${star?` gegen ${star}`:""}: der Außenverteidiger bleibt hinten, ein Mittelfeldspieler doppelt.`);
 }
 function benchFor(match,slot,mode){
  const brain=match.aiBrain,squad=match.opponentProfile.squad||[],base=fn("opponentMatchBase"),group=POS_GROUP[slot]||"MID";
  let best=null;
  for(let b=11;b<squad.length;b++){
   if(brain.usedBench.includes(b)||!squad[b])continue;
   const p=base?base(squad[b]):squad[b];if(!p)continue;
   const g=POS_GROUP[p.position]||"MID";if(g==="GK"&&group!=="GK")continue;if(group==="GK"&&g!=="GK")continue;
   const fit=p.position===slot?6:g===group?4:(NEAR[group]||[]).includes(g)?0:-8;
   const lean=mode==="chase"||mode==="allin"?(Number(p.sho)||0)*.06:mode==="protect"||mode==="hold"?(Number(p.def)||0)*.06:0;
   const score=(Number(p.ovr)||60)+fit+lean;
   if(!best||score>best.score)best={b,p,score};
  }
  return best;
 }
 function thinkSubs(match){
  const brain=match.aiBrain,row=SUB_WINDOWS.find(([w])=>match.minute>=w&&!brain.windows.includes(w));
  if(!row||brain.subs>=5)return;
  const [win,limit,threshold]=row;
  if(win>90&&!match.extraTimeStarted)return;
  brain.windows.push(win);
  const fitness=fn("matchPlayerFitness"),rows=fn("matchActorRows");if(!fitness||!rows)return;
  const chasing=brain.mode==="chase"||brain.mode==="allin";
  const tired=rows("away").filter(r=>r.slot!=="GK").map(r=>({r,fit:fitness("","away",r.index)}))
   .filter(x=>x.fit<threshold+(chasing&&/^(ST|CF|LW|RW|LM|RM|CAM)$/.test(x.r.slot)?4:0)).sort((a,b)=>a.fit-b.fit);
  let made=0;
  for(const {r} of tired){
   if(made>=limit||brain.subs>=5)break;
   const pick=benchFor(match,r.slot,brain.mode);if(!pick||pick.score<(Number(r.base?.ovr)||60)-7)continue;
   const p=match.opponentProfile,squad=[...p.squad],i=r.index;
   [squad[i],squad[pick.b]]=[squad[pick.b],squad[i]];p.squad=squad;
   if(Array.isArray(p.items)){const items=[...p.items];[items[i],items[pick.b]]=[items[pick.b],items[i]];p.items=items}
   if(match.fitnessLoss?.away)match.fitnessLoss.away[i]=0;
   brain.usedBench.push(pick.b);brain.subs++;made++;
   const outName=r.name||"Spieler",inName=pick.p.name||"Einwechselspieler";
   (match.substitutionEvents||(match.substitutionEvents=[])).push({side:"away",minute:Math.min(120,Math.floor(match.minute)),in:inName,out:outName,index:i});
   const ev=fn("recordMatchEvent");if(ev)ev("sub","away",`${inName} für ${outName}`);
   say(match,"sub",`Wechsel bei ${teamName()}: ${inName} kommt für den müden ${outName}.`,"note");
  }
 }
 function think(match){
  if(!brainActive(match)||match.finished)return;
  const id=activeId(match.opponentProfile),fresh=!match.aiBrain;ensureBrain(match);
  if(fresh){const line=scoutTicker(match.opponentProfile),ticker=fn("matchCommentaryTicker");if(line&&ticker)ticker("🔎 "+line,"analysis")}
  thinkTactics(match,id);thinkFlank(match);thinkSubs(match);
 }
 // Bounded flank effect: the secured side defends wide attacks better, the
 // CPU's own build-up loses a little because the full-back stays home.
 function flankTuning(match,attackingSide,kind,flank){
  const guard=match?.aiBrain?.guard;if(!guard||!brainActive(match))return NEUTRAL;
  if(attackingSide==="away")return{build:-.006,duel:0,xg:0};
  if(flank!==guard)return NEUTRAL;
  const wide=kind==="cross"||kind==="cutback"||kind==="dribble";
  return wide?{build:-.012,duel:-.045,xg:0}:NEUTRAL;
 }
 function decisions(match){return match?.aiBrain?.decisions||[]}

 // V21.473 Gegner-Scouting: what the CPU coach will do and where he is
 // strong or weak, read from the real squad before kick-off. Pure function.
 const SCOUT_TIPS=Object.freeze({
  possession:"Früh anlaufen: hohes Pressing stört seinen geduldigen Aufbau.",
  counter:"Keine leichten Ballverluste im Aufbau – eine tiefere Linie nimmt ihm die Räume hinter der Abwehr.",
  wing:"Starke Außenverteidiger aufstellen, er sucht fast immer die Flanke.",
  press:"Schnell und direkt spielen. Ab der 70. Minute wird sein Pressing müde.",
  block:"Geduld: Breite, Flanken und Distanzschüsse knacken den tiefen Block."
 });
 const SLOT_LABEL={LB:"Linksverteidiger",RB:"Rechtsverteidiger",LWB:"linker Schienenspieler",RWB:"rechter Schienenspieler",LM:"linker Mittelfeldspieler",RM:"rechter Mittelfeldspieler"};
 function scoutReport(opponent){
  const id=activeId(opponent);if(!id)return null;
  const forms=typeof FORMATIONS!=="undefined"?FORMATIONS:root.FORMATIONS,form=forms?.[opponent.formation]||forms?.["4-3-3"]||[];
  const resolve=typeof root.resolvedPlayer==="function"?root.resolvedPlayer:(x=>x);
  const rows=(opponent.squad||[]).slice(0,11).map((e,i)=>{const b=e&&typeof e==="object"?resolve(e.base||e):null;return b?{b,slot:form[i]?.p||b.position||"",i}:null}).filter(Boolean);
  const n=(b,k)=>Number(b?.[k]??b?.ovr??60)||60;
  const weight=slot=>/^(ST|CF|LW|RW|CAM)$/.test(slot)?1:/^(LM|RM|CM)$/.test(slot)?.8:.4;
  const danger=rows.filter(r=>r.slot!=="GK").map(r=>({...r,score:(n(r.b,"sho")*.5+n(r.b,"pac")*.3+n(r.b,"dri")*.2)*weight(r.slot)})).sort((a,b)=>b.score-a.score)[0]||null;
  const stats=b=>[["PAC",n(b,"pac")],["SHO",n(b,"sho")],["DRI",n(b,"dri")],["PAS",n(b,"pas")]].sort((x,y)=>y[1]-x[1]).slice(0,2).map(([k,v])=>k+" "+v).join(" · ");
  const side=prefix=>rows.find(r=>r.slot===prefix+"B")||rows.find(r=>r.slot===prefix+"WB")||rows.find(r=>r.slot===prefix+"M")||null;
  const def=r=>r?n(r.b,"def")*.6+n(r.b,"pac")*.4:99;
  const L=side("L"),R=side("R");let weak=null;
  if(L&&R&&Math.abs(def(L)-def(R))>=3){const w=def(L)<def(R)?L:R;weak={name:w.b.name||"",slot:w.slot,role:SLOT_LABEL[w.slot]||w.slot,def:n(w.b,"def"),pac:n(w.b,"pac"),userFlank:/^L/.test(w.slot)?"right":"left"}}
  const pers=PERSONALITY[id]||PERSONALITY.possession,profile=profiles.find(p=>p.id===id);
  return{style:id,label:profile?.label||"",hint:profile?.hint||"",
   danger:danger?{name:danger.b.name||"",slot:danger.slot,stats:stats(danger.b)}:null,weak,
   plan:`Liegt er hinten, geht er ab etwa der ${pers.chase}. Minute mehr Risiko. Führt er, zieht er sich ab etwa der ${pers.protect}. Minute zurück. Müde Spieler wechselt er ab der 60. Minute.`,
   tip:SCOUT_TIPS[id]||""};
 }
 function scoutHTML(opponent,esc){
  const r=scoutReport(opponent);if(!r)return"";
  const e=typeof esc==="function"?esc:(x=>String(x));
  const row=(icon,title,text)=>`<div class="scout-row"><i aria-hidden="true">${icon}</i><div><b>${e(title)}</b><span>${e(text)}</span></div></div>`;
  return `<section class="match-scout" aria-label="Gegner-Scouting"><div class="match-scout-head"><span>SCOUTING</span><strong>${e(r.label)}</strong><small>${e(r.hint)}</small></div>`+
   (r.danger?row("⚡","Gefährlichster Spieler",`${r.danger.name} (${r.danger.slot}) · ${r.danger.stats}`):"")+
   (r.weak?row("🎯","Seine Schwachstelle",`${r.weak.role} ${r.weak.name} (DEF ${r.weak.def}, PAC ${r.weak.pac}). Angriffe über eure ${r.weak.userFlank==="left"?"linke":"rechte"} Seite tun ihm weh.`):row("🎯","Seine Abwehr","Beide Außenverteidiger sind ähnlich stark – Lücken eher durch die Mitte."))+
   row("🧠","So reagiert sein Trainer",r.plan)+(r.tip?row("💡","Tipp",r.tip):"")+`</section>`;
 }
 function scoutTicker(opponent){
  const r=scoutReport(opponent);if(!r)return"";
  return `Scouting: ${r.label}${r.danger?` · Achtung auf ${r.danger.name}`:""}${r.weak?` · Schwachstelle über eure ${r.weak.userFlank==="left"?"linke":"rechte"} Seite (${r.weak.name})`:""}.`;
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
     const body=root.document.querySelector("#squadBattleModalBody"),head=body?.querySelector(".friend-team-title");
     if(head&&!body.querySelector(".match-scout")){const html=scoutHTML(pendingMatchContext.opponent,typeof esc==="function"?esc:null);if(html)head.insertAdjacentHTML("afterend",html)}
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
 root.FooteraOpponentStyles={profiles,hash,styleFor,activeId,matchTuning,possessionBias,think,flankTuning,attackFlank,decisions,desiredMode,scoutReport,scoutHTML,scoutTicker};
 install();
})(globalThis);
