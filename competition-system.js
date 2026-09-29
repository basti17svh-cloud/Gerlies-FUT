"use strict";

// All competitive windows use Berlin wall time; the timezone helper in footera-time.js
// converts each boundary to an instant, including the March/October clock changes.
const COMPETITION_WEEK={squad:{weekday:1,hour:9},rivals:{weekday:4,hour:9}};
const SB_DIFFICULTIES={amateur:{label:"Amateur",factor:.60},semi:{label:"Halbprofi",factor:.80},pro:{label:"Profi",factor:1},world:{label:"Weltklasse",factor:1.25},legend:{label:"Legende",factor:1.50},ultimate:{label:"Ultimativ",factor:1.70}};
const SB_STRENGTH={easy:.90,medium:1,hard:1.10,elite:1.15,totw:1.15,event:1.15};
// Primary multi-player packs are tradeable; extra guaranteed-rating packs are untradeable.
const SB_RANKS=[
 {name:"Bronze 3",min:0,primary:[75,1]},
 {name:"Bronze 2",min:1000,primary:[75,2]},
 {name:"Bronze 1",min:2000,primary:[75,3]},
 {name:"Silber 3",min:3200,primary:[75,3],bonus:[78,1]},
 {name:"Silber 2",min:4500,primary:[75,5],bonus:[80,1]},
 {name:"Silber 1",min:6000,primary:[75,5],bonus:[80,3],coins:2000},
 {name:"Gold 3",min:8000,primary:[75,8],bonus:[81,2],coins:5000},
 {name:"Gold 2",min:10500,primary:[75,8],bonus:[82,3],coins:8000},
 {name:"Gold 1",min:13000,primary:[75,10],bonus:[83,3],coins:11000},
 {name:"Elite 3",min:16000,primary:[75,11],bonus:[83,4],coins:15000},
 {name:"Elite 2",min:19000,primary:[75,15],bonus:[84,2],coins:20000},
 {name:"Elite 1",min:22000,primary:[77,15],bonus:[84,3],coins:25000}
];
const RIVALS_LADDER={10:[3,2],9:[4,2],8:[4,2],7:[5,3],6:[5,3],5:[5,3],4:[6,3],3:[6,3],2:[6,3],1:[7,4]};
const RIVALS_REWARDS={
 10:{15:[1500,["gold"]],35:[3000,["gold","gold"]]},
 9:{15:[2500,["gold"]],35:[5000,["goldplayers"]]},
 8:{15:[4000,["goldplayers"]],35:[7000,["goldplayers","electrum"]]},
 7:{15:[5000,["goldplayers"]],35:[9000,["82","goldplayers"]]},
 6:{15:[7500,["82","goldplayers"]],35:[12000,["82","primegold"]]},
 5:{15:[10000,["82","primegold"]],35:[16000,["82","82","primegold"]]},
 4:{15:[13000,["82","82","primegold"]],35:[20000,["85","primegold"]]},
 3:{15:[17000,["82","82","primegold"]],35:[27000,["85","primegold","primegold"]]},
 2:{15:[22000,["85","primegold"]],35:[35000,["85","primegold","primegold","totw-reward"]]},
 1:{15:[30000,["85","primegold","primegold"]],35:[50000,["86","primegold","primegold","totw-reward"]]},
 0:{15:[40000,["86","primegold","primegold"]],35:[65000,["86","primegold","primegold","primegold","totw-reward"]]}
};
function competitionWindow(mode,at=new Date()){
 const rule=COMPETITION_WEEK[mode],start=berlinWeekStart(at,rule.weekday,rule.hour);
 return{key:String(start.getTime()),start,end:berlinShiftDays(start,7,rule.hour)}
}
function sbRank(points){return [...SB_RANKS].reverse().find(x=>points>=x.min)||SB_RANKS[0]}
function sbBattlePoints(result,goals,conceded,difficulty="pro",strength="medium"){
 const raw=(result==="win"?700:200)+Math.min(5,Math.max(0,goals))*40+(conceded===0?100:0);
 return Math.round(raw*(SB_DIFFICULTIES[difficulty]?.factor??1)*(SB_STRENGTH[strength]??1))
}
function sbRankReward(rank){
 const row=SB_RANKS.find(x=>x.name===rank)||SB_RANKS[0],packs=[];
 if(row.primary)packs.push({id:ratingRewardPack(...row.primary),tradeable:row.primary[1]>=5});
 if(row.bonus)packs.push({id:ratingRewardPack(...row.bonus),tradeable:false});
 return{coins:row.coins||0,packs}
}
function rivalsReward(division,milestone){
 const [coins,ids]=RIVALS_REWARDS[division]?.[milestone]||[0,[]];
 return{coins,packs:ids.map(id=>({id,tradeable:true}))}
}
function ratingRewardPack(min,count){
 const id=`reward-${min}-${count}`;
 if(!PACKS.some(p=>p.id===id))PACKS.push({id,name:`${count}× ${min}+ Spieler-Pack`,coins:null,points:null,type:"gold",count,min,max:99,store:false,reward:true,desc:`${count} Goldspieler · jeder mindestens ${min} GES`,iconChance:0});
 return id
}
if(!PACKS.some(p=>p.id==="totw-reward"))PACKS.push({id:"totw-reward",name:"TOTW-Spieler-Pack",coins:null,points:null,type:"special",count:1,min:75,max:99,store:false,reward:true,desc:"1 TOTW-Spieler",iconChance:0});
for(const rank of SB_RANKS){if(rank.primary)ratingRewardPack(...rank.primary);if(rank.bonus)ratingRewardPack(...rank.bonus)}

