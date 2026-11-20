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
import {createFooteraShoulderAlignment} from '../3d-player-evolution-shoulders.mjs';
import {createFooteraDirectionalTransitions,FOOTERA_DIRECTION_MOVES}
 from '../3d-player-evolution-transitions.mjs';

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

test('Captured shoulder abduction alignment keeps real Mixamo swing, source bones and foot targets',()=>{
 const {root,bones}=rig({twist:true});
 const capture=createFooteraCapturedGait(root),director=createFooteraPoseDirector(root),
  shoulder=createFooteraShoulderAlignment(root);
 const corrected=[],phases=[.10,.24,.38,.61,.78,.93];
 let total=0;
 for(const yaw of [0,.45,-.45]){
  root.rotation.y=Math.PI+yaw;
  for(const clip of FOOTERA_MOCAP_GAITS){
   const timeline=[];
   for(const phase of phases){
    const captured=capture.sample(clip,phase);
    director.beginFrame();director.submit('locomotion',captured.pose);director.commit();
    capture.applyTranslation(captured.translation);
    const beforeNames=['pelvis','spine_01','spine_03','clavicle_l','clavicle_r',
      'upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','thigh_l','calf_l','foot_l'];
    const before=new Map(beforeNames.map(n=>[n,bones.get(n).quaternion.clone()]));
    const no=shoulder.sample({enabled:false});
    assert.equal(no.pose.size,0);
    const res=shoulder.sample({strength:1});
    const feetBefore=['l','r'].map(side=>bones.get('foot_'+side)
     .getWorldPosition(new THREE.Vector3()));
    for(const side of ['l','r']){
     const d=res.arms[side];
     assert.ok(Number.isFinite(d.beforeDeg)&&Number.isFinite(d.afterDeg),
      clip+' '+side+' finite angles');
     assert.ok(d.afterDeg<=d.beforeDeg+.01,clip+' shoulder must not widen');
     assert.ok(d.changeDeg>=-.01&&d.changeDeg<=45.1,clip+' bounded correction');
     if(d.active){
      total++;
      assert.ok(d.changeDeg>.001,'active shoulder has measurable motion');
      corrected.push(d.changeDeg);
     }
    }
    // The adapter always restores ALL input quaternions after measurement,
    // even when the next phase or a new heading is requested.
    for(const n of beforeNames)
     assert.ok(qDistance(bones.get(n).quaternion,before.get(n))<1e-6,
      'Shoulder alignment illegally changed original capture joint '+n);
    const onPose=res.pose;
    assert.ok([...onPose.keys()].every(n=>n==='upperarm_l'||n==='upperarm_r'));
    director.submit('contact',onPose);director.commit();
    for(const [i,side] of ['l','r'].entries()){
     assert.ok(feetBefore[i].distanceTo(
      bones.get('foot_'+side).getWorldPosition(new THREE.Vector3()))<1e-5,
      'Upper-arm correction must leave foot trajectories untouched');
    }
    timeline.push(bones.get('upperarm_l').quaternion.clone());
    capture.reset();
   }
   assert.ok(timeline.some((q,i)=>i>0&&qDistance(q,timeline[0])>.008),
    clip+' captured arm movement must not be frozen');
  }
 }
 assert.ok(total>0,'At least one excessive shoulder abduction is corrected');
 assert.ok(corrected.every(Number.isFinite));
 assert.throws(()=>shoulder.sample({strength:NaN}),RangeError);
 assert.throws(()=>createFooteraShoulderAlignment(root,{maxAbductionDeg:90}),RangeError);
});

test('Original Adobe Mixamo lateral/backpedal transitions are quaternion-only, reversible and bounded',()=>{
 const {root,bones}=rig({twist:true}),capture=createFooteraCapturedGait(root);
 const director=createFooteraPoseDirector(root),trans=createFooteraDirectionalTransitions(root,capture);
 assert.deepEqual(FOOTERA_DIRECTION_MOVES,['strafeLeft','strafeRight','backpedal']);
 for(const yaw of [0,-.46,.46]){
  root.rotation.y=Math.PI+yaw;root.updateMatrixWorld(true);
  for(const dir of FOOTERA_DIRECTION_MOVES){
   const captured=trans.originalDirectionalClip(dir,.27);
   assert.equal(captured.pose.size,52);
   assert.ok(captured.source.includes('Adobe Mixamo'));
   const forward=capture.sample('run',.28);
   const originalQ=new Map(FOOTERA_EVOLUTION_BONES.map(x=>[
    x.name,bones.get(x.name).quaternion.clone()]));
   const zero=trans.blend({from:'run',to:dir,fromPhase:.28,
    toPhase:.27,weight:0});
   const full=trans.blend({from:'run',to:dir,fromPhase:.28,
    toPhase:.27,weight:1});
   for(const {name} of FOOTERA_EVOLUTION_BONES){
    assert.ok(qDistance(zero.pose.get(name),forward.pose.get(name))<1e-6,
     dir+' zero blend must equal recorded run');
    assert.ok(qDistance(full.pose.get(name).clone().normalize(),
     captured.pose.get(name).clone().normalize())<.0001,
     dir+' full blend must equal recorded directional capture (normalized quaternions)');
    assert.ok(qDistance(bones.get(name).quaternion,originalQ.get(name))<1e-6,
     dir+' blend must not mutate source bones');
   }
   for(const time of [0,.64,.65,.66,.85,1.04,1.05,1.06,
    1.54,1.55,1.56,1.75,1.94,1.95,1.96,2.30]){
    const state=trans.sampleSequence({time,direction:dir});
    assert.equal(state.pose.size,52);
    assert.ok(state.source.includes('original baked Adobe Mixamo'));
    assert.ok(state.worldFootPlantGuaranteed===false&&!state.liveRootMotion);
    assert.ok(Object.values(state.feet).every(pos=>pos.every(Number.isFinite)));
    assert.ok(state.weight>=0&&state.weight<=1);
    director.beginFrame();director.submit('locomotion',state.pose);director.commit();
    capture.applyTranslation(state.translation);
    for(const side of ['l','r']){
     const actual=root.worldToLocal(bones.get('foot_'+side).getWorldPosition(
      new THREE.Vector3())).toArray();
     assert.ok(Math.hypot(...actual.map((x,i)=>x-state.feet[side][i]))<.0001,
      dir+' FK feet must match quaternion-blended 3D pose');
    }
   }
   for(const t of [.65,1.05,1.55,1.95]){
    const a=trans.sampleSequence({time:t-.0001,direction:dir}),
     b=trans.sampleSequence({time:t+.0001,direction:dir});
    for(const bone of ['pelvis','spine_03','thigh_l','thigh_r','upperarm_l']){
     assert.ok(qDistance(a.pose.get(bone),b.pose.get(bone))<.22,
      dir+' pose discontinuity at boundary '+t+' '+bone);
    }
   }
   capture.reset();
  }
 }
 assert.throws(()=>trans.sampleSequence({direction:'fake'}),RangeError);
 assert.throws(()=>trans.sampleSequence({time:-1}),RangeError);
 assert.throws(()=>trans.blend({to:'strafeLeft',weight:NaN}),RangeError);
 assert.throws(()=>trans.blend({to:'strafeLeft',weight:1.1}),RangeError);
});
