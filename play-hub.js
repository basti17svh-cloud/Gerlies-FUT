/* Footera V20.97 — Spielmodi mit eindeutiger Champions-Navigation und Qualifikationsfortschritt. Existing match/reward handlers stay in place. */
(()=>{
 const MODES={tournaments:{title:"Turniere"},"halloween-cup":{title:"Halloween-Cup"},rivals:{title:"Division Rivals",summary:"playRivalsSummary",stats:"playRivalsStats"},champions:{title:"Footera Champions",summary:"playChampionsSummary",stats:"playChampionsStats"},squad:{title:"Squad Battles",summary:"playSquadSummary",stats:"playSquadStats"},"friendly-random":{title:"Zufälliger Gegner",summary:"playRandomSummary",stats:"playRandomStats"},"friendly-friend":{title:"Gegen Freund",summary:"playFriendsSummary",stats:"playFriendsStats"}};
 let area="hub";
 const num=value=>Math.max(0,Number(value)||0);
 const put=(id,html)=>{const el=$(id);if(el)el.innerHTML=html};
 const metric=(value,label)=>`<div class="play-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
 const meter=(value,max,label)=>{const bounded=Math.max(0,Math.min(max,num(value))),percent=max>0?bounded/max*100:0;return `<div class="play-progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${bounded}"><span style="width:${percent}%"></span></div>`};
 const reset=mode=>`<div class="play-reset"><span>Wochenwechsel</span><strong>${mode==="squad"?"Sonntag":"Donnerstag"} · 09:00</strong><small>${esc(competitionCountdown(mode))}</small></div>`;
 const rewardCopy=reward=>esc(rewardLabel({reward}));
 // V21.215: one broken summary (e.g. an old cached script next to a new one) must never lock all game modes.
 const safe=fn=>{try{fn()}catch(e){if(typeof console!=="undefined")console.error("Footera Spielmodi:",e)}};

 function statsFor(mode){
  const key=mode.startsWith("friendly")?"friendly":mode==="champions"?"weekend":mode,stats=state.stats||{};
  const matches=num(key==="friendly"?stats.friendlies:key==="squad"?stats.squadMatches:key==="weekend"?stats.championsMatches:stats.rivalsMatches),wins=num(key==="friendly"?stats.friendlyWins:key==="squad"?stats.squadWins:key==="weekend"?stats.championsWins:stats.rivalsWins);
  const history=(state.clubMatchHistory||[]).filter(row=>row.mode===key);
  return{matches,wins,rate:matches?Math.round(wins/matches*100):0,history,goals:history.reduce((sum,row)=>sum+num(row.gf),0),conceded:history.reduce((sum,row)=>sum+num(row.ga),0)};
 }
 function statsHTML(mode){
  const s=statsFor(mode),recent=s.history.slice(-5),friendly=mode.startsWith("friendly");
  const form=recent.length?recent.map(row=>{const result=["win","draw","loss"].includes(row.result)?row.result:"draw",label={win:"Sieg",draw:"Remis",loss:"Niederlage"}[result];return `<span class="play-form-${result}" title="${esc(`${label} · ${row.gf}:${row.ga} gegen ${row.opponent||"Gegner"}`)}" aria-label="${esc(`${label} ${row.gf}:${row.ga}`)}">${{win:"S",draw:"U",loss:"N"}[result]}</span>`}).join(""):'<p class="play-note">Noch keine erfassten Partien</p>';
  return `<div class="play-metrics">${metric(fmt(s.matches),"Spiele gesamt")}${metric(fmt(s.wins),"Siege gesamt")}${metric(s.rate+" %","Siegquote")}</div><div class="play-form-row"><span>Letzte Partien</span><div class="play-form">${form}</div></div>${s.history.length?`<div class="play-score-summary"><strong>${fmt(s.goals)} : ${fmt(s.conceded)}</strong><span>Tore · ${s.history.length} ${s.history.length===1?"erfasste Partie":"erfasste Partien"}</span></div>`:""}<p class="play-note">${friendly?"Zufallsgegner und gespeicherte Freunde werden gemeinsam gezählt. ":""}Die Form und Tore beziehen sich auf deine gespeicherte Spielhistorie.</p>`;
 }
 function renderRivals(){
  const r=state.rivals,c=ensureChampionsState(),cpTarget=CHAMPIONS_ENTRY_POINTS,cp=Math.max(0,Number(c.qualPoints||0)),qualified=cp>=cpTarget,elite=r.division===0,stages=elite?0:RIVALS_LADDER[r.division][0];
  put("playRivalsSummary",`<b>${elite?"Elite":`Division ${r.division}`}</b><small>${elite?`${fmt(r.skill)} Skill-Rating`:`Stufe ${r.step} von ${stages}`} · ${fmt(r.weeklyPoints)} Wochenpunkte · Champs ${fmt(cp)}/${fmt(cpTarget)} CP</small>${competitionPending("rivals").length?'<em>Belohnung abholbereit</em>':""}`);
  const steps=elite?"":`<div class="play-step-track" aria-label="Stufe ${r.step} von ${stages}">${Array.from({length:stages},(_,i)=>`<span class="${i+1<=r.step?"reached":""} ${i+1===r.checkpoint?"checkpoint":""}"${i+1===r.step?' aria-current="step"':""}>${i+1}${i+1===r.checkpoint?'<small>✓</small>':""}</span>`).join("")}</div>`;
  const championsStatus=`<div class="rivals-champions-status"><span>Champions-Qualifikation</span><strong>${fmt(cp)} / ${fmt(cpTarget)} CP${qualified?" · QUALIFIZIERT":""}</strong></div>${meter(Math.min(cp,cpTarget),cpTarget,"Champions-Qualifikation")}`;
  put("rvRecord",`<div class="play-standing-title"><h4>${elite?"Elite":`Division ${r.division}`}</h4><span>${elite?`${fmt(r.skill)} Skill-Rating`:`Stufe ${r.step} / ${stages}`}</span></div>${steps}<div class="play-metrics">${metric(r.checkpoint?`Stufe ${r.checkpoint}`:"Noch kein","Checkpoint")}${metric(fmt(r.streak),"Siegesserie")}${metric(fmt(r.weeklyPoints),"Wochenpunkte")}</div>${championsStatus}${reset("rivals")}`);
  put("rvWeeklyCard",`<div class="play-reward-tier ${r.weeklyPoints>=15?"earned":""}"><div><strong>Basisbelohnung</strong><b>${Math.min(15,num(r.weeklyPoints))} / 15 Punkte</b></div>${meter(r.weeklyPoints,15,"Basisbelohnung")}${r.weeklyPoints>=15?'<span class="play-earned">Wochenziel erreicht</span>':`<span>Noch ${15-num(r.weeklyPoints)} Punkte</span>`}<p>${rewardCopy(rivalsReward(r.division,15))}</p></div><div class="play-reward-tier ${r.weeklyPoints>=35?"earned":""}"><div><strong>Verbesserte Belohnung</strong><b>${Math.min(35,num(r.weeklyPoints))} / 35 Punkte</b></div>${meter(r.weeklyPoints,35,"Verbesserte Belohnung")}<span>${r.weeklyPoints>=35?"Wochenziel erreicht":`Noch ${35-num(r.weeklyPoints)} Punkte`}</span><p>${rewardCopy(rivalsReward(r.division,35))}</p></div><p class="play-note">Die Wochenbelohnung wird beim Wochenwechsel gesichert und ist anschließend abholbar.</p>${competitionClaimButtons("rivals")}`);
  put("playRivalsRanks",Array.from({length:11},(_,i)=>{const division=10-i,current=division===r.division;return `<div class="play-rank-row ${current?"is-current":""}"${current?' aria-current="true"':""}><strong>${division?`Division ${division}`:"Elite"}</strong><span>${current?"Dein aktueller Stand":division>r.division?"Bereits erreicht":"Nächstes Ziel"}</span><small>${division?`${RIVALS_LADDER[division][0]} Stufen · Checkpoint ${RIVALS_LADDER[division][1]}`:"Skill-Rating"}</small></div>`}).join("")+`<p class="play-note">Sieg: +1 Stufe · Remis: kein Verlust · Niederlage: −1 bis zum Checkpoint. Ab dem dritten Sieg in Folge: +2. Wochenpunkte: Sieg 3 · Remis 1.</p>`);
 }
 function renderSquad(){
  const sb=state.squadBattle,rank=sbRank(sb.points),next=SB_RANKS.find(row=>row.min>sb.points),gap=next?next.min-sb.points:0;
  put("playSquadSummary",`<b>${esc(rank.name)} · ${fmt(sb.points)} BP</b><small>${sb.played} / 14 gewertete Spiele</small>${competitionPending("squad").length?'<em>Belohnung abholbereit</em>':""}`);
  put("sbRecord",`<div class="play-standing-title"><h4>${esc(rank.name)}</h4><span>${fmt(sb.points)} Battle-Punkte</span></div><div class="play-metrics">${metric(`${sb.played} / 14`,"Gewertete Spiele")}${metric(Math.max(0,14-sb.played),"Spiele übrig")}</div><div class="play-rank-progress"><strong>${next?`Nächster Rang: ${esc(next.name)}`:"Höchster Rang erreicht"}</strong>${meter(next?sb.points-rank.min:1,next?next.min-rank.min:1,"Fortschritt zum nächsten Rang")}<span>${next?`Noch ${fmt(gap)} BP bis ${esc(next.name)}`:"Elite 1 gesichert"}</span></div>${sb.played>=14?'<p class="play-note">Alle Wertungsspiele sind gespielt. Über „Gegner & Aufstellung ansehen“ kannst du jetzt unbegrenzt ohne Wertung gegen KI-Teams spielen. Weitere Partien bringen keine Battle-Punkte.</p>':""}${reset("squad")}`);
  put("sbWeeklyCard",`<div class="play-reward-tier"><div><strong>Dein aktueller Rang</strong><b>${esc(rank.name)}</b></div><p>${rewardCopy(sbRankReward(rank.name))}</p></div>${next?`<div class="play-reward-tier"><div><strong>Nächster Rang</strong><b>${esc(next.name)}</b></div><p>${rewardCopy(sbRankReward(next.name))}</p></div>`:""}<p class="play-note">Am Sonntag um 09:00 Uhr wird dein Endrang gesichert. ${sb.played?"Deine Belohnung ist danach abholbar.":"Spiele mindestens eine gewertete Partie, um eine Wochenbelohnung zu erhalten."}</p>${competitionClaimButtons("squad")}`);
  put("playSquadRanks",SB_RANKS.map(row=>`<div class="play-rank-row ${row.name===rank.name?"is-current":""}"${row.name===rank.name?' aria-current="true"':""}><strong>${esc(row.name)}</strong><span>${fmt(row.min)} BP${row.name===rank.name?" · Dein Rang":""}</span><small>${rewardCopy(sbRankReward(row.name))}</small></div>`).join(""));
 }
 const rewardChips=reward=>`<div class="champions-chips">${rewardLabel({reward}).split(" · ").filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join("")}</div>`;
 function championsDots(c,active){
  return `<div class="champions-dots" role="img" aria-label="${c.games} von ${CHAMPIONS_MAX_GAMES} Spielen: ${c.wins} Siege, ${c.losses} Niederlagen">${Array.from({length:CHAMPIONS_MAX_GAMES},(_,i)=>{const r=c.results[i],cls=i<c.games?(r==="W"?"win":r==="L"?"loss":"played"):(active&&i===c.games?"next":"");return `<i class="${cls}"></i>`}).join("")}</div>`;
 }
 function renderChampions(){
  syncChampionsCompetition();const c=ensureChampionsState(),w=championsWindow(),rank=championsRank(c.wins),remaining=Math.max(0,CHAMPIONS_MAX_GAMES-c.games),pending=competitionPending("champions"),qualified=c.qualPoints>=CHAMPIONS_ENTRY_POINTS;
  const active=c.active&&c.week===w.key&&w.open,finished=c.week===w.key&&c.completed,ready=squadMetrics().filled===18,next=CHAMPIONS_RANKS.slice().reverse().find(row=>row.min>c.wins),qualValue=Math.max(0,Number(c.qualPoints||0)),qualPct=Math.max(0,Math.min(100,qualValue/CHAMPIONS_ENTRY_POINTS*100));
  const endWeekday=new Intl.DateTimeFormat("de-DE",{timeZone:FOOTERA_TIME_ZONE,weekday:"long"}).format(w.end);
  put("championsWindowSchedule",`Freitag ${String(championsStartHour(w.start)).padStart(2,"0")}:00 – ${endWeekday} 09:00 · ${esc(championsWindowText())}`);
  const tileHeadline=active?`${c.wins}-${c.losses} · ${esc(rank.name)}`:pending.length?"Belohnung abholbereit":qualified?"QUALIFIZIERT":"Champions-Qualifikation";
  const tileQual=active?"":`<span class="play-tile-qual" aria-label="Champions-Qualifikation ${fmt(qualValue)} von ${fmt(CHAMPIONS_ENTRY_POINTS)} CP"><span><i style="width:${qualPct}%"></i></span><small>${fmt(qualValue)} / ${fmt(CHAMPIONS_ENTRY_POINTS)} CP${qualified?" · QUALIFIZIERT":""}</small></span>`;
  put("playChampionsSummary",`<b>${tileHeadline}</b>${tileQual}<small>${active?`${remaining} Spiele übrig · ${esc(championsWindowText())}`:esc(championsWindowText())}</small>${pending.length?'<em>Champions-Rewards warten</em>':""}`);
  const kicker=$("championsKicker");if(kicker)kicker.textContent=active?`CHAMPIONS FINALS · SPIEL ${Math.min(CHAMPIONS_MAX_GAMES,c.games+1)} VON ${CHAMPIONS_MAX_GAMES}`:"CHAMPIONS FINALS";
  const best=c.bestWins||c.bestLosses!==99?championsBestRecordText():"noch keiner",meta=`<p class="champions-meta">Bester Record ${esc(best)} · ${fmt(c.participations)} ${c.participations===1?"Teilnahme":"Teilnahmen"}</p>`;
  let head,body="";
  if(active||finished){
   head=`<div class="champions-head"><h4>${c.wins}-${c.losses}</h4><b>${esc(active?rank.name:(c.lastRank||rank.name))}</b></div><span class="champions-sub">${active?`${remaining} ${remaining===1?"Spiel":"Spiele"} übrig`:"Teilnahme beendet · Endrang festgeschrieben"}</span>`;
   body=championsDots(c,active)+(active&&next?`<div class="champions-next"><span>Noch <b>${next.min-c.wins} ${next.min-c.wins===1?"Sieg":"Siege"}</b> bis <b>${esc(next.name)}</b>. Dort gibt es:</span>${rewardChips(championsRewardForWins(next.min))}</div>`:"");
  }else if(!qualified){
   head=`<div class="champions-head"><h4>${fmt(qualValue)} / ${fmt(CHAMPIONS_ENTRY_POINTS)} CP</h4><b>Quali</b></div><span class="champions-sub">Noch ${fmt(CHAMPIONS_ENTRY_POINTS-qualValue)} CP aus Division Rivals (Sieg +200 · Remis +100)</span>`;
   body=meter(qualValue,CHAMPIONS_ENTRY_POINTS,"Champions-Qualifikation");
  }else{
   head=`<div class="champions-head"><h4>Qualifiziert</h4><b>${w.open?"Finals offen":"Bereit"}</b></div><span class="champions-sub">${w.open?"Starte jetzt deinen Lauf mit 15 Spielen.":`Die Finals öffnen ${esc(championsDate(w.start))}.`}</span>`;
   body=championsDots(c,false);
  }
  put("championsRecord",head+body+meta);
  put("championsQualification",`<div class="champions-qual"><div><strong>${fmt(c.qualPoints)} / ${fmt(CHAMPIONS_ENTRY_POINTS)} CP</strong><span>${qualified?"Qualifikation erreicht":"Champions-Punkte aus Division Rivals"}</span></div>${meter(Math.min(CHAMPIONS_ENTRY_POINTS,c.qualPoints),CHAMPIONS_ENTRY_POINTS,"Champions-Qualifikation")}<p class="play-note">Rivals: Sieg +200 CP · Remis +100 CP. Eine Teilnahme kostet 1.000 CP.</p></div>`);
  put("championsRewards",`${competitionClaimButtons("champions")}<div class="play-reward-tier"><div><strong>${active?"Dein aktueller Rang":c.lastRank?"Letzter Rang":"Start-Rang"}</strong><b>${esc(active?rank.name:(c.lastRank||rank.name))}</b></div>${rewardChips(championsRewardForWins(active?c.wins:Math.max(0,c.bestWins||0)))}</div><p class="play-note">Nach Spiel 15 oder am ${esc(championsDate(active?(championsRunEnd(c.week)||w.end):w.end))} wird dein Endrang festgeschrieben. Player Picks kommen über dein Footera-Konto.</p>`);
  put("championsRanks",CHAMPIONS_RANKS.map(row=>`<div class="play-rank-row ${row.name===rank.name&&active?"is-current":""}"><strong>${esc(row.name)}</strong><span>${row.min===row.max?`${row.min} Siege`:`${row.min}–${row.max} Siege`}</span>${rewardChips(championsRewardForWins(row.min))}</div>`).join("")+`<p class="play-note">15 Spiele pro Wochenende · Verlängerung und Elfmeterschießen bei Gleichstand · die Gegnerstärke reagiert auf deinen laufenden Record.</p>`);
  const button=document.querySelector('.startmode[data-mode="champions"]');
  if(button){
   let label="Champions öffnen",disabled=!ready;
   if(active){label=`Weiter zu Spiel ${Math.min(CHAMPIONS_MAX_GAMES,c.games+1)}`}
   else if(finished){label="Teilnahme beendet";disabled=true}
   else if(!w.open){label="Champions öffnet Freitag";disabled=true}
   else if(!qualified){label=`Noch ${fmt(CHAMPIONS_ENTRY_POINTS-c.qualPoints)} CP`;disabled=true}
   else label="Teilnahme starten";
   button.textContent=label;button.disabled=disabled
  }
 }
 function selectedFriend(){const value=$("friendlyFriendSelect")?.value;return value!==""&&value!==undefined?state.friends[Number(value)]:null}
 function renderFriends(){
  const stats=statsFor("friendly-random");
  put("playRandomSummary",`<b>${fmt(stats.matches)} Freundschaftsspiele</b><small>${fmt(stats.wins)} Siege · ${stats.rate} % Siegquote</small>`);
  put("playFriendsSummary",`<b>${state.friends.length} ${state.friends.length===1?"Freund":"Freunde"} gespeichert</b><small>Freundesduell · Online-Rangliste</small>`);
  const friend=selectedFriend(),button=$("playFriendRanking"),available=!!friend?.onlineUid&&typeof window.FooteraOnline?.showComparison==="function";
  if(button)button.disabled=!available;
  if($("playFriendRankingNote"))$("playFriendRankingNote").textContent=available?`Siege, Punkte und Tore aus euren Live-Duellen gegen ${friend.clubName||"deinen Freund"}.`:friend?"Für die Online-Rangliste benötigst du einen Freund mit aktuellem Online-Code.":"Wähle einen Online-Freund, um eure Tabelle und direkte Bilanz anzusehen.";
 }
 function renderOverview(){
  safe(()=>window.FooteraTournaments?.render());safe(()=>window.FooteraHalloweenCup?.render());safe(renderRivals);safe(renderChampions);safe(renderSquad);safe(renderFriends);
  for(const [mode,config]of Object.entries(MODES))safe(()=>{if(config.stats)put(config.stats,statsHTML(mode))});
 }
 function show(mode,{push=true,focus=true}={}){
  area=MODES[mode]?mode:"hub";
  const hub=$("playModeHub"),detail=$("playModeDetail");
  if(hub)hub.hidden=area!=="hub";if(detail)detail.hidden=area==="hub";
  document.querySelectorAll("[data-play-panel]").forEach(panel=>panel.hidden=panel.dataset.playPanel!==area);
  if($("playDetailTitle"))$("playDetailTitle").textContent=MODES[area]?.title||"";
  const back=document.querySelector("[data-play-back]");if(back)back.textContent=area==="halloween-cup"?"← Alle Turniere":"← Alle Spielmodi";
  if(push)pushUiState(area==="hub"?"view":"play-mode",{view:"playView",playMode:area});
  if(focus){window.scrollTo({top:0,behavior:"smooth"});if(area!=="hub")$("playDetailTitle")?.focus({preventScroll:true})}
 }
 const originalStatus=renderCompetitionModeStatus;
 renderCompetitionModeStatus=function(){originalStatus();renderOverview()};
 const originalPlay=renderPlay;
 renderPlay=function(){safe(originalPlay);safe(()=>window.FooteraTournaments?.render());safe(()=>window.FooteraHalloweenCup?.render());safe(renderChampions);safe(renderFriends);show(area,{push:false,focus:false})};
 window.FooteraPlayHub={open:mode=>{renderPlay();show(mode)},restore:target=>{if(target?.view==="playView"){if(target.playMode==="tournaments")window.FooteraTournaments?.select(target.tournamentId||"",false);show(target.playMode||"hub",{push:false})}},handleBack:target=>{
  if(area==="hub")return false;
  if(target?.gfut&&target.view!=="playView"){area="hub";return false}
  if(target?.playMode==="tournaments")window.FooteraTournaments?.select(target.tournamentId||"",false);
  show(target?.playMode||"hub",{push:false});return true
 }};
 document.addEventListener("click",event=>{
  const tile=event.target.closest("[data-play-mode]");if(tile){renderPlay();show(tile.dataset.playMode);return}
  if(event.target.closest("[data-play-back]")){
   if(area==="halloween-cup"){window.FooteraTournaments?.select("",false);show("tournaments");return}
   const old=area;if(history.state?.kind==="play-mode")history.back();else show("hub");
   document.querySelector(`[data-play-mode="${old}"]`)?.focus({preventScroll:true});return
  }
  if(event.target.closest("#playFriendRanking")){const friend=selectedFriend();if(friend?.onlineUid)window.FooteraOnline?.showComparison(friend)}
 });
 show("hub",{push:false,focus:false});
 if(typeof module!=="undefined")module.exports={statsFor,statsHTML,renderOverview,show};
})();
