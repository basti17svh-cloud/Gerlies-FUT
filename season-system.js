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
  {id:"play",title:"Auf den Platz",desc:"Spiele ein gewertetes Match.",stat:"competitiveMatches",target:1,reward:{sp:150}},
  {id:"win",title:"Tagessieg",desc:"Gewinne ein gewertetes Match.",stat:"competitiveWins",target:1,reward:{sp:175,coins:300}},
  {id:"squad",title:"Squad-Battle-Start",desc:"Spiele ein Squad Battle.",stat:"squadMatches",target:1,reward:{sp:150}},
  {id:"rivals",title:"Rivals-Einsatz",desc:"Spiele ein Rivals-Match.",stat:"rivalsMatches",target:1,reward:{sp:150}},
  {id:"pack",title:"Pack öffnen",desc:"Öffne ein Pack.",stat:"packs",target:1,reward:{sp:150}},
  {id:"market",title:"Kader verstärken",desc:"Kaufe einen Spieler auf dem Markt.",stat:"market",target:1,reward:{sp:150,coins:250}},
  {id:"sbc",title:"Tägliche SBC",desc:"Schließe eine SBC ab.",stat:"sbcs",target:1,reward:{sp:200}}
 ],
 weekly:[
  {id:"matches",title:"Spielwoche",desc:"Spiele 6 gewertete Partien.",stat:"competitiveMatches",target:6,reward:{sp:450,coins:1200}},
  {id:"wins",title:"Form halten",desc:"Gewinne 3 gewertete Partien.",stat:"competitiveWins",target:3,reward:{sp:450,pack:"silver"}},
  {id:"squad",title:"Squad-Battle-Woche",desc:"Spiele 4 Squad Battles.",stat:"squadMatches",target:4,reward:{sp:450,pack:"silver"}},
  {id:"rivals",title:"Rivals-Woche",desc:"Spiele 3 Rivals-Partien.",stat:"rivalsMatches",target:3,reward:{sp:500,coins:1000}},
  {id:"packs",title:"Packs entdecken",desc:"Öffne 3 Packs.",stat:"packs",target:3,reward:{sp:450,pack:"silver"}},
  {id:"market",title:"Transferwoche",desc:"Kaufe 2 Spieler.",stat:"market",target:2,reward:{sp:450,coins:1500}},
  {id:"sbc",title:"SBC-Serie",desc:"Schließe 2 SBCs ab.",stat:"sbcs",target:2,reward:{sp:550,pack:"gold"}}
 ],
 season:[
  {id:"matches",title:"Saisonspieler",desc:"Spiele 20 gewertete Partien.",stat:"competitiveMatches",target:20,reward:{sp:1200,pack:"gold"}},
  {id:"wins",title:"Siegeslauf",desc:"Gewinne 10 gewertete Partien.",stat:"competitiveWins",target:10,reward:{sp:1400,pack:"82"}},
  {id:"squad",title:"Gegen die KI",desc:"Spiele 12 Squad Battles.",stat:"squadMatches",target:12,reward:{sp:1200,coins:3500}},
  {id:"rivals",title:"Division-Fortschritt",desc:"Spiele 10 Rivals-Partien.",stat:"rivalsMatches",target:10,reward:{sp:1300,pack:"gold"}},
  {id:"packs",title:"Pack-Sammler",desc:"Öffne 10 Packs.",stat:"packs",target:10,reward:{sp:1100,pack:"82"}},
  {id:"market",title:"Transferfenster",desc:"Kaufe 4 Spieler.",stat:"market",target:4,reward:{sp:1000,coins:3000}},
  {id:"sbc",title:"SBC-Spezialist",desc:"Schließe 4 SBCs ab.",stat:"sbcs",target:4,reward:{sp:1300,pack:"goldplayers"}}
 ]
};
const OBJECTIVE_GROUPS=["daily","weekly","season"];
const OBJECTIVE_GROUP_NAMES={daily:"Täglich",weekly:"Wöchentlich",season:"Saison"};
const OBJECTIVE_GROUP_SIZE={daily:3,weekly:4,season:4};
const OBJECTIVE_STATS=["competitiveMatches","competitiveWins","rivalsMatches","squadMatches","packs","market","sbcs"];

