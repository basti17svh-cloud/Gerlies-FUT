import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import {footeraHumanLook,footeraHumanSource} from '../3d-player-human.mjs';

// V21.433 realistic men's body (tools/build-footera-real.py, "Man Player" by
// RiverofCreative, CC-BY-4.0). It must be a drop-in for the MakeHuman body:
// same bones and bone frames, so every mocap layer and the foot IK pose it.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function readGlb(file){
 const b=fs.readFileSync(path.join(root,file)),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(20+n+8);
 const accessor=i=>{
  const a=json.accessors[i],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const Type={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];
  const start=bin.byteOffset+v.byteOffset+(a.byteOffset||0);
  return new Type(bin.buffer.slice(start,start+a.count*size*Type.BYTES_PER_ELEMENT));
 };
 return{json,accessor,bytes:b.length};
}
function worldFrames(json){
 const parent=new Map();json.nodes.forEach((node,i)=>(node.children||[]).forEach(c=>parent.set(c,i)));
 const local=node=>new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation||[0,0,0])),
  new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
 const frames=new Map();
 json.nodes.forEach((node,i)=>{
  const m=local(node);for(let p=parent.get(i);p!=null;p=parent.get(p))m.premultiply(local(json.nodes[p]));
  const pos=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(pos,q,s);
  frames.set(node.name,{pos,q});
 });
 return frames;
}
const real=readGlb('assets/footera/models/footera-real.glb'),human=readGlb('assets/footera/models/footera-humans.glb');
const info=real.json.extras.footera;

test('real GLB: credited CC-BY source, mobile-sized, every part present',()=>{
 assert.match(info.source,/Man Player.*RiverofCreative.*CC-BY-4\.0/);
 assert.match(info.credit,/sketchfab\.com\/3d-models\/man-player-4c7133dbb06e4136891d59231372d818/);
 assert.ok(real.bytes<3.5e6,'GLB stays under 3.5 MB: '+real.bytes);
 const meshes=real.json.meshes.map(m=>m.name);
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes','FooteraLashes'])assert.ok(meshes.includes(name),name);
 for(const hair of info.hair)assert.ok(meshes.includes('FooteraHair-'+hair),hair);
 // Women's players stay on the MakeHuman body: no women's parts here.
 assert.deepEqual(info.hairFemale,[]);
 assert.ok(info.skins.light!=null&&info.skinMean.light.length===3);
});

test('real GLB: same bones in the same order, frames aligned with the MakeHuman rig',()=>{
 assert.deepEqual(info.bones,human.json.extras.footera.bones);
 const names=j=>j.skins[0].joints.map(i=>j.nodes[i].name);
 assert.deepEqual(names(real.json),names(human.json));
 const a=worldFrames(real.json),b=worldFrames(human.json);
 // Bone frames copy the Quaternius rig turned onto each limb, so the two
 // bodies' frames agree up to the differences in limb direction (the upper
 // spine leans most: 26 deg).
 for(const bone of ['pelvis','spine_03','Head','upperarm_l','lowerarm_r','hand_l','thigh_r','calf_l','foot_r','ball_l']){
  const angle=a.get(bone).q.angleTo(b.get(bone).q)*180/Math.PI;
  assert.ok(angle<30,`${bone} frame within 30 deg (${angle.toFixed(1)})`);
 }
 // A-pose like the MakeHuman body (posed from the source T-pose).
 const arm=a.get('lowerarm_l').pos.clone().sub(a.get('upperarm_l').pos).normalize();
 assert.ok(arm.y<-.6,'upper arm hangs down in the bind pose: '+arm.y.toFixed(2));
 assert.ok(Math.abs(a.get('Head').pos.y-1.65)<.08,'head at standing height');
});

test('real GLB: skin weights spread over the limbs, head and fingers',()=>{
 const prim=real.json.meshes.find(m=>m.name==='FooteraBody').primitives[0];
 const joints=real.accessor(prim.attributes.JOINTS_0),weights=real.accessor(prim.attributes.WEIGHTS_0);
 const names=real.json.skins[0].joints.map(i=>real.json.nodes[i].name),count=new Map();
 for(let v=0;v<weights.length/4;v++){
  let best=0;for(let k=1;k<4;k++)if(weights[v*4+k]>weights[v*4+best])best=k;
  const bone=names[joints[v*4+best]];count.set(bone,(count.get(bone)||0)+1);
 }
 for(const bone of ['Head','neck_01','upperarm_l','lowerarm_r','hand_l','thigh_l','calf_r','index_02_l'])
  assert.ok((count.get(bone)||0)>20,bone+' drives '+(count.get(bone)||0)+' vertices');
});

test('real GLB: shirt and shorts carry the kit canvas UV in their bands',()=>{
 const bands=info.kitBands;
 for(const [mesh,band] of [['FooteraShirt',bands.shirt],['FooteraShorts',bands.shorts],['FooteraSocks',bands.socks]]){
  const prim=real.json.meshes.find(m=>m.name===mesh).primitives[0],uv=real.accessor(prim.attributes.TEXCOORD_0);
  for(let i=1;i<uv.length;i+=2)assert.ok(uv[i]>=band[0]-1e-4&&uv[i]<=band[1]+1e-4,`${mesh} v in band`);
 }
 assert.ok(info.captainBand&&info.captainBand.shoulder.length===2);
});

test('looks: without the realistic body loaded every player keeps the MakeHuman look',()=>{
 // In node nothing is loaded; the look must not claim the realistic body.
 assert.equal(footeraHumanLook('Florian Wirtz','#c88f69').real,false);
 assert.equal(footeraHumanSource({real:true}),null);
 const src=fs.readFileSync(path.join(root,'3d-player-human.mjs'),'utf8');
 assert.match(src,/footera-3d-real'\)!=='0'/,'opt-out flag');
 assert.match(src,/custom\?\.female!==true&&!!sourceReal/,'women stay on the MakeHuman body');
});
