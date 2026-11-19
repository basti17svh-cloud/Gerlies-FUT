import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MeshoptDecoder} from '../vendor/three/meshopt_decoder.mjs';

// V21.480: the three player bodies ship meshopt-compressed
// (tools/compress-footera-models.mjs). Decoded with the very decoder the game
// loads, every accessor must equal the source GLB (indices may only rotate
// inside a triangle, which keeps winding and edges), so nothing the 3D code
// reads can change.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const TYPES={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array,5122:Int16Array,5120:Int8Array};
function parse(file){
 const b=fs.readFileSync(path.join(root,file)),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString());
 const bin=b.subarray(20+n+8,20+n+8+b.readUInt32LE(20+n));
 return{json,bin,bytes:b.length};
}
function views({json,bin}){
 return json.bufferViews.map(v=>{
  const ext=v.extensions?.EXT_meshopt_compression;
  if(!ext)return bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
  const src=bin.subarray(ext.byteOffset||0,(ext.byteOffset||0)+ext.byteLength);
  const out=new Uint8Array(ext.count*ext.byteStride);
  MeshoptDecoder.decodeGltfBuffer(out,ext.count,ext.byteStride,src,ext.mode,ext.filter);
  return out;
 });
}
function accessor(glb,decoded,i){
 const a=glb.json.accessors[i],size=SIZE[a.type],T=TYPES[a.componentType],out=new T(a.count*size);
 const read=(index,offset,count,Type,comps)=>{
  const v=glb.json.bufferViews[index],data=decoded[index],el=Type.BYTES_PER_ELEMENT,stride=v.byteStride||el*comps;
  const dv=new DataView(data.buffer,data.byteOffset,data.byteLength),res=new Type(count*comps);
  for(let k=0;k<count;k++)for(let c=0;c<comps;c++){
   const at=(offset||0)+k*stride+c*el;
   res[k*comps+c]=Type===Float32Array?dv.getFloat32(at,true):Type===Uint32Array?dv.getUint32(at,true):Type===Uint16Array?dv.getUint16(at,true):Type===Int16Array?dv.getInt16(at,true):Type===Int8Array?dv.getInt8(at):dv.getUint8(at);
  }
  return res;
 };
 if(a.bufferView!=null)out.set(read(a.bufferView,a.byteOffset,a.count,T,size));
 if(a.sparse){
  const s=a.sparse,ix=read(s.indices.bufferView,s.indices.byteOffset,s.count,TYPES[s.indices.componentType],1);
  const val=read(s.values.bufferView,s.values.byteOffset,s.count,T,size);
  ix.forEach((v,k)=>{for(let c=0;c<size;c++)out[v*size+c]=val[k*size+c]});
 }
 return out;
}
function contents(file){
 const glb=parse(file),decoded=views(glb),out=new Map();
 for(const mesh of glb.json.meshes)mesh.primitives.forEach((p,j)=>{
  const key=mesh.name+'#'+j;
  for(const [sem,i] of Object.entries(p.attributes))out.set(key+'.'+sem,accessor(glb,decoded,i));
  if(p.indices!=null)out.set(key+'.indices',accessor(glb,decoded,p.indices));
  (p.targets||[]).forEach((t,k)=>{for(const [sem,i] of Object.entries(t))out.set(key+'.t'+k+'.'+sem,accessor(glb,decoded,i))});
 });
 for(const skin of glb.json.skins||[])out.set('skin:'+skin.name,accessor(glb,decoded,skin.inverseBindMatrices));
 const images=(glb.json.images||[]).map(img=>{const v=glb.json.bufferViews[img.bufferView];return decoded[img.bufferView].length+':'+img.mimeType+':'+v.byteLength});
 return{glb,out,images};
}
const sameTriangles=(a,b)=>{
 if(a.length!==b.length)return false;
 for(let t=0;t<a.length;t+=3){
  const x=[a[t],a[t+1],a[t+2]],y=[b[t],b[t+1],b[t+2]];
  if(!(x+''===y+''||[x[1],x[2],x[0]]+''===y+''||[x[2],x[0],x[1]]+''===y+''))return false;
 }
 return true;
};

for(const name of ['footera-humans','footera-real','footera-metahuman']){
 test(`${name}: compressed copy decodes to the same model`,async()=>{
  await MeshoptDecoder.ready;
  const src=contents(`assets/footera/models/${name}.glb`),dst=contents(`assets/footera/models/compressed/${name}.glb`);
  assert.ok(dst.glb.json.extensionsRequired.includes('EXT_meshopt_compression'));
  assert.ok(dst.glb.bytes<src.glb.bytes*0.85,`only ${dst.glb.bytes} vs ${src.glb.bytes} bytes`);
  assert.deepEqual(dst.glb.json.extras,src.glb.json.extras,'extras.footera (skin texture indices) unchanged');
  assert.deepEqual(dst.glb.json.nodes.map(n=>n.name),src.glb.json.nodes.map(n=>n.name));
  assert.deepEqual(dst.glb.json.materials.map(m=>m.name),src.glb.json.materials.map(m=>m.name));
  assert.deepEqual(dst.images,src.images,'textures byte-identical and in the same order');
  assert.deepEqual([...dst.out.keys()].sort(),[...src.out.keys()].sort());
  for(const [key,a] of src.out){
   const b=dst.out.get(key);
   if(key.endsWith('.indices'))assert.ok(sameTriangles(a,b),key);
   else assert.ok(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)),key);
  }
 });
}

test('the game loads the compressed bodies and falls back to the originals',()=>{
 const src=fs.readFileSync(path.join(root,'3d-player-human.mjs'),'utf8');
 assert.match(src,/import\('\.\/vendor\/three\/meshopt_decoder\.mjs'\)/);
 assert.match(src,/setMeshoptDecoder\(meshopt\)\.loadAsync\(url\.replace\('\/models\/footera-','\/models\/compressed\/footera-'\)\)/);
 assert.match(src,/return new GLTFLoader\(\)\.loadAsync\(url\)/);
 assert.ok(fs.readFileSync(path.join(root,'service-worker.js'),'utf8').includes('"./vendor/three/meshopt_decoder.mjs"'));
});
