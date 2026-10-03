/* Footera V20.43 — Verein-Hub + Vereinsidentität + karteninstanzbezogene Statistiken */
(()=>{
 const STAT_VERSION=1;
 const STAT_MODE_LABELS={all:"Gesamt",squad:"Squad Battles",rivals:"Division Rivals",friendly:"Freundschaft",weekend:"Weekend League"};
 const EMPTY_STAT=()=>({matches:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,ratingTotal:0,ratedMatches:0,motm:0,yellow:0,red:0,saves:0,conceded:0,cleanSheets:0});
 let clubArea="hub",statsMode="all",statsTab="players",statsMetric="goals";

 function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
 function normaliseBucket(raw){const out=EMPTY_STAT();for(const k of Object.keys(out))out[k]=Math.max(0,num(raw?.[k]));return out}
 function ensureItemStats(item){
  if(!item)return null;
  if(!item.clubStats||typeof item.clubStats!=="object")item.clubStats={version:STAT_VERSION,overall:EMPTY_STAT(),modes:{}};
  item.clubStats.version=STAT_VERSION;
  item.clubStats.overall=normaliseBucket(item.clubStats.overall);
  item.clubStats.modes=item.clubStats.modes&&typeof item.clubStats.modes==="object"?item.clubStats.modes:{};
  if(!item.clubStats._legacyMigrated){
   item.clubStats.overall.goals=Math.max(item.clubStats.overall.goals,num(item.clubGoals));
   item.clubStats.overall.assists=Math.max(item.clubStats.overall.assists,num(item.clubAssists));
   item.clubStats._legacyMigrated=true;
  }
  item.clubGoals=item.clubStats.overall.goals;
  item.clubAssists=item.clubStats.overall.assists;
  return item.clubStats
 }
 function modeKey(mode){const m=String(mode||"").toLowerCase();if(m==="squad")return"squad";if(m==="rivals")return"rivals";if(m.startsWith("friendly"))return"friendly";if(m.includes("weekend")||m.includes("champ"))return"weekend";return m||"other"}
 function modeBucket(item,key){const stats=ensureItemStats(item);if(!stats)return EMPTY_STAT();if(key==="all")return stats.overall;if(!stats.modes[key])stats.modes[key]=EMPTY_STAT();else stats.modes[key]=normaliseBucket(stats.modes[key]);return stats.modes[key]}
 function addPerformance(bucket,row,{start=false,sub=false,motm=false}={}){
  if(!bucket||!row)return;
  bucket.matches+=1;if(start)bucket.starts+=1;if(sub)bucket.subApps+=1;
  bucket.minutes+=Math.max(0,num(row.minutes));bucket.goals+=Math.max(0,num(row.goals));bucket.assists+=Math.max(0,num(row.assists));
  bucket.yellow+=Math.max(0,num(row.yellows));bucket.red+=Math.max(0,num(row.reds));bucket.saves+=Math.max(0,num(row.saves));bucket.conceded+=Math.max(0,num(row.conceded));
  if(Number.isFinite(Number(row.rating))&&num(row.minutes)>0){bucket.ratingTotal+=num(row.rating);bucket.ratedMatches+=1}
  if(motm)bucket.motm+=1;
  if(String(row.position||"").toUpperCase()==="GK"&&num(row.minutes)>=60&&num(row.conceded)===0)bucket.cleanSheets+=1
 }
 function ensureHistory(){if(!Array.isArray(state.clubMatchHistory))state.clubMatchHistory=[];return state.clubMatchHistory}
 function resultForMatch(){
  const pens=match?.home===match?.away&&match?.penaltyWinner;
  if(match.home>match.away||(pens&&match.penaltyWinner==="home"))return"win";
  if(match.home<match.away||(pens&&match.penaltyWinner==="away"))return"loss";
  return"draw"
 }
 function recordClubMatchHistory(){
  if(!match)return;const history=ensureHistory(),id=String(match.resultId||"");if(id&&history.some(x=>String(x.id)===id))return;
  history.push({id:id||`match-${Date.now()}`,ts:Date.now(),mode:modeKey(match.mode),result:resultForMatch(),gf:num(match.home),ga:num(match.away),opponent:String(match.opponentName||"Gegner")});
  if(history.length>400)state.clubMatchHistory=history.slice(-400)
 }

 /* Replaces the former goal-only accumulator. Each owned card instance keeps its own career. */
 applyClubGoalStats=function(){
  if(!match||match.playerStatsApplied)return;match.playerStatsApplied=true;
  const rows=matchReportPerformanceRows("home"),mode=modeKey(match.mode),potm=matchReportPotm(),starterIds=new Set((match.initialStarters||[]).filter(Boolean).map(String));
  for(const row of rows){
   const appeared=num(row.minutes)>0||num(row.goals)>0||num(row.assists)>0||num(row.yellows)>0||num(row.reds)>0;if(!appeared)continue;
   const item=row.item||state.club.find(x=>String(x.uid)===String(row.uid));if(!item)continue;
   const start=starterIds.has(String(row.uid)),sub=!start,wonPotm=potm?.side==="home"&&String(potm.uid)===String(row.uid);
   addPerformance(modeBucket(item,"all"),row,{start,sub,motm:wonPotm});
   addPerformance(modeBucket(item,mode),row,{start,sub,motm:wonPotm});
   item.clubGoals=ensureItemStats(item).overall.goals;item.clubAssists=item.clubStats.overall.assists
  }
  recordClubMatchHistory()
 };

 function averageRating(bucket){return num(bucket?.ratedMatches)?num(bucket.ratingTotal)/num(bucket.ratedMatches):0}
 function statRows(mode=statsMode){
  return (state.club||[]).map(item=>{const base=displayBase(item);if(!base)return null;const b=modeBucket(item,mode),cards=num(b.yellow)+num(b.red);return{item,base,b,goals:num(b.goals),assists:num(b.assists),scorer:num(b.goals)+num(b.assists),matches:num(b.matches),starts:num(b.starts),subs:num(b.subApps),minutes:num(b.minutes),avg:averageRating(b),motm:num(b.motm),yellow:num(b.yellow),red:num(b.red),cards,saves:num(b.saves),conceded:num(b.conceded),cleanSheets:num(b.cleanSheets)}}).filter(Boolean)
 }
 function activeRows(mode=statsMode){return statRows(mode).filter(r=>r.matches||r.goals||r.assists||r.cards||r.saves||r.cleanSheets)}
 function topRow(rows,key,min=0){return [...rows].filter(r=>num(r[key])>=min).sort((a,b)=>num(b[key])-num(a[key])||b.scorer-a.scorer||b.matches-a.matches)[0]||null}
 function fmtRate(v){return v?Number(v).toFixed(1).replace(".",","):"–"}
 function playerCardButton(row,extra=""){if(!row)return '<div class="club-stats-empty-leader">Noch keine Daten</div>';return '<div class="club-stat-card-visual '+esc(extra)+'" role="button" tabindex="0" aria-label="'+esc(row.base.name)+' öffnen" data-club-stat-player="'+esc(row.item.uid)+'">'+cardHTML(row.base,row.item,true,row.base.position)+'</div>'}
 function leaderCard(label,row,value){return `<article class="club-stat-leader"><span>${label}</span>${playerCardButton(row)}<strong>${row?esc(row.base.name):"–"}</strong><b>${row?value:"Keine Daten"}</b></article>`}
 function renderHub(){
  const hub=$("clubStatsHub");if(!hub)return;
  const count=(state.club||[]).length,stored=(state.sbcStorage||[]).length,played=activeRows("all").reduce((n,r)=>n+r.matches,0);
  $("clubHubProsCount").textContent=`${count} Item${count===1?"":"s"}`;$("clubHubStorageCount").textContent=`${stored}/100`;
  $("clubHubStatsCount").textContent=played?"Daten verfügbar":"Noch keine Spiele"
 }
 function renderStorage(){
  const root=$("clubStorageGrid");if(!root)return;const items=state.sbcStorage||[];
  $("clubStorageMeta").textContent=`${items.length}/100 Plätze belegt`;
  root.innerHTML=items.length?items.map(item=>{const b=displayBase(item);return b?`<button class="club-storage-item" type="button" data-club-storage-player="${esc(item.uid)}"><span class="mini">${cardHTML(b,item,true,b.position)}</span><strong>${esc(b.name)}</strong><small>${item.tradeable?"Tauschbar":"Untauschbar"}</small></button>`:""}).join(""):'<div class="club-stats-empty">Dein SBC-Speicher ist leer.</div>'
 }
 function modeButtons(){return Object.entries(STAT_MODE_LABELS).map(([key,label])=>`<button type="button" class="club-stat-filter ${statsMode===key?"active":""}" data-club-stat-mode="${key}">${label}</button>`).join("")}
 function statsTabs(){return [["players","Spieler"],["club","Verein"],["records","Rekorde"]].map(([key,label])=>`<button type="button" class="club-stat-tab ${statsTab===key?"active":""}" data-club-stat-tab="${key}">${label}</button>`).join("")}
 function renderStatsOverview(rows){
  const goals=topRow(rows,"goals",1),assists=topRow(rows,"assists",1);
  const topScorers=[...rows].filter(r=>r.scorer>0).sort((a,b)=>b.scorer-a.scorer||b.goals-a.goals||b.assists-a.assists).slice(0,5);
  return `<div class="club-stat-leaders">${leaderCard("TOP-TORSCHÜTZE",goals,goals?`${goals.goals} Tore`:"")}${leaderCard("TOP-VORLAGENGEBER",assists,assists?`${assists.assists} Vorlagen`:"")}</div><section class="club-top-scorers"><div class="club-stat-section-head"><div><span>TOP 5</span><h3>Scorer</h3></div><small>Tore + Vorlagen</small></div>${topScorers.length?`<div class="club-top-scorer-grid">${topScorers.map((r,i)=>`<button type="button" class="club-top-scorer" data-club-stat-player="${esc(r.item.uid)}"><span class="rank">${i+1}</span><span class="mini">${cardHTML(r.base,r.item,true,r.base.position)}</span><span class="copy"><strong>${esc(r.base.name)}</strong><small>${r.goals} Tore · ${r.assists} Vorlagen</small></span><b>${r.scorer}</b></button>`).join("")}</div>`:'<div class="club-stats-empty">Noch keine Scorerpunkte erfasst.</div>'}</section>`
 }
 function metricValue(r){if(statsMetric==="avg")return r.avg;if(statsMetric==="cards")return r.cards;return num(r[statsMetric])}
 function renderPlayers(rows){
  const metrics=[["goals","Tore"],["assists","Vorlagen"],["scorer","Scorer"],["matches","Spiele"],["avg","Ø-Note"],["cards","Karten"]];
  const ranked=[...rows].filter(r=>r.matches||r.goals||r.assists||r.cards).sort((a,b)=>metricValue(b)-metricValue(a)||b.scorer-a.scorer||b.matches-a.matches);
  return `<div class="club-stat-metrics">${metrics.map(([k,l])=>`<button type="button" class="${statsMetric===k?"active":""}" data-club-stat-metric="${k}">${l}</button>`).join("")}</div>${ranked.length?`<div class="club-stat-ranking">${ranked.map((r,i)=>{const gk=String(r.base.position).toUpperCase()==="GK";return `<button type="button" class="club-stat-row" data-club-stat-player="${esc(r.item.uid)}"><span class="club-stat-rank">${i+1}</span><span class="mini">${cardHTML(r.base,r.item,true,r.base.position)}</span><span class="club-stat-copy"><strong>${esc(r.base.name)}</strong><small>${r.matches} Spiele · ${r.starts} Startelf · ${r.subs} Einwechsl. · ${r.minutes} Min.</small><small>${r.goals} Tore · ${r.assists} Vorlagen · ${r.motm}× Spieler des Spiels${gk?` · ${r.cleanSheets}× zu Null · ${r.saves} Paraden`:""}</small><small>🟨 ${r.yellow} · 🟥 ${r.red}</small></span><b>${statsMetric==="avg"?fmtRate(r.avg):metricValue(r)}</b></button>`}).join("")}</div>`:'<div class="club-stats-empty">Für diesen Wettbewerb wurden noch keine Kartenstatistiken erfasst.</div>'}`
 }
 function historyRows(mode=statsMode){const rows=ensureHistory();return mode==="all"?[...rows]:rows.filter(x=>x.mode===mode)}
 function clubSummary(mode){
  const hist=historyRows(mode);let matches=hist.length,wins=hist.filter(x=>x.result==="win").length,draws=hist.filter(x=>x.result==="draw").length,losses=hist.filter(x=>x.result==="loss").length;
  if(mode==="all"&&num(state.stats?.matches)>matches){matches=num(state.stats.matches);wins=num(state.stats.wins);draws=num(state.stats.draws);losses=num(state.stats.losses)}
  return{hist,matches,wins,draws,losses,gf:hist.reduce((n,x)=>n+num(x.gf),0),ga:hist.reduce((n,x)=>n+num(x.ga),0)}
 }
 function renderClubTab(){
  const x=clubSummary(statsMode),rate=x.matches?Math.round(x.wins/x.matches*100):0,form=x.hist.slice(-5).map(m=>`<span class="form-${m.result}">${m.result==="win"?"S":m.result==="draw"?"U":"N"}</span>`).join("");
  return `<div class="club-team-kpis"><div><strong>${x.matches}</strong><span>Spiele</span></div><div><strong>${x.wins}</strong><span>Siege</span></div><div><strong>${x.draws}</strong><span>Remis</span></div><div><strong>${x.losses}</strong><span>Niederlagen</span></div><div><strong>${rate}%</strong><span>Siegquote</span></div><div><strong>${x.gf}:${x.ga}</strong><span>Tore*</span></div></div><div class="club-form-card"><div><span>LETZTE 5</span><strong>Form</strong></div><div class="club-form">${form||'<small>Noch keine neuen Spiele</small>'}</div></div><p class="club-stat-note">* Tore, Gegentore und Form werden ab dieser Statistik-Version vollständig geführt. Bereits vorhandene Siege/Remis/Niederlagen bleiben erhalten.</p>`
 }
 function longestStreak(hist,allowed){let best=0,cur=0;for(const m of hist){if(allowed.includes(m.result)){cur++;best=Math.max(best,cur)}else cur=0}return best}
 function recordLine(title,value,sub=""){return `<div class="club-record"><span>${title}</span><strong>${value||"–"}</strong>${sub?`<small>${sub}</small>`:""}</div>`}
 function renderRecords(rows){
  const hist=historyRows(statsMode),wins=hist.filter(x=>x.result==="win").sort((a,b)=>(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf),highest=wins[0]||null;
  const goal=topRow(rows,"goals",1),assist=topRow(rows,"assists",1),scorer=topRow(rows,"scorer",1),clean=topRow(rows,"cleanSheets",1),cards=topRow(rows,"cards",1);
  return `<div class="club-record-grid">${recordLine("Höchster Sieg",highest?`${highest.gf}:${highest.ga}`:"–",highest?highest.opponent:"")}${recordLine("Längste Siegesserie",`${longestStreak(hist,["win"])} Spiele`)}${recordLine("Längste Serie ohne Niederlage",`${longestStreak(hist,["win","draw"])} Spiele`)}${recordLine("Meiste Tore",goal?`${goal.goals} · ${esc(goal.base.name)}`:"–")}${recordLine("Meiste Vorlagen",assist?`${assist.assists} · ${esc(assist.base.name)}`:"–")}${recordLine("Meiste Scorerpunkte",scorer?`${scorer.scorer} · ${esc(scorer.base.name)}`:"–")}${recordLine("Meiste Zu-Null-Spiele",clean?`${clean.cleanSheets} · ${esc(clean.base.name)}`:"–")}${recordLine("Meiste Karten",cards?`${cards.cards} · ${esc(cards.base.name)}`:"–",cards?`🟨 ${cards.yellow} · 🟥 ${cards.red}`:"")}</div>`
 }
 function renderStatistics(){
  const root=$("clubStatsContent");if(!root)return;const rows=activeRows(statsMode);
  $("clubStatsFilters").innerHTML=modeButtons();$("clubStatsTabs").innerHTML=statsTabs();
  let content=statsTab==="players"?renderPlayers(rows):statsTab==="club"?renderClubTab():renderRecords(rows);
  root.innerHTML=renderStatsOverview(rows)+`<section class="club-stat-detail">${content}</section>`
 }
 function showArea(area){
  clubArea=area;const hub=$("clubStatsHub"),pros=$("clubProsPanel"),storage=$("clubStoragePanel"),stats=$("clubStatsPanel"),headline=$("clubView")?.querySelector(":scope > .headline h2"),desc=$("clubView")?.querySelector(":scope > .headline p");
  const usesProsPanel=area==="pros"||area==="identity";
  if(hub)hub.hidden=area!=="hub";if(pros)pros.hidden=!usesProsPanel;if(storage)storage.hidden=area!=="storage";if(stats)stats.hidden=area!=="stats";
  const copy={hub:["Verein","Dein Club, deine Karten und deine Statistiken."],pros:["Profis","Alle gezogenen, gekauften und entwickelten Spieleritems."],identity:["Vereinsidentität","Vereinsname, Wappen, Farben und Trikots gestalten."],storage:["SBC-Speicher","Untauschbare Duplikate für spätere Squad Building Challenges."],stats:["Statistiken","Jede einzelne Karteninstanz führt ihre eigene Vereinskarriere."]}[area]||[];
  if(headline)headline.textContent=copy[0]||"Verein";if(desc)desc.textContent=copy[1]||"";
  if(usesProsPanel){
   clubSection=area==="identity"?"identity":"players";
   if(area==="identity"&&typeof makeClubIdentityDraft==="function")clubIdentityDraft=makeClubIdentityDraft();
   if(typeof syncClubSectionUi==="function")syncClubSectionUi();
   originalRenderClub()
  }
  if(area==="storage")renderStorage();if(area==="stats")renderStatistics();renderHub();window.scrollTo({top:0,behavior:"smooth"})
 }
 function initUi(){
  const view=$("clubView");if(!view||$("clubStatsHub"))return;const pros=view.querySelector(":scope > .section");if(!pros)return;
  pros.id="clubProsPanel";pros.classList.add("club-area-panel");pros.hidden=true;
  pros.insertAdjacentHTML("afterbegin",'<button type="button" class="club-area-back" data-club-area="hub">← Verein</button>');
  const tabs=pros.querySelector(".club-section-tabs");if(tabs)tabs.hidden=true;
  const hub=document.createElement("div");hub.id="clubStatsHub";hub.className="club-hub";hub.innerHTML=`<button type="button" class="club-hub-card club-hub-pros" data-club-area="pros"><span class="club-hub-kicker">KADER</span><strong>Profis</strong><small id="clubHubProsCount">0 Items</small><i>›</i></button><button type="button" class="club-hub-card club-hub-identity" data-club-area="identity"><span class="club-hub-kicker">CLUB</span><strong>Vereinsidentität</strong><small>Vereinsname · Wappen · Farben · Trikots</small><i>›</i></button><div class="club-hub-grid"><button type="button" class="club-hub-card" data-club-area="storage"><span class="club-hub-icon">▣</span><strong>SBC-Speicher</strong><small id="clubHubStorageCount">0/100</small><i>›</i></button><button type="button" class="club-hub-card club-hub-stats" data-club-area="stats"><span class="club-hub-icon">▥</span><strong>Statistiken</strong><small id="clubHubStatsCount">Noch keine Spiele</small><i>›</i></button></div>`;
  view.insertBefore(hub,pros);
  const storage=document.createElement("div");storage.id="clubStoragePanel";storage.className="section club-area-panel";storage.hidden=true;storage.innerHTML='<button type="button" class="club-area-back" data-club-area="hub">← Verein</button><div class="club-area-head"><div><span>SBC-SPEICHER</span><h3>Gesicherte Duplikate</h3></div><b id="clubStorageMeta">0/100 Plätze belegt</b></div><div id="clubStorageGrid" class="club-storage-grid"></div>';
  const stats=document.createElement("div");stats.id="clubStatsPanel";stats.className="section club-area-panel";stats.hidden=true;stats.innerHTML='<button type="button" class="club-area-back" data-club-area="hub">← Verein</button><div id="clubStatsFilters" class="club-stat-filters"></div><div id="clubStatsTabs" class="club-stat-tabs"></div><div id="clubStatsContent"></div>';
  view.append(storage,stats);showArea("hub")
 }

 const originalRenderClub=renderClub;
 renderClub=function(){originalRenderClub();renderHub();if(clubArea==="storage")renderStorage();if(clubArea==="stats")renderStatistics()};
 document.addEventListener("click",e=>{
  const area=e.target.closest("[data-club-area]");if(area){showArea(area.dataset.clubArea);return}
  const mode=e.target.closest("[data-club-stat-mode]");if(mode){statsMode=mode.dataset.clubStatMode;renderStatistics();return}
  const tab=e.target.closest("[data-club-stat-tab]");if(tab){statsTab=tab.dataset.clubStatTab;renderStatistics();return}
  const metric=e.target.closest("[data-club-stat-metric]");if(metric){statsMetric=metric.dataset.clubStatMetric;renderStatistics();return}
  const statPlayer=e.target.closest("[data-club-stat-player]");if(statPlayer){const item=(state.club||[]).find(x=>String(x.uid)===String(statPlayer.dataset.clubStatPlayer));if(item)openBiography(item,null);return}
  const stored=e.target.closest("[data-club-storage-player]");if(stored){const item=(state.sbcStorage||[]).find(x=>String(x.uid)===String(stored.dataset.clubStoragePlayer));if(item)openBiography(item,null);return}
 });
 initUi();
 for(const item of state.club||[])ensureItemStats(item);
})();