function ensureCompetitionState(){
 state.squadBattle=state.squadBattle||{week:"",points:0,played:0,playedIds:[],difficulty:"pro"};
 state.rivals=state.rivals||{division:10,points:0};
 state.rivals.step??=Math.min((RIVALS_LADDER[state.rivals.division]||[1])[0],1+Math.floor(Math.max(0,Number(state.rivals.points||0))/3));
 state.rivals.checkpoint??=(RIVALS_LADDER[state.rivals.division]&&state.rivals.step>=RIVALS_LADDER[state.rivals.division][1]?RIVALS_LADDER[state.rivals.division][1]:0);
 state.rivals.streak??=0;state.rivals.skill??=state.rivals.division===0?500:0;
 state.rivals.weeklyPoints??=0;state.rivals.week??="";
 state.weeklyRewards=Array.isArray(state.weeklyRewards)?state.weeklyRewards:[];
 state.rewardPackQueue=Array.isArray(state.rewardPackQueue)?state.rewardPackQueue:[];
 return state
}
function syncCompetitionWeeks(at=new Date()){
 ensureCompetitionState();let changed=false;
 const sb=state.squadBattle,sw=competitionWindow("squad",at);
 if(sb.week!==sw.key){
  if(sb.week&&sb.played>0&&!state.weeklyRewards.some(x=>x.mode==="squad"&&x.week===sb.week)){
   const rank=sbRank(sb.points);state.weeklyRewards.push({mode:"squad",week:sb.week,rank:rank.name,points:sb.points,reward:sbRankReward(rank.name),claimed:false});
  }
  sb.week=sw.key;sb.points=0;sb.played=0;sb.playedIds=[];changed=true
 }
 const rv=state.rivals,rw=competitionWindow("rivals",at);
 if(rv.week!==rw.key){
  const milestone=rv.weeklyPoints>=35?35:rv.weeklyPoints>=15?15:0;
  if(rv.week&&milestone&&!state.weeklyRewards.some(x=>x.mode==="rivals"&&x.week===rv.week)){
   state.weeklyRewards.push({mode:"rivals",week:rv.week,division:rv.division,milestone,points:rv.weeklyPoints,reward:rivalsReward(rv.division,milestone),claimed:false});
  }
  rv.week=rw.key;rv.weeklyPoints=0;changed=true
 }
 if(changed)save();return changed
}
function competitionPending(mode){ensureCompetitionState();return state.weeklyRewards.filter(x=>!x.claimed&&(!mode||x.mode===mode))}
function claimCompetitionReward(mode,week){
 const row=competitionPending(mode).find(x=>x.week===week);if(!row)return false;
 row.claimed=true;state.coins+=row.reward.coins||0;
 for(const pack of row.reward.packs){state.packs[pack.id]=(state.packs[pack.id]||0)+1;if(!pack.tradeable)state.rewardPackQueue.push({id:pack.id,tradeable:false})}
 save();renderAll();if(currentViewId()==="playView")renderPlay();toast(`${mode==="squad"?"Squad-Battles":"Rivals"}-Belohnung abgeholt.`);return true
}
function recordRivalsResult(result){
 const r=state.rivals,before={division:r.division,step:r.step,skill:r.skill,weekly:r.weeklyPoints,streak:r.streak};
 if(result==="win"){
  r.streak++;
  if(r.division===0)r.skill+=25;
  else{
   let next=r.step-1+(r.streak>=3?2:1);
   while(r.division>0&&next>=RIVALS_LADDER[r.division][0]){
    next-=RIVALS_LADDER[r.division][0];r.division--;r.checkpoint=0;
    if(r.division===0){r.skill=500;break}
   }
   if(r.division>0){r.step=next+1;if(r.step>=RIVALS_LADDER[r.division][1])r.checkpoint=RIVALS_LADDER[r.division][1]}
  }
  r.weeklyPoints+=3
 }else if(result==="draw")r.weeklyPoints++;
 else{r.streak=0;if(r.division===0)r.skill=Math.max(0,r.skill-20);else r.step=Math.max(1,r.checkpoint||1,r.step-1)}
 return{mode:"rivals",result,before,after:{division:r.division,step:r.step,skill:r.skill,weekly:r.weeklyPoints,streak:r.streak,checkpoint:r.checkpoint},earned:r.weeklyPoints-before.weekly}
}
function recordSquadBattleResult(result,home,away,opponent,difficulty=state.squadBattle.difficulty){
 const sb=state.squadBattle,before={points:sb.points,rank:sbRank(sb.points).name,played:sb.played},key=String(opponent?.battleId||""),eligible=sb.played<14&&key&&!sb.playedIds.includes(key);
 const earned=eligible?sbBattlePoints(result,home,away,difficulty,opponent?.strengthId):0;
 if(eligible){sb.played++;sb.points+=earned;sb.playedIds.push(key)}
 return{mode:"squad",result,before,after:{points:sb.points,rank:sbRank(sb.points).name,played:sb.played},earned,eligible}
}
function recordCompetitionMatch(mode,result,home,away,opponent,difficulty){
 if(!COMPETITION_WEEK[mode])return null;
 syncCompetitionWeeks();
 return mode==="rivals"?recordRivalsResult(result):recordSquadBattleResult(result,home,away,opponent,difficulty)
}