function seasonInfo(at=new Date()){
 const first=new Date(2026,8,17,19,0,0),date=new Date(at);
 let start=new Date(first),end=new Date(2026,9,22,19,0,0),number=1;
 while(date>=end){start=new Date(end);end=new Date(start);end.setDate(end.getDate()+35);number++}
 return{key:"s"+number,number,start,end}
}
function objectiveStart(group,at){
 const date=new Date(at);
 if(group==="season")return seasonInfo(date).start;
 const start=new Date(date);start.setHours(19,0,0,0);
 if(group==="daily"){if(date<start)start.setDate(start.getDate()-1);return start}
 const weekday=(start.getDay()+6)%7;start.setDate(start.getDate()-weekday);
 if(date<start)start.setDate(start.getDate()-7);
 return start
}
function objectiveWindow(group,at=new Date()){
 const season=seasonInfo(at),start=objectiveStart(group,at),end=group==="season"?season.end:new Date(start);
 if(group==="daily")end.setDate(end.getDate()+1);
 if(group==="weekly")end.setDate(end.getDate()+7);
 const key=group+":"+season.key+":"+start.getTime(),pool=OBJECTIVE_POOLS[group];
 const rotation=group==="season"?season.number-1:Math.floor(start.getTime()/(group==="daily"?86400000:7*86400000));
 const tasks=Array.from({length:OBJECTIVE_GROUP_SIZE[group]},(_,i)=>{
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
 for(const group of OBJECTIVE_GROUPS){
  const window=objectiveWindow(group,at),existing=state.objectiveWindows[group];
  if(existing?.key===window.key)continue;
  state.objectiveWindows[group]={key:window.key,baseline:Object.fromEntries(OBJECTIVE_STATS.map(stat=>[stat,Number(state.stats[stat]||0)]))};
  changed=true
 }
 return changed
}
function objectiveProgress(task){
 const base=Number(state.objectiveWindows[task.group]?.baseline?.[task.stat]||0);
 return Math.min(task.target,Math.max(0,Number(state.stats[task.stat]||0)-base))
}
function activeObjectiveGroups(at=new Date()){return OBJECTIVE_GROUPS.map(group=>objectiveWindow(group,at))}
function availableRotatingObjectiveRewardsCount(){
 ensureObjectiveWindows();
 const taskCount=activeObjectiveGroups().reduce((n,window)=>n+window.tasks.filter(task=>objectiveProgress(task)>=task.target&&!state.objectiveClaims[task.key]).length,0);
 const week=objectiveWindow("weekly"),bonusReady=week.tasks.every(task=>state.objectiveClaims[task.key])&&!state.objectiveBonuses[week.key];
 return taskCount+(bonusReady?1:0)
}
function availablePassRewardsCount(){
 ensureObjectiveWindows();
 return SEASON_REWARDS.reduce((n,tier)=>n+(state.sp>=tier.sp&&!state.seasonPass.freeClaims[tier.level]?1:0)+(state.seasonPass.premium&&state.sp>=tier.sp&&!state.seasonPass.premiumClaims[tier.level]?1:0),0)
}
function availableObjectiveRewardsCount(){
 return availableRotatingObjectiveRewardsCount()+availablePassRewardsCount()
}

const originalGrant=grant;
grant=function(reward){syncSeasonState();originalGrant(reward)};
claimSeasonRewards=function(){syncSeasonState()};
const originalRenderAll=renderAll;
renderAll=function(){const changed=ensureObjectiveWindows();originalRenderAll();if(changed)save()};
let objectiveTab="all";
const WEEKLY_BONUS={sp:500,pack:"gold"};
function passDate(date){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
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
  `<div><strong>Premium-Pass freischalten</strong><p>Zusätzliche Belohnungen auf denselben 30 Stufen. Frühere Stufen bleiben verfügbar. Nur Guthaben aus Gerlies FUT.</p></div><div class="pass-upgrade-actions"><button class="secondary" data-pass-buy="coins" ${state.coins<PASS_PRICE.coins?"disabled":""}>${fmt(PASS_PRICE.coins)} Coins</button><button class="primary" data-pass-buy="points" ${state.points<PASS_PRICE.points?"disabled":""}>${fmt(PASS_PRICE.points)} FC Points</button></div>`;
 host.innerHTML=`<div class="pass-panel"><div class="pass-top"><div><span class="pass-kicker">SEASON PASS · SAISON ${info.number}</span><h3>${info.number===1?"Ones to Watch":"Saison "+info.number}</h3><p>Kostenloser und Premium-Pfad · 30 Stufen · gleiche SP für beide</p></div><span class="pass-time">Endet ${passDate(info.end)}</span></div><div class="pass-progress"><div style="width:${Math.min(100,Math.round(sp/max*100))}%"></div></div><div class="pass-status"><span>Level ${level}/30 · ${fmt(sp)} SP</span><span>${next?`Nächstes Level bei ${fmt(next.sp)} SP`:"Alle Stufen erreicht"}</span></div><div class="pass-upgrade">${upgrade}</div><div class="pass-ladder" aria-label="Saisonbelohnungen">${SEASON_REWARDS.map(tier=>`<div class="pass-tier ${sp>=tier.sp?"reached":""}"><div class="pass-tier-header"><span>LEVEL ${tier.level}</span><small>${fmt(tier.sp)} SP</small></div>${rewardCell(tier,"free")}${rewardCell(tier,"premium")}</div>`).join("")}</div></div>`;
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
 const groups=activeObjectiveGroups(),options=[["all","Alle"],["foundation","Foundations"],["daily","Täglich"],["weekly","Wöchentlich"],["season","Saison"]];
 $("objectiveTabs").innerHTML=options.map(([key,label])=>`<button type="button" data-objective-tab="${key}" class="${objectiveTab===key?"active":""}">${label}</button>`).join("");
 const pending=availableRotatingObjectiveRewardsCount()+TASKS.filter(t=>!state.claims[t.id]&&Number(state.stats[t.stat]||0)>=t.target).length;
 $("objectiveSummary").textContent=`${pending} Belohnung${pending===1?"":"en"} abholbereit · Ziele erneuern sich zu den angezeigten Zeiten.`;
 const sections=[];
 if(objectiveTab==="all"||objectiveTab==="foundation"){
  const tasks=[...TASKS].sort((a,b)=>Number(!!state.claims[a.id])-Number(!!state.claims[b.id])||Number((state.stats[b.stat]||0)>=b.target)-Number((state.stats[a.stat]||0)>=a.target));
  sections.push('<div class="objective-group-head"><strong>Foundations</strong><span>Einmalige Club-Aufgaben</span></div>'+tasks.map(t=>objectiveCard(t,"foundation")).join(""))
 }
 for(const window of groups){
  const group=window.tasks[0]?.group;
  if(objectiveTab!=="all"&&objectiveTab!==group)continue;
  const tasks=[...window.tasks].sort((a,b)=>Number(!!state.objectiveClaims[a.key])-Number(!!state.objectiveClaims[b.key])||Number(objectiveProgress(b)>=b.target)-Number(objectiveProgress(a)>=a.target));
  let html=`<div class="objective-group-head"><strong>${OBJECTIVE_GROUP_NAMES[group]}</strong><span>Bis ${passDate(window.end)}</span></div>`+tasks.map(t=>objectiveCard(t,group)).join("");
  if(group==="weekly"){
   const complete=window.tasks.every(task=>state.objectiveClaims[task.key]),claimed=!!state.objectiveBonuses[window.key];
   html+=`<div class="objective-bonus"><div><b>Wochenbonus · alle 4 Ziele</b><small>${esc(rewardText(WEEKLY_BONUS))}</small></div>${claimed?'<span class="task-state done">ABGEHOLT</span>':`<button class="primary" data-objective-bonus="${esc(window.key)}" ${complete?"":"disabled"}>Abholen</button>`}</div>`
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
  if(!confirm(`Premium-Pass für Saison ${seasonInfo().number} für ${fmt(price)} ${currency==="coins"?"Coins":"FC Points"} freischalten?`))return;
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
 if(bonus.dataset.objectiveBonus!==week.key||state.objectiveBonuses[week.key]||!week.tasks.every(t=>state.objectiveClaims[t.key]))return;
 state.objectiveBonuses[week.key]=true;grant(WEEKLY_BONUS);save();renderAll();toast("Wochenbonus abgeholt.")
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
