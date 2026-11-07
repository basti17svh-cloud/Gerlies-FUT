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

test('striker capture: header around the shot time, overhead kick lands and gets up',async()=>{
 const {strikerCaptureWeights,strikerCaptureTime,createStrikerCaptureLayer}=await import('../3d-mocap-mixamo-layer.mjs');
 for(const name of ['header','bicycle'])assert.equal(atob(FOOTERA_MIXAMO.clips[name].bytes).length,FOOTERA_MIXAMO.clips[name].frames*20*3*2,name);
 assert.equal(strikerCaptureWeights('header',5.4).legs,0,'the header keeps the authored jump');
 assert.ok(strikerCaptureWeights('header',5.4).body>.85);
 assert.equal(strikerCaptureWeights('normal',5.4).body,0);
 assert.equal(strikerCaptureWeights('bicycle',7.2).body,0,'up again before the celebration');
 const hk=FOOTERA_MIXAMO.clips.header.keys,bk=FOOTERA_MIXAMO.clips.bicycle.keys;
 assert.ok(Math.abs(strikerCaptureTime('header',5.4,hk)-hk.contact)<1e-9);
 assert.ok(Math.abs(strikerCaptureTime('bicycle',5.4,bk)-bk.contact)<1e-9);
 // At the overhead contact the kicking boot is above the head; lying after the landing.
 const {bones,player,scene,at}=rig(0),layer=createStrikerCaptureLayer(bones,player);
 layer.apply(5.4,'bicycle');scene.updateMatrixWorld(true);
 assert.ok(at('foot_r').y>at('Head').y,'boot over the head at contact');
 layer.apply(5.95,'bicycle');scene.updateMatrixWorld(true);
 assert.ok(Math.abs(at('Head').y-at('pelvis').y)<.4,'on the back after landing');
});

test('tackle capture: boot leads at contact, lies on the turf, up again, off without a tackle',async()=>{
 const {tackleCaptureWeights,tackleCaptureTime,createTackleCaptureLayer}=await import('../3d-mocap-mixamo-layer.mjs');
 const clip=FOOTERA_MIXAMO.clips.slide_tackle;assert.ok(clip);
 assert.ok(Math.abs(tackleCaptureTime(4.4,4.4,clip.keys)-clip.keys.contact)<1e-9);
 assert.equal(tackleCaptureWeights(3.5,4.4).body,0);assert.equal(tackleCaptureWeights(6,4.4).body,0,'up again');
 assert.equal(tackleCaptureWeights(4.4,4.4).body,1);
 const {bones,player,scene,at}=rig(0),layer=createTackleCaptureLayer(bones,player);
 assert.equal(layer.apply(4.4,null).clip,'none');
 layer.apply(4.4,{contact:4.4,weight:1});scene.updateMatrixWorld(true);
 assert.ok(at('foot_r').z-at('pelvis').z>.4,'leading boot ahead of the hips');
 assert.ok(at('Head').y-at('pelvis').y<.5,'leaning back into the slide');
 assert.equal(layer.apply(4.4,{contact:4.4,weight:0}).clip,'none','far from the ball: no slide');
});

test('run capture: backwards and sideways jogs by travel direction, forward left alone',async()=>{
 const {backpedalBlend,createRunCaptureLayer}=await import('../3d-mocap-mixamo-layer.mjs');
 for(const k of ['jog_back','jog_back_diag','strafe_left','strafe_right'])assert.ok(FOOTERA_MIXAMO.clips[k]?.loop,k);
 assert.equal(backpedalBlend(0).share,0,'forward travel keeps the normal run');
 const back=backpedalBlend(Math.PI);assert.equal(back.share,1);assert.equal(back.b.clip,'jog_back');assert.ok(back.u>.999);
 assert.equal(backpedalBlend(Math.PI/2).a.clip,'strafe_left');assert.equal(backpedalBlend(-Math.PI/2).a.clip,'strafe_right');
 assert.equal(backpedalBlend(Math.PI*.7).b.mirror,1);assert.equal(backpedalBlend(-Math.PI*.7).b.mirror,0);
 const {bones,player,layer=createRunCaptureLayer(bones,player)}=(()=>{const r=rig(0);return{...r,layer:createRunCaptureLayer(r.bones,r.player)}})();
 assert.ok(layer.ready);
 assert.equal(layer.apply(null,0).clip,'none');
 // The model faces +Z in player space: travelling -Z is backwards.
 assert.equal(layer.apply([0,-1,1],1.3).clip,'jog_back');
 assert.equal(layer.apply([0,1,1],1.3).clip,'none','forward');
});

