import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import {FOOTERA_TWIST_SEGMENTS,inspectFooteraTwistRig,createFooteraTwistSolver}
 from '../3d-player-evolution-twist.mjs';
import {FOOTERA_EVOLUTION_BONES} from '../3d-player-evolution-rig.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function read(name){
 const binary=fs.readFileSync(path.join(ROOT,'assets/footera/models',name));
 assert.equal(binary.readUInt32LE(0),0x46546c67);
 const length=binary.readUInt32LE(12),j=JSON.parse(binary.subarray(20,20+length).toString());
 const start=20+length+8;
 return{j,bin:binary.subarray(start)};
}
function accessor(glb,index){
 const a=glb.j.accessors[index],b=glb.j.bufferViews[a.bufferView];
 const T={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType],
  len={VEC3:3,VEC4:4,MAT4:16,SCALAR:1}[a.type]*a.count;
 const start=glb.bin.byteOffset+(b.byteOffset||0)+(a.byteOffset||0);
 return new T(glb.bin.buffer.slice(start,start+len*T.BYTES_PER_ELEMENT));
}
const pairs=FOOTERA_TWIST_SEGMENTS;
const src=read('footera-evolution-master.glb');
const dst=read('footera-evolution-twist-prototype.glb');

test('Eight real twist bones in their correct parent hierarchy; original 52 intact',()=>{
 assert.equal(pairs.length,8);
 assert.equal(src.j.skins[0].joints.length,52);
 assert.equal(dst.j.skins[0].joints.length,60);
 assert.deepEqual(dst.j.extras.footera.bones.slice(0,52),src.j.extras.footera.bones);
 assert.deepEqual(dst.j.extras.footera.evolutionTwist.twist_bones,pairs.map(x=>x.name));
 const ids=new Map(dst.j.nodes.map((n,i)=>[n.name,i]));
 for(const d of pairs){
  const p=dst.j.nodes[ids.get(d.parent)];
  assert.ok(p.children.includes(ids.get(d.name)),d.name+' must be child of '+d.parent);
  assert.ok(p.children.includes(ids.get(d.end)),d.end+' must stay child of '+d.parent);
  const t=dst.j.nodes[ids.get(d.name)];
  assert.ok(t.translation.some(x=>Math.abs(x)>1e-5),d.name+' needs real pivot');
 }
 for(const b of FOOTERA_EVOLUTION_BONES){
  assert.ok(ids.has(b.name),b.name);
 }
});
test('Source materials, geometry positions, face morphs and game assets unchanged',()=>{
 assert.deepEqual(dst.j.images,src.j.images);
 assert.deepEqual(dst.j.materials,src.j.materials);
 const meshes=dst.j.meshes.map(m=>m.name);
 assert.deepEqual(meshes,src.j.meshes.map(m=>m.name));
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes']){
  const mesh=g=>g.j.meshes.find(m=>m.name===name).primitives[0];
  assert.deepEqual(accessor(dst,mesh(dst).attributes.POSITION),accessor(src,mesh(src).attributes.POSITION),name);
 }
});
test('Each twist bone deforms its anatomically visible mesh; weights sum to one',()=>{
 const joints=dst.j.skins[0].joints,byId=new Map(joints.map((i,k)=>[dst.j.nodes[i].name,k]));
 const active=new Map(pairs.map(d=>[d.name,0]));
 const surfaces=new Map(pairs.map(d=>[d.name,new Map()]));
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks']){
  const mesh=dst.j.meshes.find(m=>m.name===name).primitives[0];
  const ji=mesh.attributes.JOINTS_0,wi=mesh.attributes.WEIGHTS_0;
  const idx=accessor(dst,ji),weights=accessor(dst,wi);
  const byte=dst.j.accessors[wi].componentType===5121;
  for(let i=0;i<weights.length;i+=4){
   const sum=weights[i]+weights[i+1]+weights[i+2]+weights[i+3];
   assert.ok(Math.abs(sum-(byte?255:1))<1e-4,name+' skin sum at vertex '+i/4);
   for(let k=0;k<4;k++)assert.ok(idx[i+k]<60);
   for(const d of pairs)
    for(let k=0;k<4;k++)
     if(idx[i+k]===byId.get(d.name)&&weights[i+k]>(byte?0:1e-4)){
      active.set(d.name,active.get(d.name)+1);
      surfaces.get(d.name).set(name,(surfaces.get(d.name).get(name)||0)+1);break;
     }
  }
 }
 for(const [name,count] of active){
  assert.ok(count>=20,name+' must deform actual visible vertices: '+count);
  const part=name.split('_twist_')[0];
  const preferred={upperarm:'FooteraShirt',lowerarm:'FooteraBody',
    thigh:'FooteraShorts',calf:'FooteraSocks'}[part];
  assert.ok((surfaces.get(name).get(preferred)||0)>=8,
   name+' must deform its anatomical surface '+preferred);
 }
 const ibm=accessor(dst,dst.j.skins[0].inverseBindMatrices);
 assert.equal(ibm.length,60*16);
 assert.ok(ibm.every(Number.isFinite));
});
function fixture(){
 const root=new THREE.Group(),map=new Map();
 for(const d of FOOTERA_EVOLUTION_BONES){
  const b=new THREE.Bone();b.name=d.name;
  b.position.set(d.name.endsWith('_l')?-.02:.02, .15,0);
  (d.parent?map.get(d.parent):root).add(b);
  map.set(d.name,b);
 }
 for(const d of pairs){
  const b=new THREE.Bone();b.name=d.name;b.position.set(0,.08,0);
  map.get(d.parent).add(b);map.set(d.name,b);
 }
 return{root,map};
}
test('Twist correction counter-rotates parent axial motion only; no primary bones overwritten',()=>{
 const {root,map}=fixture(),report=inspectFooteraTwistRig(root,{requireSkin:false});
 assert.equal(report.ok,true);
 assert.equal(report.auxiliaryBones,8);
 const solver=createFooteraTwistSolver(root);
 const shoulder=map.get('upperarm_l'),twist=map.get('upperarm_twist_l');
 const orig=shoulder.quaternion.clone(),axis=map.get('lowerarm_l').position.clone().normalize();
 shoulder.quaternion.setFromAxisAngle(axis,Math.PI/2);
 solver.update();
 assert.ok(twist.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(axis,-Math.PI/4))<1e-6);
 assert.ok(shoulder.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(axis,Math.PI/2))<1e-6);
 const once=twist.quaternion.clone();solver.update();
 assert.ok(once.angleTo(twist.quaternion)<1e-6,'Repeated seek cannot accumulate twist');
 solver.reset();assert.ok(twist.quaternion.angleTo(new THREE.Quaternion())<1e-6);
 assert.equal(orig.angleTo(twist.quaternion),0);
});
test('Old 52-bone rig fails a mandatory twist-rig audit',()=>{
 const {root,map}=fixture();
 for(const d of pairs)map.get(d.name).removeFromParent();
 const result=inspectFooteraTwistRig(root,{requireSkin:false});
 assert.equal(result.ok,false);
 assert.equal(result.errors.filter(e=>e.startsWith('missing:')).length,8);
});
