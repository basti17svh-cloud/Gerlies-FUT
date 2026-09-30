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
function seasonTierReward(tier,which,seasonKey=seasonInfo().key){
 if(which==="free"&&seasonKey==="s1"&&(tier.level===15||tier.level===30))return{story:`s1-${tier.level}`};
 return which==="premium"?tier.premium:tier.reward
}

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
  const free=seasonTierReward(tier,"free",pass.key);
  if(!pass.freeClaims?.[tier.level]||free.story)grantSeasonOnly(free);
  if(pass.premium&&!pass.premiumClaims?.[tier.level])grantSeasonOnly(seasonTierReward(tier,"premium",pass.key))
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
 const keys=activeObjectiveGroupKeys(at),seasonWindow=objectiveWindow("season",at);
 keys.sort((a,b)=>a==="season"?-1:b==="season"?1:0);
 for(const group of keys){
  const window=objectiveWindow(group,at);if(!window)continue;
  const existing=state.objectiveWindows[group];if(existing?.key===window.key)continue;
  const sharedSeasonBaseline=["squad","rivals"].includes(group)&&state.objectiveWindows.season?.key===seasonWindow?.key?state.objectiveWindows.season.baseline:null;
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
function passRewardItems(reward){
 const out=[];
 if(reward?.story){
  const spec=STORY_PASS_PLAYERS[reward.story];
  if(spec)out.push({type:"story",label:`${spec.rating} ${spec.name}`,sub:"Story-Spieler · einmalig · untauschbar",visual:`<div class="pass-reward-player">${storyPreviewCard(reward.story)}</div>`})
 }
 if(reward?.coins)out.push({type:"coins",label:`${fmt(reward.coins)} Münzen`,sub:"Footera Münzen",visual:`<div class="pass-reward-currency">${currencyAmountHTML("coins",reward.coins,"pass-currency-hero")}</div>`});
 if(reward?.points)out.push({type:"points",label:`${fmt(reward.points)} Footera Points`,sub:"Footera Points",visual:`<div class="pass-reward-currency">${currencyAmountHTML("points",reward.points,"pass-currency-hero")}</div>`});
 if(reward?.sp)out.push({type:"sp",label:`${fmt(reward.sp)} Season Points`,sub:"Season Points",visual:`<div class="pass-reward-sp"><strong>SP</strong><b>${fmt(reward.sp)}</b></div>`});
 if(reward?.pack){
  const pack=PACKS.find(p=>p.id===reward.pack),qty=Math.max(1,Number(reward.qty||1)),name=pack?.name||"Pack";
  out.push({type:"pack",label:`${qty>1?`${qty}× `:""}${name}`,sub:pack?.desc||"Pack-Belohnung",visual:`<div class="pass-reward-pack"><img src="${packArtSrc(reward.pack)}" alt="${esc(name)}" loading="lazy">${qty>1?`<span>${qty}×</span>`:""}</div>`})
 }
 if(reward?.coinBoost){
  const games=Math.max(0,Number(reward.coinBoost.games||0)),amount=Math.max(0,Number(reward.coinBoost.amount||0));
  out.push({type:"boost",label:`+${fmt(amount)} Münzen × ${games} Spiele`,sub:"Coin-Boost",visual:`<div class="pass-reward-currency boost">${currencyAmountHTML("coins",amount,"pass-currency-hero")}<small>× ${games} Spiele</small></div>`})
 }
 return out.length?out:[{type:"reward",label:"Belohnung",sub:"Season Pass",visual:'<div class="pass-reward-sp"><strong>★</strong></div>'}]
}
function passRewardSlider(reward,tier,which){
 const items=passRewardItems(reward),key=`${which}-${tier.level}`,multi=items.length>1;
 return `<div class="pass-reward-slider" data-pass-carousel="${key}"><div class="pass-reward-slides">${items.map((item,index)=>`<div class="pass-reward-slide" data-pass-slide="${index}"><div class="pass-reward-visual">${item.visual}</div><strong class="pass-reward-name">${esc(item.label)}</strong><span class="pass-reward-sub">${esc(item.sub)}</span></div>`).join("")}</div>${multi?`<button type="button" class="pass-slide-arrow prev" data-pass-slide-nav="-1" aria-label="Vorherige Belohnung">‹</button><button type="button" class="pass-slide-arrow next" data-pass-slide-nav="1" aria-label="Nächste Belohnung">›</button><div class="pass-slide-footer"><div class="pass-slide-dots">${items.map((_,index)=>`<button type="button" class="${index===0?"active":""}" data-pass-slide-dot="${index}" aria-label="Belohnung ${index+1}"></button>`).join("")}</div><span class="pass-slide-count">1/${items.length}</span></div>`:""}</div>`
}
function rewardPanel(tier,which){
 const premium=which==="premium",unlocked=Number(state.sp||0)>=tier.sp,owned=!premium||state.seasonPass.premium,claimed=!!passClaims(which)[tier.level];
 const reward=seasonTierReward(tier,which),items=passRewardItems(reward),story=!!reward.story;
 const action=claimed?'<em class="pass-claim-state done">ABGEHOLT</em>':unlocked&&owned?`<button class="primary pass-claim-button" data-pass-claim="${which}" data-pass-level="${tier.level}">${items.length>1?"Belohnungen abholen":"Abholen"}</button>`:
  `<em class="pass-claim-state">${!owned?"PREMIUM GESPERRT":unlocked?"BEREIT":`${fmt(tier.sp)} SP NÖTIG`}</em>`;
 return `<div class="pass-path-panel ${which==="free"?"active ":""}${premium?"premium":"free"} ${story?"story-reward":""} ${claimed?"claimed":""} ${!owned?"locked":""}" data-pass-path-panel="${which}">${passRewardSlider(reward,tier,which)}<div class="pass-level-card-action">${action}</div></div>`
}
function passLevelCard(tier){
 const freeReward=seasonTierReward(tier,"free"),story=!!freeReward?.story,premiumLocked=!state.seasonPass.premium;
 return `<div class="pass-level-card ${story?"story-level":""}" data-pass-level-card="${tier.level}"><div class="pass-level-card-head"><div><span>LEVEL ${tier.level}</span><small>${fmt(tier.sp)} SP</small></div>${story?'<b class="story-badge">STORY</b>':""}</div><div class="pass-path-toggle" role="tablist" aria-label="Belohnungspfad"><button type="button" class="active" data-pass-path-toggle="free" aria-selected="true">Kostenlos</button><button type="button" data-pass-path-toggle="premium" aria-selected="false">Premium${premiumLocked?" 🔒":""}</button></div><div class="pass-path-panels">${rewardPanel(tier,"free")}${rewardPanel(tier,"premium")}</div></div>`
}
function storyPassChapters(info){
 if(info.key!=="s1")return"";
 const cards=[15,30].map(level=>{
  const spec=STORY_PASS_PLAYERS[`s1-${level}`],tier=SEASON_REWARDS.find(t=>t.level===level),claimed=!!state.seasonPass.freeClaims[level];
  return `<div class="pass-story-chapter"><div class="pass-story-visual">${storyPreviewCard(`s1-${level}`)}</div><div class="pass-story-copy"><small>KAPITEL ${level===15?"I":"II"} · STUFE ${level}</small><strong>${esc(spec.chapter)} · ${spec.rating} ${esc(spec.name)}</strong><p>${claimed?"In deinem Verein":state.sp>=tier.sp?"Jetzt kostenlos abholen":`${fmt(tier.sp)} SP · kostenloser Pfad`} · einmalig und untauschbar</p><button type="button" data-pass-jump="${level}">Zu Stufe ${level}</button></div></div>`
 }).join("");
 return `<div class="pass-story-chapters">${cards}</div><p class="pass-story-note">Beide Story-Spieler gehören zu Season 1. Sie erscheinen weder in Packs, SBCs noch auf dem Transfermarkt und bleiben nach der Saison im Verein.</p>`
}
function renderSeasonPass(){
 const host=$("seasonPass");if(!host)return;
 if(ensureObjectiveWindows())save();
 const info=seasonInfo(),sp=Math.max(0,Number(state.sp||0)),max=SEASON_REWARDS[SEASON_REWARDS.length-1].sp;
 const next=SEASON_REWARDS.find(t=>t.sp>sp),level=Math.max(1,SEASON_REWARDS.filter(t=>sp>=t.sp).length);
 const upgrade=state.seasonPass.premium?'<strong>✓ Premium aktiviert</strong><p>Beide Spuren verwenden dieselben Season Points. Bereits erreichte Premium-Stufen können abgeholt werden.</p>':
  `<div><strong>Premium-Pass freischalten</strong><p>Zusätzliche Belohnungen auf denselben 30 Stufen. Frühere Stufen bleiben verfügbar.</p></div><div class="pass-upgrade-actions"><button class="secondary" data-pass-buy="coins" ${state.coins<PASS_PRICE.coins?"disabled":""}>${currencyIconHTML("coins")}${fmt(PASS_PRICE.coins)}</button><button class="primary" data-pass-buy="points" ${state.points<PASS_PRICE.points?"disabled":""}>${currencyIconHTML("points")}${fmt(PASS_PRICE.points)}</button></div>`;
 host.innerHTML=`<div class="pass-panel"><div class="pass-top"><div><span class="pass-kicker">SEASON ${info.number} · ${esc(info.name)}</span><h3>${esc(info.name)}</h3><p>30 Stufen · eine Belohnung im Fokus · bei mehreren Inhalten nach links oder rechts wischen.</p></div><span class="pass-time">Start ${passDate(info.start)}<br>${info.end?`Endet ${passDate(info.end,true)}<br>`:""}<strong>${seasonCountdown(info.end)}</strong></span></div><div class="pass-progress"><div style="width:${Math.min(100,Math.round(sp/max*100))}%"></div></div><div class="pass-status"><span>Level ${level}/30 · ${fmt(Math.min(sp,max))} / ${fmt(max)} SP</span><span>${next?`Nächstes Level bei ${fmt(next.sp)} SP`:"Alle Stufen erreicht"}</span></div><div class="pass-upgrade">${upgrade}</div><div class="pass-ladder pass-level-stack" aria-label="Saisonbelohnungen">${SEASON_REWARDS.map(tier=>`<section class="pass-level-row ${sp>=tier.sp?"reached":""} ${tier.level===level?"current":""}" data-pass-tier="${tier.level}"><div class="pass-level-rail"><span>${tier.level}</span></div><div class="pass-level-cards">${passLevelCard(tier)}</div></section>`).join("")}</div></div>`
}
function objectiveCard(task,group,featured=false){
 const foundation=group==="foundation",value=foundation?Math.min(task.target,Number(state.stats[task.stat]||0)):objectiveProgress(task);
 const done=foundation?!!state.claims[task.id]:!!state.objectiveClaims[task.key],ready=value>=task.target;
 const claim=foundation?`data-claim="${task.id}"`:`data-objective-claim="${esc(task.key)}"`;
 return `<div class="task ${ready&&!done?"claimable":done?"completed":""}"><div class="tasktop"><div>${featured?`<small class="objective-category">${esc(group==="foundation"?"Foundations":OBJECTIVE_GROUP_NAMES[group])}</small>`:""}<h4>${esc(task.title)}</h4><p>${esc(task.desc)}</p><span class="task-state ${done?"done":ready?"ready":""}">${done?"ABGEHOLT":ready?"ABGESCHLOSSEN":"IN ARBEIT"}</span></div><div class="reward">${esc(rewardText(task.reward))}</div></div><div class="progress" style="margin-top:7px"><div style="width:${Math.min(100,Math.round(value/task.target*100))}%"></div></div><div class="taskfoot"><small>${value}/${task.target}</small>${done?'<span style="font-size:9px;color:#79f2a9">ERLEDIGT</span>':`<button class="primary" ${claim} ${ready?"":"disabled"}>Abholen</button>`}</div></div>`
}
function weeklyBonusCard(window){
 const claimedCount=window.tasks.filter(task=>state.objectiveClaims[task.key]).length,complete=weeklyBonusReady(window),claimed=!!state.objectiveBonuses[window.key];
 return `<div class="objective-bonus"><div><b>Wochenmeister · 5 von 6 Zielen</b><small>${claimedCount}/6 abgeschlossen · ${esc(rewardText(WEEKLY_BONUS))}</small></div>${claimed?'<span class="task-state done">ABGEHOLT</span>':`<button class="primary" data-objective-bonus="${esc(window.key)}" ${complete?"":"disabled"}>Abholen</button>`}</div>`
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
 if(objectiveTab==="all"){
  const readyFoundations=TASKS.filter(t=>!state.claims[t.id]&&Number(state.stats[t.stat]||0)>=t.target);
  const readyRotating=groups.flatMap(window=>window.tasks.filter(t=>!state.objectiveClaims[t.key]&&objectiveProgress(t)>=t.target));
  const week=groups.find(window=>window.tasks[0]?.group==="weekly"),readyBonus=week&&weeklyBonusReady(week)&&!state.objectiveBonuses[week.key];
  if(readyFoundations.length||readyRotating.length||readyBonus){
   sections.push(`<div class="objective-ready-head"><strong>Jetzt abholen</strong><span>${pending} Belohnung${pending===1?"":"en"}</span></div>`+
    readyFoundations.map(t=>objectiveCard(t,"foundation",true)).join("")+
    readyRotating.map(t=>objectiveCard(t,t.group,true)).join("")+
    (readyBonus?weeklyBonusCard(week):""))
  }
 }
 if(objectiveTab==="all"||objectiveTab==="foundation"){
  const tasks=TASKS.filter(t=>objectiveTab!=="all"||state.claims[t.id]||Number(state.stats[t.stat]||0)<t.target).sort((a,b)=>Number(!!state.claims[a.id])-Number(!!state.claims[b.id])||Number((state.stats[b.stat]||0)>=b.target)-Number((state.stats[a.stat]||0)>=a.target));
  sections.push('<div class="objective-group-head"><strong>Foundations</strong><span>Einmalige Club-Aufgaben</span></div>'+tasks.map(t=>objectiveCard(t,"foundation")).join(""))
 }
 for(const window of groups){
  const group=window.tasks[0]?.group;if(!group)continue;
  const tabGroup=group.startsWith("catchup")?"catchup":group;
  if(objectiveTab!=="all"&&objectiveTab!==tabGroup)continue;
  const tasks=window.tasks.filter(t=>objectiveTab!=="all"||state.objectiveClaims[t.key]||objectiveProgress(t)<t.target).sort((a,b)=>Number(!!state.objectiveClaims[a.key])-Number(!!state.objectiveClaims[b.key])||Number(objectiveProgress(b)>=b.target)-Number(objectiveProgress(a)>=a.target));
  let html=`<div class="objective-group-head"><strong>${OBJECTIVE_GROUP_NAMES[group]}</strong><span>Bis ${passDate(window.end)}</span></div>`;
  if(group==="weekly"){
   if(objectiveTab!=="all"&&weeklyBonusReady(window)&&!state.objectiveBonuses[window.key])html+=weeklyBonusCard(window)
  }
  html+=tasks.map(t=>objectiveCard(t,group)).join("");
  if(group==="weekly"&&(!weeklyBonusReady(window)||state.objectiveBonuses[window.key]))html+=weeklyBonusCard(window);
  sections.push(html)
 }
 $("taskList").innerHTML=sections.join("")
}
$("objectiveTabs").addEventListener("click",event=>{
 const button=event.target.closest("[data-objective-tab]");if(!button)return;
 objectiveTab=button.dataset.objectiveTab;renderTasks()
});
$("seasonPass").addEventListener("click",event=>{
 const pathToggle=event.target.closest("[data-pass-path-toggle]");
 if(pathToggle){
  const card=pathToggle.closest("[data-pass-level-card]"),which=pathToggle.dataset.passPathToggle;if(!card||!["free","premium"].includes(which))return;
  card.querySelectorAll("[data-pass-path-toggle]").forEach(button=>{const on=button.dataset.passPathToggle===which;button.classList.toggle("active",on);button.setAttribute("aria-selected",String(on))});
  card.querySelectorAll("[data-pass-path-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.passPathPanel===which));
  return
 }
 const nav=event.target.closest("[data-pass-slide-nav]"),dot=event.target.closest("[data-pass-slide-dot]");
 if(nav||dot){
  const slider=(nav||dot).closest(".pass-reward-slider"),track=slider?.querySelector(".pass-reward-slides");if(!track)return;
  const slides=[...track.children],current=Math.round(track.scrollLeft/Math.max(1,track.clientWidth)),target=dot?Number(dot.dataset.passSlideDot):Math.max(0,Math.min(slides.length-1,current+Number(nav.dataset.passSlideNav||0)));
  track.scrollTo({left:target*track.clientWidth,behavior:"smooth"});return
 }
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
 passClaims(which)[level]=true;grantSeasonOnly(seasonTierReward(tier,which));
 save();renderAll();toast(`Level ${level}: Belohnung abgeholt.`)
});
$("seasonPass").addEventListener("scroll",event=>{
 const track=event.target?.classList?.contains("pass-reward-slides")?event.target:null;if(!track)return;
 const slider=track.closest(".pass-reward-slider"),dots=[...slider.querySelectorAll("[data-pass-slide-dot]")];if(!dots.length)return;
 const index=Math.max(0,Math.min(dots.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
 dots.forEach((dot,i)=>dot.classList.toggle("active",i===index));
 const count=slider.querySelector(".pass-slide-count");if(count)count.textContent=`${index+1}/${dots.length}`
},true);
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
capSeasonSp();ensureObjectiveWindows();save();
setInterval(()=>{
 if(!ensureObjectiveWindows())return;
 save();
 updateObjectiveIndicators();
 if($("objectivesView")?.classList.contains("active"))renderTasks();
 if($("seasonPassView")?.classList.contains("active"))renderSeasonPass();
 if($("homeView")?.classList.contains("active"))renderHome()
},60000);
