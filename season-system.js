"use strict";

const PASS_PRICE={coins:50000,points:500};
const FREE_EXTRA=[
 {coins:2000},{pack:"gold"},{coinBoost:{games:5,amount:300}},{points:50},{pack:"82"},
 {coins:3000},{pack:"silver",qty:2},{coins:3500},{points:75},{pack:"goldplayers"},
 {coins:4000},{pack:"gold",qty:2},{coinBoost:{games:8,amount:400}},{points:75},{pack:"82",qty:2},
 {coins:5000},{pack:"goldplayers"},{points:100},{pack:"85"},{coins:12000,pack:"goldplayers",qty:2}
];
function premiumTierReward(level){
 if(level===30)return{coins:15000,pack:"85",qty:2};
 if(level%10===0)return{coins:4000,pack:"goldplayers",qty:2};
 if(level%5===0)return{pack:"85"};
 if(level%3===0)return{coins:2000,pack:"82"};
 if(level%2===0)return{pack:"gold"};
 return{coins:3000}
}
for(const tier of SEASON_REWARDS)tier.premium=premiumTierReward(tier.level);
for(let level=11;level<=30;level++)SEASON_REWARDS.push({level,sp:13500+(level-10)*650,reward:FREE_EXTRA[level-11],premium:premiumTierReward(level)});

