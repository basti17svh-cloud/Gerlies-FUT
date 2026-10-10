"use strict";

/* Footera V20.97 — Champions competition layer.
   Match results stay owned by the existing Footera simulation; this file only
   handles qualification, weekend state, rank/reward progression and AI profile selection. */
const CHAMPIONS_ENTRY_POINTS=1000;
const CHAMPIONS_MAX_GAMES=15;
const CHAMPIONS_RANKS=[
 {name:"Rang I",min:15,max:15,coins:100000,rated:[[84,20],[86,10]],totw:3,bonus:true},
 {name:"Rang II",min:13,max:14,coins:75000,rated:[[84,20],[86,5]],totw:2},
 {name:"Rang III",min:11,max:12,coins:50000,rated:[[83,15],[85,5]],totw:2},
 {name:"Rang IV",min:9,max:10,coins:35000,rated:[[83,10],[85,3]],totw:1},
 {name:"Rang V",min:7,max:8,coins:25000,rated:[[82,10],[84,2]],totw:1},
 {name:"Rang VI",min:5,max:6,coins:15000,rated:[[82,5]],totw:1},
 {name:"Rang VII",min:3,max:4,coins:10000,rated:[[80,5]],totw:0},
 {name:"Rang VIII",min:0,max:2,coins:5000,rated:[[80,1]],totw:0}
];

