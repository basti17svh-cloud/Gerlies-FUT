import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import {createCmuKickLayer,cmuKickWeight,cmuKickClip} from '../3d-mocap-cmu-layer.mjs';
import {FOOTERA_CMU_KICKS} from '../3d-mocap-cmu-data.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// The real human rig, posed at rest, under a turned player root.
function rig(yaw=.7){
 const b=fs.readFileSync(path.join(root,'assets/footera/models/footera-humans.glb')),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString());
 const nodes=json.nodes.map(nd=>{const o=new THREE.Bone();o.name=nd.name;if(nd.translation)o.position.fromArray(nd.translation);if(nd.rotation)o.quaternion.fromArray(nd.rotation);if(nd.scale)o.scale.fromArray(nd.scale);return o});
 json.nodes.forEach((nd,i)=>(nd.children||[]).forEach(c=>nodes[i].add(nodes[c])));
 const player=new THREE.Group();player.rotation.y=yaw;nodes.filter(o=>!o.parent).forEach(o=>player.add(o));
 player.updateMatrixWorld(true);
 const bones=new Map(nodes.map(o=>[o.name,o]));
 const inv=player.quaternion.clone().invert();
 const at=name=>bones.get(name).getWorldPosition(new THREE.Vector3()).applyQuaternion(inv);
 return{bones,player,at};
}

test('CMU kick data: every Footera bone, contact inside the clip',()=>{
 assert.equal(FOOTERA_CMU_KICKS.bones.length,20);
 for(const [name,clip] of Object.entries(FOOTERA_CMU_KICKS.clips)){
  assert.ok(clip.frames>40,name);
  assert.ok(clip.contact>0&&clip.contact<clip.frames/clip.rate,name);
  assert.equal(atob(clip.bytes).length,clip.frames*20*3*2,name);
 }
 assert.equal(cmuKickClip('power'),'power');assert.equal(cmuKickClip('pass'),'finesse');assert.equal(cmuKickClip('header'),'normal');
});

test('CMU kick weights: only around contact, never for headers, volleys or overhead kicks',()=>{
 for(const t of [0,3,4.4,6.5,9])assert.equal(cmuKickWeight(t).body,0,String(t));
 assert.equal(cmuKickWeight(5.4).body,1);assert.equal(cmuKickWeight(5.4).legs,1);
 for(const f of ['header','volley','bicycle'])assert.equal(cmuKickWeight(5.4,f).body,0,f);
 assert.ok(cmuKickWeight(4.7).legs<cmuKickWeight(4.7).body,'legs join after the run-up');
 const pass=cmuKickWeight(2.0,'pass',2.0);assert.ok(pass.body>.8&&pass.body<=.85);
 assert.equal(cmuKickWeight(1.2,'pass',2.0).body,0);assert.equal(cmuKickWeight(2.6,'pass',2.0).body,0);
});

test('captured right-foot kick: backswing behind, follow-through high and forward, arms counterbalance',()=>{
 const {bones,player,at}=rig(),layer=createCmuKickLayer(bones,player),rest=at('hand_l');
 const fwd=v=>v.z; // the human rig faces +Z in player space
 layer.apply(5.2,{finish:'normal',foot:'Right'});player.updateMatrixWorld(true);
 const back=at('foot_r'),handL=at('hand_l');
 assert.ok(fwd(back)<-.3&&back.y>.35,'kicking boot swung back and up: '+back.toArray());
 assert.ok(handL.x>rest.x,'left arm opens out for balance');
 layer.apply(5.6,{finish:'normal',foot:'Right'});player.updateMatrixWorld(true);
 const follow=at('foot_r');
 assert.ok(fwd(follow)>.3&&follow.y>.35,'follow-through forward and high: '+follow.toArray());
 assert.ok(at('Head').y>1.45,'stays upright');
});

test('left-footed kick mirrors the capture and the layer is deterministic',()=>{
 const a=rig(),b=rig(),right=createCmuKickLayer(a.bones,a.player),left=createCmuKickLayer(b.bones,b.player);
 right.apply(5.2,{finish:'power',foot:'Right'});left.apply(5.2,{finish:'power',foot:'Left'});
 a.player.updateMatrixWorld(true);b.player.updateMatrixWorld(true);
 const r=a.at('foot_r'),l=b.at('foot_l');
 assert.ok(Math.abs(r.x+l.x)<.04&&Math.abs(r.y-l.y)<.04&&Math.abs(r.z-l.z)<.04,`mirror ${r.toArray()} ${l.toArray()}`);
 const c=rig(),again=createCmuKickLayer(c.bones,c.player);
 again.apply(5.2,{finish:'power',foot:'Right'});c.player.updateMatrixWorld(true);
 assert.ok(c.at('foot_r').distanceTo(r)<1e-9);
 assert.equal(right.apply(3,{finish:'normal',foot:'Right'}).body,0);
});