const OBJECTIVE_POOLS={
 daily:[
  {id:"play",title:"Auf den Platz",desc:"Spiele ein gewertetes Match.",stat:"competitiveMatches",target:1,reward:{sp:100}},
  {id:"win",title:"Tagessieg",desc:"Gewinne ein gewertetes Match.",stat:"competitiveWins",target:1,reward:{sp:130,coins:300}},
  {id:"squad",title:"Squad-Battle-Start",desc:"Spiele ein Squad Battle.",stat:"squadMatches",target:1,reward:{sp:100}},
  {id:"rivals",title:"Rivals-Einsatz",desc:"Spiele ein Rivals-Match.",stat:"rivalsMatches",target:1,reward:{sp:100}},
  {id:"pack",title:"Pack öffnen",desc:"Öffne ein Pack.",stat:"packs",target:1,reward:{sp:90}},
  {id:"market",title:"Kader verstärken",desc:"Kaufe einen Spieler auf dem Markt.",stat:"market",target:1,reward:{sp:90,coins:250}},
  {id:"sbc",title:"Tägliche SBC",desc:"Schließe eine SBC ab.",stat:"sbcs",target:1,reward:{sp:130}}
 ],
 weekly:[
  {id:"matches",title:"Spielwoche",desc:"Spiele 8 gewertete Partien.",stat:"competitiveMatches",target:8,reward:{sp:260,coins:1200}},
  {id:"wins",title:"Form halten",desc:"Gewinne 4 gewertete Partien.",stat:"competitiveWins",target:4,reward:{sp:300,pack:"silver"}},
  {id:"squad",title:"Squad-Battle-Woche",desc:"Spiele 6 Squad Battles.",stat:"squadMatches",target:6,reward:{sp:260,pack:"silver"}},
  {id:"rivals",title:"Rivals-Woche",desc:"Spiele 5 Rivals-Partien.",stat:"rivalsMatches",target:5,reward:{sp:280,coins:1000}},
  {id:"packs",title:"Packs entdecken",desc:"Öffne 5 Packs.",stat:"packs",target:5,reward:{sp:240,pack:"silver"}},
  {id:"market",title:"Transferwoche",desc:"Kaufe 3 Spieler.",stat:"market",target:3,reward:{sp:220,coins:1500}},
  {id:"sbc",title:"SBC-Serie",desc:"Schließe 3 SBCs ab.",stat:"sbcs",target:3,reward:{sp:300,pack:"gold"}},
  {id:"grind",title:"Dranbleiben",desc:"Spiele 12 gewertete Partien.",stat:"competitiveMatches",target:12,reward:{sp:320,coins:1800}}
 ],
 season:[
  {id:"matches10",title:"Saisonstart",desc:"Spiele 10 gewertete Partien.",stat:"competitiveMatches",target:10,reward:{sp:400,pack:"gold"}},
  {id:"matches25",title:"Stammkraft",desc:"Spiele 25 gewertete Partien.",stat:"competitiveMatches",target:25,reward:{sp:600,pack:"82"}},
  {id:"matches50",title:"Dauergast",desc:"Spiele 50 gewertete Partien.",stat:"competitiveMatches",target:50,reward:{sp:900,pack:"goldplayers"}},
  {id:"wins5",title:"Erste Serie",desc:"Gewinne 5 gewertete Partien.",stat:"competitiveWins",target:5,reward:{sp:450,coins:2500}},
  {id:"wins15",title:"Siegermentalität",desc:"Gewinne 15 gewertete Partien.",stat:"competitiveWins",target:15,reward:{sp:700,pack:"82"}},
  {id:"wins25",title:"The Beginning Champion",desc:"Gewinne 25 gewertete Partien.",stat:"competitiveWins",target:25,reward:{sp:950,pack:"85"}},
  {id:"squad14",title:"Gegen die KI",desc:"Spiele 14 Squad Battles.",stat:"squadMatches",target:14,reward:{sp:600,coins:3500}},
  {id:"squad28",title:"Battle-Routine",desc:"Spiele 28 Squad Battles.",stat:"squadMatches",target:28,reward:{sp:800,pack:"82"}},
  {id:"rivals10",title:"Division-Fortschritt",desc:"Spiele 10 Rivals-Partien.",stat:"rivalsMatches",target:10,reward:{sp:500,pack:"gold"}},
  {id:"rivals20",title:"Rivals-Stammgast",desc:"Spiele 20 Rivals-Partien.",stat:"rivalsMatches",target:20,reward:{sp:750,pack:"82"}},
  {id:"packs15",title:"Pack-Sammler",desc:"Öffne 15 Packs.",stat:"packs",target:15,reward:{sp:450,pack:"82"}},
  {id:"sbc8",title:"SBC-Spezialist",desc:"Schließe 8 SBCs ab.",stat:"sbcs",target:8,reward:{sp:600,pack:"goldplayers"}}
 ],
 squad:[
  {id:"sb4",title:"Erste Battle-Punkte",desc:"Spiele 4 Squad Battles.",stat:"squadMatches",target:4,reward:{sp:220}},
  {id:"sbwin2",title:"KI bezwingen",desc:"Gewinne 2 Squad Battles.",stat:"squadWins",target:2,reward:{sp:260,coins:1200}},
  {id:"sb8",title:"Halbe Wochenstrecke",desc:"Spiele 8 Squad Battles.",stat:"squadMatches",target:8,reward:{sp:320}},
  {id:"sbwin5",title:"Battle-Serie",desc:"Gewinne 5 Squad Battles.",stat:"squadWins",target:5,reward:{sp:380,pack:"silver"}},
  {id:"sb14",title:"Komplette Wertung",desc:"Spiele 14 Squad Battles.",stat:"squadMatches",target:14,reward:{sp:500,pack:"gold"}}
 ],
 rivals:[
  {id:"rv4",title:"Rivals-Einstieg",desc:"Spiele 4 Rivals-Partien.",stat:"rivalsMatches",target:4,reward:{sp:220}},
  {id:"rvwin2",title:"Erste Rivalen",desc:"Gewinne 2 Rivals-Partien.",stat:"rivalsWins",target:2,reward:{sp:260,coins:1200}},
  {id:"rv8",title:"Division-Arbeit",desc:"Spiele 8 Rivals-Partien.",stat:"rivalsMatches",target:8,reward:{sp:320}},
  {id:"rvwin5",title:"Rivals-Serie",desc:"Gewinne 5 Rivals-Partien.",stat:"rivalsWins",target:5,reward:{sp:380,pack:"silver"}},
  {id:"rv15",title:"Rivals-Stammspieler",desc:"Spiele 15 Rivals-Partien.",stat:"rivalsMatches",target:15,reward:{sp:500,pack:"gold"}}
 ],
 catchup1:[
  {id:"c1play",title:"Aufholjagd: Spielen",desc:"Spiele 5 gewertete Partien.",stat:"competitiveMatches",target:5,reward:{sp:600}},
  {id:"c1win",title:"Aufholjagd: Siege",desc:"Gewinne 3 gewertete Partien.",stat:"competitiveWins",target:3,reward:{sp:700}},
  {id:"c1squad",title:"Aufholjagd: Squad Battles",desc:"Spiele 3 Squad Battles.",stat:"squadMatches",target:3,reward:{sp:600}},
  {id:"c1rivals",title:"Aufholjagd: Rivals",desc:"Spiele 3 Rivals-Partien.",stat:"rivalsMatches",target:3,reward:{sp:600}},
  {id:"c1sbc",title:"Aufholjagd: SBC",desc:"Schließe 2 SBCs ab.",stat:"sbcs",target:2,reward:{sp:600}},
  {id:"c1packs",title:"Aufholjagd: Packs",desc:"Öffne 3 Packs.",stat:"packs",target:3,reward:{sp:500}}
 ],
 catchup2:[
  {id:"c2play",title:"Finale Woche: Spielen",desc:"Spiele 6 gewertete Partien.",stat:"competitiveMatches",target:6,reward:{sp:700}},
  {id:"c2win",title:"Finale Woche: Siege",desc:"Gewinne 3 gewertete Partien.",stat:"competitiveWins",target:3,reward:{sp:750}},
  {id:"c2squad",title:"Finale Woche: Squad Battles",desc:"Spiele 4 Squad Battles.",stat:"squadMatches",target:4,reward:{sp:700}},
  {id:"c2rivals",title:"Finale Woche: Rivals",desc:"Spiele 4 Rivals-Partien.",stat:"rivalsMatches",target:4,reward:{sp:700}},
  {id:"c2sbc",title:"Finale Woche: SBC",desc:"Schließe 2 SBCs ab.",stat:"sbcs",target:2,reward:{sp:650}},
  {id:"c2packs",title:"Finale Woche: Packs",desc:"Öffne 4 Packs.",stat:"packs",target:4,reward:{sp:600}}
 ]
};
const OBJECTIVE_GROUPS=["daily","weekly","season","squad","rivals"];
const OBJECTIVE_GROUP_NAMES={daily:"Täglich",weekly:"Wöchentlich",season:"Saison",squad:"Squad Battles",rivals:"Division Rivals",catchup1:"Aufholen · Phase 1",catchup2:"Aufholen · Finale"};
const OBJECTIVE_GROUP_SIZE={daily:3,weekly:6,season:12,squad:5,rivals:5,catchup1:6,catchup2:6};
const OBJECTIVE_STATS=["competitiveMatches","competitiveWins","rivalsMatches","rivalsWins","squadMatches","squadWins","packs","market","sbcs"];

