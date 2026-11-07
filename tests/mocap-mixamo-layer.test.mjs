import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import {createKeeperCaptureLayer,keeperCaptureWeights,keeperCaptureTime,keeperCaptureClip} from '../3d-mocap-mixamo-layer.mjs';
import {FOOTERA_MIXAMO} from '../3d-mocap-mixamo-data.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// The real human rig at rest under a keeper root turned like the game's (yaw PI).
function rig(yaw=Math.PI){
 const b=fs.readFileSync(path.join(root,'assets/footera/models/footera-humans.glb')),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString());
 const nodes=json.nodes.map(nd=>{const o=new THREE.Bone();o.name=nd.name;if(nd.translation)o.position.fromArray(nd.translation);if(nd.rotation)o.quaternion.fromArray(nd.rotation);if(nd.scale)o.scale.fromArray(nd.scale);return o});
 json.nodes.forEach((nd,i)=>(nd.children||[]).forEach(c=>nodes[i].add(nodes[c])));
 const scene=new THREE.Group(),player=new THREE.Group();scene.add(player);player.rotation.y=yaw;nodes.filter(o=>!o.parent).forEach(o=>player.add(o));
 scene.updateMatrixWorld(true);
 const bones=new Map(nodes.map(o=>[o.name,o]));
 const at=name=>bones.get(name).getWorldPosition(new THREE.Vector3());
 return{bones,player,scene,at};
}
const dive=(impactX,action='classic')=>({type:'big_chance_saved',action,impactX,impactY:1.1});

test('Mixamo keeper data: every Footera bone, dives and ready stance at 30 fps',()=>{
 assert.equal(FOOTERA_MIXAMO.bones.length,20);
 for(const name of ['keeper_dive','keeper_dive_high','keeper_ready']){
  const clip=FOOTERA_MIXAMO.clips[name];assert.ok(clip,name);
  assert.equal(clip.rate,30);assert.ok(clip.frames>40,name);
  assert.equal(atob(clip.bytes).length,clip.frames*20*3*2,name);
 }
 assert.ok(FOOTERA_MIXAMO.clips.keeper_ready.loop);
 assert.equal(keeperCaptureClip('high_reach'),'keeper_dive_high');assert.equal(keeperCaptureClip('parry'),'keeper_dive');
});

test('keeper capture timing: ready before the shot, dive around the save, hands on the ball at contact',()=>{
 assert.equal(keeperCaptureWeights(1).ready,0);assert.equal(keeperCaptureWeights(1).dive,0);
 assert.ok(keeperCaptureWeights(4.5).ready>.7);
 assert.equal(keeperCaptureWeights(6.5).dive,1);assert.equal(keeperCaptureWeights(6.5).legs,1);
 assert.equal(keeperCaptureWeights(6.6).hands,1,'gloves on the authored contact');
 assert.ok(keeperCaptureWeights(7.8).hands<.5,'captured arms after the landing');
 assert.equal(keeperCaptureWeights(10).dive,0);
 assert.equal(keeperCaptureWeights(6.5,'rush_spread').dive,0,'spread block keeps the authored smother');
 assert.equal(keeperCaptureWeights(6.65,'rush_spread').hands,1);
 const keys=FOOTERA_MIXAMO.clips.keeper_dive.keys;
 assert.ok(Math.abs(keeperCaptureTime(5.95,keys)-keys.launch)<1e-9);
 assert.ok(Math.abs(keeperCaptureTime(6.95,keys)-keys.land)<1e-9);
 assert.ok(keeperCaptureTime(6.4,keys)>keeperCaptureTime(6.2,keys),'monotonic');
});

test('captured dive goes to the authored side and lies down on landing, mirrored both ways',()=>{
 for(const side of [1,-1]){
  const {bones,player,scene,at}=rig(),layer=createKeeperCaptureLayer(bones,player);
  const pelvis0=at('pelvis'),head0=at('Head');
  layer.apply(7.3,dive(side*2.5));scene.updateMatrixWorld(true);
  const head=at('Head'),pelvis=at('pelvis');
  assert.ok(Math.sign(head.x-pelvis.x)===side,`head leads towards ${side}: ${head.toArray()} ${pelvis.toArray()}`);
  assert.ok(head.y-pelvis.y<.35,'lying on the side after landing, not upright');
  assert.ok(head0.y-pelvis0.y>.4,'rest is upright');
 }
});

test('keeper capture is deterministic and off without a dive',()=>{
 const a=rig(),b=rig(),la=createKeeperCaptureLayer(a.bones,a.player),lb=createKeeperCaptureLayer(b.bones,b.player);
 la.apply(6.5,dive(-2));lb.apply(6.5,dive(-2));a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);
 assert.ok(a.at('hand_l').distanceTo(b.at('hand_l'))<1e-9);
 assert.equal(la.apply(6.5,null).clip,'none');
});