test('receive capture: first touch around the pass arrival, boot by side, off without a pass',async()=>{
 const {receiveCaptureWeights,receiveCaptureTime,createReceiveCaptureLayer}=await import('../3d-mocap-mixamo-layer.mjs');
 const clip=FOOTERA_MIXAMO.clips.receive;assert.ok(clip&&!clip.loop);
 assert.ok(clip.frames<=Math.round(2.2*clip.rate)+1,'only the trap is stored, not the turn after it');
 assert.ok(Math.abs(receiveCaptureTime(3,3,clip.keys)-clip.keys.contact)<1e-9);
 assert.equal(receiveCaptureWeights(2.4,3,3.42).legs,0);assert.equal(receiveCaptureWeights(3.7,3,3.42).legs,0,'next action takes over');
 assert.equal(receiveCaptureWeights(3,3,3.42).legs,1);
 const {bones,player,scene,at}=rig(0),layer=createReceiveCaptureLayer(bones,player);
 assert.equal(layer.apply(3,null).clip,'none');
 layer.apply(3,{arrival:3,end:3.42,mirror:0});scene.updateMatrixWorld(true);
 assert.ok(at('foot_l').y-at('foot_r').y>.1,'left boot lifted to cushion the pass');
 layer.apply(3,{arrival:3,end:3.42,mirror:1});scene.updateMatrixWorld(true);
 assert.ok(at('foot_r').y-at('foot_l').y>.1,'mirrored: right boot');
 assert.equal(layer.apply(3,{arrival:3,end:3.42,weight:0}).clip,'none');
});

test('mixamo kicks: penalty and open-play strike, contact lined up, stretched penalty run-up',async()=>{
 const {mixamoKickWeight,createMixamoKickLayer,MIXAMO_KICK_CLIPS}=await import('../3d-mocap-mixamo-layer.mjs');
 for(const name of Object.values(MIXAMO_KICK_CLIPS))assert.ok(FOOTERA_MIXAMO.clips[name]?.keys.contact>0,name);
 assert.equal(mixamoKickWeight(5.4,'penalty').legs,1);assert.equal(mixamoKickWeight(5.4,'normal').legs,1);
 assert.equal(mixamoKickWeight(4,'normal').body,0);assert.equal(mixamoKickWeight(6.5,'penalty').body,0);
 // A set-piece run-up in stretched game time starts later in game seconds.
 assert.ok(mixamoKickWeight(4.9,'penalty',5.4,1).body>mixamoKickWeight(4.9,'penalty',5.4,1.67).body);
 const {bones,player,scene,at}=rig(0),layer=createMixamoKickLayer(bones,player);
 assert.ok(layer.handles({finish:'penalty'}));assert.ok(!layer.handles({finish:'power'}),'other finishes keep the CMU kicks');
 assert.equal(layer.apply(5.4,{finish:'header'}).body,0);
 layer.apply(5.42,{finish:'penalty',foot:'Right',contact:5.4});scene.updateMatrixWorld(true);
 assert.ok(at('foot_r').z>at('foot_l').z,'right boot through the ball');
 layer.apply(5.42,{finish:'penalty',foot:'Left',contact:5.4});scene.updateMatrixWorld(true);
 assert.ok(at('foot_l').z>at('foot_r').z,'left-footed: mirrored');
});
