const test=require('node:test'),assert=require('node:assert/strict');
const file='../3d-defender-tracking.mjs';
test('jockey genuinely tracks laterally, close-down closes a large gap without overlap',async()=>{
 const m=await import(file);
 const carrier=t=>[-7+t*.68,-25-t*1.8];
 assert.ok(m.isTrackingAction('jockey')&&m.isTrackingAction('close_down'));
 assert.equal(m.isTrackingAction('slide_attempt'),false);
 const j1=m.sampleTrackingRoute('jockey',1,'cut_inside_right',carrier);
 const j4=m.sampleTrackingRoute('jockey',4.2,'cut_inside_right',carrier);
 const c1=m.sampleTrackingRoute('close_down',1,'cut_inside_right',carrier);
 const c4=m.sampleTrackingRoute('close_down',4.2,'cut_inside_right',carrier);
 assert.equal(j4.lateral,true);assert.equal(c4.lateral,false);
 assert.ok(j1.gap>3&&j4.gap>2.8&&j4.gap<5.4,'side-on defender shadows with natural reaction lag');
 assert.ok(c1.gap>7.0&&c4.gap<c1.gap-4.0&&c4.gap>1.6,'pressing defender actually closes distance without joining attacker root');
 assert.ok(c1.gap>j1.gap+3,'two actions have different routes');
 assert.notDeepEqual(j4.position,c4.position);
 assert.deepEqual(j4,m.sampleTrackingRoute('jockey',4.2,'cut_inside_right',carrier),'seek deterministic');
 const l=m.sampleTrackingRoute('close_down',4.2,'cut_inside_left',carrier);
 assert.ok(l.position[0]>carrier(4.2)[0]&&c4.position[0]<carrier(4.2)[0],'left and right are mirrored');
 for(const action of ['jockey','close_down'])
  for(let t=0;t<5.9;t+=.045){
   const a=m.sampleTrackingRoute(action,t,'cut_inside_right',carrier),b=m.sampleTrackingRoute(action,t+.045,'cut_inside_right',carrier);
   assert.ok(Math.hypot(b.position[0]-a.position[0],b.position[1]-a.position[1])<.30,action+' no position pop at '+t);
  }
});
test('single tracking pose does not overwrite planted hip or ankle locomotion',async()=>{
 const m=await import(file);
 const joint=()=>({rotation:{x:0,y:0,z:0}});
 const actor=()=>({root:joint(),rig:{rotation:{x:.06,y:0,z:.08},position:{y:-.11}},
  upper:joint(),arms:[joint(),joint()],elbows:[joint(),joint()],
  legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()]});
 for(const action of ['jockey','close_down']){
  const p=actor();p.legs[0].rotation.x=.37;p.legs[1].rotation.x=-.41;
  p.ankles[0].rotation.x=-.17;p.ankles[1].rotation.x=.19;
  const oldHips=p.legs.map(x=>x.rotation.x),oldAnkles=p.ankles.map(x=>x.rotation.x);
  for(const t of [0,1,2,3.4,4.6,6]){
   const q=actor();q.legs[0].rotation.x=oldHips[0];q.legs[1].rotation.x=oldHips[1];
   q.ankles[0].rotation.x=oldAnkles[0];q.ankles[1].rotation.x=oldAnkles[1];
   const pose=m.applyTrackingPose(q,action,t,.7,0,-.8);
   assert.deepEqual(q.legs.map(x=>x.rotation.x),oldHips,action+' keeps biomechanical hip gait');
   assert.deepEqual(q.ankles.map(x=>x.rotation.x),oldAnkles,action+' keeps grounded ankle gait');
   assert.ok(q.upper.rotation.x>-.20&&Math.abs(q.upper.rotation.z)<.11,'no falling torso');
   assert.ok(Math.abs(q.rig.rotation.x)<.00001&&Math.abs(q.rig.rotation.z)<.07,'pelvis does not stumble');
   assert.ok(q.rig.position.y>=-.085&&q.rig.position.y<=.027,'feet remain grounded');
   assert.ok(Number.isFinite(pose.heading));
  }
 }
});

test('defender observes direction changes later, pursues using separate capped velocity',async()=>{
 const m=await import(file);
 // A sudden carrier cut creates an observation delay, not frame-perfect cloning.
 const attacker=t=>[t<2?-5:-5+(t-2)*8,-28-t*1.4];
 for(const action of ['jockey','close_down']){
  const path=m.createTrackingTimeline(action,'cut_inside_right',attacker);
  assert.ok(path.reaction>.25);
  const before=path.sample(2),short=path.sample(2.12),later=path.sample(3.2);
  const attackerDx=attacker(2.12)[0]-attacker(2)[0],defenderDx=short.position[0]-before.position[0];
  assert.ok(attackerDx>.90,'carrier visibly cuts');
  assert.ok(defenderDx<attackerDx*.55,'defender must NOT move in lockstep on the same frame: '+action);
  assert.ok(later.position[0]>short.position[0]+.10,'defender reacts later: '+action);
  assert.deepEqual(path.sample(2.12),path.sample(2.12),'random seeking must be deterministic');
  assert.deepEqual(path.sample(2.12),m.createTrackingTimeline(action,'cut_inside_right',attacker).sample(2.12));
  assert.ok(path.sample(.10).speed===0,'starts by observing before reacting');
  const max=action==='jockey'?3.9:6.2,accel=action==='jockey'?5:8;
  for(let t=.2;t<5.2;t+=.08){
   const now=path.sample(t),next=path.sample(t+.04);
   assert.ok(now.speed<=max+.02,'independent defender speed is capped');
   assert.ok(Math.hypot(...next.position.map((n,i)=>n-now.position[i]))<=max*.05,'no instant route jumps');
   assert.ok(Math.hypot(...next.velocity.map((n,i)=>n-now.velocity[i]))<=accel*.06,'no sudden velocity snaps');
  }
 }
});
