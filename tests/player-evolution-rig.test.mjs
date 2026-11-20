import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {
 FOOTERA_EVOLUTION_BONES,FOOTERA_EVOLUTION_LAYERS,collectFooteraBones,
 auditFooteraRig,createFooteraEvolutionRetargeter,createFooteraPoseDirector
} from '../3d-player-evolution-rig.mjs';

// Independent skeletons simulate a Mixamo-like source and a differently
// oriented MetaHuman-style target: no assumptions about local bone axes.
function fixture(seed=0) {
 const root=new THREE.Group();root.rotation.y=seed*0.4;
 const bones=new Map();
 for(const {name,parent} of FOOTERA_EVOLUTION_BONES){
  const bone=new THREE.Bone();bone.name=name;
  bone.position.set(name.endsWith('_l')?-.025:name.endsWith('_r')?.025:0,
   name.startsWith('calf')||name.startsWith('foot')?-.18:.08,0);
  bone.rotation.set(seed*.04,seed*.03,seed*.02);
  (parent?bones.get(parent):root).add(bone);bones.set(name,bone);
 }
 root.updateMatrixWorld(true);return{root,bones};
}
const angle=(a,b)=>a.angleTo(b);

test('canonical 52-bone layout has unique names and all parents precede children',()=>{
 assert.equal(FOOTERA_EVOLUTION_BONES.length,52);
 assert.deepEqual(Object.keys(FOOTERA_EVOLUTION_LAYERS),['base','locomotion','action','contact','ik']);
 const seen=new Set();
 for(const {name,parent} of FOOTERA_EVOLUTION_BONES){
  assert.ok(!seen.has(name),name);
  if(parent)assert.ok(seen.has(parent),name+' parent '+parent);
  seen.add(name);
 }
});
test('rig audit: valid structure, duplicates, missing joints, bad parent and invalid rotations',()=>{
 const {root,bones}=fixture();
 assert.deepEqual(auditFooteraRig(root).errors,[]);
 assert.equal(auditFooteraRig(root).boneCount,52);
 const extra=new THREE.Bone();extra.name='Head';root.add(extra);
 assert.ok(auditFooteraRig(root).errors.includes('duplicate-bone:Head'));root.remove(extra);
 bones.get('hand_l').removeFromParent();root.add(bones.get('hand_l'));
 assert.ok(auditFooteraRig(root).errors.some(x=>x.startsWith('wrong-parent:hand_l')));
 bones.get('hand_l').removeFromParent();bones.get('lowerarm_l').add(bones.get('hand_l'));
 bones.get('calf_r').quaternion.set(0,0,0,0);
 assert.ok(auditFooteraRig(root).errors.includes('invalid-rest-rotation:calf_r'));
 bones.get('calf_r').quaternion.identity();
 bones.get('Head').removeFromParent();
 assert.ok(auditFooteraRig(root).errors.includes('missing-bone:Head'));
});
test('skinned mesh audit detects non-normalized vertex weights',()=>{
 const {root,bones}=fixture();
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, 0,1,0, 1,0,0],3));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());
 mesh.name='TestBody';root.add(mesh);
 mesh.bind(new THREE.Skeleton([bones.get('pelvis')]));
 assert.equal(auditFooteraRig(root).ok,true);
 geometry.getAttribute('skinWeight').setX(1,.2);
 assert.ok(auditFooteraRig(root).errors.includes('unnormalized-skin-weight:TestBody'));
});
test('retarget: target bind pose retained with rotated roots and differently oriented bones',()=>{
 const source=fixture(.6),target=fixture(-.8);
 const rest=new Map();
 for(const {name} of FOOTERA_EVOLUTION_BONES)
  rest.set(name,target.bones.get(name).quaternion.clone());
 const retarget=createFooteraEvolutionRetargeter(source.root,target.root);
 const director=createFooteraPoseDirector(target.root);
 director.beginFrame();director.submit('base',retarget.sample());director.commit();
 for(const {name} of FOOTERA_EVOLUTION_BONES)
  assert.ok(angle(target.bones.get(name).quaternion,rest.get(name))<1e-5,name);
 source.bones.get('upperarm_l').rotateX(.4);
 source.bones.get('spine_02').rotateZ(-.18);
 source.root.updateMatrixWorld(true);
 const srcRootInv=source.root.getWorldQuaternion(new THREE.Quaternion()).invert();
 const targetRootWorld=target.root.getWorldQuaternion(new THREE.Quaternion());
 const sourceShoulderRest=new THREE.Quaternion();
 // Reconstruct the source's original bind rotation without disturbing its parent.
 const oldShoulder=source.bones.get('upperarm_l').quaternion.clone();
 source.bones.get('upperarm_l').rotateX(-.4);
 source.root.updateMatrixWorld(true);
 sourceShoulderRest.copy(srcRootInv).multiply(
  source.bones.get('upperarm_l').getWorldQuaternion(new THREE.Quaternion()));
 source.bones.get('upperarm_l').quaternion.copy(oldShoulder);source.root.updateMatrixWorld(true);
 const delta=srcRootInv.clone().multiply(
  source.bones.get('upperarm_l').getWorldQuaternion(new THREE.Quaternion()))
  .multiply(sourceShoulderRest.invert());
 const targetShoulderRest=targetRootWorld.clone().invert().multiply(
  target.bones.get('upperarm_l').getWorldQuaternion(new THREE.Quaternion()));
 const expected=targetRootWorld.clone().multiply(delta).multiply(targetShoulderRest);
 director.beginFrame();director.submit('base',retarget.sample());director.commit();
 const actual=target.bones.get('upperarm_l').getWorldQuaternion(new THREE.Quaternion());
 assert.ok(angle(expected,actual)<1e-5,'world-space anatomical delta');
 const after=actual.clone();
 director.beginFrame();director.submit('base',retarget.sample());director.commit();
 assert.ok(angle(after,target.bones.get('upperarm_l').getWorldQuaternion(new THREE.Quaternion()))<1e-6,'no accumulated rotation');
});
test('director uses one writer per joint; explicit action/IK precedence; deterministic reset',()=>{
 const {root,bones}=fixture();
 const d=createFooteraPoseDirector(root),rest=bones.get('foot_l').quaternion.clone();
 const base=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.3));
 const action=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.7));
 const contact=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.2));
 d.beginFrame();d.submit('base',new Map([['foot_l',base]]));
 d.submit('action',new Map([['foot_l',action]]));
 d.submit('ik',new Map([['foot_l',contact]]),{weight:.5});
 const result=d.commit();
 assert.equal(result.written,52);
 assert.equal(result.owners.get('foot_l'),'ik');
 assert.equal(result.overrides.length,2);
 assert.ok(angle(bones.get('foot_l').quaternion,action.clone().slerp(contact,.5))<1e-6);
 assert.throws(()=>d.submit('ik',new Map([['foot_l',contact]])),/Duplicate pose owner/);
 assert.throws(()=>d.submit('base',{'unknown_joint':base}),/Unknown pose joint/);
 assert.throws(()=>d.submit('base',{'foot_r':new THREE.Quaternion(0,0,0,0)}),/Invalid pose quaternion/);
 d.beginFrame();d.commit();
 assert.ok(angle(bones.get('foot_l').quaternion,rest)<1e-6);
 assert.equal(collectFooteraBones(root).bones.size,52);
});
