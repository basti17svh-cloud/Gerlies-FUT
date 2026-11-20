import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {FOOTERA_EVOLUTION_BONES,createFooteraPoseDirector}
 from '../3d-player-evolution-rig.mjs';
import {FOOTERA_TWIST_SEGMENTS} from '../3d-player-evolution-twist.mjs';
import {FOOTERA_MOCAP_GAITS,createFooteraCapturedGait}
 from '../3d-player-evolution-mocap.mjs';
import {createFooteraFootPlant,footeraStanceWeight}
 from '../3d-player-evolution-foot-ik.mjs';

function rig({twist=false}={}){
 const root=new THREE.Group(),bones=new Map();
 root.rotation.y=Math.PI;
 for(const {name,parent} of FOOTERA_EVOLUTION_BONES){
  const bone=new THREE.Bone();bone.name=name;
  if(name==='pelvis')bone.position.set(0,.94,0);
  else if(name.startsWith('spine'))bone.position.set(0,.125,0);
  else if(name==='neck_01')bone.position.set(0,.115,0);
  else if(name==='Head')bone.position.set(0,.13,0);
  else if(name.startsWith('clavicle'))bone.position.set(name.endsWith('_l')?.15:-.15,.02,0);
  else if(name.startsWith('upperarm'))bone.position.set(name.endsWith('_l')?.09:-.09,-.025,0);
  else if(name.startsWith('lowerarm'))bone.position.set(name.endsWith('_l')?.23:-.23,-.04,0);
  else if(name.startsWith('hand'))bone.position.set(name.endsWith('_l')?.21:-.21,-.02,0);
  else if(name.startsWith('thigh'))bone.position.set(name.endsWith('_l')?.12:-.12,-.10,0);
  else if(name.startsWith('calf'))bone.position.set(0,-.37,0);
  else if(name.startsWith('foot'))bone.position.set(0,-.38,0);
  else if(name.startsWith('ball'))bone.position.set(0,-.03,.15);
  else bone.position.set(0,.012,.01);
  (parent?bones.get(parent):root).add(bone);bones.set(name,bone);
 }
 if(twist)for(const d of FOOTERA_TWIST_SEGMENTS){
  const bone=new THREE.Bone();bone.name=d.name;
  bones.get(d.parent).add(bone);bones.set(bone.name,bone);
 }
 root.updateMatrixWorld(true);return{root,bones};
}
const qDistance=(a,b)=>a.angleTo(b);

