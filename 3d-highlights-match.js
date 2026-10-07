/* The only bridge to Footera's authoritative simulation. */
let match3DQueue=null,match3DScrollLock=null;
function lockMatch3DViewport(){
 if(match3DScrollLock)return;
 const body=document.body,stage=document.getElementById('matchLiveStage');
 stage?.scrollIntoView({block:'center',behavior:'auto'});
 const y=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
 match3DScrollLock={y,position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow};
 document.documentElement.classList.add('fh3d-scroll-lock');
 body.style.position='fixed';body.style.top=`-${y}px`;body.style.left='0';body.style.right='0';body.style.width='100%';body.style.overflow='hidden';
}
function unlockMatch3DViewport(){
 const lock=match3DScrollLock;if(!lock)return;
 const body=document.body;
 body.style.position=lock.position;body.style.top=lock.top;body.style.left=lock.left;body.style.right=lock.right;body.style.width=lock.width;body.style.overflow=lock.overflow;
 document.documentElement.classList.remove('fh3d-scroll-lock');match3DScrollLock=null;
 window.scrollTo({top:lock.y,behavior:'auto'});
}
function cancelMatch3D(){
 match3DQueue?.cancel();match3DQueue=null;
 if(match)match.highlight3DPending=false;
 document.getElementById('match')?.classList.remove('highlight3d-pending');unlockMatch3DViewport();
}
function match3DStableNumber(value){
 let n=2166136261;for(const ch of String(value||'')){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0
}
function match3DActorSlot(side,{uid='',index=-1,name=''}={}){
 if(typeof matchActorRows!=='function')return'';
 const rows=matchActorRows(side)||[];
 const row=side==='home'?(uid?rows.find(r=>String(r.uid)===String(uid)):null):(Number(index)>=0?rows.find(r=>Number(r.index)===Number(index)):null);
 const byName=row||rows.find(r=>String(r.name||r.base?.name||'').toLowerCase()===String(name||'').toLowerCase());
 return String(byName?.slot||'').toUpperCase()
}
function match3DPresentationMeta(event,current){
 const rows=typeof matchActorRows==='function'?(matchActorRows(event.team)||[]):[],row=event.team==='home'
  ?(event.playerId?rows.find(r=>String(r.uid)===String(event.playerId)):null)||rows.find(r=>String(r.name||'').toLowerCase()===String(event.playerName||'').toLowerCase())
  :(Number(event.playerId)>=0?rows.find(r=>Number(r.index)===Number(event.playerId)):null)||rows.find(r=>String(r.name||'').toLowerCase()===String(event.playerName||'').toLowerCase());
 let playerCardHTML='';
 if(event.type==='goal'&&row?.base&&typeof cardHTML==='function'){
  const item=event.team==='home'&&typeof state!=='undefined'?state.club?.find(i=>String(i.uid)===String(row.uid)):null;
  try{playerCardHTML=cardHTML(item&&typeof displayBase==='function'?displayBase(item):row.base,item||null,false,row.slot||row.base.position,false)||''}catch(_){}
 }
 const identity=typeof clubIdentitySnapshot==='function'?clubIdentitySnapshot():null,opponentIdentity=current?.opponentProfile?.clubIdentity||null;
 const homeName=String((typeof state!=='undefined'&&state.profile?.clubName)||'Heimteam'),awayName=String(current?.opponentProfile?.clubName||current?.opponentProfile?.name||current?.opponentName||'Gegner');
 const teamName=event.team==='away'?awayName:homeName,teamIdentity=event.team==='away'?opponentIdentity:identity;
 let teamCrestHTML='';if(teamIdentity&&typeof crestHTML==='function'){try{teamCrestHTML=crestHTML(teamIdentity,true)||''}catch(_){}}
 return{playerCardHTML,teamName,teamCrestHTML}
}
function match3DSequence(event){
 const wideLeft=new Set(['LB','LWB','LM','LW']),wideRight=new Set(['RB','RWB','RM','RW']);
 if(['freekick','penalty'].includes(event.creationType))return'central';
 if(event.creationType==='solo')return'dribble';
 if(wideLeft.has(event.creatorSlot)||wideRight.has(event.creatorSlot)){
  const side=wideLeft.has(event.creatorSlot)?'left':'right';
  return match3DStableNumber(event.id+event.minute)%2?`wing_${side}`:`cutback_${side}`
 }
 if(wideLeft.has(event.scorerSlot)||wideRight.has(event.scorerSlot))return'dribble';
 const cycle=['one_two','through_ball','central','dribble'];
 return cycle[match3DStableNumber(event.id+':'+event.minute+':'+event.playerName)%cycle.length]
}

function queueMatch3D(event){
 if(typeof FooteraHighlights==='undefined'||!FooteraHighlights.accepts(event.type)||!match||match.paused||match.finished)return false;
 const current=match;
 if(!match3DQueue){
  match3DQueue=new FooteraHighlights.Queue({
   onBusy(){current.highlight3DPending=true;stopMatchTimer();document.getElementById('match')?.classList.add('highlight3d-pending');lockMatch3DViewport()},
   onIdle(){
    if(match!==current){unlockMatch3DViewport();return}
    current.highlight3DPending=false;current.highlightActive=false;
    document.getElementById('match')?.classList.remove('highlight3d-pending');
    updateMatchUI();renderMatchTimeline();renderMatchScene();setMatchPill(!!current.paused);unlockMatch3DViewport();
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
 const home=current.kickoffKits?.home||identity?.kits?.home;
 const opponentIdentity=current.opponentProfile?.clubIdentity;
 const away=current.kickoffKits?.away||opponentIdentity?.kits?.away||opponentIdentity?.kits?.home;
 const presentation={...event,...match3DPresentationMeta(event,current)};
 presentation.scorerSlot=event.scorerSlot||match3DActorSlot(event.team,{uid:event.playerId,index:event.playerId,name:event.playerName});
 presentation.creatorSlot=event.creatorSlot||match3DActorSlot(event.team,{uid:event.creatorUid,index:event.creatorIndex,name:event.creatorName||event.assistName});
 presentation.sequence=event.sequence||match3DSequence({...presentation,id:event.id||'',minute:event.minute||0});
 const queued=match3DQueue.enqueue({...presentation,period:FooteraHighlights.getMatchPeriod(current),
  homeColor:home?.shirtPrimary,homeSecondary:home?.shirtSecondary,homePattern:home?.pattern,homeShorts:home?.shorts,homeSocks:home?.socks,homeKitConfigured:!!home,
  awayColor:away?.shirtPrimary,awaySecondary:away?.shirtSecondary,awayPattern:away?.pattern,awayShorts:away?.shorts,awaySocks:away?.socks,awayKitConfigured:!!away});
 // The simulation is already authoritative at enqueue time. Keep score, shots
 // and xG synchronized while the presentation layer is playing.
 if(queued){if(typeof updateMatchUI==='function')updateMatchUI(true);const clock=document.getElementById('matchMinute');if(clock)clock.textContent=`${event.minute}'`}
 return queued;
}
function queueMatchGoal3D(event){
 const queued=queueMatch3D({id:`goal:${match.goalEvents.length}`,type:'goal',minute:event.minute,team:event.side,playerId:event.scorerUid||event.scorerIndex,playerName:event.playerName||event.scorer,
  assistName:event.assist||'',creatorName:event.assist||'',creatorUid:event.assistUid||'',creatorIndex:event.assistIndex,creationType:event.type||''});
 // Keep the original goal tick's early return (including its RNG consumption).
 if(queued)match.highlightActive=true;
 return queued;
}
function queueMatchChance3D(shot){
 if(!shot.highlightType)return false;
 return queueMatch3D({id:`shot:${match.shotEvents.length}`,type:shot.highlightType,minute:shot.minute,team:shot.side,playerId:shot.shooterUid||shot.shooterIndex,playerName:shot.playerName||shot.shooter,keeperName:shot.goalkeeperName||"",
  creatorName:shot.creator||'',creationType:'chance'});
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
