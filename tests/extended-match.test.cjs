const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');
test('all six live scenes keep continuous ball/player paths and a genuine finishing contact',async()=>{
 const E=await import('../3d-extended-match.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const sequence of E.EXTENDED_SEQUENCES){
  const kind=E.extendedKind(sequence),finish=kind==='corner'?'header':'normal',event={id:kind,sceneKind:kind,restartSide:sequence.endsWith('_right')?'right':'left',finish};
  // The turnover counter is retired from live selection since 17.10.2026; its scene data is still checked below.
  if(kind!=='turnover_counter')assert.equal(H.choosePresentation(event).sequence,sequence);
  assert.equal(M.normalizeSequence(sequence),sequence);
  let prev=M.ballPosition('goal',0,sequence,finish);
  for(let n=1;n<=1040;n++){
   const t=n/100,point=M.ballPosition('goal',t,sequence,finish);
   assert.ok(point.every(Number.isFinite),sequence+' finite ball');
   assert.ok(Math.hypot(...point.map((v,i)=>v-prev[i]))<1.4,sequence+' ball continuity at '+t);prev=point;
   for(let i=0;i<16;i++){const p=M.playerPosition(i,t,'goal',sequence);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[0])<=34.3&&Math.abs(p[1])<=53,sequence+' pitch bounds')}
  }
  assert.deepEqual(M.ballPosition('goal',5.4,sequence,finish),M.shotContact(sequence,finish));
  // Every outcome crosses the keeper's line together; the goal then goes on into the net.
  assert.ok(Math.abs(M.ballPosition('goal',6.65,sequence,finish)[2]+50.6)<1e-6);
  assert.ok(M.ballPosition('goal',M.shotArrival('goal',sequence,finish),sequence,finish)[2]<-52.5);
  assert.ok(M.ballPosition('big_chance_saved',6.65,sequence,finish)[2]>-52.5);
  assert.ok(M.ballPosition('big_chance_missed',M.shotArrival('big_chance_missed',sequence,finish),sequence,finish)[0]>3.66);
 }
});
test('penalty is at eleven metres, free kick clears its wall, throw starts above two hands',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),E=await import('../3d-extended-match.mjs');
 const penalty=M.shotContact('extended_penalty');assert.ok(Math.abs(penalty[2]+41.5)<.2);
 const fk=M.ballPosition('goal',5.4+.35,'extended_free_kick');assert.ok(fk[1]>2.05,'clear the jumping wall');
 const ball=M.ballPosition('goal',0,'extended_throw_in'),thrower=E.extendedPosition(1,0,'extended_throw_in');
 assert.ok(ball[1]>1.8&&Math.abs(ball[0]-thrower[0])<.2);assert.ok(thrower[0]>=34);
 assert.deepEqual(M.ballPosition('goal',1,'extended_penalty'),penalty);
});
test('planner ownership, camera direction and physical shot speed survive both teams and halves',async()=>{
 const E=await import('../3d-extended-match.mjs'),{createHighlightPlayback}=await import('../3d-playback-clock.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const sequence of E.EXTENDED_SEQUENCES){
  const timing=E.extendedTiming(sequence),clock=createHighlightPlayback({sequence,type:'goal'});assert.ok(Math.abs(clock.totalSeconds-(timing.duration-1.25+1.25/1.5))<1e-9);
  clock.presented(0);let state;for(let n=1;n<=Math.round(timing.shot*20);n++)state=clock.tick(n*50);
  assert.ok(Math.abs(state.time-5.4)<1e-8);for(let n=1;n<=10;n++)state=clock.tick((timing.shot+n/10*1.25/1.5)*1000);assert.ok(Math.abs(state.time-6.65)<1e-8);
  for(const direction of [-1,1])for(const aspect of [.85,1.8])for(const t of [0,1,3,5.4,6.65]){const c=M.cameraState(direction,t,aspect,'goal',sequence);assert.ok(c.position[0]-c.target[0]>0,'permanent TV side');assert.ok([...c.position,...c.target].every(Number.isFinite));}
 }
 for(const team of ['home','away']){const seq='extended_turnover_counter';assert.notEqual(E.extendedPhase(seq,0,team).team,team);assert.equal(E.extendedPhase(seq,3,team).team,team)}
});
test('throw and keeper distribution styles contribute only at their actual restart',()=>{
 const A=require('../footera-match-actions.js'),row={attrs:{pas:75,dri:75},styles:[]},thrower={...row,styles:[{id:'long-throw',plus:true}]},keeper={...row,styles:[{id:'far-throw',plus:true}]};
 assert.ok(A.restartBuildSkill(thrower,'combination','throw_in',row)>A.restartBuildSkill(row,'combination','throw_in',row));
 assert.ok(A.restartBuildSkill(row,'combination','keeper_buildout',keeper)>A.restartBuildSkill(row,'combination','keeper_buildout',row));
 assert.equal(A.restartBuildSkill(thrower,'combination','',keeper),A.buildSkill(row,'combination'));
});
