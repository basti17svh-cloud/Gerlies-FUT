const test=require('node:test'),assert=require('node:assert/strict');
const flow='../3d-attack-flow.mjs',scene='../3d-highlights-scene.mjs';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const speed=(fn,t)=>distance(fn(t-.008),fn(t+.008))/.016;
const velocity=(fn,t)=>fn(t+.008).map((v,i)=>(v-fn(t-.008)[i])/.016);
test('continuous Hermite motion passes waypoints without stop-and-go',async()=>{
 const {sampleFlowRun,flowSpeed,ATTACK_FLOW_VERSION}=await import(flow);
 assert.match(ATTACK_FLOW_VERSION,/continuous-carrier/);
 const nodes=[[0,24,-24],[1.45,19,-28],[2.65,22,-31],[3.90,15,-35.5],[5.4,9,-39]];
 for(const [t,x,z] of nodes){const p=sampleFlowRun(nodes,t,-1.45,-2);
  assert.ok(distance(p,[x,z])<1e-9,'preserve authored scene waypoint at '+t);
 }
 for(const [t] of nodes.slice(1,-1)){
  assert.ok(flowSpeed(nodes,t,-1.45,-2)>1.15,'NEVER stop at a story waypoint: '+t);
  const a=velocity(tt=>sampleFlowRun(nodes,tt,-1.45,-2),t-.006);
  const b=velocity(tt=>sampleFlowRun(nodes,tt,-1.45,-2),t+.006);
  assert.ok(distance(a,b)<.20,'tangent must be smooth across node '+t);
 }
 const before=velocity(tt=>sampleFlowRun(nodes,tt,-1.45,-2),5.4-.006);
 const after=velocity(tt=>sampleFlowRun(nodes,tt,-1.45,-2),5.4+.006);
 assert.ok(distance(before,after)<.12,'shooting follow-through must inherit approaching momentum');
 assert.ok(flowSpeed(nodes,5.40,-1.45,-2)>1.3,'the run does not freeze on shot contact');
 assert.ok(flowSpeed(nodes,6.8,-1.45,-2)<1e-5,'runner settles only after the actual shot');
});
test('all attacking sequences flow through former hard-stop nodes, including mirrored cuts',async()=>{
 const M=await import(scene);
 const cases=[
 ['central',[3.1]],
 ['dribble',[1.89,3.78]],
 ['wing_left',[3.25]],['cutback_right',[3.25]],
 ['through_ball',[2.35]],
 ['one_two',[1.8,2.65]],
 ['inside_left',[2.25,3.85]],['inside_right',[2.25,3.85]],
 ['cut_inside_left',[2.05,3.2,4.2]],['cut_inside_right',[2.05,3.2,4.2]],
 ['double_feint_left',[1.45,2.65,3.90]],['double_feint_right',[1.45,2.65,3.90]],
 ['near_post_cut_left',[2.0,3.65]],['near_post_cut_right',[2.0,3.65]]
 ];
 for(const [seq,nodes] of cases){
  const fn=t=>M.runPosition(0,t,seq);
  for(const t of nodes){
   const s=speed(fn,t);assert.ok(s>1.05,seq+' still stops at '+t+': speed '+s);
   const a=velocity(fn,t-.012),b=velocity(fn,t+.012);
   assert.ok(distance(a,b)<.50,seq+' jerky directional jump at '+t+': '+distance(a,b));
  }
  const kickSpeed=speed(fn,M.SHOT_TIME);
  assert.ok(kickSpeed>.9&&kickSpeed<6,seq+' enters shot with controlled movement '+kickSpeed);
  const pre=velocity(fn,M.SHOT_TIME-.010),post=velocity(fn,M.SHOT_TIME+.010);
  assert.ok(distance(pre,post)<.34,seq+' abrupt stop at the strike: '+distance(pre,post));
  for(let t=.05;t<5.35;t+=.10){
   const a=fn(t),b=fn(t+.035),v=speed(fn,t);
   assert.ok(v<11.5,seq+' no impossible run burst at '+t+' speed '+v);
   assert.ok(distance(a,b)<.42,seq+' no teleport');
  }
  assert.deepEqual(M.runPosition(0,3.27,seq),M.runPosition(0,3.27,seq),'seek is deterministic');
 }
});
test('new running paths preserve ball close control, canonical shot contact and match invariants',async()=>{
 const M=await import(scene);
 for(const seq of ['central','dribble','wing_left','wing_right','one_two','through_ball',
  'cut_inside_left','cut_inside_right','double_feint_left','double_feint_right']){
  const inverted=/^(?:cut_inside|double_feint)_(?:left|right)$/.test(seq);
  assert.deepEqual(M.ballPosition('goal',M.SHOT_TIME,seq),inverted?M.shotContact(seq):M.shotFootPosition(),
   'canonical strike remains at the sequence-specific boot contact: '+seq);
  for(const t of [1.2,2.7,3.7,4.4]){
   const c=M.controlCarrier(t,seq);
   if(c.index!==0||c.weight<.8)continue;
   const p=M.runPosition(0,t,seq),ball=M.ballPosition('goal',t,seq);
   assert.ok(Math.hypot(ball[0]-p[0],ball[2]-p[1])<1.12,'carrier keeps ball near boot '+seq+' @ '+t);
  }
 }
});
