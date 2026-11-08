#!/usr/bin/env node
/* Bake selected Mixamo motions (Adobe Mixamo, free for use in games) into
 * Footera's 3d-mocap-mixamo-data.mjs. The raw FBX files are NOT part of the
 * repository; Basti downloads them ("Soccer Game Pack", FBX Binary, Without
 * Skin, 30 fps) and the baker keeps only reduced rotation tracks.
 *
 *   npm i three@0.160.0 --prefix /some/tmp
 *   THREE_DIR=/some/tmp/node_modules/three node tools/build-footera-mixamo.mjs <folder with the pack's .fbx files>
 *
 * Per frame and mapped bone: the capture's world rotation away from its
 * T-pose rest (character faces +Z, its left is +X), the same format as the
 * CMU kicks, so one retarget drives both.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const THREE_DIR=process.env.THREE_DIR;
if(!THREE_DIR)throw new Error('set THREE_DIR to an installed three@0.160 package');
const THREE=await import(pathToFileURL(path.join(THREE_DIR,'build/three.module.js')).href);
const {FBXLoader}=await import(pathToFileURL(path.join(THREE_DIR,'examples/jsm/loaders/FBXLoader.js')).href);

const MAP=[['pelvis','Hips','Spine'],['spine_01','Spine','Spine1'],['spine_02','Spine1','Spine2'],['spine_03','Spine2','Neck'],
 ['neck_01','Neck','Head'],['Head','Head','HeadTop_End'],
 ['clavicle_l','LeftShoulder','LeftArm'],['upperarm_l','LeftArm','LeftForeArm'],['lowerarm_l','LeftForeArm','LeftHand'],['hand_l','LeftHand','LeftHandMiddle1'],
 ['clavicle_r','RightShoulder','RightArm'],['upperarm_r','RightArm','RightForeArm'],['lowerarm_r','RightForeArm','RightHand'],['hand_r','RightHand','RightHandMiddle1'],
 ['thigh_l','LeftUpLeg','LeftLeg'],['calf_l','LeftLeg','LeftFoot'],['foot_l','LeftFoot','LeftToeBase'],
 ['thigh_r','RightUpLeg','RightLeg'],['calf_r','RightLeg','RightFoot'],['foot_r','RightFoot','RightToeBase']];
// clip -> source file, the side the capture moves to (+1 = its left, +X),
// and key times in the capture (seconds) the game lines up with its own.
const CLIPS={
 keeper_dive:{file:'goalkeeper diving save.fbx',side:1,keys:{launch:.7,land:1.35,rise:2.3,up:3.1}},
 keeper_dive_high:{file:'goalkeeper diving save (2).fbx',side:-1,keys:{launch:.6,land:1.35,rise:2.15,up:3.0}},
 keeper_ready:{file:'goalkeeper idle.fbx',side:0,loop:true,keys:{}},
 header:{file:'header soccerball.fbx',side:0,keys:{load:.5,contact:.95,settle:1.8}},
 bicycle:{file:'scissor kick.fbx',side:0,keys:{takeoff:.3,contact:.8,land:1.2,rise:1.9,up:2.6}},
 slide_tackle:{file:'soccer tackle (2).fbx',side:0,keys:{takeoff:.2,contact:.55,rise:1.0,up:1.7}},
 jog_back:{file:'jog backward.fbx',side:0,loop:true,keys:{}},
 jog_back_diag:{file:'jog backward diagonal.fbx',side:0,loop:true,keys:{}},
 strafe_left:{file:'jog strafe left.fbx',side:0,loop:true,keys:{}},
 strafe_right:{file:'jog strafe right.fbx',side:0,loop:true,keys:{}},
 jog_fwd:{file:'jog forward.fbx',side:0,loop:true,keys:{leftForward:.24}},
 ready_idle:{file:'offensive idle.fbx',side:0,end:6,keys:{}},
 strike_jog:{file:'strike foward jog.fbx',side:0,keys:{contact:.41}},
 penalty:{file:'soccer penalty kick.fbx',side:0,keys:{contact:.74}},
 receive:{file:'receive soccerball.fbx',side:0,end:2.2,keys:{load:.85,contact:1.15,settle:1.55,up:1.8}},
 keeper_throw:{file:'goalkeeper overhand throw.fbx',side:0,end:2.3,keys:{hold:.3,release:1.45}},
 throw_in:{file:'throw in.fbx',side:0,end:2.4,keys:{raise:.7,back:1.2,release:1.45}},
 trip:{file:'soccer trip.fbx',side:0,keys:{hit:.12,down:.7,lying:1.2}},
 // Turned (yaw, degrees) so it starts in the lying pose the trip ends in.
 stand_up:{file:'standing up.fbx',side:0,yaw:-80,keys:{lying:.2,up:1.6}},
};
const RATE=30;
const dir=process.argv[2];
const OUT=path.join(path.dirname(new URL(import.meta.url).pathname),'..','3d-mocap-mixamo-data.mjs');
if(!dir)throw new Error('usage: build-footera-mixamo.mjs <folder with .fbx>');

function load(file){
 const buf=fs.readFileSync(file);
 const o=new FBXLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length),'');
 const B=new Map();o.traverse(x=>{if(x.isBone)B.set(x.name.replace(/^mixamorig\d*:?/,''),x)});
 for(const [,j,c] of MAP)if(!B.get(j)||!B.get(c))throw new Error(file+': missing bone '+j+'/'+c);
 o.updateMatrixWorld(true);
 const rest=new Map();for(const [k,b] of B)rest.set(k,{q:b.getWorldQuaternion(new THREE.Quaternion()),p:b.getWorldPosition(new THREE.Vector3())});
 const mixer=new THREE.AnimationMixer(o),clip=o.animations[0];mixer.clipAction(clip).play();
 return{B,rest,duration:clip.duration,set:t=>{mixer.setTime(t);o.updateMatrixWorld(true)}};
}
const pack=rows=>{
 const out=new Int16Array(rows.length*3);
 rows.forEach((q,i)=>{const s=q.w<0?-1:1;out[i*3]=Math.round(q.x*s*32767);out[i*3+1]=Math.round(q.y*s*32767);out[i*3+2]=Math.round(q.z*s*32767)});
 return Buffer.from(out.buffer).toString('base64');
};
let restDirs=null;const clips={};
for(const [name,spec] of Object.entries(CLIPS)){
 const c=load(path.join(dir,spec.file));
 if(!restDirs)restDirs=MAP.map(([,j,child])=>c.rest.get(child).p.clone().sub(c.rest.get(j).p).normalize().toArray().map(v=>Math.round(v*1e4)/1e4));
 // end: keep only the first seconds of a long capture (e.g. the trap, not the turn after it).
 const frames=Math.floor(Math.min(c.duration,spec.end??c.duration)*RATE+1e-6)+1,rows=[],hips=[];
 const inv=new Map(MAP.map(([,j])=>[j,c.rest.get(j).q.clone().invert()]));
 const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(spec.yaw||0)*Math.PI/180);
 for(let f=0;f<frames;f++){
  c.set(Math.min(c.duration,f/RATE));
  for(const [,j] of MAP)rows.push(turn.clone().multiply(c.B.get(j).getWorldQuaternion(new THREE.Quaternion()).multiply(inv.get(j))).normalize());
  hips.push(Math.round(c.B.get('Hips').getWorldPosition(new THREE.Vector3()).y)/100);
 }
 clips[name]={frames,rate:RATE,side:spec.side,loop:!!spec.loop,keys:spec.keys,source:'Mixamo '+spec.file.replace(/\.fbx$/,''),hipY:hips.map(v=>Math.round(v*100)/100),bytes:pack(rows)};
}
const body={bones:MAP.map(m=>m[0]),restDirs,clips};
fs.writeFileSync(OUT,'/* Footera: football motions from Adobe Mixamo (Soccer Game Pack, free for\n'+
 ' * use in games), baked by tools/build-footera-mixamo.mjs. World rotation away\n'+
 ' * from the T-pose per bone, capture facing +Z, 30 fps. Do not edit. */\n'+
 'export const FOOTERA_MIXAMO='+JSON.stringify(body)+';\n');
console.log('wrote',OUT,fs.statSync(OUT).size,'bytes',Object.keys(clips).join(','));
