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
 assert.ok(j1.gap>3.5&&j4.gap>3.0&&j4.gap<4.0,'side-on defender maintains shadow gap');
 assert.ok(c1.gap>8&&c4.gap<2.6&&c4.gap>2,'pressing defender actually approaches and brakes');
 assert.ok(c1.gap>j1.gap+4,'two actions have different routes');
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