function battleEventTeam(at=new Date()){
 const now=new Date(at).getTime();
 const ready=e=>e.id===MOMENTUM_EVENT.id?e.players?.length===MOMENTUM_EVENT.players.length:completeEventRoster(e);
 return EVENT_PROMO_RELEASES.find(e=>ready(e)&&eventPackIsActive(e,now))
  ||[...EVENT_PROMO_RELEASES].reverse().find(e=>ready(e)&&Date.parse(e.activeFrom)<=now)
  ||null
}
function bronzeBattleFillers(event,key){
 if(completeEventRoster(event))return[];
 if(event.id!==MOMENTUM_EVENT.id)return[];
 const used=new Set(event.players.map(x=>String(x.pid))),pool=PLAYERS.filter(p=>Number(p.ovr)<65&&playerGender(p)!=="female"&&!used.has(String(p.id))),goalkeepers=pool.filter(p=>p.position==="GK"),fields=pool.filter(p=>p.position!=="GK");
 const keeper=deterministicPick(goalkeepers,key+"|bronze-gk"),others=[];
 for(let i=0;i<3;i++){const p=deterministicPick(fields.filter(x=>!others.includes(x)),`${key}|bronze-${i}`);if(p)others.push(p)}
 return[keeper,...others].filter(Boolean)
}
function battleSpecialOpponent(kind,key){
 const event=kind==="event"?battleEventTeam():null;
 if(kind==="event"&&!event)return null;
 const entries=kind==="event"?promoEventEntries(event):liveTotwTeamEntries();
 if(!entries.length)return null;
 const used=new Set(),formation="4-3-3",slots=FORMATIONS[formation],xi=[];
 for(const slot of slots){
  const entry=entries.find(x=>!used.has(x)&&posFit(x.player,slot.p)>0)||entries.find(x=>!used.has(x));
  if(entry){xi.push(entry);used.add(entry)}
 }
 const rest=entries.filter(x=>!used.has(x));
 const base=kind==="event"?[...xi,...rest,...bronzeBattleFillers(event,key)]:[...xi,...rest];
 const rows=base.slice(0,18).map(x=>x?.player?{player:x.player,item:x.item}:{player:x,item:null});
 if(kind==="totw"){
  const fillers=PLAYERS.filter(p=>p.ovr>=65&&p.ovr<=75&&!rows.some(x=>String(x.player?.id)===String(p.id)));
  while(rows.length<18&&fillers.length){const pick=deterministicPick(fillers,key+"|filler-"+rows.length);rows.push({player:pick,item:null});fillers.splice(fillers.indexOf(pick),1)}
 }
 const squad=rows.map(x=>x.player),items=rows.map(x=>x.item),rating=Math.round(squad.slice(0,11).reduce((n,p)=>n+Number(p?.ovr||0),0)/11);
 const chem=typeof opponentChemistryTotal==="function"?opponentChemistryTotal(squad,formation,items):0;
 return{kind:"generated",name:kind==="event"?`${event.name} ${event.subtitle||""}`.trim():totwDisplayName(LIVE_TOTW.name),formation,rating,chem,squad,items,
  tier:kind==="event"?(eventPackIsActive(event)?"Event-Team":"Event-Team · Archiv"):"Team der Woche",strengthId:kind,battleId:`${key}:${kind}`,rewards:{win:850,loss:330},sp:100,power:rating+chem*.12}
}

