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
 state.squadBattle=state.squadBattle||{week:"",points:0,played:0,playedIds:[],difficulty:"pro",refreshesUsed:0,setSeq:0,setPlayed:0};
 const sb=state.squadBattle;sb.refreshesUsed??=0;sb.setSeq??=Math.floor(Math.max(0,Number(sb.played||0))/4);sb.setPlayed??=0;
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
  sb.week=sw.key;sb.points=0;sb.played=0;sb.playedIds=[];sb.refreshesUsed=0;sb.setSeq=0;sb.setPlayed=0;changed=true
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
 if(eligible){
  sb.played++;sb.points+=earned;sb.playedIds.push(key);
  if(Number.isInteger(opponent?.battleSet)&&Number(opponent.battleSet)===Number(sb.setSeq)){
   sb.setPlayed=Math.max(0,Number(sb.setPlayed||0))+1;
   if(sb.setPlayed>=4){sb.setSeq=Math.max(0,Number(sb.setSeq||0))+1;sb.setPlayed=0}
  }
 }
 return{mode:"squad",result,before,after:{points:sb.points,rank:sbRank(sb.points).name,played:sb.played},earned,eligible}
}
function squadBattleRefreshRemaining(){ensureCompetitionState();return Math.max(0,4-Number(state.squadBattle.refreshesUsed||0))}
function refreshSquadBattleOpponents(){
 syncCompetitionWeeks();const sb=state.squadBattle;
 if(sb.played>=12||squadBattleRefreshRemaining()<=0)return false;
 sb.refreshesUsed=Math.max(0,Number(sb.refreshesUsed||0))+1;sb.setSeq=Math.max(0,Number(sb.setSeq||0))+1;sb.setPlayed=0;
 if(typeof squadBattleOpponentCache!=="undefined")squadBattleOpponentCache={key:"",list:[]};
 save();return true
}
function recordCompetitionMatch(mode,result,home,away,opponent,difficulty){
 if(!COMPETITION_WEEK[mode])return null;
 syncCompetitionWeeks();
 return mode==="rivals"?recordRivalsResult(result):recordSquadBattleResult(result,home,away,opponent,difficulty)
}

