const test=require('node:test'),assert=require('node:assert/strict');
const supplied=['wing_left','wing_right','cutback_left','cutback_right','early_cross_left','early_cross_right','low_cross_left','low_cross_right','far_post_left','far_post_right','near_post_left','near_post_right','volley_left','volley_right'];
const dist2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[1]);
const dist3=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('V21.96: every normal wide/cross preset starts with an actual teammate pass and reception',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 for(const seq of supplied){
  const side=seq.endsWith('_left')?-1:1,source=side<0?5:4;
  for(const t of [.1,.32]){
   const ball=S.ballPosition('goal',t,seq),provider=S.runPosition(source,t,seq);
   assert.ok(dist2(ball,provider)<.72,seq+' supplier has opening possession');
   assert.equal(S.controlCarrier(t,seq).index,source,seq+' initial owner');
  }
  const during=S.ballPosition('goal',.76,seq);
  assert.ok(during[1]>.18,seq+' opening pass must leave the boot');
  assert.equal(S.controlCarrier(.76,seq).index,-1,seq+' airborne pass not owned');
  const receive=S.runPosition(1,1.12,seq),arrived=S.ballPosition('goal',1.12,seq);
  assert.ok(dist2(arrived,receive)<.75,seq+' winger controls receipt');
  assert.equal(S.controlCarrier(1.4,seq).index,1,seq+' winger retains ball after pass');
  for(const boundary of [.42,1.12,seq.startsWith('early_cross_')?3.2:seq.startsWith('low_cross_')?3.24:3.65]){
   assert.ok(dist3(S.ballPosition('goal',boundary-.001,seq),S.ballPosition('goal',boundary+.001,seq))<.10,seq+' seamless at '+boundary);
  }
 }
});
test('V21.96: dribbler visibly beats a marker before the ball is crossed',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 for(const seq of [...supplied,'bicycle']){
  const side=seq==='bicycle'||seq.endsWith('_left')?-1:1,marker=side<0?14:13;
  // Marker is close enough for a real duel but never collides with the dribbler.
  for(const t of [1.7,2.2,2.65,3.08]){
   const a=S.runPosition(1,t,seq),b=S.runPosition(marker,t,seq),gap=Math.hypot(a[0]-b[0],a[1]-b[1]);
   assert.ok(gap>1.5&&gap<8,seq+' defender shadowing winger '+t+' gap='+gap.toFixed(2));
  }
  const t=2.18,winger=S.runPosition(1,t,seq),initial=side*23,end=side*25.5,u=t/3.65,p=u*u*(3-2*u),noFeint=initial+(end-initial)*p;
  if(['wing_left','wing_right','early_cross_left','early_cross_right','low_cross_left','low_cross_right'].includes(seq))
   assert.ok(side*(noFeint-winger[0])>1.2,seq+' must cut around defender before crossing');
 }
});
test('V21.96: the selected visual finish and shot result remain unchanged',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 for(const seq of supplied)for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post']){
  const shot=S.ballPosition(type,S.SHOT_TIME,seq);
  assert.ok(dist3(shot,S.ballPosition(type,S.SHOT_TIME-.001,seq))<.05,seq+' smooth approach');
  assert.ok(dist3(shot,S.ballPosition(type,S.SHOT_TIME+.001,seq))<.05,seq+' continuous release');
  assert.deepEqual(S.ballPosition(type,S.IMPACT_TIME,seq),S.shotImpact(type,seq,'normal'));
 }
});
