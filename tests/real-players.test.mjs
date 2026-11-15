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
  const a=json.accessors[i],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const types={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array,5122:Int16Array},Type=types[a.componentType];
  const view=(index,offset,count,T)=>{const v=json.bufferViews[index],start=bin.byteOffset+(v.byteOffset||0)+(offset||0);
   return new T(bin.buffer.slice(start,start+count*T.BYTES_PER_ELEMENT))};
  const out=a.bufferView==null?new Type(a.count*size):view(a.bufferView,a.byteOffset,a.count*size,Type);
  if(a.sparse){
   const ix=view(a.sparse.indices.bufferView,a.sparse.indices.byteOffset,a.sparse.count,types[a.sparse.indices.componentType]);
   const val=view(a.sparse.values.bufferView,a.sparse.values.byteOffset,a.sparse.count*size,Type);
   ix.forEach((v,k)=>{for(let c=0;c<size;c++)out[v*size+c]=val[k*size+c]});
  }
  return out;
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
 assert.ok(real.bytes<8e6,'GLB stays under 8 MB: '+real.bytes);
 const meshes=real.json.meshes.map(m=>m.name);
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes','FooteraLashes'])assert.ok(meshes.includes(name),name);
 // Every MakeHuman haircut, beard and brow is fitted onto this head too, so
 // the per-player looks (player-looks.js) work on both bodies.
 const mh=human.json.extras.footera;
 for(const hair of [...info.hair,...info.hairFemale,...info.hairSpecial])assert.ok(meshes.includes('FooteraHair-'+hair),hair);
 for(const hair of [...mh.hair,...mh.hairFemale,...mh.hairSpecial])assert.ok(meshes.includes('FooteraHair-'+hair),'MakeHuman cut '+hair);
 for(const beard of mh.facial)assert.ok(meshes.includes('FooteraFacial-'+beard),beard);
 for(const brow of mh.brows)assert.ok(meshes.includes('FooteraBrows-'+brow),brow);
 assert.ok(info.skins.light!=null&&info.skinMean.light.length===3);
});

test('real GLB: face morphs, own dark skin and a clean-shaven head',()=>{
 // V21.433: the MakeHuman face morphs carried onto the head, so every man
 // gets his own face (footeraHumanLook picks the weights from his name).
 const mh=human.json.extras.footera.morphs;
 for(const key of info.morphs)assert.ok(mh.includes(key),key);
 const body=real.json.meshes.find(m=>m.name==='FooteraBody');
 const names=body.extras.targetNames,prim=body.primitives[0];
 for(const key of ['race_african','race_asian','race_caucasian','head_square','jaw_width','chin_prominent','nose_width','nose_length','cheekbones','brow_ridge'])
  assert.ok(names.includes(key),'body morph '+key);
 const pos=real.accessor(prim.attributes.POSITION),head=real.json.nodes.find(n=>n.name==='Head');
 for(const [k,key] of names.entries()){
  const acc=real.json.accessors[prim.targets[k].POSITION],raw=real.accessor(prim.targets[k].POSITION);
  // Dense targets are normalized int16 metres (KHR_mesh_quantization).
  const d=acc.normalized?Float32Array.from(raw,v=>v/32767):raw;let moved=0,low=Infinity;
  for(let v=0;v<d.length/3;v++){const m=Math.hypot(d[v*3],d[v*3+1],d[v*3+2]);if(m>.001){moved++;low=Math.min(low,pos[v*3+1])}}
  // Small features (lips) may move only a few vertices; the shape keys must move many.
  if(key!=='lips_volume')assert.ok(moved>10,key+' moves the face: '+moved);
  // Only the head and neck move, never the kit or the legs.
  assert.ok(low>1.35,key+' stays on the head ('+low.toFixed(2)+' m)');
 }
 if(prim.targets.some(t=>real.json.accessors[t.POSITION].normalized))assert.ok(real.json.extensionsRequired.includes('KHR_mesh_quantization'));
 // Dark complexions get their own warm atlas, not a grey multiply of the light one.
 assert.notEqual(info.skins.dark,info.skins.light);
 assert.ok(info.skinMean.dark[0]<.5&&info.skinMean.dark[0]>info.skinMean.dark[2]);
 // Beards are the beard meshes: names pick clean-shaven or a beard.
 assert.ok(info.facial.length>=2);
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