function eventTeamEntryRating(entry){return Number(entry?.player?.ovr??entry?.item?.displayRating??entry?.info?.ovr??0)||0}
function eventTeamPositionQuality(entry,slot){
 const player=entry?.player;if(!player)return 0;
 const target=String(slot||"").toUpperCase(),primary=String(player.position||"").toUpperCase();
 if(primary===target)return 2;
 return posFit(player,target)>0?1:0
}
function eventTeamEntryIsHighlight(entry,maxRating=0){
 const info=entry?.info||{},item=entry?.item||{};
 if(info.highlight===true||info.headliner===true||info.featured===true||info.hero===true||item.highlight===true||item.headliner===true||["highlight","headliner","featured"].includes(String(info.priority||"").toLowerCase()))return true;
 return maxRating>0&&eventTeamEntryRating(entry)>=maxRating-1
}
function eventTeamSolveFormation(entries,formation){
 const slots=FORMATIONS[formation]||FORMATIONS["4-3-3"]||[],candidates=(entries||[]).filter(e=>e?.player),size=1<<slots.length,maxRating=candidates.reduce((m,e)=>Math.max(m,eventTeamEntryRating(e)),0);
 let scores=new Float64Array(size);scores.fill(-Infinity);scores[0]=0;
 const choices=[];
 for(const entry of candidates){
  const next=scores.slice(),choice=new Int8Array(size),rating=eventTeamEntryRating(entry),highlight=eventTeamEntryIsHighlight(entry,maxRating);choice.fill(-1);
  for(let mask=0;mask<size;mask++){
   if(!Number.isFinite(scores[mask]))continue;
   for(let slot=0;slot<slots.length;slot++){
    const bit=1<<slot;if(mask&bit)continue;
    const quality=eventTeamPositionQuality(entry,slots[slot].p),points=(quality?1e12:0)+(highlight?1e9:0)+rating*1e5+(quality===2?1000:0),nextMask=mask|bit;
    if(scores[mask]+points>next[nextMask]){next[nextMask]=scores[mask]+points;choice[nextMask]=slot}
   }
  }
  scores=next;choices.push(choice)
 }
 let mask=size-1;
 if(!Number.isFinite(scores[mask])){
  let bestMask=0,bestCount=-1,bestScore=-Infinity;
  for(let m=0;m<size;m++){if(!Number.isFinite(scores[m]))continue;let bits=m,count=0;while(bits){bits&=bits-1;count++}if(count>bestCount||(count===bestCount&&scores[m]>bestScore)){bestMask=m;bestCount=count;bestScore=scores[m]}}
  mask=bestMask
 }
 const xi=Array(slots.length).fill(null);
 for(let n=candidates.length-1;n>=0;n--){const slot=choices[n][mask];if(slot>=0){xi[slot]=candidates[n];mask^=1<<slot}}
 const used=new Set(xi.filter(Boolean)),starters=xi.filter(Boolean),fitCount=xi.reduce((n,e,slot)=>n+(e&&eventTeamPositionQuality(e,slots[slot].p)>0?1:0),0),exactCount=xi.reduce((n,e,slot)=>n+(e&&eventTeamPositionQuality(e,slots[slot].p)===2?1:0),0);
 const highlightCount=starters.filter(e=>eventTeamEntryIsHighlight(e,maxRating)).length,ratingSum=starters.reduce((n,e)=>n+eventTeamEntryRating(e),0);
 const bench=candidates.filter(e=>!used.has(e)).sort((a,b)=>Number(eventTeamEntryIsHighlight(b,maxRating))-Number(eventTeamEntryIsHighlight(a,maxRating))||eventTeamEntryRating(b)-eventTeamEntryRating(a)||Number(a.index??0)-Number(b.index??0));
 return{formation,slots,xi,bench,filled:starters.length,fitCount,exactCount,highlightCount,ratingSum}
}
function eventTeamLineup(entries,{preferredFormation="",formations=null}={}){
 const names=(Array.isArray(formations)&&formations.length?formations:Object.keys(FORMATIONS)).filter(name=>Array.isArray(FORMATIONS[name])&&FORMATIONS[name].length===11);
 if(preferredFormation&&FORMATIONS[preferredFormation]&&!names.includes(preferredFormation))names.unshift(preferredFormation);
 let best=null;
 const better=current=>{
  if(!best)return true;
  for(const key of ["filled","fitCount","highlightCount","ratingSum","exactCount"])if(current[key]!==best[key])return current[key]>best[key];
  const cp=current.formation===preferredFormation,bp=best.formation===preferredFormation;if(cp!==bp)return cp;
  return String(current.formation).localeCompare(String(best.formation),"de")<0
 };
 for(const formation of names){const current=eventTeamSolveFormation(entries,formation);if(better(current))best=current}
 return best||{formation:"4-3-3",slots:FORMATIONS["4-3-3"]||[],xi:[],bench:[...(entries||[])],filled:0,fitCount:0,exactCount:0,highlightCount:0,ratingSum:0}
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
 const lineup=eventTeamLineup(entries,{preferredFormation:event?.preferredFormation||event?.formation||""}),formation=lineup.formation||"4-3-3",slots=lineup.slots||FORMATIONS[formation]||FORMATIONS["4-3-3"],xi=(lineup.xi||[]).filter(Boolean),used=new Set(xi);
 const rest=lineup.bench||entries.filter(x=>!used.has(x));
 const base=kind==="event"?[...xi,...rest,...bronzeBattleFillers(event,key)]:[...xi,...rest];
 const rows=base.slice(0,18).map(x=>x?.player?{player:x.player,item:x.item}:{player:x,item:null});
 if(kind==="totw"){
  const fillers=PLAYERS.filter(p=>p.ovr>=65&&p.ovr<=75&&!rows.some(x=>String(x.player?.id)===String(p.id)));
  while(rows.length<18&&fillers.length){const pick=deterministicPick(fillers,key+"|filler-"+rows.length);rows.push({player:pick,item:null});fillers.splice(fillers.indexOf(pick),1)}
 }
 const squad=rows.map(x=>x.player),items=rows.map(x=>x.item),rating=Math.round(squad.slice(0,11).reduce((n,p)=>n+Number(p?.ovr||0),0)/11);
 const chem=typeof opponentChemistryTotal==="function"?opponentChemistryTotal(squad,formation,items):0;
 return{kind:"generated",eventReleaseId:event?.id||"",name:kind==="event"?`${event.name} ${event.subtitle||""}`.trim():totwDisplayName(LIVE_TOTW.name),formation,rating,chem,squad,items,
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
  const a=snapshot.after,b=snapshot.before,up=a.division<b.division,protectedStep=snapshot.result==="loss"&&b.step===a.step&&a.checkpoint>0,q=snapshot.championsQualification;
  const championsLine=q?`<em>CHAMPIONS · +${fmt(q.earned)} CP · ${fmt(q.before)} → ${fmt(q.after)} / ${fmt(q.target)}${q.qualifiedAfter&&!q.qualifiedBefore?" · QUALIFIZIERT":""}</em>`:"";
  host.innerHTML=`<div class="competition-result ${up?"promoted":""}"><small>DIVISION RIVALS · ${snapshot.result==="win"?"SIEG":snapshot.result==="draw"?"REMIS":"NIEDERLAGE"}</small><strong>+${snapshot.earned} WOCHENPUNKTE</strong><p>${b.weekly} → ${a.weekly}/35</p><b>${up?`AUFSTIEG · DIVISION ${a.division||"ELITE"}`:esc(rivalsStageLabel(a))}</b>${a.division!==0?`<span>STUFE ${b.step} → ${a.step} · CHECKPOINT ${a.checkpoint||"OFFEN"}</span>`:""}<div class="competition-bar"><i style="width:${Math.min(100,Math.round(a.weekly/35*100))}%"></i></div><span>RESET DONNERSTAG 09:00 · ${competitionCountdown("rivals")}</span>${championsLine}${a.streak>=2?`<em>SIEGESSERIE ×${a.streak}</em>`:""}${protectedStep?"<em>CHECKPOINT AKTIV · KEIN RÜCKFALL</em>":""}</div>`
 }
}

