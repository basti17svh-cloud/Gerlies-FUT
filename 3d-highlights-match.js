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
 if(match){match.highlight3DPending=false;delete match.highlight3DScoreHold}
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
function match3DShirtNumbers(event,current,defender,goalie,defenderIndex){
 // Visual only; never affect the match simulation or its random stream.
 const fallbacks=[9,10,7,11,18,21,6,8,4,5,3,2,14,17,15,20],out=fallbacks.slice();
 const valid=(v,fb)=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=99?n:fb};
 const rows=side=>typeof matchActorRows==="function"?(matchActorRows(side)||[]):[];
 const field=side=>rows(side).filter(row=>!/^(GK|TW|TH)$/i.test(String(row.slot||"")));
 const number=(side,row,fb)=>side==="home"?valid(current?.shirtNumbers?.[row?.uid],fb):
  valid(row?.entry?.shirtNumber??row?.entry?.jerseyNumber??row?.base?.shirtNumber??row?.base?.jerseyNumber,fb);
 const attackSide=event.team==="away"?"away":"home",defendSide=attackSide==="home"?"away":"home";
 const attacker=field(attackSide).find(row=>attackSide==="home"?String(row.uid)===String(event.playerId):String(row.index)===String(event.playerId))||
  field(attackSide).find(row=>String(row.name).toLowerCase()===String(event.playerName||"").toLowerCase());
 const fill=(side,offset,lead,target)=>{
  const list=field(side),anchor=list.includes(lead)?lead:null,ordered=anchor?[anchor,...list.filter(row=>row!==anchor)]:list;
  let slot=0;
  for(let i=0;i<ordered.length&&i<8;i++){
   if(i===0&&anchor){out[offset+target]=number(side,ordered[i],out[offset+target]);continue}
   while(anchor&&slot===target)slot++;
   if(slot>7)break;
   out[offset+slot]=number(side,ordered[i],out[offset+slot]);slot++;
  }
 };
 fill(attackSide,0,attacker,0);
 fill(defendSide,8,defender,Math.max(0,Math.min(7,Number(defenderIndex)-8)));
 return {shirtNumbers:out,keeperShirtNumber:number(defendSide,goalie,1)};
}
function match3DPresentationMeta(event,current){
 const rows=typeof matchActorRows==='function'?(matchActorRows(event.team)||[]):[],row=event.team==='home'
  ?(event.playerId?rows.find(r=>String(r.uid)===String(event.playerId)):null)||rows.find(r=>String(r.name||'').toLowerCase()===String(event.playerName||'').toLowerCase())
  :(Number(event.playerId)>=0?rows.find(r=>Number(r.index)===Number(event.playerId)):null)||rows.find(r=>String(r.name||'').toLowerCase()===String(event.playerName||'').toLowerCase());
 let playerCardHTML='';
 if(event.type==='goal'&&row?.base&&typeof cardHTML==='function'){
  const homeItem=event.team==='home'&&typeof state!=='undefined'?state.club?.find(i=>String(i.uid)===String(row.uid)):null;
  const awayCandidate=event.team==='away'?(current?.opponentProfile?.items?.[row.index]||(row.entry&&typeof row.entry==='object'&&row.entry.pid?row.entry:null)):null;
  const item=homeItem||awayCandidate||null;
  try{const base=item&&typeof displayBase==='function'?(displayBase(item)||row.base):row.base;playerCardHTML=cardHTML(base,item,false,row.slot||base.position,false)||''}catch(_){}
 }
 const homeName=String((typeof state!=='undefined'&&state.profile?.clubName)||'Heimteam'),awayName=String(current?.opponentProfile?.clubName||current?.opponentProfile?.name||current?.opponentName||'Gegner');
 const teamName=event.team==='away'?awayName:homeName;
 const kickoffIdentity=current?.kickoffTeamIdentity?.[event.team]||null;
 const liveIdentity=event.team==='away'?(current?.opponentProfile?.clubIdentity||null):(typeof clubIdentitySnapshot==='function'?clubIdentitySnapshot():null);
 const teamIdentity=kickoffIdentity||liveIdentity;
 let teamCrestHTML='';if(teamIdentity&&typeof crestHTML==='function'){try{teamCrestHTML=crestHTML(teamIdentity,true)||''}catch(_){}}
 return{playerCardHTML,teamName,teamCrestHTML}
}
// Resolve styles from copies of actor data; never consume simulation RNG.
function match3DActorStyles(side,{uid='',index=-1,name=''}={}){
 if(typeof matchActorRows!=='function'||typeof FooteraPlayStyles==='undefined')return[];
 const rows=matchActorRows(side)||[],key=String(name||'').toLowerCase(),num=Number(index);
 const row=(side==='home'&&uid?rows.find(r=>String(r.uid)===String(uid)):null)||
   (side==='away'&&Number.isInteger(num)&&num>=0?rows.find(r=>r.index===num):null)||
   (key?rows.find(r=>String(r.name||r.base?.name||'').toLowerCase()===key):null);
 if(!row?.base)return[];
 const item=side==='home'&&typeof state!=='undefined'?state.club?.find(i=>String(i.uid)===String(row.uid)):
   row.entry&&typeof row.entry==='object'?row.entry:null;
 try{return FooteraPlayStyles.resolve({...row.base},item).styles.map(p=>({id:String(p.id),plus:!!p.plus})).filter(p=>!p.id.startsWith('custom-'))}catch(_){return[]}
}
function match3DSequence(event){if(['freekick','penalty'].includes(event.creationType))return 'central';return FooteraHighlights.choosePresentation(event,match3DQueue?.history||[]).sequence}
function queueMatch3D(event){
 if(typeof FooteraHighlights==='undefined'||!FooteraHighlights.accepts(event.type)||!match||match.paused||match.finished)return false;
 const current=match;
 if(!match3DQueue){
  match3DQueue=new FooteraHighlights.Queue({
   onBusy(){current.highlight3DPending=true;stopMatchTimer();document.getElementById('match')?.classList.add('highlight3d-pending');lockMatch3DViewport()},
   onIdle(){
    if(match!==current){unlockMatch3DViewport();return}
    current.highlight3DPending=false;current.highlightActive=false;delete current.highlight3DScoreHold;
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
 presentation.playerStyles=match3DActorStyles(event.team,{uid:event.playerId,index:event.playerId,name:event.playerName});
 presentation.creatorStyles=match3DActorStyles(event.team,{uid:event.creatorUid,index:event.creatorIndex,name:event.creatorName||event.assistName});
 // Fetch the real OPPOSING goalkeeper/defender, using only player-data copies.
 const defending=event.team==='home'?'away':'home';
 const opponents=typeof matchActorRows==='function'?(matchActorRows(defending)||[]):[];
 const goalie=opponents.find(r=>/^(GK|TW|TH)$/.test(String(r.slot||'').toUpperCase()));
 const wideLeft=/_left$/.test(String(event.sequence||''))||/^(LW|LF|LM)$/.test(String(event.scorerSlot||'').toUpperCase());
 const wideRight=/_right$/.test(String(event.sequence||''))||/^(RW|RF|RM)$/.test(String(event.scorerSlot||'').toUpperCase());
 const defenders=opponents.filter(r=>/^(CB|IV|LB|RB|LV|RV|LWB|RWB|CDM|ZDM|CM|ZM)$/.test(String(r.slot||'').toUpperCase()));
 const priority=r=>{const p=String(r.slot||'').toUpperCase();return wideLeft?/^(LB|LV|LWB)$/.test(p)?0:/^(CB|IV)$/.test(p)?1:2:
  wideRight?/^(RB|RV|RWB)$/.test(p)?0:/^(CB|IV)$/.test(p)?1:2:
  /^(CB|IV)$/.test(p)?0:/^(CDM|ZDM)$/.test(p)?1:2};
 const closest=defenders.slice().sort((a,b)=>priority(a)-priority(b)||a.index-b.index);
 const defender=closest.length?closest[match3DStableNumber(event.id||event.minute||0)%Math.min(2,closest.length)]:null;
 const styleFor=row=>row?match3DActorStyles(defending,{uid:row.uid,index:row.index,name:row.name}):[];
 presentation.keeperName=event.keeperName||goalie?.name||'';
 presentation.keeperStyles=styleFor(goalie);
 presentation.defenderStyles=styleFor(defender);
 presentation.defenderName=defender?.name||'';
 presentation.defenderIndex=wideLeft?9:wideRight?10:8;
  const shirtInfo=match3DShirtNumbers(event,current,defender,goalie,presentation.defenderIndex);
  presentation.shirtNumbers=shirtInfo.shirtNumbers;
  presentation.keeperShirtNumber=shirtInfo.keeperShirtNumber;
 presentation.scorerSlot=event.scorerSlot||match3DActorSlot(event.team,{uid:event.playerId,index:event.playerId,name:event.playerName});
 presentation.creatorSlot=event.creatorSlot||match3DActorSlot(event.team,{uid:event.creatorUid,index:event.creatorIndex,name:event.creatorName||event.assistName});
 const selected=FooteraHighlights.choosePresentation(presentation,match3DQueue.history||[]);
 presentation.sequence=event.sequence||match3DSequence({...presentation,id:event.id||'',minute:event.minute||0});
 presentation.finish=event.finish||(presentation.sequence===selected.sequence?selected.finish:'normal');
 const reactions=FooteraHighlights.chooseReactions(presentation);
 presentation.defenderAction=reactions.defenderAction;presentation.keeperAction=reactions.keeperAction;
 const queued=match3DQueue.enqueue({...presentation,period:FooteraHighlights.getMatchPeriod(current),
  homeColor:home?.shirtPrimary,homeSecondary:home?.shirtSecondary,homePattern:home?.pattern,homeShorts:home?.shorts,homeSocks:home?.socks,homeKitConfigured:!!home,
  awayColor:away?.shirtPrimary,awaySecondary:away?.shirtSecondary,awayPattern:away?.pattern,awayShorts:away?.shorts,awaySocks:away?.socks,awayKitConfigured:!!away});
 // The simulation stays authoritative. Only the visible scoreboard is held at
 // the pre-goal value until the 3D ball actually reaches the goal.
 if(queued){
   match3DQueue.history=(match3DQueue.history||[]).concat({sequence:presentation.sequence,family:selected.family}).slice(-5);
  if(event.type==='goal'&&Number.isFinite(Number(event.scoreBeforeHome))&&Number.isFinite(Number(event.scoreBeforeAway)))current.highlight3DScoreHold={id:String(event.id||''),home:Number(event.scoreBeforeHome),away:Number(event.scoreBeforeAway)};
  if(typeof updateMatchUI==='function')updateMatchUI(true);
  const score=document.getElementById('matchScore'),hold=current.highlight3DScoreHold;if(score&&hold)score.textContent=`${hold.home} : ${hold.away}`;
  const clock=document.getElementById('matchMinute');if(clock)clock.textContent=`${event.minute}'`
 }
 return queued;
}
function queueMatchGoal3D(event){
 const scoreBeforeHome=Math.max(0,Number(event.scoreHome||0)-(event.side==='home'?1:0)),scoreBeforeAway=Math.max(0,Number(event.scoreAway||0)-(event.side==='away'?1:0));
 const queued=queueMatch3D({id:`goal:${match.goalEvents.length}`,type:'goal',minute:event.minute,team:event.side,playerId:event.scorerUid||event.scorerIndex,playerName:event.playerName||event.scorer,
  assistName:event.assist||'',creatorName:event.assist||'',creatorUid:event.assistUid||'',creatorIndex:event.assistIndex,creationType:event.type||'',scoreBeforeHome,scoreBeforeAway});
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
 document.addEventListener('footera-highlight-impact',e=>{
  const hold=match?.highlight3DScoreHold;if(!hold||String(e.detail?.id||'')!==String(hold.id||''))return;
  delete match.highlight3DScoreHold;if(typeof updateMatchUI==='function')updateMatchUI(true)
 });
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
