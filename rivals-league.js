"use strict";
/* Footera V21.337 – Wochen-Rivals: Freundesliga.
   Every Rivals match counts for the league week Thursday 09:00 → Thursday 09:00 (Berlin),
   i.e. exactly the Division Rivals week, so there is one weekly reset for both.
   Your own standing comes from this save; friends' standings come from the server.
   After the week (plus 10 minutes for late reports) the final place becomes a normal
   weekly reward row (mode "league"), claimed in the existing reward centre. */
(function(){
 const QUALIFY=3,GRACE_MS=10*60*1000,KEEP_WEEKS=6,REFRESH_MS=30000;
 const REWARDS={
  1:{coins:12000,packs:[{id:ratingRewardPack(84,1),tradeable:false}]},
  2:{coins:8000,packs:[{id:ratingRewardPack(82,2),tradeable:false}]},
  3:{coins:5000,packs:[{id:"goldplayers",tradeable:false}]},
  0:{coins:2000,packs:[{id:"gold",tradeable:true}]}
 };
 const PLACE_NAMES={1:"Platz 1",2:"Platz 2",3:"Platz 3"};
 const boards=new Map();let reportBusy=false,finalizeBusy=false,lastFinalize=0;

 const WEEKDAY=4,HOUR=9; // same as COMPETITION_WEEK.rivals
 function leagueWindow(at=new Date()){const start=berlinWeekStart(at,WEEKDAY,HOUR);return{key:String(start.getTime()),start,end:berlinShiftDays(start,7,HOUR)}}
 function weekEnd(key){return berlinShiftDays(new Date(Number(key)),7,HOUR).getTime()}
 // V21.333 counted Sunday-19:00 weeks. Those few hours of games move into the
 // Thursday week they belong to, so nobody loses a match after the switch.
 function migrateWeeks(l){
  for(const key of Object.keys(l.weeks)){
   const start=new Date(Number(key));if(!Number.isFinite(start.getTime()))continue;
   const target=leagueWindow(start).key;if(target===key)continue;
   const from=l.weeks[key],into=l.weeks[target]={...blank(),...(l.weeks[target]||{})};
   for(const f of["wins","draws","losses","gf","ga"])into[f]=(Number(into[f])||0)+(Number(from[f])||0);
   into.reported=-1;delete l.weeks[key]
  }
 }
 function ensure(){
  const l=state.rivalsLeague&&typeof state.rivalsLeague==="object"?state.rivalsLeague:(state.rivalsLeague={});
  if(!l.weeks||typeof l.weeks!=="object"||Array.isArray(l.weeks))l.weeks={};
  if(l.schedule!=="thu9"){migrateWeeks(l);l.schedule="thu9"}
  return l
 }
 function blank(){return{wins:0,draws:0,losses:0,gf:0,ga:0,reported:-1}}
 function weekStats(key){const w=ensure().weeks[key];return w?{...blank(),...w}:blank()}
 const matches=s=>(Number(s.wins)||0)+(Number(s.draws)||0)+(Number(s.losses)||0);
 const points=s=>3*(Number(s.wins)||0)+(Number(s.draws)||0);
 function rewardFor(place){const r=REWARDS[place]||REWARDS[0];return{coins:r.coins,packs:r.packs.map(p=>({...p})),playerPicks:[]}}
 function onlineFriends(){return[...new Set((state.friends||[]).map(f=>f?.onlineUid).filter(uid=>/^[0-9a-f-]{36}$/i.test(uid||"")))].slice(0,200)}
 function clubName(){return String(state.profile?.clubName||state.profile?.username||"Footera Club").trim().slice(0,30)||"Footera Club"}

 function record(result,home,away,at=new Date()){
  if(!["win","draw","loss"].includes(result))return null;
  const key=leagueWindow(at).key,l=ensure(),w=l.weeks[key]={...blank(),...(l.weeks[key]||{})};
  if(result==="win")w.wins++;else if(result==="draw")w.draws++;else w.losses++;
  w.gf+=Math.max(0,Math.min(10,Number(home)||0));w.ga+=Math.max(0,Math.min(10,Number(away)||0));
  prune();return{week:key,...w}
 }
 function prune(at=new Date()){
  const l=ensure(),current=Number(leagueWindow(at).key),oldest=current-KEEP_WEEKS*7*86400000;
  for(const key of Object.keys(l.weeks)){
   const done=(state.weeklyRewards||[]).some(r=>r.mode==="league"&&r.week===key);
   if(Number(key)<oldest||(Number(key)<current&&done))delete l.weeks[key]
  }
 }

 // Sorting: points, goal difference, goals scored, then club name for a stable order.
 function standings(rows){
  return rows.slice().sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||String(a.club).localeCompare(String(b.club),"de"))
   .map((row,i)=>({...row,place:i+1}))
 }
 function boardRows(key,serverRows){
  const own=weekStats(key),uid=window.FooteraOnline?.userId||"",friends=new Set(onlineFriends());
  const rows=(serverRows||[]).filter(r=>r.user_id!==uid&&friends.has(r.user_id)).map(r=>({uid:r.user_id,club:r.club_name||"Freund",wins:+r.wins||0,draws:+r.draws||0,losses:+r.losses||0,gf:+r.goals_for||0,ga:+r.goals_against||0,points:+r.points||0,me:false}));
  rows.push({uid,club:clubName(),...own,points:points(own),me:true});
  return standings(rows)
 }
 // Final place among everyone with at least QUALIFY games; alone = participation reward.
 function finalPlace(key,serverRows){
  const rows=boardRows(key,serverRows).filter(r=>matches(r)>=QUALIFY),me=rows.find(r=>r.me);
  if(!me)return null;
  return{place:rows.length>=2?me.place:0,players:rows.length,me}
 }

 async function client(){const online=window.FooteraOnline;if(!online?.ready||typeof online.authClient!=="function")return null;return online.authClient()}
 async function report(){
  if(reportBusy)return;reportBusy=true;
  try{
   const c=await client();if(!c)return;
   const l=ensure(),now=Date.now(),current=leagueWindow().key;
   for(const key of Object.keys(l.weeks)){
    const w=l.weeks[key],n=matches(w);
    if(!n||Number(w.reported)>=n)continue;
    if(key!==current&&now>=weekEnd(key)+GRACE_MS)continue;
    const {error}=await c.rpc("footera_rivals_league_report",{p_week:Number(key),p_club:clubName(),p_wins:w.wins,p_draws:w.draws,p_losses:w.losses,p_goals_for:w.gf,p_goals_against:w.ga});
    if(error)throw error;
    if(matches(l.weeks[key]||{})===n){l.weeks[key].reported=n;save()}
   }
  }catch(e){console.warn("Freundesliga melden:",e)}
  finally{reportBusy=false}
 }
 async function fetchBoard(key,force=false){
  const cached=boards.get(key);
  if(!force&&cached&&Date.now()-cached.at<REFRESH_MS)return cached;
  const friends=onlineFriends(),entry={at:Date.now(),rows:[],error:"",loaded:false};
  try{
   if(!friends.length){entry.loaded=true;entry.closed=Date.now()>=weekEnd(key)+GRACE_MS}
   else{
    const c=await client();if(!c){entry.error="offline";boards.set(key,entry);return entry}
    const {data,error}=await c.rpc("footera_rivals_league_board",{p_week:Number(key),p_friends:friends});
    if(error)throw error;
    entry.rows=Array.isArray(data)?data:[];entry.loaded=true;entry.closed=entry.rows.some(r=>r.closed===true)||(!entry.rows.length&&Date.now()>=weekEnd(key)+GRACE_MS+60000);
   }
  }catch(e){entry.error="server";console.warn("Freundesliga laden:",e)}
  boards.set(key,entry);return entry
 }
 // Turn finished weeks into reward rows once. Never invents a place without a loaded board.
 async function finalize(force=false){
  if(finalizeBusy||(!force&&Date.now()-lastFinalize<REFRESH_MS))return false;finalizeBusy=true;lastFinalize=Date.now();let changed=false;
  try{
   ensureCompetitionState();
   const l=ensure(),now=Date.now();
   for(const key of Object.keys(l.weeks).sort()){
    const own=l.weeks[key];
    if(now<weekEnd(key)+GRACE_MS||matches(own)<QUALIFY)continue;
    if(state.weeklyRewards.some(r=>r.mode==="league"&&r.week===key))continue;
    const board=await fetchBoard(key,true);
    if(!board.loaded||(onlineFriends().length&&!board.closed))continue;
    if(state.weeklyRewards.some(r=>r.mode==="league"&&r.week===key))continue;
    const result=finalPlace(key,board.rows);if(!result)continue;
    state.weeklyRewards.push({mode:"league",week:key,place:result.place,players:result.players,points:result.me.points,wins:result.me.wins,draws:result.me.draws,losses:result.me.losses,reward:rewardFor(result.place),claimed:false});
    changed=true
   }
   if(changed){prune();save();if(typeof flushSave==="function")flushSave();if(typeof renderCompetitionHome==="function")renderCompetitionHome();if(typeof currentViewId==="function"&&currentViewId()==="playView"&&typeof renderPlay==="function")renderPlay()}
  }catch(e){console.warn("Freundesliga auswerten:",e)}
  finally{finalizeBusy=false}
  return changed
 }

 function countdown(end){
  const ms=Math.max(0,end-Date.now()),d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);
  return d?`noch ${d} ${d===1?"Tag":"Tage"} ${h} Std`:h?`noch ${h} Std ${m} Min`:`noch ${m} Min`
 }
 function rewardSummary(place){const r=rewardFor(place);return`${fmt(r.coins)} Coins · ${r.packs.map(p=>PACKS.find(x=>x.id===p.id)?.name||p.id).join(" · ")}`}
 function html(){
  const w=leagueWindow(),key=w.key,board=boards.get(key),rows=boardRows(key,board?.rows),own=rows.find(r=>r.me),friends=onlineFriends().length;
  const online=window.FooteraOnline;
  const status=!friends?'<p class="rivals-league-note">Noch keine Online-Freunde. Füge Freunde hinzu und messt euch jede Woche in der Rangliste.</p>':
   board?.error?`<p class="rivals-league-note">${online?.ready?"Rangliste gerade nicht erreichbar. Dein eigener Stand zählt trotzdem.":"Für die Rangliste der Freunde bitte online gehen."}</p>`:
   !board?'<p class="rivals-league-note">Rangliste wird geladen …</p>':"";
  const table=`<ol class="rivals-league-table">${rows.map(r=>`<li class="${r.me?"is-me":""}${matches(r)<QUALIFY?" is-open":""}"><b>${r.place}.</b><span class="rivals-league-club">${esc(r.club)}${r.me?" <em>Du</em>":""}</span><small>${matches(r)} Sp · ${r.wins}-${r.draws}-${r.losses} · ${r.gf}:${r.ga}</small><strong>${r.points}</strong></li>`).join("")}</ol>`;
  const need=Math.max(0,QUALIFY-matches(own||{}));
  return `<div class="rivals-league"><div class="rivals-league-head"><small>WERTUNG DONNERSTAG 09:00 · ${esc(countdown(w.end.getTime()))}</small><strong>${own&&matches(own)>=QUALIFY&&rows.filter(r=>matches(r)>=QUALIFY).length>=2?`Du bist ${own.place}. von ${rows.filter(r=>matches(r)>=QUALIFY).length}`:need?`Noch ${need} Rivals-${need===1?"Spiel":"Spiele"} bis zur Wertung`:"Du bist in der Wertung"}</strong></div>${table}${status}
   <details class="rivals-league-rewards"><summary>Belohnungen am Donnerstag</summary><ul>${[1,2,3].map(p=>`<li><b>${PLACE_NAMES[p]}</b> ${esc(rewardSummary(p))}</li>`).join("")}<li><b>Dabei</b> ${esc(rewardSummary(0))}</li></ul><p>Sieg 3 Punkte, Remis 1 Punkt. Gewertet wird ab ${QUALIFY} Rivals-Spielen in der Woche. Platzierungen gibt es ab zwei Teilnehmern, sonst die Teilnahme-Belohnung.</p></details>
   ${!friends?'<button type="button" class="secondary rivals-league-add" data-rivals-league-add>Freunde hinzufügen</button>':""}</div>`
 }
 function render(){
  for(const id of["rvLeague","friendsLeague"]){const host=document.getElementById(id);if(host)host.innerHTML=html()}
 }
 async function refresh(force=false){
  const key=leagueWindow().key;
  await report();
  if(onlineFriends().length)await fetchBoard(key,force);else boards.set(key,{at:Date.now(),rows:[],loaded:true});
  render();await finalize()
 }

 // Hooks into the existing Rivals flow.
 const baseRecord=recordCompetitionMatch;
 recordCompetitionMatch=function(mode,result,home,away,opponent,difficulty){
  const snapshot=baseRecord(mode,result,home,away,opponent,difficulty);
  if(mode==="rivals"&&snapshot){const row=record(result,home,away);if(row){snapshot.league=row;save();report().then(()=>fetchBoard(row.week,true)).then(render).catch(()=>{})}}
  return snapshot
 };
 const baseModeStatus=renderCompetitionModeStatus;
 if(typeof renderSocial==="function"){const baseSocial=renderSocial;renderSocial=function(){baseSocial();render();refresh().catch(()=>{})}}
 renderCompetitionModeStatus=function(){baseModeStatus();render();refresh().catch(()=>{})};
 document.addEventListener("click",event=>{
  if(!event.target.closest("[data-rivals-league-add]"))return;
  if(typeof switchView==="function")switchView("socialView");
  window.FooteraFriendsHub?.open?.("add")
 });
 setInterval(()=>{if(document.visibilityState==="visible")refresh().catch(()=>{})},60000);
 setTimeout(()=>refresh().catch(()=>{}),4000);

 window.FooteraRivalsLeague={leagueWindow,record,standings,boardRows,finalPlace,rewardFor,finalize,refresh,render,report,QUALIFY};
})();
