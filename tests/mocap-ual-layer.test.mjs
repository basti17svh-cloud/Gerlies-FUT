import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {FOOTERA_UAL_POSE} from '../3d-mocap-ual-data.mjs';
import {createUalPoseLayer,ualPoseWeight} from '../3d-mocap-ual-layer.mjs';

function skeleton(){
 const bones=new Map();
 for(const name of [...FOOTERA_UAL_POSE.bones,...FOOTERA_UAL_POSE.fingers]){
  const bone=new THREE.Bone();bone.name=name;bone.quaternion.fromArray(FOOTERA_UAL_POSE.rest[name]);bones.set(name,bone);
 }
 return bones;
}
// The procedural rig rewrites these joints every frame before the layer runs.
const OWNED=['pelvis','spine_01','spine_02','spine_03','Head','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r'];
function procedural(bones){for(const name of OWNED)bones.get(name).quaternion.fromArray(FOOTERA_UAL_POSE.rest[name])}
const snapshot=bones=>[...bones.values()].flatMap(b=>b.quaternion.toArray().map(v=>+v.toFixed(6)));

test('captured CC0 clips are complete gait cycles of the shared skeleton', ()=>{
 assert.deepEqual(Object.keys(FOOTERA_UAL_POSE.clips),['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop']);
 for(const clip of Object.values(FOOTERA_UAL_POSE.clips)){
  assert.equal(atob(clip.bytes).length,clip.frames*FOOTERA_UAL_POSE.bones.length*6);
  assert.ok(clip.leftForward>=0&&clip.leftForward<1);
 }
});

test('seeking gives the same pose regardless of earlier frames', ()=>{
 const a=skeleton(),b=skeleton(),layerA=createUalPoseLayer(a),layerB=createUalPoseLayer(b);
 const info={speed:.6,stride:7.3,control:0,sequence:'combo_left',clipEnabled:true};
 for(let t=.2;t<3;t+=.1){procedural(a);layerA.apply(t,{...info,stride:t*9})}
 procedural(a);layerA.apply(3.1,info);procedural(b);layerB.apply(3.1,info);
 assert.deepEqual(snapshot(a),snapshot(b));
});

test('keepers, disabled capture and the authored strike keep the procedural pose', ()=>{
 const bones=skeleton(),before=snapshot(bones),layer=createUalPoseLayer(bones);
 assert.equal(layer.apply(2,{speed:.7,stride:3},true).weight,0);
 assert.equal(layer.apply(2,{speed:.7,stride:3,clipEnabled:false}).weight,0);
 assert.equal(ualPoseWeight(5.5,{}),0);
 assert.ok(ualPoseWeight(2,{})>.99);
 assert.deepEqual(snapshot(bones),before);
});

test('running drives the arms with the capture and follows the travelled distance', ()=>{
 const bones=skeleton(),layer=createUalPoseLayer(bones),arm=bones.get('upperarm_l');
 const angles=[];
 for(let i=0;i<8;i++){
  procedural(bones);
  const state=layer.apply(2,{speed:.9,stride:i/8*Math.PI*2});
  assert.equal(state.clip,'Sprint_Loop');
  angles.push(arm.quaternion.angleTo(new THREE.Quaternion().fromArray(FOOTERA_UAL_POSE.rest.upperarm_l)));
 }
 assert.ok(Math.max(...angles)-Math.min(...angles)>.2,'arm swing over one stride');
});