test('All four genuine shipped Mixamo captures can be sampled as 52 local quaternions',()=>{
 const {root,bones}=rig({twist:true}),capture=createFooteraCapturedGait(root);
 assert.deepEqual(FOOTERA_MOCAP_GAITS,['walk','jog','run','sprint']);
 assert.equal(capture.boneCount,52);
 const before=FOOTERA_EVOLUTION_BONES.map(({name})=>bones.get(name).quaternion.clone());
 for(const clip of FOOTERA_MOCAP_GAITS){
  const a=capture.sample(clip,.11),b=capture.sample(clip,.32);
  assert.equal(a.pose.size,52);
  assert.ok(a.frame>=0);
  assert.ok(a.source.includes('Mixamo'));
  for(const q of a.pose.values()){
   assert.ok(q.toArray().every(Number.isFinite),clip);
   assert.ok(Math.abs(q.length()-1)<.005,clip);
  }
  assert.ok(qDistance(a.pose.get('pelvis'),b.pose.get('pelvis'))>.002,
   clip+' should animate the hips');
  assert.ok(qDistance(a.pose.get('upperarm_l'),b.pose.get('upperarm_l'))>.002,
   clip+' should animate the left arm');
  assert.ok(Math.abs(a.translation.y)<=.045);
  assert.ok(a.feet.l.every(Number.isFinite)&&a.feet.r.every(Number.isFinite));
  const replay=capture.sample(clip,.11).pose.get('pelvis');
  const first=a.pose.get('pelvis');
  for(const axis of ['x','y','z','w'])
   assert.ok(Math.abs(first[axis]-replay[axis])<1e-7,
    clip+' deterministic '+axis+' (component-wise, independent of float32 dot rounding)');
 }
 FOOTERA_EVOLUTION_BONES.forEach(({name},i)=>{
  assert.ok(qDistance(bones.get(name).quaternion,before[i])<1e-6,name+' not mutated');
 });
 assert.equal(bones.size,60,'Eight twist nodes remain part of the same rig');
 assert.throws(()=>capture.sample('imaginary',0),RangeError);
 assert.throws(()=>capture.sample('run',NaN),RangeError);
});
test('Local 2-bone IK returns an optional director layer and restores posed bones',()=>{
 const {root,bones}=rig(),cap=createFooteraCapturedGait(root),director=createFooteraPoseDirector(root),
  ik=createFooteraFootPlant(root,cap);
 const clip='walk',phase=.25,a=cap.sample(clip,phase);
 director.beginFrame();director.submit('locomotion',a.pose);director.commit();
 cap.applyTranslation(a.translation);
 const before=['thigh_l','calf_l','foot_l'].map(n=>bones.get(n).quaternion.clone());
 const pose=ik.computePose({clip,phase});
 assert.ok(pose.feet.l.weight>.95,'left leg is planted at midstance');
 assert.ok(pose.pose.size>0,'the IK layer owns planted joints');
 assert.ok(pose.feet.l.errorAfter<=pose.feet.l.errorBefore+.005,
  'IK should not increase ankle sliding significantly');
 before.forEach((q,i)=>assert.ok(qDistance(bones.get(['thigh_l','calf_l','foot_l'][i]).quaternion,q)<1e-6,
  'IK must not mutate the 52-bone animation before director ownership'));
 director.submit('ik',pose.pose);director.commit();
 const ankle=bones.get('foot_l').getWorldPosition(new THREE.Vector3());
 assert.ok(ankle.toArray().every(Number.isFinite));
 assert.ok(Math.abs(bones.get('thigh_l').quaternion.length()-1)<.01);
 cap.reset();
 assert.ok(cap.hipRest.distanceTo(bones.get('pelvis').position)<1e-9);
});
test('Foot stance is phased, capped and deliberately disabled in swing',()=>{
 assert.equal(footeraStanceWeight(.25,'l'),1);
 assert.equal(footeraStanceWeight(.75,'l'),0);
 assert.equal(footeraStanceWeight(.75,'r'),1);
 assert.equal(footeraStanceWeight(.25,'r'),0);
 const {root}=rig(),cap=createFooteraCapturedGait(root),ik=createFooteraFootPlant(root,cap);
 const a=ik.computePose({clip:'run',phase:.25,strength:0});
 assert.equal(a.pose.size,0);
 assert.throws(()=>ik.computePose({phase:Infinity}),RangeError);
 assert.throws(()=>ik.computePose({strength:-1}),RangeError);
 assert.throws(()=>cap.anchor('run','x'),RangeError);
 const at=cap.anchor('run','l');
 assert.ok(at.distanceTo(cap.anchor('run','l'))<1e-8);
});

test('Captured root travel stabilizes stance feet without stretching knees',()=>{
 const {root}=rig(),cap=createFooteraCapturedGait(root);
 for(const clip of FOOTERA_MOCAP_GAITS){
  const leftTarget=cap.anchor(clip,'l');
  const dL=cap.rootTravel(clip,.5);
  for(const p of [.08,.16,.25,.35,.44]){
   const sample=cap.sample(clip,p);
   const track=cap.rootTravel(clip,p,sample.feet);
   const current=new THREE.Vector3(...sample.feet.l).add(track);
   assert.ok(Math.hypot(current.x-leftTarget.x,current.z-leftTarget.z)<.00005,
    clip+' left shoe planted at '+p);
  }
  const rightTarget=cap.anchor(clip,'r').add(dL);
  for(const p of [.57,.68,.79,.92]){
   const sample=cap.sample(clip,p);
   const track=cap.rootTravel(clip,p,sample.feet);
   const current=new THREE.Vector3(...sample.feet.r).add(track);
   assert.ok(Math.hypot(current.x-rightTarget.x,current.z-rightTarget.z)<.00005,
    clip+' right shoe planted at '+p);
  }
  const cycleStart=cap.rootTravel(clip,1);
  const expected=cap.rootTravel(clip,.999999);
  assert.ok(cycleStart.distanceTo(expected)<.03,clip+' must loop continuously');
  const pos=new THREE.Vector3(0,0,0),quat=new THREE.Quaternion();
  const world=cap.worldFootAnchor(clip,.25,'l',pos,quat);
  const current=cap.sample(clip,.25);
  const placed=new THREE.Vector3(...current.feet.l).add(cap.rootTravel(clip,.25,current.feet));
  assert.ok(Math.hypot(world.x-placed.x,world.z-placed.z)<.00005);
  const before=cap.sample(clip,.15).feet.l,after=cap.sample(clip,.35).feet.l;
  const slide=Math.hypot(after[0]-before[0],after[2]-before[2]);
  assert.ok(slide>.02,clip+' original in-place capture must visibly move its stance foot');
 }
 assert.throws(()=>cap.rootTravel('run',NaN),RangeError);
});