const SEASON_SCHEDULE=[
 {number:1,key:"s1",name:"THE BEGINNING",start:"2026-09-17T19:00:00+02:00",end:"2026-10-30T19:00:00+01:00"},
 {number:2,key:"s2",name:"HALLOWEEN",start:"2026-10-30T19:00:00+01:00",end:null}
];
function seasonInfo(at=new Date()){
 const date=new Date(at),current=[...SEASON_SCHEDULE].reverse().find(s=>date>=new Date(s.start))||SEASON_SCHEDULE[0];
 return{...current,start:new Date(current.start),end:current.end?new Date(current.end):null}
}
function seasonCountdown(end,at=new Date()){
 if(!end)return"Enddatum folgt";
 const minutes=Math.max(0,Math.ceil((new Date(end)-new Date(at))/60000));
 if(minutes===0)return"Beendet";
 if(minutes<1440)return`Endet in ${Math.floor(minutes/60)} Std. ${minutes%60} Min.`;
 return`Endet in ${Math.ceil(minutes/1440)} Tagen`
}
function catchupStart(group,season){
 if(!season?.end)return null;
 return berlinShiftDays(season.end,group==="catchup1"?-14:-7,19)
}
function activeObjectiveGroupKeys(at=new Date()){
 const season=seasonInfo(at),date=new Date(at),keys=[...OBJECTIVE_GROUPS];
 for(const group of ["catchup1","catchup2"]){
  const start=catchupStart(group,season);
  if(start&&date>=start&&(!season.end||date<season.end))keys.push(group)
 }
 return keys
}
function objectiveStart(group,at){
 const date=new Date(at),season=seasonInfo(date);
 if(["season","squad","rivals"].includes(group))return season.start;
 if(group==="catchup1"||group==="catchup2")return catchupStart(group,season);
 if(group==="weekly")return berlinWeekStart(date,1,19);
 const p=berlinParts(date),start=berlinInstant(p.year,p.month,p.day,19);
 return date<start?berlinShiftDays(start,-1,19):start
}
function objectiveWindow(group,at=new Date()){
 const season=seasonInfo(at),start=objectiveStart(group,at);
 if(!start)return null;
 const seasonLong=["season","squad","rivals","catchup1","catchup2"].includes(group);
 const end=seasonLong?season.end:new Date(start);
 if(group==="daily")end.setTime(berlinShiftDays(start,1,19).getTime());
 if(group==="weekly")end.setTime(berlinShiftDays(start,7,19).getTime());
 const key=group+":"+season.key+":"+start.getTime(),pool=OBJECTIVE_POOLS[group]||[];
 const rotation=group==="daily"?Math.floor(start.getTime()/86400000):group==="weekly"?Math.floor(start.getTime()/(7*86400000)):0;
 const size=Math.min(OBJECTIVE_GROUP_SIZE[group]||pool.length,pool.length);
 const tasks=Array.from({length:size},(_,i)=>{
  const task=pool[((rotation+i)%pool.length+pool.length)%pool.length];
  return{...task,group,key:key+":"+task.id}
 });
 return{key,start,end,tasks}
}
function passClaims(which){return which==="premium"?state.seasonPass.premiumClaims:state.seasonPass.freeClaims}
function settleExpiredPass(pass){
 const oldSp=Math.max(0,Number(state.sp||0));
 for(const tier of SEASON_REWARDS){
  if(oldSp<tier.sp)continue;
  if(!pass.freeClaims?.[tier.level])grantSeasonOnly(tier.reward);
  if(pass.premium&&!pass.premiumClaims?.[tier.level])grantSeasonOnly(tier.premium)
 }
}
function syncSeasonState(at=new Date()){
 const current=seasonInfo(at);
 if(!state.seasonPass||!state.seasonPass.key){
  const legacy=state.seasonClaims||{},freeClaims={};
  if(legacy[1]&&!state.legacyLevel1Refund){state.coins+=500;state.legacyLevel1Refund=true}
  if(current.number===1){
   for(const level of Object.keys(legacy))if(legacy[level])freeClaims[level]=true;
  }else state.sp=0;
  state.seasonPass={key:current.key,premium:false,freeClaims,premiumClaims:{}};
  state.objectiveWindows={};return true
 }
 if(state.seasonPass.key===current.key){
  state.seasonPass.freeClaims=state.seasonPass.freeClaims||{};
  state.seasonPass.premiumClaims=state.seasonPass.premiumClaims||{};
  return false
 }
 settleExpiredPass(state.seasonPass);
 state.seasonPass={key:current.key,premium:false,freeClaims:{},premiumClaims:{}};
 state.objectiveWindows={};state.objectiveClaims={};state.objectiveBonuses={};state.sp=0;return true
}
function ensureObjectiveWindows(at=new Date()){
 let changed=syncSeasonState(at);
 state.objectiveWindows=state.objectiveWindows||{};
 state.objectiveClaims=state.objectiveClaims||{};
 state.objectiveBonuses=state.objectiveBonuses||{};
 const seasonWindow=objectiveWindow("season",at),seasonBaseline=state.objectiveWindows.season?.key===seasonWindow?.key?state.objectiveWindows.season.baseline:null;
 for(const group of activeObjectiveGroupKeys(at)){
  const window=objectiveWindow(group,at);if(!window)continue;
  const existing=state.objectiveWindows[group];if(existing?.key===window.key)continue;
  const sharedSeasonBaseline=["season","squad","rivals"].includes(group)&&seasonBaseline?seasonBaseline:null;
  state.objectiveWindows[group]={key:window.key,baseline:sharedSeasonBaseline||Object.fromEntries(OBJECTIVE_STATS.map(stat=>[stat,Number(state.stats[stat]||0)]))};
  changed=true
 }
 return changed
}
function objectiveProgress(task){
 const base=Number(state.objectiveWindows[task.group]?.baseline?.[task.stat]||0);
 return Math.min(task.target,Math.max(0,Number(state.stats[task.stat]||0)-base))
}
function activeObjectiveGroups(at=new Date()){return activeObjectiveGroupKeys(at).map(group=>objectiveWindow(group,at)).filter(Boolean)}
function weeklyBonusReady(week=objectiveWindow("weekly")){
 if(!week)return false;
 return week.tasks.filter(task=>!!state.objectiveClaims[task.key]).length>=Math.min(5,week.tasks.length)
}
function availableRotatingObjectiveRewardsCount(){
 ensureObjectiveWindows();
 const taskCount=activeObjectiveGroups().reduce((n,window)=>n+window.tasks.filter(task=>objectiveProgress(task)>=task.target&&!state.objectiveClaims[task.key]).length,0);
 const week=objectiveWindow("weekly"),bonusReady=weeklyBonusReady(week)&&!state.objectiveBonuses[week.key];
 return taskCount+(bonusReady?1:0)
}
function availablePassRewardsCount(){
 ensureObjectiveWindows();
 return SEASON_REWARDS.reduce((n,tier)=>n+(state.sp>=tier.sp&&!state.seasonPass.freeClaims[tier.level]?1:0)+(state.seasonPass.premium&&state.sp>=tier.sp&&!state.seasonPass.premiumClaims[tier.level]?1:0),0)
}
function availableObjectiveRewardsCount(){
 return availableRotatingObjectiveRewardsCount()+availablePassRewardsCount()
}

