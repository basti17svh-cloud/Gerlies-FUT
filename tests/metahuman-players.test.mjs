import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// V21.436 MetaHuman body (tools/build-footera-metahuman.py from Basti's own
// MetaHuman, DNA export of Unreal 5.8). It replaces the Man Player body for the
// men and must be a drop-in: same bones, mesh names, kit layout, face morphs.
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
const meta=readGlb('assets/footera/models/footera-metahuman.glb'),real=readGlb('assets/footera/models/footera-real.glb');
const human=readGlb('assets/footera/models/footera-humans.glb');
const info=meta.json.extras.footera;
const mesh=name=>meta.json.meshes.find(m=>m.name===name);

test('metahuman GLB: credited, mobile-sized, every part of the realistic body',()=>{
 assert.match(info.metahuman,/MetaHuman/);
 assert.match(info.credit,/man-player-4c7133dbb06e4136891d59231372d818/,'boots still from the CC-BY Man Player');
 assert.ok(meta.bytes<8e6,'GLB stays under 8 MB: '+meta.bytes);
 const names=meta.json.meshes.map(m=>m.name);
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes','FooteraCornea','FooteraDetail','FooteraLashes'])
  assert.ok(names.includes(name),name);
 const mh=human.json.extras.footera;
 for(const hair of [...mh.hair,...mh.hairFemale,...mh.hairSpecial])assert.ok(names.includes('FooteraHair-'+hair),hair);
 for(const beard of mh.facial)assert.ok(names.includes('FooteraFacial-'+beard),beard);
 for(const brow of mh.brows)assert.ok(names.includes('FooteraBrows-'+brow),brow);
 assert.notEqual(info.skins.light,info.skins.dark);
 assert.ok(info.skinMean.dark[0]<.5&&info.skinMean.light[0]>.6);
});

test('metahuman GLB: same bones in the same order as both other bodies',()=>{
 assert.deepEqual(info.bones,human.json.extras.footera.bones);
 const names=j=>j.skins[0].joints.map(i=>j.nodes[i].name);
 assert.deepEqual(names(meta.json),names(real.json));
});

test('metahuman GLB: face morphs move only the head',()=>{
 const body=mesh('FooteraBody'),prim=body.primitives[0],names=body.extras.targetNames;
 for(const key of ['race_african','head_square','jaw_width','nose_width'])assert.ok(names.includes(key),key);
 const pos=meta.accessor(prim.attributes.POSITION);
 for(const [k,key] of names.entries()){
  const acc=meta.json.accessors[prim.targets[k].POSITION],raw=meta.accessor(prim.targets[k].POSITION);
  const d=acc.normalized?Float32Array.from(raw,v=>v/32767):raw;let moved=0,low=Infinity;
  for(let v=0;v<d.length/3;v++){const m=Math.hypot(d[v*3],d[v*3+1],d[v*3+2]);if(m>.001){moved++;low=Math.min(low,pos[v*3+1])}}
  if(key!=='lips_volume')assert.ok(moved>10,key+' moves the face: '+moved);
  assert.ok(low>1.35,key+' stays on the head ('+low.toFixed(2)+' m)');
 }
});

test('metahuman GLB: kit in its canvas bands and painted area, shirt over the shorts',()=>{
 const bands=info.kitBands;
 for(const [name,band] of [['FooteraShirt',bands.shirt],['FooteraShorts',bands.shorts],['FooteraSocks',bands.socks]]){
  const uv=meta.accessor(mesh(name).primitives[0].attributes.TEXCOORD_0);
  for(let i=1;i<uv.length;i+=2)assert.ok(uv[i]>=band[0]-1e-4&&uv[i]<=band[1]+1e-4,name+' v in band');
 }
 // The kit painter draws sponsor (1.21 m), crest (1.365 m) and collar (1.5 m)
 // in metres: the shirt must span them.
 const [,top,bottom]=info.kitMetres.shirt;
 assert.ok(top>1.5&&bottom<1.1,'shirt spans the painted kit: '+top+'..'+bottom);
 const y=name=>{const p=meta.accessor(mesh(name).primitives[0].attributes.POSITION);let lo=Infinity,hi=-Infinity;
  for(let i=1;i<p.length;i+=3){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i])}return[lo,hi]};
 const shirt=y('FooteraShirt'),shorts=y('FooteraShorts');
 assert.ok(shirt[0]<shorts[1],'shirt hem overlaps the waistband (no bare belly)');
 assert.ok(shorts[0]<.75,'shorts reach the thighs: '+shorts[0].toFixed(2));
 assert.ok(info.captainBand&&info.captainBand.shoulder.length===2);
});

test('runtime: MetaHuman first, Man Player as fallback, own opt-out',()=>{
 const src=fs.readFileSync(path.join(root,'3d-player-human.mjs'),'utf8');
 assert.match(src,/footera-metahuman\.glb\?v=\d+/);
 assert.match(src,/footera-3d-metahuman'\)!=='0'/);
 // V21.441: tries MetaHuman, then Man Player, after the MakeHuman squad is ready.
 assert.match(src,/\[\[METAHUMAN_URL\.href,'metahuman'\],\[REAL_URL\.href,'real'\]\]/);
 assert.ok(src.indexOf("source=human;status.state='ready'")<src.indexOf('realPending=(async'),'MakeHuman squad ready before the men\'s body loads');
 assert.doesNotMatch(src,/Promise\.all\(\[load\(HUMAN_URL/);
});
