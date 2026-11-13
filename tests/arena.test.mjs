// V21.382 Flutlicht-Arena: pure layout rules of the night stadium and its wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {arenaPerimeter,floodlightShadow,arenaFlashLevel,FLOODLIGHTS} from '../3d-arena.mjs';
import {ceremonyCamera,CEREMONY_ARENA_SHOT,CEREMONY_CUT} from '../3d-ceremony.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('the bowl is a closed rounded rectangle outside the lower stands',()=>{
 for(const radius of [15.5,21.2,34]){
  const {points,length}=arenaPerimeter(radius),first=points[0],last=points.at(-1);
  assert.ok(Math.hypot(first.x-last.x,first.z-last.z)<1e-9,'closed');
  assert.ok(Math.abs(length-(2*Math.PI*radius+2*74+2*114.2))<1,'perimeter length '+length);
  for(const p of points){
   assert.ok(Math.abs(p.x)<=37+radius+1e-9&&Math.abs(p.z)<=57.1+radius+1e-9);
   // Never inside the pitch-side rail of the lower tier.
   assert.ok(Math.abs(p.x)>=37||Math.abs(p.z)>=57.1);
   assert.ok(Math.abs(Math.hypot(p.nx,p.nz)-1)<1e-9);
  }
 }
});

test('every player gets four floodlight shadows pointing away from the corners',()=>{
 assert.equal(FLOODLIGHTS.length,4);
 for(const [x,z] of [[0,0],[20,-40],[-33,52],[5,-51]]){
  let sx=0,sz=0;
  for(const light of FLOODLIGHTS){
   const s=floodlightShadow(light,x,z);
   assert.ok(Math.abs(Math.hypot(s.dirX,s.dirZ)-1)<1e-9);
   assert.ok(s.dirX*(x-light[0])+s.dirZ*(z-light[2])>0,'away from the lamp');
   assert.ok(s.length>.5&&s.length<=4.2,'readable but never across the pitch: '+s.length);
   sx+=s.dirX*s.length;sz+=s.dirZ*s.length;
  }
  if(!x&&!z)assert.ok(Math.hypot(sx,sz)<1e-9,'a symmetric cross on the centre spot');
 }
 // Further from a lamp means a longer shadow.
 assert.ok(floodlightShadow(FLOODLIGHTS[0],-30,-50).length>floodlightShadow(FLOODLIGHTS[0],30,50).length);
});

test('camera flashes: a few all the time, a burst right after a goal that fades again',()=>{
 assert.equal(arenaFlashLevel(3,null),.16);
 assert.equal(arenaFlashLevel(3,6.4),.16);
 assert.ok(arenaFlashLevel(6.9,6.4)>.95);
 assert.ok(arenaFlashLevel(9.5,6.4)<arenaFlashLevel(8,6.4));
 assert.ok(Math.abs(arenaFlashLevel(12,6.4)-.16)<1e-9);
 for(let t=0;t<12;t+=.05){const v=arenaFlashLevel(t,6.4);assert.ok(v>=.16&&v<=1)}
});

test('the walk-out opens with the stadium shot: from above the roof down into the bowl',()=>{
 // V21.406 (Basti: "vor dem Spiel soll man das Stadion sehen"): 3.4 s instead of 1.7 s.
 assert.ok(CEREMONY_ARENA_SHOT>=3&&CEREMONY_ARENA_SHOT<=CEREMONY_CUT.kickoff-2,'the walk-out keeps time');
 const first=ceremonyCamera('kickoff',0);assert.ok(first.position[1]>90,'starts high above the roof (33.6 m)');
 let prev=Infinity;
 for(let t=0;t<CEREMONY_ARENA_SHOT;t+=.1){
  const c=ceremonyCamera('kickoff',t);assert.equal(c.phase,'arena');
  assert.ok(c.position[1]<=prev+1e-9,'only descends');prev=c.position[1];
  assert.ok(c.position[0]>1,'broadcast side');
 }
 // Ends where the old opening shot was: above the lower tier, inside the bowl.
 const last=ceremonyCamera('kickoff',CEREMONY_ARENA_SHOT-.01);
 assert.ok(last.position[1]>18&&last.position[1]<28);
 assert.ok(Math.hypot(last.position[0]-37,last.position[2]-57.1)<15.5);
 assert.equal(ceremonyCamera('kickoff',CEREMONY_ARENA_SHOT+.01).phase,'walkout');
 assert.equal(ceremonyCamera('kickoff',CEREMONY_CUT.kickoff+.5).phase,'lineup');
 assert.notEqual(ceremonyCamera('fulltime',.5).phase,'arena');
});

test('arena is wired into the scene, versioned and cached offline',()=>{
 const scene=read('3d-highlights-scene.mjs'),sw=read('service-worker.js'),hl=read('3d-highlights.js'),arena=read('3d-arena.mjs');
 assert.match(scene,/from '\.\/3d-arena\.mjs\?v=21410'/);
 assert.match(scene,/footera-3d-arena'\)!=='0'/,'opt-out flag');
 assert.equal(scene.match(/arena\?\.update\(time,camera\)/g).length,2,'match scene and ceremony both update it');
 const version=hl.match(/3d-highlights-scene\.mjs\?v=(\d+)/)[1];
 for(const f of ['./3d-arena.mjs?v=21410','./3d-highlights-scene.mjs?v='+version,'./3d-ceremony.mjs?v=21410'])assert.ok(sw.includes(`"${f}"`),f);
 // Deterministic: no clock and no RNG inside the module.
 assert.ok(!/Math\.random|Date\.now|performance\.now/.test(arena));
});
