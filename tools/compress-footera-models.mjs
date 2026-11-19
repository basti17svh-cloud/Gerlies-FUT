/* Footera V21.479: smaller 3D player models for phones (glTF-Transform +
 * meshoptimizer, both MIT). Writes assets/footera/models/compressed/<name>.glb
 * next to the source GLBs, which stay unchanged (the build tools and tests
 * read those). Compression is LOSSLESS on purpose: no quantisation and no
 * vertex reordering, so every position, morph delta, weight and index the
 * game reads (pos.array, hair-cap welding, extras.footera texture indices)
 * is bit-for-bit the same; only the bytes on the wire shrink. The script
 * checks that itself by decoding the result and comparing every accessor.
 *
 *   node tools/compress-footera-models.mjs          (writes + verifies)
 *   node tools/compress-footera-models.mjs --check  (verify only)
 *
 * Needs once: npm i --no-save @gltf-transform/core@4.5.1
 *   @gltf-transform/extensions@4.5.1 meshoptimizer@1.3.0
 * Re-run after any tools/build-footera-*.py rebuild of these models.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SRC=path.join(ROOT,'assets/footera/models');
const OUT=path.join(SRC,'compressed');
export const FOOTERA_COMPRESSED_MODELS=['footera-humans','footera-real','footera-metahuman'];

await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
 .registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});

const fingerprint=doc=>{
 const root=doc.getRoot(),out={extras:JSON.stringify(root.getExtras()),accessors:new Map(),textures:[]};
 for(const mesh of root.listMeshes())mesh.listPrimitives().forEach((prim,p)=>{
  const key=`${mesh.getName()}#${p}`;
  for(const sem of prim.listSemantics())out.accessors.set(`${key}.${sem}`,prim.getAttribute(sem));
  if(prim.getIndices())out.accessors.set(`${key}.indices`,prim.getIndices());
  prim.listTargets().forEach((t,i)=>{for(const sem of t.listSemantics())out.accessors.set(`${key}.t${i}.${sem}`,t.getAttribute(sem))});
 });
 for(const skin of root.listSkins())if(skin.getInverseBindMatrices())out.accessors.set(`skin:${skin.getName()}`,skin.getInverseBindMatrices());
 root.listAnimations().forEach((a,i)=>a.listSamplers().forEach((s,j)=>{
  out.accessors.set(`anim${i}.${j}.in`,s.getInput());out.accessors.set(`anim${i}.${j}.out`,s.getOutput());
 }));
 for(const tex of root.listTextures())out.textures.push(Buffer.from(tex.getImage()||[]).toString('base64').length+':'+tex.getMimeType());
 out.nodes=root.listNodes().map(n=>n.getName()+'|'+n.getTranslation()+'|'+n.getRotation()+'|'+n.getScale()).join(';');
 out.materials=root.listMaterials().map(m=>m.getName()+'|'+m.getAlphaMode()+'|'+m.getDoubleSided()).join(';');
 return out;
};
const same=(a,b)=>{
 if(a.extras!==b.extras)return 'root extras differ';
 if(a.nodes!==b.nodes)return 'nodes differ';
 if(a.materials!==b.materials)return 'materials differ';
 if(a.textures.join()!==b.textures.join())return 'textures differ';
 if(a.accessors.size!==b.accessors.size)return `accessor count ${a.accessors.size} vs ${b.accessors.size}`;
 for(const [key,x] of a.accessors){
  const y=b.accessors.get(key);
  if(!y)return 'missing '+key;
  if(x.getType()!==y.getType()||x.getComponentType()!==y.getComponentType()||x.getNormalized()!==y.getNormalized())return 'layout differs '+key;
  const ax=x.getArray(),ay=y.getArray();
  if(ax.length!==ay.length)return 'length differs '+key;
  if(key.endsWith('.indices')){
   // The meshopt index codec may rotate a triangle (a,b,c)->(b,c,a): same winding, same edges.
   for(let t=0;t<ax.length;t+=3){const x=[ax[t],ax[t+1],ax[t+2]],y=[ay[t],ay[t+1],ay[t+2]]+'';
    if(x+''!==y&&[x[1],x[2],x[0]]+''!==y&&[x[2],x[0],x[1]]+''!==y)return 'triangle differs '+key}
  }else if(!Buffer.from(ax.buffer,ax.byteOffset,ax.byteLength).equals(Buffer.from(ay.buffer,ay.byteOffset,ay.byteLength)))return 'data differs '+key;
 }
 return '';
};


// V21.486 (Basti: "Männchen sind blau"): glTF-Transform writes a texture
// slot only for images a material uses and renumbers the rest, but
// extras.footera.skins names skin textures by their slot in the source GLB
// (the extra skin tones sit in no material). After writing, the texture list
// is copied back from the source (same images, same order) and the material
// references are renumbered to it, so every texture index means the same
// picture as before.
export function keepTextureSlots(srcFile,dstFile){
 const read=file=>{const b=fs.readFileSync(file),n=b.readUInt32LE(12);return{b,n,json:JSON.parse(b.subarray(20,20+n).toString())}};
 const src=read(srcFile).json,dst=read(dstFile);
 const images=list=>(list||[]).length;
 if(images(src.images)!==images(dst.json.images))throw new Error('image count differs '+dstFile);
 if(!(src.textures||[]).every((t,i)=>t.source===i))throw new Error('source texture slots are not 1:1 with images '+srcFile);
 const old=dst.json.textures||[];
 const walk=node=>{
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){node.forEach(walk);return}
  for(const [key,value] of Object.entries(node)){
   if(/Texture$/.test(key)&&value&&typeof value.index==='number')value.index=old[value.index].source;
   else walk(value);
  }
 };
 walk(dst.json.materials);
 dst.json.textures=src.textures.map(t=>({...t}));
 let text=JSON.stringify(dst.json);while(Buffer.byteLength(text)%4)text+=' ';
 const json=Buffer.from(text),rest=dst.b.subarray(20+dst.n),head=Buffer.alloc(20);
 head.write('glTF',0);head.writeUInt32LE(2,4);head.writeUInt32LE(20+json.length+rest.length,8);
 head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4E4F534A,16);
 fs.writeFileSync(dstFile,Buffer.concat([head,json,rest]));
}

const checkOnly=process.argv.includes('--check');
fs.mkdirSync(OUT,{recursive:true});
let failed=false;
for(const name of FOOTERA_COMPRESSED_MODELS){
 const src=path.join(SRC,name+'.glb'),dst=path.join(OUT,name+'.glb');
 if(!checkOnly){
  const doc=await io.read(src);
  doc.createExtension(EXTMeshoptCompression).setRequired(true)
   .setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  await io.write(dst,doc);
  keepTextureSlots(src,dst);
 }
 const problem=same(fingerprint(await io.read(src)),fingerprint(await io.read(dst)));
 const a=fs.statSync(src).size,b=fs.statSync(dst).size;
 console.log(`${name}: ${(a/1e6).toFixed(2)} MB -> ${(b/1e6).toFixed(2)} MB (${Math.round(100-b/a*100)}% smaller) ${problem?'FAIL '+problem:'identical'}`);
 if(problem)failed=true;
}
if(failed)process.exit(1);
