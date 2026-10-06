/* The only bridge to Footera's authoritative simulation. */
let match3DQueue=null;
function cancelMatch3D(){
 match3DQueue?.cancel();match3DQueue=null;
 if(match)match.highlight3DPending=false;
 document.getElementById('match')?.classList.remove('highlight3d-pending');
}
function preserveMatch3DScroll(stage,before){
 if(!stage||!before||before.top>=0||before.bottom<=0)return;
 const ratio=Math.max(0,Math.min(1,-before.top/Math.max(1,before.height)));
 requestAnimationFrame(()=>{
  if(!stage.isConnected)return;
  const after=stage.getBoundingClientRect(),wantedTop=-ratio*after.height,delta=after.top-wantedTop;
  if(Math.abs(delta)>1)window.scrollBy(0,delta);
 });
}
function queueMatch3D(event){
 if(typeof FooteraHighlights==='undefined'||!FooteraHighlights.accepts(event.type)||!match||match.paused||match.finished)return false;
 const current=match;
 if(!match3DQueue){
  match3DQueue=new FooteraHighlights.Queue({
   onBusy(){current.highlight3DPending=true;stopMatchTimer();document.getElementById('match')?.classList.add('highlight3d-pending')},
   onIdle(){
    if(match!==current)return;
    const stage=document.getElementById('matchLiveStage'),before=stage?.getBoundingClientRect();
    current.highlight3DPending=false;current.highlightActive=false;
    document.getElementById('match')?.classList.remove('highlight3d-pending');
    updateMatchUI();renderMatchTimeline();renderMatchScene();setMatchPill(!!current.paused);preserveMatch3DScroll(stage,before);
    const fallback=current.highlight3DFallback;delete current.highlight3DFallback;
    if(fallback?.type==='goal'&&!current.paused&&!current.finished){
     const goal=current.goalEvents.find(g=>g.minute===fallback.minute&&g.side===fallback.team&&(g.playerName||g.scorer)===fallback.playerName);
     if(goal){showMatchGoalMoment(goal,{uid:goal.scorerUid,index:goal.scorerIndex});return}
    }
    if(!current.paused&&!current.finished)startMatchTimer();
   },
   onFallback(event){if(match===current)current.highlight3DFallback=event}
  });
 }
 const identity=typeof clubIdentitySnapshot==='function'?clubIdentitySnapshot():null;
 const home=identity?.kits?.home;
 const away=current.opponentProfile?.clubIdentity?.kits?.away;
 const queued=match3DQueue.enqueue({...event,period:FooteraHighlights.getMatchPeriod(current),homeColor:home?.shirtPrimary,awayColor:away?.shirtPrimary,homeShorts:home?.shorts,awayShorts:away?.shorts,homeSocks:home?.socks,awaySocks:away?.socks});
 // The simulation is already authoritative at enqueue time. Keep score, shots
 // and xG synchronized while the presentation layer is playing.
 if(queued){if(typeof updateMatchUI==='function')updateMatchUI(true);const clock=document.getElementById('matchMinute');if(clock)clock.textContent=`${event.minute}'`}
 return queued;
}
function queueMatchGoal3D(event){
 const queued=queueMatch3D({id:`goal:${match.goalEvents.length}`,type:'goal',minute:event.minute,team:event.side,playerId:event.scorerUid||event.scorerIndex,playerName:event.playerName||event.scorer});
 // Keep the original goal tick's early return (including its RNG consumption).
 if(queued)match.highlightActive=true;
 return queued;
}
function queueMatchChance3D(shot){
 if(!shot.highlightType)return false;
 return queueMatch3D({id:`shot:${match.shotEvents.length}`,type:shot.highlightType,minute:shot.minute,team:shot.side,playerId:shot.shooterUid||shot.shooterIndex,playerName:shot.playerName||shot.shooter,keeperName:shot.goalkeeperName||""});
}
(function(){
 const selects=document.querySelectorAll('[data-highlight-mode]');
 selects.forEach(select=>{
  for(const [value,label] of Object.entries(FooteraHighlights.MODES)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}
  select.value=FooteraHighlights.getMode();
  select.addEventListener('change',()=>{const value=FooteraHighlights.setMode(select.value);selects.forEach(other=>other.value=value);if(value==='off')match3DQueue?.skip()});
 });
 // Hidden tabs must not leave a suspended animation blocking the match.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)match3DQueue?.skip()});
 window.addEventListener('pagehide',()=>{
  const pending=!!match?.highlight3DPending;cancelMatch3D();
  if(pending&&match){match.highlightActive=false;match.highlight3DResume=true}
 });
 window.addEventListener('pageshow',()=>{
  if(!match?.highlight3DResume)return;delete match.highlight3DResume;
  updateMatchUI();renderMatchTimeline();renderMatchScene();setMatchPill(!!match.paused);
  if(!match.paused&&!match.finished)startMatchTimer();
 });
})();
