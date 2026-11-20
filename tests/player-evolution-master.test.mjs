import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function glb(name){
 const bytes=fs.readFileSync(path.join(root,'assets/footera/models',name));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const size=bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.subarray(20,20+size).toString());
 const binary=bytes.subarray(20+size+8);
 return{bytes,json,binary};
}
function access(g,i){
 const a=g.json.accessors[i],v=g.json.bufferViews[a.bufferView];
 const types={5126:Float32Array,5121:Uint8Array,5123:Uint16Array,5125:Uint32Array};
 const T=types[a.componentType],size={VEC3:3,VEC4:4,SCALAR:1}[a.type];
 const start=g.binary.byteOffset+v.byteOffset+(a.byteOffset||0),count=a.count*size;
 return new T(g.binary.buffer.slice(start,start+count*T.BYTES_PER_ELEMENT));
}
const orig=glb('footera-metahuman.glb'),newOne=glb('footera-evolution-master.glb');
const mesh=(g,n)=>g.json.meshes.find(m=>m.name===n).primitives[0];

test('independent asset, 52-bone contract, licensing information preserved',()=>{
 assert.ok(newOne.bytes.length<9e6,'mobile file size under 9MB');
 assert.notDeepEqual(newOne.bytes,orig.bytes);
 const e=newOne.json.extras.footera;
 assert.match(e.evolution.version,/step2-master/);
 assert.equal(e.evolution.bones,52);
 assert.match(e.metahuman,/MetaHuman/);
 assert.match(e.credit,/RiverofCreative/);
 assert.deepEqual(e.bones,orig.json.extras.footera.bones);
 const joints=g=>g.json.skins[0].joints.map(i=>g.json.nodes[i].name);
 assert.deepEqual(joints(newOne),joints(orig));
});
test('face morphs and source textures retained; no removed clothes',()=>{
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes','FooteraLashes']){
  assert.ok(newOne.json.meshes.some(m=>m.name===name),name);
 }
 assert.deepEqual(newOne.json.images,orig.json.images);
 assert.deepEqual(mesh(newOne,'FooteraBody').targets,mesh(orig,'FooteraBody').targets);
});
test('separate mesh sculpt, subtle cloth geometry and safe skin weights',()=>{
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks']){
  const before=access(orig,mesh(orig,name).attributes.POSITION);
  const after=access(newOne,mesh(newOne,name).attributes.POSITION);
  assert.equal(before.length,after.length);
  const deltas=[];
  for(let i=0;i<before.length;i+=3){
   const diff=Math.hypot(before[i]-after[i],before[i+1]-after[i+1],before[i+2]-after[i+2]);
   if(diff>1e-4)deltas.push(diff);
   assert.ok(diff<.03,name+' anatomy displacement under 3 cm');
  }
  assert.ok(deltas.length>100,name+' must genuinely change mesh geometry: '+deltas.length);
 }
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots']){
  const accessorIndex=mesh(newOne,name).attributes.WEIGHTS_0;
  const weights=access(newOne,accessorIndex);
  const isByte=newOne.json.accessors[accessorIndex].componentType===5121;
  for(let i=0;i<weights.length;i+=4){
   const sum=weights[i]+weights[i+1]+weights[i+2]+weights[i+3];
   assert.ok(Math.abs(sum-(isByte?255:1))<1e-4,
    name+' normalized weights at vertex '+(i/4)+': '+sum);
  }
 }
});
