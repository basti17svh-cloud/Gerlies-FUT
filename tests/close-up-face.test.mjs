import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {faceUV,faceStyle,hairlineAt,FACE_NY_MIN} from '../3d-player-face.mjs';
import {splitAtlasSeams,extractFooteraHead} from '../3d-player-prototype.mjs';
import {footeraAtlasUV} from '../3d-rigged-footballer.mjs';

test('face UV wraps around the head with the face at u=0.5',()=>{
 assert.deepEqual(faceUV(0,FACE_NY_MIN,1),[.5,0]);
 assert.ok(Math.abs(faceUV(1,1,0)[0]-.75)<1e-9);
 assert.ok(faceUV(-.001,.95,-1)[0]<.01||faceUV(-.001,.95,-1)[0]>.99);
});

test('hairline: forehead highest, receding at the temples, nape lowest',()=>{
 assert.ok(hairlineAt(0)>hairlineAt(.6)&&hairlineAt(.6)>hairlineAt(.95));
 assert.ok(hairlineAt(Math.PI)<hairlineAt(0)-.08);
 for(let a=-Math.PI;a<=Math.PI;a+=.01){
  assert.ok(Math.abs(hairlineAt(a+.01)-hairlineAt(a))<.006,'no step at '+a);
  assert.equal(hairlineAt(a),hairlineAt(-a));
 }
});

test('face style is stable per player name',()=>{
 assert.deepEqual(faceStyle('Jamal Musiala'),faceStyle('Jamal Musiala'));
 const beards=new Set(['Kane','Musiala','Wirtz','Saka','Pedri','Rodri','Yamal','Mbappe'].map(n=>faceStyle(n).beard));
 assert.ok(beards.size>1);
});

function strip(zones){
 // UVs as the mount assigns them: each vertex in its own slot's tile.
 // A row of triangles across zones; one normalised point per vertex.
 const n=zones.length,positions=[],normalized=new Float32Array(n*3),index=[];
 for(let i=0;i<n;i++){positions.push(i,i%2,0);normalized.set([.3,.6+i*.01,.1],i*3)}
 for(let i=0;i+2<n;i++)index.push(i,i+1,i+2);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from(zones).flatMap((z,i)=>footeraAtlasUV(...normalized.slice(i*3,i*3+3),z)),2));
 g.setIndex(index);return{g,normalized};
}

test('shirt/sleeve triangles get one atlas slot; hems against skin stay as they are',()=>{
 const zones=new Uint8Array([0,0,4,4,2,2]);
 const {g,normalized}=strip(zones);
 const added=splitAtlasSeams(g,zones,normalized);
 // Triangles (0,0,4) and (0,4,4) are split; (4,4,2) and (4,2,2) are not.
 assert.equal(added,2);
 assert.equal(g.getAttribute('position').count,8);
 const idx=g.index.array;
 assert.deepEqual(Array.from(idx.slice(6,12)),[2,3,4,3,4,5]);
 for(let t=0;t<6;t+=3){
  const u=[0,1,2].map(k=>g.getAttribute('uv').getX(idx[t+k]));
  assert.ok(Math.max(...u)-Math.min(...u)<.1,'one tile per triangle');
 }
 assert.deepEqual(g.getAttribute('position').array.slice(18,21),g.getAttribute('position').array.slice(6,9));
});

test('the head moves into its own geometry with plain vertex colours',()=>{
 const n=400,positions=[],colors=[],heights=new Float32Array(n),zones=new Uint8Array(n).fill(2),normalized=new Float32Array(n*3),index=[];
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2,head=i>=100;
  positions.push(Math.sin(a),i,Math.cos(a));colors.push(.2,.2,.2);
  heights[i]=head?.95:.5;normalized.set([Math.sin(a)*.08,heights[i],Math.cos(a)*.08],i*3);
 }
 for(let i=0;i+2<n;i++)index.push(i,i+1,i+2);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(index);
 const face=extractFooteraHead(g,heights,zones,normalized);
 assert.ok(face);
 assert.equal(face.getAttribute('position').count%3,0);
 assert.equal(g.index.count+face.getAttribute('position').count,index.length);
 assert.ok(Array.from(face.getAttribute('color').array).every(v=>v===1));
 const uv=face.getAttribute('uv');
 for(let i=0;i<uv.count;i+=3){
  const u=[uv.getX(i),uv.getX(i+1),uv.getX(i+2)];
  assert.ok(Math.max(...u)-Math.min(...u)<.5,'no triangle smears across the back seam');
 }
});