test('Anatomical knee pole is continuous, pose-preserving and heading-relative for four captured gaits',()=>{
 const {root,bones}=rig({twist:true}),cap=createFooteraCapturedGait(root),
  director=createFooteraPoseDirector(root),ik=createFooteraFootPlant(root,cap);
 assert.equal(ik.maxLateralDegrees,14);
 for(const clip of FOOTERA_MOCAP_GAITS){
  for(const phase of [.12,.25,.63,.77]){
   // Rotate player to test a heading change: anatomical pole must follow
   // pelvis/world heading instead of snapping to global forward.
   for(const yaw of [0,-.48,.48]){
    root.rotation.y=Math.PI+yaw;
    root.updateMatrixWorld(true);
    const capture=cap.sample(clip,phase);
    director.beginFrame();director.submit('locomotion',capture.pose);director.commit();
    cap.applyTranslation(capture.translation);
    const originals=['thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']
     .map(n=>bones.get(n).quaternion.clone());
    const ankles=['l','r'].map(s=>bones.get('foot_'+s)
     .getWorldPosition(new THREE.Vector3()));
    const anklesQ=['l','r'].map(s=>bones.get('foot_'+s)
     .getWorldQuaternion(new THREE.Quaternion()));
    const off=ik.computePose({clip,phase,kneeAlignment:0});
    const on=ik.computePose({clip,phase,kneeAlignment:1});
    for(const side of ['l','r']){
     const b=off.knees[side],a=on.knees[side];
     assert.ok([b.deviationAfterDeg,a.deviationAfterDeg,
      b.flexBeforeDeg,a.flexAfterDeg].every(Number.isFinite),clip+side);
     if(Math.abs(b.deviationAfterDeg)>14.1)
      assert.ok(Math.abs(a.deviationAfterDeg)<14.8,
       clip+' '+phase+' '+side+' pole = '+a.deviationAfterDeg);
     // Compare identical foot-contact goals: alignment may redirect the
     // knee pole, but must not significantly change the captured knee flex.
     // Comparing to the pre-IK source would incorrectly reject legitimate
     // flexion required by a corrected world-space foot contact.
     assert.ok(Math.abs(b.flexAfterDeg-a.flexAfterDeg)<2.5,
      clip+' '+phase+' '+side+' knee alignment must preserve foot-IK flexion');
    }
    originals.forEach((q,i)=>assert.ok(qDistance(
     bones.get(['thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r'][i]).quaternion,
     q)<1e-5,'IK sampler must restore source capture bone'));
    director.submit('ik',on.pose);director.commit();
    for(const [i,side] of ['l','r'].entries()){
     const foot=bones.get('foot_'+side),w=foot.getWorldPosition(new THREE.Vector3());
     assert.ok(w.distanceTo(ankles[i])<.21,
      clip+side+' foot correction must be bounded');
     const worldQ=foot.getWorldQuaternion(new THREE.Quaternion());
     assert.ok(worldQ.angleTo(anklesQ[i])<.03,
      clip+side+' original Mixamo shoe orientation should survive IK');
    }
    cap.reset();
   }
  }
 }
 assert.throws(()=>ik.computePose({kneeAlignment:-.1}),RangeError);
 assert.throws(()=>ik.computePose({kneeAlignment:1.1}),RangeError);
});