function capSeasonSp(){const max=SEASON_REWARDS[SEASON_REWARDS.length-1]?.sp||0;if(max>0&&Number(state.sp||0)>max)state.sp=max}
const originalGrant=grant;
grant=function(reward){syncSeasonState();originalGrant(reward);capSeasonSp()};
claimSeasonRewards=function(){syncSeasonState();capSeasonSp()};
const originalRenderAll=renderAll;
renderAll=function(){const changed=ensureObjectiveWindows();originalRenderAll();if(changed)save()};
let objectiveTab="all";
const WEEKLY_BONUS={sp:750,pack:"gold"};
function passDate(date,weekday=false){return date?new Intl.DateTimeFormat("de-DE",{timeZone:FOOTERA_TIME_ZONE,...(weekday?{weekday:"long"}:{}),day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date):"Termin folgt"}
function rewardCell(tier,which){
 const premium=which==="premium",unlocked=Number(state.sp||0)>=tier.sp,owned=!premium||state.seasonPass.premium,claimed=!!passClaims(which)[tier.level];
 const reward=premium?tier.premium:tier.reward;
 const action=claimed?'<em>ABGEHOLT</em>':unlocked&&owned?`<button class="primary" data-pass-claim="${which}" data-pass-level="${tier.level}">Abholen</button>`:
  `<em>${!owned?"PREMIUM":unlocked?"BEREIT":`${fmt(tier.sp)} SP nötig`}</em>`;
 return `<div class="pass-reward ${premium?"premium":""}"><b>${premium?"PREMIUM":"KOSTENLOS"}</b><span>${esc(rewardText(reward))}</span>${action}</div>`
}
function renderSeasonPass(){
 const host=$("seasonPass");if(!host)return;
 if(ensureObjectiveWindows())save();
 const info=seasonInfo(),sp=Math.max(0,Number(state.sp||0)),max=SEASON_REWARDS[SEASON_REWARDS.length-1].sp;
 const next=SEASON_REWARDS.find(t=>t.sp>sp),level=SEASON_REWARDS.filter(t=>sp>=t.sp).length;
 const previous=host.querySelector(".pass-ladder"),previousScroll=previous?.scrollLeft||0;
 const upgrade=state.seasonPass.premium?'<strong>✓ Premium aktiviert</strong><p>Beide Spuren verwenden dieselben Season Points. Bereits erreichte Premium-Stufen können abgeholt werden.</p>':
  `<div><strong>Premium-Pass freischalten</strong><p>Zusätzliche Belohnungen auf denselben 30 Stufen. Frühere Stufen bleiben verfügbar. Nur Guthaben aus Footera.</p></div><div class="pass-upgrade-actions"><button class="secondary" data-pass-buy="coins" ${state.coins<PASS_PRICE.coins?"disabled":""}>${fmt(PASS_PRICE.coins)} Coins</button><button class="primary" data-pass-buy="points" ${state.points<PASS_PRICE.points?"disabled":""}>${fmt(PASS_PRICE.points)} Footera Points</button></div>`;
 host.innerHTML=`<div class="pass-panel"><div class="pass-top"><div><span class="pass-kicker">SEASON ${info.number} · ${esc(info.name)}</span><h3>${esc(info.name)}</h3><p>Kostenloser und Premium-Pfad · 30 Stufen · regelmäßige Spieler können Level 30 rund 14 Tage vor Saisonende erreichen.</p></div><span class="pass-time">Start ${passDate(info.start)}<br>${info.end?`Endet ${passDate(info.end,true)}<br>`:""}<strong>${seasonCountdown(info.end)}</strong></span></div><div class="pass-progress"><div style="width:${Math.min(100,Math.round(sp/max*100))}%"></div></div><div class="pass-status"><span>Level ${level}/30 · ${fmt(Math.min(sp,max))} / ${fmt(max)} SP</span><span>${next?`Nächstes Level bei ${fmt(next.sp)} SP`:"Alle Stufen erreicht"}</span></div><div class="pass-upgrade">${upgrade}</div><div class="pass-ladder" aria-label="Saisonbelohnungen">${SEASON_REWARDS.map(tier=>`<div class="pass-tier ${sp>=tier.sp?"reached":""}"><div class="pass-tier-header"><span>LEVEL ${tier.level}</span><small>${fmt(tier.sp)} SP</small></div>${rewardCell(tier,"free")}${rewardCell(tier,"premium")}</div>`).join("")}</div></div>`;
 host.querySelector(".pass-ladder").scrollLeft=previousScroll
}
function objectiveCard(task,group){
 const foundation=group==="foundation",value=foundation?Math.min(task.target,Number(state.stats[task.stat]||0)):objectiveProgress(task);
 const done=foundation?!!state.claims[task.id]:!!state.objectiveClaims[task.key],ready=value>=task.target;
 const claim=foundation?`data-claim="${task.id}"`:`data-objective-claim="${esc(task.key)}"`;
 return `<div class="task ${ready&&!done?"claimable":done?"completed":""}"><div class="tasktop"><div><h4>${esc(task.title)}</h4><p>${esc(task.desc)}</p><span class="task-state ${done?"done":ready?"ready":""}">${done?"ABGEHOLT":ready?"ABGESCHLOSSEN":"IN ARBEIT"}</span></div><div class="reward">${esc(rewardText(task.reward))}</div></div><div class="progress" style="margin-top:7px"><div style="width:${Math.min(100,Math.round(value/task.target*100))}%"></div></div><div class="taskfoot"><small>${value}/${task.target}</small>${done?'<span style="font-size:9px;color:#79f2a9">ERLEDIGT</span>':`<button class="primary" ${claim} ${ready?"":"disabled"}>Abholen</button>`}</div></div>`
}
function renderTasks(){
 const changed=ensureObjectiveWindows();if(changed)save();
 const groups=activeObjectiveGroups(),hasCatchup=groups.some(w=>String(w.tasks[0]?.group||"").startsWith("catchup"));
 const options=[["all","Alle"],["foundation","Foundations"],["daily","Täglich"],["weekly","Wöchentlich"],["season","Saison"],["squad","Squad Battles"],["rivals","Rivals"],...(hasCatchup?[["catchup","Aufholen"]]:[])];
 if(!options.some(([key])=>key===objectiveTab))objectiveTab="all";
 $("objectiveTabs").innerHTML=options.map(([key,label])=>`<button type="button" data-objective-tab="${key}" class="${objectiveTab===key?"active":""}">${label}</button>`).join("");
 const pending=availableRotatingObjectiveRewardsCount()+TASKS.filter(t=>!state.claims[t.id]&&Number(state.stats[t.stat]||0)>=t.target).length;
 const season=seasonInfo(),c1=catchupStart("catchup1",season),c2=catchupStart("catchup2",season);
 $("objectiveSummary").textContent=`${pending} Belohnung${pending===1?"":"en"} abholbereit · 6 Wochenziele, Wochenbonus ab 5/6 · Aufholziele ${c1?`ab ${passDate(c1)} und ${passDate(c2)}`:"zum Saisonende"}.`;
 const sections=[];
 if(objectiveTab==="all"||objectiveTab==="foundation"){
  const tasks=[...TASKS].sort((a,b)=>Number(!!state.claims[a.id])-Number(!!state.claims[b.id])||Number((state.stats[b.stat]||0)>=b.target)-Number((state.stats[a.stat]||0)>=a.target));
  sections.push('<div class="objective-group-head"><strong>Foundations</strong><span>Einmalige Club-Aufgaben</span></div>'+tasks.map(t=>objectiveCard(t,"foundation")).join(""))
 }
 for(const window of groups){
  const group=window.tasks[0]?.group;if(!group)continue;
  const tabGroup=group.startsWith("catchup")?"catchup":group;
  if(objectiveTab!=="all"&&objectiveTab!==tabGroup)continue;
  const tasks=[...window.tasks].sort((a,b)=>Number(!!state.objectiveClaims[a.key])-Number(!!state.objectiveClaims[b.key])||Number(objectiveProgress(b)>=b.target)-Number(objectiveProgress(a)>=a.target));
  let html=`<div class="objective-group-head"><strong>${OBJECTIVE_GROUP_NAMES[group]}</strong><span>Bis ${passDate(window.end)}</span></div>`+tasks.map(t=>objectiveCard(t,group)).join("");
  if(group==="weekly"){
   const claimedCount=window.tasks.filter(task=>state.objectiveClaims[task.key]).length,complete=weeklyBonusReady(window),claimed=!!state.objectiveBonuses[window.key];
   html+=`<div class="objective-bonus"><div><b>Wochenmeister · 5 von 6 Zielen</b><small>${claimedCount}/6 abgeschlossen · ${esc(rewardText(WEEKLY_BONUS))}</small></div>${claimed?'<span class="task-state done">ABGEHOLT</span>':`<button class="primary" data-objective-bonus="${esc(window.key)}" ${complete?"":"disabled"}>Abholen</button>`}</div>`
  }
  sections.push(html)
 }
 $("taskList").innerHTML=sections.join("")
}
$("objectiveTabs").addEventListener("click",event=>{
 const button=event.target.closest("[data-objective-tab]");if(!button)return;
 objectiveTab=button.dataset.objectiveTab;renderTasks()
});
$("seasonPass").addEventListener("click",event=>{
 const buy=event.target.closest("[data-pass-buy]"),claim=event.target.closest("[data-pass-claim]");
 if(buy){
  ensureObjectiveWindows();
  if(state.seasonPass.premium)return;
  const currency=buy.dataset.passBuy,price=PASS_PRICE[currency];
  if(!price||!Number.isFinite(state[currency])||state[currency]<price)return toast("Nicht genügend Guthaben.");
  if(!confirm(`Premium-Pass für Saison ${seasonInfo().number} für ${fmt(price)} ${currency==="coins"?"Coins":"Footera Points"} freischalten?`))return;
  state[currency]-=price;state.seasonPass.premium=true;save();renderAll();toast("Premium-Pass aktiviert.");return
 }
 if(!claim)return;
 ensureObjectiveWindows();
 const which=claim.dataset.passClaim,level=Number(claim.dataset.passLevel),tier=SEASON_REWARDS.find(t=>t.level===level);
 if(!tier||!["free","premium"].includes(which)||state.sp<tier.sp||which==="premium"&&!state.seasonPass.premium||passClaims(which)[level])return;
 passClaims(which)[level]=true;grantSeasonOnly(which==="premium"?tier.premium:tier.reward);
 save();renderAll();toast(`Level ${level}: Belohnung abgeholt.`)
});
$("taskList").addEventListener("click",event=>{
 const taskButton=event.target.closest("[data-objective-claim]"),bonus=event.target.closest("[data-objective-bonus]");
 if(!taskButton&&!bonus)return;
 ensureObjectiveWindows();
 if(taskButton){
  const task=activeObjectiveGroups().flatMap(window=>window.tasks).find(t=>t.key===taskButton.dataset.objectiveClaim);
  if(!task||state.objectiveClaims[task.key]||objectiveProgress(task)<task.target)return;
  state.objectiveClaims[task.key]=true;grant(task.reward);save();renderAll();toast("Zielbelohnung abgeholt.");return
 }
 const week=objectiveWindow("weekly");
 if(bonus.dataset.objectiveBonus!==week.key||state.objectiveBonuses[week.key]||!weeklyBonusReady(week))return;
 state.objectiveBonuses[week.key]=true;grant(WEEKLY_BONUS);save();renderAll();toast("Wochenmeister-Bonus abgeholt.")
});
ensureObjectiveWindows();save();
setInterval(()=>{
 if(!ensureObjectiveWindows())return;
 save();
 updateObjectiveIndicators();
 if($("objectivesView")?.classList.contains("active"))renderTasks();
 if($("seasonPassView")?.classList.contains("active"))renderSeasonPass();
 if($("homeView")?.classList.contains("active"))renderHome()
},60000);
