/* Weekly knockout cups: simulation owns results; account receipts own rewards. */
(()=>{
 'use strict';
 const MODE='tournament',ROUNDS=['Viertelfinale','Halbfinale','Finale'];
 const CUPS=[
  {id:'bronze',name:'Bronze Cup',quality:'Bronze',min:40,max:64,targets:[58,61,64],names:['Kupferstadt FC','Bronze Athletic','Bronze Elite'],coins:7500,pack:'goldplayers',reward:'2× Premium-Goldspieler-Pack',tone:'bronze'},
  {id:'silver',name:'Silber Cup',quality:'Silber',min:65,max:74,targets:[68,71,74],names:['Silberhain FC','Argentum Athletic','Silberstadt United'],coins:15000,pack:'83x3-sbc',reward:'2× 3×83+-Spielerpack',tone:'silver'},
  {id:'open',name:'Offener Cup',quality:'Freie Mannschaftswahl',min:40,max:99,targets:[79,83,87],names:['Arena Athletic','FC Horizont','Era United'],coins:20000,picks:2,reward:'2× 1-aus-3-Spielerpick · 84+',tone:'open'}
 ];
 let selected='',busy=false,message='';
 const cup=id=>CUPS.find(c=>c.id===id);
 function week(at=new Date()){const start=berlinWeekStart(new Date(at),4,19),p=berlinParts(start);return {key:`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`,start:+start,end:+berlinShiftDays(start,7,19)}}
 const key=(id,w)=>`tournament:${id}:${w}`;
 function progress(id,w=week().key){return state.tournaments?.[id]?.[w]||{attempt:0,wins:[],titles:0,earned:null}}
 function mutable(id,w){state.tournaments??={};state.tournaments[id]??={};return state.tournaments[id][w]??={attempt:0,wins:[],titles:0,earned:null}}
 function eligible(c,item){return !!item&&Number.isFinite(itemRating(item))&&itemRating(item)>=c.min&&itemRating(item)<=c.max}
 function rosterReason(id,ids=state.squad?.slice(0,18),allowEmpty=false){
  const c=cup(id);if(!c)return 'Turnier nicht verfügbar.';
  if(!Array.isArray(ids)||(!allowEmpty&&(ids.length!==18||ids.some(x=>!x))))return 'Bitte Startelf und Bank mit 18 Spielern besetzen.';
  const present=ids.filter(Boolean);if(new Set(present).size!==present.length)return 'Ein Spieler kann nur einmal im Kader stehen.';
  const bad=present.map(uid=>state.club.find(x=>x.uid===uid)).find(i=>!eligible(c,i));
  if(bad||present.some(uid=>!state.club.some(i=>i.uid===uid)))return c.id==='open'?'Ein Spieler ist nicht mehr im Verein.':`Nur ${c.quality}karten (${c.min}–${c.max} GES) in Startelf und Bank erlaubt.`;
  return '';
 }
 function canStart(id=selected,at=Date.now()){
  if(busy||window.FooteraAccount?.pendingChallengeReward?.())return 'Bitte zuerst die ausstehende Belohnung bestätigen.';
  if(!cup(id))return 'Wähle zuerst ein Turnier.';
  if(progress(id,week(at).key).wins.length===3)return 'Starte einen neuen Turnierversuch.';
  return rosterReason(id);
 }
 function opponent(id=selected,at=Date.now()){
  const c=cup(id),w=week(at),p=progress(id,w.key),stage=p.wins.length+1;if(!c||stage>3)return null;
  const seed=`cup|${id}|${w.key}|${p.attempt}|${stage}`,used=new Set(),squad=[],target=c.targets[stage-1];
  const pool=PLAYERS.filter(b=>Number(b.ovr)>=c.min&&Number(b.ovr)<=c.max&&b.gender!=='female');
  const ranked=pool.map(b=>({b,d:Math.abs(b.ovr-target),score:hashNum(seed+'|'+b.id)})).sort((a,b)=>a.d-b.d||a.score-b.score).map(x=>x.b);
  FORMATIONS['4-3-3'].forEach((slot,i)=>{
   const candidates=ranked.filter(b=>!used.has(String(b.id))&&posFit(b,slot.p)>0);
   const b=candidates[hashNum(seed+'|'+i)%Math.min(4,candidates.length)];if(b)used.add(String(b.id));squad.push(b||null);
  });
  for(let i=0;i<7;i++){const candidates=ranked.filter(b=>!used.has(String(b.id)));const b=candidates[i===0?0:Math.min(i,candidates.length-1)];if(b)used.add(String(b.id));squad.push(b||null)}
  if(squad.some(x=>!x))return null;
  const rating=Math.round(squad.slice(0,11).reduce((n,b)=>n+b.ovr,0)/11),chem=opponentChemistryTotal(squad,'4-3-3');
  const o={kind:'generated',name:c.names[stage-1],formation:'4-3-3',seed,squad,rating,chem,power:rating+chem*.12,tier:ROUNDS[stage-1],tournamentId:id,tournamentWeek:w.key,tournamentAttempt:p.attempt,tournamentStage:stage,styleProfile:{id:['block','wing','press'][stage-1],label:['Kompakte Defensive','Flügelspiel','Pressing'][stage-1]}};
  window.FooteraOpponentStyles?.styleFor?.(o);return o;
 }
 function kickoff(o,at=Date.now()){
  const id=o?.tournamentId,reason=canStart(id,at);if(reason)return {error:reason};const w=week(at),p=progress(id,w.key),c=cup(id);
  if(o.tournamentWeek!==w.key||o.tournamentAttempt!==p.attempt||o.tournamentStage!==p.wins.length+1||o.squad?.length!==18||o.squad.some(b=>!b||b.ovr<c.min||b.ovr>c.max))return {error:'Die Turnierrunde hat sich geändert. Bitte die Vorschau neu öffnen.'};
  return {saveId:state.profile.saveId,id,week:w.key,attempt:p.attempt,stage:o.tournamentStage,kickoffAt:at,roster:state.squad.slice(0,18).map(uid=>({uid,rating:itemRating(state.club.find(i=>i.uid===uid))}))};
 }
 function record(m,result,at=Date.now()){
  const ctx=m?.tournament,c=cup(ctx?.id);if(m?.mode!==MODE||!m.finished||!m.resultId||!ctx||!c||ctx.saveId!==state.profile.saveId||!['win','loss'].includes(result))return false;
  const w=week(ctx.kickoffAt),p=progress(ctx.id,ctx.week);
  if(w.key!==ctx.week||at<ctx.kickoffAt||at>=w.end+7200000||p.attempt!==ctx.attempt||ctx.stage!==p.wins.length+1||ctx.stage>3||p.lastResult===m.resultId||p.wins.some(x=>x.id===m.resultId))return false;
  if(ctx.roster?.length!==18||ctx.roster.some(r=>r.rating<c.min||r.rating>c.max)||new Set(ctx.roster.map(r=>r.uid)).size!==18)return false;
  if(p.wins.length&&ctx.kickoffAt<p.wins.at(-1).finishedAt)return false;
  const own=mutable(ctx.id,ctx.week);own.lastResult=m.resultId;
  if(result==='loss'){own.wins=[];own.attempt++;message='Ausgeschieden. Dein nächster Versuch beginnt im Viertelfinale.'}
  else{own.wins.push({id:m.resultId,stage:ctx.stage,kickoffAt:ctx.kickoffAt,finishedAt:at,roster:ctx.roster});if(ctx.stage===3){own.titles++;own.earned??=JSON.parse(JSON.stringify(own.wins));message=c.name+' gewonnen! Deine Wochenbelohnung wartet unter Turniere.'}else message=ROUNDS[ctx.stage-1]+' gewonnen – weiter geht’s!'}
  save();return true;
 }
 function restart(id=selected){if(busy||progress(id).wins.length!==3)return;const p=mutable(id,week().key);p.attempt++;p.wins=[];save();render()}
 function applyDeliveryToSave(s,data){
  const c=cup(data.cup_id);if(!c||data.save_id!==s.profile.saveId||data.claim_key!==key(c.id,data.week))throw Error('Die Turnierbestätigung gehört nicht zu diesem Verein.');
  s.challengeClaims??={};if(Object.hasOwn(s.challengeClaims,data.claim_key))return s;
  s.coins=(s.coins||0)+c.coins;
  if(c.pack){s.packs??={};s.packs[c.pack]=(s.packs[c.pack]||0)+2;s.rewardPackQueue??=[];for(let i=0;i<2;i++)s.rewardPackQueue.push({id:c.pack,tradeable:false,challengeClaim:data.claim_key})}
  s.challengeClaims[data.claim_key]=true;return s;
 }
 async function claim(id,w){
  if(busy)return;busy=true;message='Wochenbelohnung wird mit deinem Konto abgeglichen …';render();
  try{await window.FooteraAccount.claimTournamentReward(id,w,data=>{applyDeliveryToSave(state,data);save();flushSave();renderAll()});message='Wochenbelohnung erhalten. Packs und Picks findest du im Store.';window.FooteraPlayerPicks?.refresh?.(true)}catch(e){message=e.message||'Keine Bestätigung. Bitte dieselbe Belohnung erneut abholen.'}finally{busy=false;render()}
 }
 const trophy='<svg viewBox="0 0 80 88" aria-hidden="true"><path d="M21 10h38v20c0 19-8 30-19 30S21 49 21 30Z"/><path d="M21 17H8v10c0 13 8 20 18 20M59 17h13v10c0 13-8 20-18 20M40 60v14M25 79h30" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="m40 21 3 7 8 1-6 5 1 8-6-4-6 4 1-8-6-5 8-1Z" fill="#17151c"/></svg>';
 function select(id,push=true){selected=cup(id)?id:'';message='';if(push)pushUiState('play-mode',{view:'playView',playMode:'tournaments',tournamentId:selected});render()}
 function render(){
  const host=document.getElementById('tournamentsBody');if(!host)return;const w=week(),c=cup(selected),pending=window.FooteraAccount?.pendingChallengeReward?.();
  const rewardLine=x=>`${fmt(x.coins)} Münzen + ${x.reward}`;
  const overdue=CUPS.flatMap(x=>Object.entries(state.tournaments?.[x.id]||{}).filter(([wk,p])=>p.earned&&!state.challengeClaims?.[key(x.id,wk)]).map(([wk])=>({c:x,wk})));
  if(pending?.kind==='tournament'&&cup(pending.cup)&&pending.saveId===state.profile.saveId&&!overdue.some(x=>x.c.id===pending.cup&&x.wk===pending.week))overdue.unshift({c:cup(pending.cup),wk:pending.week});
  const notice=overdue.map(x=>`<div class="tournament-earned"><strong>${esc(x.c.name)} · Wochenbelohnung verdient</strong><small>Ausgabe ${esc(x.wk)}</small><button class="primary" data-tournament-claim="${x.c.id}" data-week="${esc(x.wk)}" ${busy?'disabled':''}>${pending?.kind==='tournament'&&pending.cup===x.c.id&&pending.week===x.wk?'Bestätigung erneut abrufen':'Belohnung abholen'}</button></div>`).join('');
  const summary=document.getElementById('playTournamentsSummary');if(summary)summary.textContent=overdue.length?overdue.length+' Wochenbelohnung(en) warten':'Bronze · Silber · Offen · Event-Cups';
  host.innerHTML=`<div class="tournament-intro"><span class="play-kicker">DEIN WEG ZUM POKAL</span><h3>${c?esc(c.name):'Turniere'}</h3><p>Drei Runden. Ein Titel. Deine Mannschaft.</p><span>Wochenwechsel: Donnerstag, 19 Uhr · ${esc(sbcTimeLeft(w.end))} verbleibend</span></div>${notice}<p class="tournament-message" role="status">${esc(message)}</p>`+(c?(()=>{
   const p=progress(c.id),reason=canStart(c.id),claimed=!!state.challengeClaims?.[key(c.id,w.key)],done=p.wins.length===3;
   return `<button class="play-back" data-tournament-back>← Alle Turniere</button><section class="tournament-detail ${c.tone}"><div class="tournament-trophy">${trophy}</div><span class="play-kicker">SIEGERBELOHNUNG · EINMAL PRO WOCHE</span><h4>${esc(rewardLine(c))}</h4><p>${c.id==='open'?'Freie Mannschaftswahl':`Nur ${c.quality}karten · ${c.min}–${c.max} GES · Startelf und Bank`}</p><strong>${claimed?'✓ Wochenbelohnung abgeholt':p.earned?'✓ Wochenbelohnung verdient':'Drei Siege in einem Versuch'}</strong><ol class="tournament-rounds">${ROUNDS.map((r,i)=>`<li class="${p.wins.length>i?'won':p.wins.length===i?'next':''}"><b>${p.wins.length>i?'✓':i+1}</b><span>${r}<small>Gegner ca. ${c.targets[i]} GES</small></span></li>`).join('')}</ol>${done?'<button class="primary" data-tournament-restart="'+c.id+'">Erneut spielen</button>':`<button class="primary" data-tournament-start="${c.id}" ${reason?'disabled':''}>Zur Aufstellung · ${ROUNDS[p.wins.length]}</button>`}${reason&&!done?`<p class="tournament-rule-error">${esc(reason)}</p>`:''}<p class="play-note">${p.titles||0} Turniersieg(e) diese Woche. Nach einer Niederlage beginnt ein neuer Versuch. Bei Gleichstand folgen Verlängerung und Elfmeterschießen. Weiteres Spielen bringt normale Matchbelohnungen; die große Siegerbelohnung gibt es einmal pro Konto und Cup je Woche. Alle Sieger-Packs und Picks sind untauschbar.</p></section>`;
  })():`<div class="tournament-grid">${CUPS.map(x=>{const p=progress(x.id),claimed=state.challengeClaims?.[key(x.id,w.key)];return `<button class="tournament-card ${x.tone}" data-tournament-select="${x.id}"><span class="tournament-trophy">${trophy}</span><span class="play-kicker">${x.id==='open'?'FREIE MANNSCHAFTSWAHL':`NUR ${x.quality.toUpperCase()}KARTEN`}</span><strong>${x.name}</strong><span class="tournament-prize">${esc(rewardLine(x))}</span><span class="tournament-card-footer">${claimed?'✓ Wochenbelohnung erhalten':p.earned?'Belohnung abholbereit':`${p.wins.length}/3 Siege im aktuellen Versuch`}<b>›</b></span></button>`}).join('')}<button class="tournament-card event play-halloween" data-play-mode="halloween-cup"><span class="tournament-trophy">☾</span><span class="play-kicker">ZEITLICH BEGRENZTER EVENT-CUP</span><strong>Halloween-Cup</strong><span class="tournament-prize">15.000 Münzen · 15×82+-Pack · Halloween-Team-1-Pick</span><span id="playHalloweenSummary" class="tournament-card-footer">30.10.–06.11. · jeweils 19 Uhr</span></button></div><p class="play-note">Viertelfinale → Halbfinale → Finale. Beliebig viele Versuche. Fortschritt wird nach jedem Spiel gespeichert. Zum Abholen der Wochenbelohnung benötigst du dein bestätigtes Footera-Konto.</p>`);
  window.FooteraHalloweenCup?.render();
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-tournament-select],[data-tournament-back],[data-tournament-start],[data-tournament-restart],[data-tournament-claim]');if(!b)return;if(b.hasAttribute('data-tournament-select'))select(b.dataset.tournamentSelect);else if(b.hasAttribute('data-tournament-back'))select('');else if(b.hasAttribute('data-tournament-start')){selected=b.dataset.tournamentStart;openModeEntry(MODE)}else if(b.hasAttribute('data-tournament-restart'))restart(b.dataset.tournamentRestart);else claim(b.dataset.tournamentClaim,b.dataset.week)});
 window.FooteraTournaments={MODE,CUPS,week,key,progress,rosterReason,canStart,opponent,kickoff,record,restart,applyDeliveryToSave,render,select,selected:()=>selected,busy:()=>busy};
})();
