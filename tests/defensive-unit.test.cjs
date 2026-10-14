const test=require('node:test'),assert=require('node:assert/strict');
test('free runners check short and support reacts only after the outcome is visible',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs');
 assert.ok(M.playerPosition(2,1.5,'goal','central')[1]>M.runPosition(2,1.5,'central')[1],'free runner checks towards midfield');
 assert.deepEqual(M.playerPosition(2,5.4,'goal','central'),M.runPosition(2,5.4,'central'),'run rejoins before shot');
 for(const id of P.PLAYBOOK_IDS){const plan=P.getPlay(id);for(const touch of P.playTouches(plan)){
  const i=touch.receiver,t=touch.arrival;
  assert.deepEqual(M.playerPosition(i,t,'goal',id),M.runPosition(i,t,id),'receiver contact preserved');
 }}
 const scorer=M.runPosition(0,9,'central');
 const dist=p=>Math.hypot(p[0]-scorer[0],p[1]-scorer[1]);
 assert.ok(dist(M.playerPosition(2,9,'goal','central'))<dist(M.runPosition(2,9,'central')),'teammate approaches scorer');
 assert.deepEqual(M.playerPosition(2,6.7,'goal','central'),M.playerPosition(2,6.7,'big_chance_missed','central'),'no premature celebration');
});
test('defensive roles stay assigned, respect running limits and preserve attacking routes',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),{createDefensiveUnit}=await import('../3d-defensive-unit.mjs');
 for(const sequence of ['central','wing_left','wing_right','six_yard_square_left','near_post_header_right','layoff_distance','defense_interception','defense_standing_tackle','defense_slide_tackle']){
  const ballWon=sequence.startsWith('defense'),type=ballWon?'ball_won':'goal';
  const at=(i,t)=>M.playerPosition(i,t,type,sequence);
  const unit=createDefensiveUnit({positionAt:at,ballAt:t=>M.ballPosition(type,t,sequence),ballWon});
  for(const role of ['press','cover','mark'])assert.equal(Object.values(unit.roles).filter(r=>r===role).length,1);
  for(let k=1;k<620;k++){
   const t=k/60;
   for(let i=0;i<8;i++)assert.deepEqual(unit.position(i,t),at(i,t));
   if(ballWon)assert.deepEqual(unit.position(8,t),at(8,t),'winning contact path remains authoritative');
   for(let i=ballWon?9:8;i<16;i++){
    const a=unit.position(i,t-1/60),b=unit.position(i,t),c=unit.position(i,t+1/60);
    assert.ok(b.every(Number.isFinite));
    assert.ok(Math.hypot(b[0]-a[0],b[1]-a[1])*60<=6.81,sequence+' plausible run speed');
    assert.ok(Math.hypot(c[0]-2*b[0]+a[0],c[1]-2*b[1]+a[1])*3600<=5.21,sequence+' bounded acceleration');
   }
  }
  assert.deepEqual(unit.position(10,2),unit.position(10,2),'absolute-time replay');
 }
});
test('interception visibly interrupts a pass; tackles start in opposition possession and recover continuously',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const P=await import('../3d-playbook.mjs');
 for(const sequence of P.DEFENSIVE_SCENES){
  assert.equal(M.controlCarrier(0,sequence).index,1);
  assert.equal(M.controlCarrier(2,sequence).index,0);
  assert.equal(M.controlCarrier(4.6,sequence).index,8);
  const b=M.ballPosition('ball_won',0,sequence),d=M.playerPosition(8,0,'ball_won',sequence);
  assert.ok(Math.hypot(b[0]-d[0],b[2]-d[1])>10,'defender does not begin in possession');
  for(const t of [.65,1.42,3.2,4.03,4.4,5.4,5.8]){
   const before=M.ballPosition('ball_won',t-.00001,sequence),after=M.ballPosition('ball_won',t+.00001,sequence);
   assert.ok(Math.hypot(...before.map((v,i)=>v-after[i]))<.002,sequence+' continuous ball at '+t);
  }
  const contact=M.ballPosition('ball_won',4.4,sequence),winner=M.playerPosition(8,4.4,'ball_won',sequence);
  assert.ok(Math.hypot(contact[0]-winner[0],contact[2]-winner[1])<.5,'boot can reach ball');
 }
 assert.equal(M.controlCarrier(3.7,'defense_interception').index,-1,'pass is free before interception');
 const p=M.playerPosition(8,5.1,'ball_won','defense_slide_tackle'),q=M.playerPosition(8,5.7,'ball_won','defense_slide_tackle');
 assert.deepEqual(p,q,'slide recovers before dribbling');
 assert.equal(M.controlCarrier(5.3,'defense_slide_tackle').weight,0);
 const bridge=require('node:fs').readFileSync(require('node:path').join(__dirname,'../3d-highlights-match.js'),'utf8');
 assert.ok(!bridge.includes('defense_press_recovery'),'duplicate recovery removed from live selection');
});
