/**
 * Step 8 – real captured animation, flat-ground outsole and directional IK.
 * No artificial animation, no production-root or skeleton modifications.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {FOOTERA_EVOLUTION_BONES,createFooteraPoseDirector}
 from '../3d-player-evolution-rig.mjs';
import {createFooteraCapturedGait,FOOTERA_MOCAP_GAITS}
 from '../3d-player-evolution-mocap.mjs';
import {createFooteraFootPlant} from '../3d-player-evolution-foot-ik.mjs';
import {createFooteraDirectionalTransitions,FOOTERA_DIRECTION_MOVES}
 from '../3d-player-evolution-transitions.mjs';
import {createFooteraDirectionalContact}
 from '../3d-player-evolution-direction-contact.mjs';

function rig(){
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
 root.updateMatrixWorld(true);return{root,bones};
}

test('Foot IK 2.0 keeps captured limbs reversible and constrains shoe roll/lift across four gaits',()=>{
 const {root,bones}=rig(),cap=createFooteraCapturedGait(root),
  director=createFooteraPoseDirector(root),ik=createFooteraFootPlant(root,cap);
 assert.equal(ik.legs,2);
 assert.equal(ik.maxSoleLift,.07);
 assert.ok(ik.maxSoleRollDegrees>11&&ik.maxSoleRollDegrees<12);
 assert.equal(ik.soles.l.meshCalibrated,false,'bone-only fixture uses a fallback sole');
 let sampled=0,contactCount=0;
 for(const clip of FOOTERA_MOCAP_GAITS){
  for(const phase of [.04,.16,.25,.4,.52,.65,.76,.9]){
   const sample=cap.sample(clip,phase);
   director.beginFrame();director.submit('locomotion',sample.pose);director.commit();
   cap.applyTranslation(sample.translation);
   const original=Object.fromEntries(['thigh_l','calf_l','foot_l','ball_l',
    'thigh_r','calf_r','foot_r','ball_r'].map(n=>[n,bones.get(n).quaternion.clone()]));
   const sole=ik.computePose({clip,phase,groundContact:true,kneeAlignment:1});
   assert.ok(sole.source.includes('measured boot outsole'));
   for(const side of ['l','r']){
    const f=sole.feet[side],k=sole.knees[side];
    assert.ok(Math.abs(f.soleLift)<=.07001,clip+side+' excessive vertical correction');
    assert.ok(f.meshCalibrated===false);
    assert.ok([k.flexBeforeDeg,k.flexAfterDeg,k.deviationAfterDeg].every(Number.isFinite));
    if(f.active){
     contactCount++;
     assert.ok(f.heelHeight!==null&&f.toeHeight!==null);
     assert.ok([f.heelHeight,f.toeHeight,f.floorPenetration,f.rollDeg].every(Number.isFinite));
     assert.ok(Math.abs(f.rollDeg)<=ik.maxSoleRollDegrees+.001);
     assert.ok(f.correction<.28,'leg reached beyond safe joint target');
    }
   }
   for(const [name,q] of Object.entries(original))
    assert.ok(bones.get(name).quaternion.angleTo(q)<1e-5,
     'Sampling IK must not overwrite original Mixamo '+name);
   director.submit('ik',sole.pose);director.commit();
   assert.ok(['l','r'].every(side=>bones.get('foot_'+side)
    .getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite)));
   cap.reset();sampled++;
  }
 }
 assert.equal(sampled,32);
 assert.ok(contactCount>=24,'No planted shoes measured');
 assert.throws(()=>ik.computePose({groundContact:true,groundY:3}),RangeError);
 assert.throws(()=>ik.computePose({contactWeights:{l:1.1}}),RangeError);
 assert.throws(()=>ik.computePose({contactPhases:{r:-.1}}),RangeError);
});

test('Original Mixamo directional support gets a bounded IK overlay without changing source tracks',()=>{
 const {root,bones}=rig(),cap=createFooteraCapturedGait(root),
  transitions=createFooteraDirectionalTransitions(root,cap),
  contact=createFooteraDirectionalContact(transitions),
  director=createFooteraPoseDirector(root),ik=createFooteraFootPlant(root,cap);
 const before=Object.fromEntries(FOOTERA_EVOLUTION_BONES.map(x=>[
  x.name,bones.get(x.name).quaternion.clone()]));
 for(const direction of FOOTERA_DIRECTION_MOVES){
  for(const time of [.32,.88,1.15,1.35,1.82,2.28]){
   const sequence=transitions.sampleSequence({time,direction});
   const support=contact.sample({time,direction});
   root.position.copy(support.rootTravel.clone().applyQuaternion(root.quaternion));
   director.beginFrame();director.submit('locomotion',sequence.pose);director.commit();
   cap.applyTranslation(sequence.translation);
   const anchors={};
   for(const side of ['l','r'])
    anchors[side]=bones.get('foot_'+side).getWorldPosition(new THREE.Vector3()).toArray();
   const station=support.estimatedFootprint.clone().applyQuaternion(root.quaternion);
   anchors[support.supportSide][0]=station.x;
   anchors[support.supportSide][2]=station.z;
   const weights={l:0,r:0},phases={l:0,r:0};
   weights[support.supportSide]=support.contactWeight;
   phases[support.supportSide]=support.supportProgress;
   const output=ik.computePose({phase:sequence.phase,anchorWorlds:anchors,
    groundContact:true,contactWeights:weights,contactPhases:phases});
   assert.ok(support.contactWeight>=0&&support.contactWeight<=1);
   assert.ok(support.supportProgress>=0&&support.supportProgress<=1);
   assert.ok(output.pose.size<=6,'Only thigh/calf/foot should be IK-owned');
   for(const side of ['l','r']){
    assert.ok(Number.isFinite(output.feet[side].correction));
    if(output.feet[side].active)
     assert.ok(output.feet[side].correction<.28);
   }
   assert.ok(FOOTERA_EVOLUTION_BONES.every(x=>
    bones.get(x.name).quaternion.toArray().every(Number.isFinite)));
  }
 }
 // Directional track is pure; IK never modifies the captured Mixamo source.
 cap.reset();root.position.set(0,0,0);
 director.beginFrame();director.commit();
 assert.ok(FOOTERA_EVOLUTION_BONES.every(x=>
  bones.get(x.name).quaternion.angleTo(before[x.name])<1e-5));
});
