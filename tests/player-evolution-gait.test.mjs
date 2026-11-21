import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {FOOTERA_EVOLUTION_BONES} from '../3d-player-evolution-rig.mjs';
import {createFooteraGaitMotion} from '../3d-player-evolution-gait.mjs';

function rig(){
 const root=new THREE.Group(),bones=new Map();
 for(const {name,parent} of FOOTERA_EVOLUTION_BONES){
  const b=new THREE.Bone();b.name=name;
  b.position.set(name.endsWith('_l')?.03:name.endsWith('_r')?-.03:0,
   name.startsWith('calf')||name.startsWith('foot')?-.23:.11,0);
  (parent?bones.get(parent):root).add(b);bones.set(name,b);
 }
 root.updateMatrixWorld(true);return{root,bones};
}
test('Walking drives pelvis laterally, twists and offsets torso in opposition',()=>{
 const {root,bones}=rig(),gait=createFooteraGaitMotion(root),cadence=1.45;
 const sample=gait.sample(1/(4*cadence));
 assert.equal(sample.pose.size,17);
 assert.ok(sample.translation.x>.01);
 assert.ok(sample.translation.y>=0&&sample.translation.y<=.0121);
 assert.ok(sample.diagnostics.yaw>.05);
 assert.ok(sample.diagnostics.roll>.03);
 assert.ok(sample.diagnostics.spineCounterYaw<0);
 const hip=sample.pose.get('pelvis'),spine=sample.pose.get('spine_01');
 assert.ok(hip.angleTo(new THREE.Quaternion())>.04,'hip rotates visibly');
 assert.ok(spine.angleTo(new THREE.Quaternion())>.02,'torso counters pelvis');
 assert.ok(hip.toArray().every(Number.isFinite));
 assert.ok(spine.toArray().every(Number.isFinite));
 assert.ok(Math.abs(hip.length()-1)<1e-8);
 // Sampling NEVER overwrites the 52-bone pose owned by the director.
 assert.equal(bones.get('pelvis').quaternion.angleTo(new THREE.Quaternion()),0);
 gait.applyTranslation(sample.translation);
 assert.ok(gait.getOffset().x>.01);
 gait.reset();
 assert.ok(gait.getOffset().length()<1e-12);
});
test('Contralateral gait, periodic samples and foot lift have deterministic phase',()=>{
 const {root}=rig(),g=createFooteraGaitMotion(root),f=1.45;
 const a=g.sample(1/(4*f)),b=g.sample(3/(4*f));
 assert.ok(a.translation.x>.01&&b.translation.x<-.01);
 assert.ok(a.diagnostics.roll>0&&b.diagnostics.roll<0);
 assert.ok(a.pose.get('upperarm_l').angleTo(b.pose.get('upperarm_l'))>.3);
 assert.ok(a.pose.get('calf_l').angleTo(b.pose.get('calf_l'))>.4);
 assert.ok(a.pose.get('calf_r').angleTo(b.pose.get('calf_r'))>.4);
 const next=g.sample(1/(4*f)+1/f);
 for(const [name,q] of a.pose)assert.ok(q.angleTo(next.pose.get(name))<1e-6,name+' periodicity');
 assert.ok(Math.abs(a.translation.x-next.translation.x)<1e-12);
});
test('Pelvis motion bounded and reversible without drift across 300 updates',()=>{
 const {root}=rig(),g=createFooteraGaitMotion(root),origin=g.restPosition.clone();
 for(let i=0;i<300;i++){
  const s=g.sample(i/30,{cadence:2.15,strength:.85});
  const offset=g.applyTranslation(s.translation);
  assert.ok(Math.abs(offset.x)<=.025&&Math.abs(offset.y)<=.018&&Math.abs(offset.z)<=.012);
  assert.ok(s.pose.get('pelvis').toArray().every(Number.isFinite));
 }
 g.reset();assert.ok(g.getOffset().length()<1e-12);
 assert.ok(g.restPosition.distanceTo(origin)<1e-12);
 assert.throws(()=>g.sample(0,{cadence:10}),RangeError);
 assert.throws(()=>g.sample(NaN),RangeError);
 assert.throws(()=>g.applyTranslation({x:NaN,y:0,z:0}),TypeError);
 assert.ok(g.getOffset().length()<1e-12);
});