function progressClamp(value){return Math.max(0,Math.min(100,Number(value)||0))}
function progressAxisHtml(markers,fromPct,toPct){
 const markerHtml=markers.map(m=>'<span class="post-progress-marker '+(m.kind||'')+'" style="left:'+progressClamp(m.pct)+'%"><i></i><b>'+esc(m.label)+'</b>'+(m.sub?'<small>'+esc(m.sub)+'</small>':'')+'</span>').join("");
 return '<div class="post-progress-axis" style="--from:'+progressClamp(fromPct)+'%;--to:'+progressClamp(toPct)+'%"><div class="post-progress-track"><i class="post-progress-fill"></i><b class="post-progress-cursor"></b></div><div class="post-progress-markers">'+markerHtml+'</div></div>'
}
function weeklyProgressHtml(before,after){
 const from=progressClamp(before/35*100),to=progressClamp(after/35*100);
 return '<div class="post-progress-weekly"><div class="post-progress-section-head"><span>WOCHENFORTSCHRITT</span><strong>'+before+' → '+after+'/35</strong></div>'+progressAxisHtml([{pct:0,label:'0'},{pct:15/35*100,label:'15',sub:'Reward'},{pct:100,label:'35',sub:'Upgrade'}],from,to)+'</div>'
}
function championsQualificationPostHtml(snapshot){
 const q=snapshot?.championsQualification;if(!q)return"";
 const target=Math.max(1,Number(q.target||1000)),before=Math.max(0,Number(q.before||0)),after=Math.max(0,Number(q.after||0)),earned=Math.max(0,Number(q.earned||0));
 const from=progressClamp(Math.min(target,before)/target*100),to=progressClamp(Math.min(target,after)/target*100),qualifiedNow=!!q.qualifiedAfter&&!q.qualifiedBefore;
 return '<div class="post-progress-weekly post-progress-champions"><div class="post-progress-section-head"><span>CHAMPIONS-QUALIFIKATION</span><strong>+'+fmt(earned)+' CP · '+fmt(before)+' → '+fmt(after)+' / '+fmt(target)+'</strong></div>'+
  progressAxisHtml([{pct:0,label:'0'},{pct:100,label:fmt(target),sub:'Qualifiziert'}],from,to)+
  (qualifiedNow?'<div class="post-progress-promotion">CHAMPIONS QUALIFIZIERT</div>':'')+
  '<div class="post-progress-note">Rivals: Sieg +200 CP · Remis +100 CP · Niederlage +0 CP</div></div>'
}
function squadPostMatchHtml(snapshot){
 const b=snapshot.before,a=snapshot.after,beforeIndex=Math.max(0,SB_RANKS.findIndex(x=>x.name===b.rank)),afterIndex=Math.max(0,SB_RANKS.findIndex(x=>x.name===a.rank));
 const startIndex=Math.max(0,Math.min(beforeIndex,afterIndex)-1),markerEnd=Math.min(SB_RANKS.length-1,Math.max(beforeIndex,afterIndex)+1);
 const axisMin=SB_RANKS[startIndex].min,axisMax=markerEnd===SB_RANKS.length-1?Math.max(SB_RANKS[markerEnd].min+3000,a.points,b.points+1):SB_RANKS[markerEnd].min;
 const pct=v=>axisMax===axisMin?100:(v-axisMin)/(axisMax-axisMin)*100;
 const markers=SB_RANKS.slice(startIndex,markerEnd+1).map(row=>({pct:pct(row.min),label:row.name,sub:fmt(row.min)+' BP',kind:row.name===a.rank?'current':''}));
 const promoted=a.rank!==b.rank;
 return '<div class="post-progress-summary"><small>SQUAD BATTLES</small><strong>+'+fmt(snapshot.earned)+' BP</strong><span>'+fmt(b.points)+' → '+fmt(a.points)+' Battle-Punkte</span></div>'+
  (promoted?'<div class="post-progress-promotion">RANGAUFSTIEG · '+esc(a.rank.toUpperCase())+'</div>':'')+
  '<div class="post-progress-status"><span>VORHER<b>'+esc(b.rank)+'</b></span><i>→</i><span>AKTUELL<b>'+esc(a.rank)+'</b></span></div>'+
  '<div class="post-progress-section-head"><span>RANGFORTSCHRITT</span><strong>'+fmt(a.points)+' BP</strong></div>'+
  progressAxisHtml(markers,pct(b.points),pct(a.points))+
  '<div class="post-progress-foot">'+a.played+'/14 gewertete Spiele · Reset Montag 09:00</div>'+
  (!snapshot.eligible?'<div class="post-progress-note">Dieses Spiel gab keine weiteren Battle-Punkte.</div>':'')
}
function rivalsPostMatchHtml(snapshot){
 const b=snapshot.before,a=snapshot.after,up=a.division<b.division,eliteBefore=b.division===0;
 let mainAxis="",status="";
 if(eliteBefore){
  const min=Math.max(0,Math.min(b.skill,a.skill)-100),max=Math.max(min+200,Math.max(b.skill,a.skill)+100),pct=v=>(v-min)/(max-min)*100;
  mainAxis=progressAxisHtml([{pct:0,label:String(min)},{pct:pct(500),label:'500',sub:'Elite Start'},{pct:100,label:String(max)}],pct(b.skill),pct(a.skill));
  status='<div class="post-progress-status"><span>VORHER<b>'+b.skill+' SR</b></span><i>→</i><span>AKTUELL<b>'+a.skill+' SR</b></span></div>'
 }else{
  const total=(RIVALS_LADDER[b.division]||[1,0])[0],checkpoint=(RIVALS_LADDER[b.division]||[1,0])[1],stepPct=step=>(Math.max(1,step)-1)/Math.max(1,total)*100;
  const markers=[];
  for(let step=1;step<=total;step++)markers.push({pct:stepPct(step),label:'Stufe '+step,sub:step===checkpoint?'Checkpoint':'',kind:step===checkpoint?'checkpoint':''});
  markers.push({pct:100,label:a.division<b.division?'AUFSTIEG':'Aufstieg',sub:b.division===1?'Elite':'Division '+Math.max(0,b.division-1),kind:'promotion'});
  mainAxis=progressAxisHtml(markers,stepPct(b.step),up?100:stepPct(a.step));
  const beforeLabel='DIV '+b.division+' · STUFE '+b.step,afterLabel=a.division===0?'ELITE · '+a.skill+' SR':'DIV '+a.division+' · STUFE '+a.step;
  status='<div class="post-progress-status"><span>VORHER<b>'+beforeLabel+'</b></span><i>→</i><span>AKTUELL<b>'+afterLabel+'</b></span></div>'
 }
 const promoted=up?'<div class="post-progress-promotion">AUFSTIEG · '+(a.division===0?'ELITE':'DIVISION '+a.division)+'</div>':'';
 const streak=a.streak>=2?'<div class="post-progress-note accent">Siegesserie ×'+a.streak+(a.streak>=3?' · Siege geben +2 Stufen':'')+'</div>':'';
 return '<div class="post-progress-summary"><small>DIVISION RIVALS</small><strong>+'+snapshot.earned+' WP</strong><span>'+b.weekly+' → '+a.weekly+'/35 Wochenpunkte</span></div>'+
  promoted+status+
  '<div class="post-progress-section-head"><span>'+(eliteBefore?'SKILL-RATING':'DIVISIONSFORTSCHRITT')+'</span><strong>'+esc(rivalsStageLabel(a))+'</strong></div>'+
  mainAxis+streak+weeklyProgressHtml(b.weekly,a.weekly)+championsQualificationPostHtml(snapshot)+
  '<div class="post-progress-foot">Reset Donnerstag 09:00 · '+esc(competitionCountdown("rivals"))+'</div>'
}
let postMatchProgressAnimationTimer=null;
function startPostMatchProgressAnimation(body){
 clearTimeout(postMatchProgressAnimationTimer);
 const axes=[...body.querySelectorAll(".post-progress-axis")];
 axes.forEach(axis=>{
  axis.classList.remove("animate","is-animating");
  const fill=axis.querySelector(".post-progress-fill"),cursor=axis.querySelector(".post-progress-cursor");
  if(fill)fill.style.width="var(--from)";
  if(cursor)cursor.style.left="var(--from)"
 });
 // Force one fully painted frame at the old value before the movement starts.
 void body.offsetWidth;
 postMatchProgressAnimationTimer=setTimeout(()=>{
  axes.forEach((axis,index)=>{
   setTimeout(()=>{
    const fill=axis.querySelector(".post-progress-fill"),cursor=axis.querySelector(".post-progress-cursor");
    axis.classList.add("animate","is-animating");
    if(fill)fill.style.width="";
    if(cursor)cursor.style.left="";
    setTimeout(()=>axis.classList.remove("is-animating"),2050)
   },index*180)
  })
 },420)
}
function showPostMatchProgress(snapshot){
 const screen=$("postMatchProgress"),body=$("postMatchProgressBody");
 if(!screen||!body||!snapshot)return false;
 $("postMatchProgressKicker").textContent=snapshot.mode==="squad"?"SQUAD BATTLES":"DIVISION RIVALS";
 $("postMatchProgressTitle").textContent="Dein Fortschritt";
 $("postMatchProgressSubtitle").textContent=snapshot.mode==="squad"?"Rang und Battle-Punkte nach diesem Spiel":"Division, Stufe und Wochenfortschritt nach diesem Spiel";
 body.innerHTML=snapshot.mode==="squad"?squadPostMatchHtml(snapshot):rivalsPostMatchHtml(snapshot);
 body.querySelectorAll(".post-progress-axis").forEach(axis=>axis.classList.remove("animate","is-animating"));
 screen.classList.add("active");screen.setAttribute("aria-hidden","false");screen.scrollTop=0;
 requestAnimationFrame(()=>requestAnimationFrame(()=>startPostMatchProgressAnimation(body)));
 setTimeout(()=>$("postMatchProgressClose")?.focus(),120);
 return true
}
function hidePostMatchProgress(){
 clearTimeout(postMatchProgressAnimationTimer);postMatchProgressAnimationTimer=null;
 const screen=$("postMatchProgress");if(!screen)return;
 screen.classList.remove("active");screen.setAttribute("aria-hidden","true");
 $("postMatchProgressBody")?.querySelectorAll(".post-progress-axis").forEach(x=>x.classList.remove("animate","is-animating"))
}

document.addEventListener("click",e=>{const button=e.target.closest("[data-claim-competition]");if(button)claimCompetitionReward(button.dataset.claimCompetition,button.dataset.competitionWeek)});
syncCompetitionWeeks();
setInterval(()=>{
 const changed=syncCompetitionWeeks();
 if(currentViewId()==="homeView")renderCompetitionHome();
 if(currentViewId()==="playView")renderCompetitionModeStatus();
 if(changed)updateObjectiveIndicators()
},60000);