function rewardLabel(row){
 const packs=row.reward.packs.map(p=>PACKS.find(x=>x.id===p.id)?.name||p.id).join(" · ");
 return`${row.reward.coins?`${fmt(row.reward.coins)} Coins · `:""}${packs}`
}
function competitionClaimButtons(mode){return competitionPending(mode).map(row=>`<button class="primary competition-claim" type="button" data-claim-competition="${row.mode}" data-competition-week="${row.week}">${row.mode==="squad"?"Squad-Battles":"Rivals"}-Belohnung abholen · ${esc(rewardLabel(row))}</button>`).join("")}
function competitionCountdown(mode){return seasonCountdown(competitionWindow(mode).end).replace("Endet", "Reset")}
function rivalsStageLabel(r){return r.division===0?`ELITE · Skill-Rating ${r.skill}`:`DIVISION ${r.division} · STUFE ${r.step}/${RIVALS_LADDER[r.division][0]}`}
function renderCompetitionModeStatus(){
 syncCompetitionWeeks();const sb=state.squadBattle,r=state.rivals;
 const sbText=`${sbRank(sb.points).name.toUpperCase()} · ${fmt(sb.points)} BP · ${sb.played}/14 gewertete Spiele · Reset Montag 09:00 · ${competitionCountdown("squad")}`;
 const rvText=`${rivalsStageLabel(r)} · ${r.weeklyPoints}/35 Wochenpunkte · Reset Donnerstag 09:00 · ${competitionCountdown("rivals")}`;
 $("sbRecord").textContent=sbText;$("rvRecord").textContent=rvText;
 $("sbWeeklyCard").innerHTML=competitionClaimButtons("squad");$("rvWeeklyCard").innerHTML=competitionClaimButtons("rivals")
}
function renderCompetitionHome(){
 const host=$("competitionHome");if(!host)return;
 const s=seasonInfo();
 host.innerHTML=`<div class="competition-tile season-only"><small>SEASON ${s.number} · ${esc(s.name)}</small><strong>${seasonCountdown(s.end)}</strong><span>${s.end?`Endet ${passDate(s.end,true)}`:"Start "+passDate(s.start)}</span></div>`
}
function renderCompetitionProgress(snapshot){
 const host=$("competitionProgress");if(!host)return;
 if(!snapshot){host.innerHTML="";return}
 if(snapshot.mode==="squad"){
  const a=snapshot.after,b=snapshot.before,rank=sbRank(a.points),next=SB_RANKS.find(x=>x.min>a.points),pct=next?Math.max(0,Math.min(100,Math.round((a.points-rank.min)/(next.min-rank.min)*100))):100;
  host.innerHTML=`<div class="competition-result ${a.rank!==b.rank?"promoted":""}"><small>SQUAD BATTLES · ${snapshot.result==="win"?"SIEG":"NIEDERLAGE"}</small><strong>+${fmt(snapshot.earned)} BATTLE-PUNKTE</strong><p>${fmt(b.points)} → ${fmt(a.points)} BP</p><b>${esc(b.rank)} ${b.rank!==a.rank?"→ "+esc(a.rank):""}</b><div class="competition-bar"><i style="width:${pct}%"></i></div><span>${a.played}/14 GEWERTETE SPIELE · RESET MONTAG 09:00</span>${!snapshot.eligible?"<em>Weiterhin Coins und Ziele · keine weiteren BP</em>":""}</div>`
 }else{
  const a=snapshot.after,b=snapshot.before,up=a.division<b.division,protectedStep=snapshot.result==="loss"&&b.step===a.step&&a.checkpoint>0;
  host.innerHTML=`<div class="competition-result ${up?"promoted":""}"><small>DIVISION RIVALS · ${snapshot.result==="win"?"SIEG":snapshot.result==="draw"?"REMIS":"NIEDERLAGE"}</small><strong>+${snapshot.earned} WOCHENPUNKTE</strong><p>${b.weekly} → ${a.weekly}/35</p><b>${up?`AUFSTIEG · DIVISION ${a.division||"ELITE"}`:esc(rivalsStageLabel(a))}</b>${a.division!==0?`<span>STUFE ${b.step} → ${a.step} · CHECKPOINT ${a.checkpoint||"OFFEN"}</span>`:""}<div class="competition-bar"><i style="width:${Math.min(100,Math.round(a.weekly/35*100))}%"></i></div><span>RESET DONNERSTAG 09:00 · ${competitionCountdown("rivals")}</span>${a.streak>=2?`<em>SIEGESSERIE ×${a.streak}</em>`:""}${protectedStep?"<em>CHECKPOINT AKTIV · KEIN RÜCKFALL</em>":""}</div>`
 }
}
document.addEventListener("click",e=>{const button=e.target.closest("[data-claim-competition]");if(button)claimCompetitionReward(button.dataset.claimCompetition,button.dataset.competitionWeek)});
syncCompetitionWeeks();
setInterval(()=>{
 const changed=syncCompetitionWeeks();
 if(currentViewId()==="homeView")renderCompetitionHome();
 if(currentViewId()==="playView")renderCompetitionModeStatus();
 if(changed)updateObjectiveIndicators()
},60000);