function championsRank(wins=0){
 const value=Math.max(0,Math.min(CHAMPIONS_MAX_GAMES,Number(wins)||0));
 return CHAMPIONS_RANKS.find(row=>value>=row.min&&value<=row.max)||CHAMPIONS_RANKS[CHAMPIONS_RANKS.length-1]
}
function championsWindow(at=new Date()){
 const now=new Date(at),lastStart=berlinWeekStart(now,5,19),lastEnd=berlinShiftDays(lastStart,3,9),open=now>=lastStart&&now<lastEnd;
 const start=open?lastStart:berlinShiftDays(lastStart,7,19),end=open?lastEnd:berlinShiftDays(start,3,9);
 return{key:String(start.getTime()),start,end,open,lastStart,lastEnd,lastKey:String(lastStart.getTime())}
}
function championsDate(date){
 return new Intl.DateTimeFormat("de-DE",{timeZone:FOOTERA_TIME_ZONE,weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date)
}
function championsWindowText(at=new Date()){
 const w=championsWindow(at);
 return w.open?`Offen bis ${championsDate(w.end)} · ${seasonCountdown(w.end)}`:`Öffnet ${championsDate(w.start)} · ${seasonCountdown(w.start).replace("Endet","Startet")}`
}
function ensureChampionsPacks(){
 if(!PACKS.some(p=>p.id==="champions-bonus"))PACKS.push({id:"champions-bonus",name:"Champions Bonus Pack",coins:null,points:null,type:"gold",count:5,min:87,max:99,store:false,reward:true,desc:"5 Goldspieler · jeder mindestens 87 GES",iconChance:0});
}
function championsRewardForWins(wins){
 ensureChampionsPacks();const row=championsRank(wins),packs=[];
 for(const spec of row.rated||[])packs.push({id:ratingRewardPack(spec[0],spec[1]),tradeable:false});
 for(let i=0;i<(row.totw||0);i++)packs.push({id:"totw-reward",tradeable:false});
 if(row.bonus)packs.push({id:"champions-bonus",tradeable:false});
 return{coins:row.coins||0,packs}
}
function ensureChampionsState(){
 state.champions=state.champions&&typeof state.champions==="object"?state.champions:{};
 const c=state.champions;
 c.qualPoints=Math.max(0,Number(c.qualPoints||0));
 c.week=String(c.week||"");c.active=!!c.active;c.completed=!!c.completed;
 c.games=Math.max(0,Math.min(CHAMPIONS_MAX_GAMES,Number(c.games||0)));
 c.wins=Math.max(0,Math.min(c.games,Number(c.wins||0)));c.losses=Math.max(0,Math.min(c.games,Number(c.losses||0)));
 c.participations=Math.max(0,Number(c.participations||0));c.totalWins=Math.max(0,Number(c.totalWins||0));
 c.streak=Math.max(0,Number(c.streak||0));c.bestWins=Math.max(0,Number(c.bestWins||0));
 c.bestLosses=Number.isFinite(Number(c.bestLosses))?Math.max(0,Number(c.bestLosses)):99;
 c.lastRank=String(c.lastRank||"");c.lastRecord=String(c.lastRecord||"");
 return c
}
function championsRunEnd(week){
 const start=new Date(Number(week));return Number.isFinite(start.getTime())?berlinShiftDays(start,3,9):null
}
function settleChampionsRun(){
 const c=ensureChampionsState();if(!c.week||c.completed)return false;
 const rank=championsRank(c.wins),record=`${c.wins}-${c.losses}`;
 if(c.games>0&&!state.weeklyRewards.some(x=>x.mode==="champions"&&x.week===c.week)){
  state.weeklyRewards.push({mode:"champions",week:c.week,rank:rank.name,wins:c.wins,losses:c.losses,points:c.wins,reward:championsRewardForWins(c.wins),claimed:false})
 }
 if(c.games>0&&(c.wins>c.bestWins||(c.wins===c.bestWins&&c.losses<c.bestLosses))){c.bestWins=c.wins;c.bestLosses=c.losses}
 c.lastRank=rank.name;c.lastRecord=record;c.active=false;c.completed=true;save();return true
}
function syncChampionsCompetition(at=new Date()){
 const c=ensureChampionsState(),now=new Date(at),end=c.active?championsRunEnd(c.week):null;
 if(c.active&&end&&now>=end)return settleChampionsRun();
 if(c.active&&c.games>=CHAMPIONS_MAX_GAMES)return settleChampionsRun();
 return false
}
function championsCanEnter(at=new Date()){
 syncChampionsCompetition(at);const c=ensureChampionsState(),w=championsWindow(at);
 return w.open&&!c.active&&c.week!==w.key&&c.qualPoints>=CHAMPIONS_ENTRY_POINTS
}
function startChampionsRun(at=new Date()){
 syncChampionsCompetition(at);const c=ensureChampionsState(),w=championsWindow(at);
 if(!w.open)return{ok:false,reason:"Champions ist nur Freitag 19:00 bis Montag 09:00 geöffnet."};
 if(c.active&&c.week===w.key)return{ok:true,active:true};
 if(c.week===w.key)return{ok:false,reason:"Deine Champions-Teilnahme für dieses Wochenende ist bereits beendet."};
 if(c.qualPoints<CHAMPIONS_ENTRY_POINTS)return{ok:false,reason:`Dir fehlen noch ${fmt(CHAMPIONS_ENTRY_POINTS-c.qualPoints)} Champions-Punkte aus Division Rivals.`};
 c.qualPoints-=CHAMPIONS_ENTRY_POINTS;c.week=w.key;c.active=true;c.completed=false;c.games=0;c.wins=0;c.losses=0;c.streak=0;c.participations++;save();
 return{ok:true,active:true}
}
function championsCanStartMatch(at=new Date()){
 syncChampionsCompetition(at);const c=ensureChampionsState(),w=championsWindow(at);
 return !!(w.open&&c.active&&c.week===w.key&&c.games<CHAMPIONS_MAX_GAMES)
}
function championsQualificationGain(result){return result==="win"?200:result==="draw"?100:0}
function championsMatchCoins(result){return result==="win"?850:425}
function recordChampionsResult(result){
 syncChampionsCompetition();const c=ensureChampionsState(),w=championsWindow(),eligible=championsCanStartMatch(),before={games:c.games,wins:c.wins,losses:c.losses,rank:championsRank(c.wins).name,streak:c.streak};
 if(!eligible)return{mode:"champions",result,before,after:{...before},earned:0,eligible:false};
 c.games++;if(result==="win"){c.wins++;c.totalWins++;c.streak++}else{c.losses++;c.streak=0}
 const after={games:c.games,wins:c.wins,losses:c.losses,rank:championsRank(c.wins).name,streak:c.streak};
 if(c.games>=CHAMPIONS_MAX_GAMES)settleChampionsRun();else save();
 return{mode:"champions",result,before,after,earned:result==="win"?1:0,eligible:true,window:w.key}
}
const CHAMPIONS_PROFILES=[
 {name:"CHAMPIONS CONTENDERS",tier:"Champions · Contenders"},
 {name:"CHAMPIONS META XI",tier:"Champions · Meta"},
 {name:"CHAMPIONS ELITE XI",tier:"Champions · Elite"},
 {name:"CHAMPIONS ICON MIX",tier:"Champions · Icon Mix"},
 {name:"CHAMPIONS HIGH-END XI",tier:"Champions · High-End"}
];
function championsOpponent(){
 syncChampionsCompetition();const c=ensureChampionsState(),diff=c.wins-c.losses,seed=`champions|${c.week}|${c.games}|${c.wins}|${c.losses}`;
 const base=Math.round(82+diff*1.15+c.games*.12),target=Math.max(78,Math.min(92,base)),chem=Math.max(22,Math.min(33,25+Math.max(-2,diff)+Math.floor(c.games/4)));
 const profileIndex=Math.max(0,Math.min(CHAMPIONS_PROFILES.length-1,Math.floor((target-78)/3.2))),profile=CHAMPIONS_PROFILES[profileIndex];
 const formations=["4-3-3","4-2-3-1","4-4-2","4-1-2-1-2 (2)"],formation=formations[hashNum(seed+"|formation")%formations.length];
 return buildGeneratedOpponent({name:generatedOpponentName(seed+"|club"),target,chem,formation,seed,tier:`${profile.tier} · Record ${c.wins}-${c.losses}`,sp:150,power:target+chem*.12})
}
function championsBestRecordText(){
 const c=ensureChampionsState();return c.bestWins||c.bestLosses!==99?`${c.bestWins}-${c.bestLosses}`:"–"
}
function championsProgressHtml(snapshot){
 const a=snapshot.after,b=snapshot.before,rankChanged=a.rank!==b.rank,remaining=Math.max(0,CHAMPIONS_MAX_GAMES-a.games);
 return `<div class="post-progress-summary"><small>FOOTERA CHAMPIONS · ${snapshot.result==="win"?"SIEG":"NIEDERLAGE"}</small><strong>${a.wins}-${a.losses}</strong><span>${a.games}/${CHAMPIONS_MAX_GAMES} Spiele absolviert</span></div>${rankChanged?'<div class="post-progress-promotion">'+esc(a.rank.toUpperCase())+'</div>':""}<div class="post-progress-status"><span>VORHER<b>${b.wins}-${b.losses}</b></span><i>→</i><span>AKTUELL<b>${a.wins}-${a.losses}</b></span></div><div class="post-progress-note accent">Aktueller Rang: ${esc(a.rank)} · ${remaining} Spiele übrig</div><div class="post-progress-foot">Freitag 19:00 – Montag 09:00 · kein Unentschieden</div>`
}

/* Extend the existing competition layer without changing Rivals/Squad-Battles behavior. */
const footeraBaseSyncCompetitionWeeks=syncCompetitionWeeks;
syncCompetitionWeeks=function(at=new Date()){const baseChanged=footeraBaseSyncCompetitionWeeks(at),championsChanged=syncChampionsCompetition(at);return !!(baseChanged||championsChanged)};

const footeraBaseRecordCompetitionMatch=recordCompetitionMatch;
recordCompetitionMatch=function(mode,result,home,away,opponent,difficulty){
 if(mode==="champions")return recordChampionsResult(result);
 const snapshot=footeraBaseRecordCompetitionMatch(mode,result,home,away,opponent,difficulty);
 if(mode==="rivals"&&snapshot){
  const c=ensureChampionsState(),before=Math.max(0,Number(c.qualPoints||0)),gain=championsQualificationGain(result),after=before+gain;
  c.qualPoints=after;snapshot.championsPointsEarned=gain;
  snapshot.championsQualification={before,after,earned:gain,target:CHAMPIONS_ENTRY_POINTS,qualifiedBefore:before>=CHAMPIONS_ENTRY_POINTS,qualifiedAfter:after>=CHAMPIONS_ENTRY_POINTS};
  save()
 }
 return snapshot
};

const footeraBaseCompetitionClaimButtons=competitionClaimButtons;
competitionClaimButtons=function(mode){
 if(mode!=="champions")return footeraBaseCompetitionClaimButtons(mode);
 return competitionPending("champions").map(row=>`<button class="primary competition-claim champions-claim" type="button" data-claim-competition="champions" data-competition-week="${row.week}">Champions-Belohnung abholen · ${esc(rewardLabel(row))}</button>`).join("")
};

const footeraBaseClaimCompetitionReward=claimCompetitionReward;
claimCompetitionReward=function(mode,week){
 const ok=footeraBaseClaimCompetitionReward(mode,week);if(ok&&mode==="champions")toast("Champions-Belohnung abgeholt.");return ok
};

const footeraBaseShowPostMatchProgress=showPostMatchProgress;
showPostMatchProgress=function(snapshot){
 if(snapshot?.mode!=="champions")return footeraBaseShowPostMatchProgress(snapshot);
 const screen=$("postMatchProgress"),body=$("postMatchProgressBody");if(!screen||!body)return false;
 $("postMatchProgressKicker").textContent="FOOTERA CHAMPIONS";$("postMatchProgressTitle").textContent="Dein Champions-Record";$("postMatchProgressSubtitle").textContent="15 Spiele · jeder Sieg verbessert deinen Rang";
 body.innerHTML=championsProgressHtml(snapshot);screen.classList.add("active");screen.setAttribute("aria-hidden","false");screen.scrollTop=0;
 setTimeout(()=>$("postMatchProgressClose")?.focus(),120);return true
};

syncChampionsCompetition();
