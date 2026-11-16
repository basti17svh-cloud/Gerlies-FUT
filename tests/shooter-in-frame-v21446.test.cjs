'use strict';
// V21.446 (Basti 17.11.2026, Yamal volley): "der Schütze im Moment des Schusses nicht zu sehen
// weil die Kamera position doof ist". The TV camera now holds the scorer, boots to head, through
// the strike and still brings the whole goal in before the ball arrives.
const test=require('node:test');
const assert=require('node:assert/strict');

test('V21.446: the scorer is in the picture at the moment of the shot, the goal at the finish',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs'),THREE=await import('../vendor/three/three.module.min.js');
 const cam=new THREE.PerspectiveCamera(),v=new THREE.Vector3();
 const far=['dream_rocket_dip','dream_knuckle_right','dream_layoff_volley','layoff_distance','halfspace_set_and_drive','switch_distance_left','trailing_midfielder_hit','edge_rocket'];
 const ids=[...new Set([...far,...P.PLAYBOOK_IDS.filter((_,i)=>i%6===0)])].filter(id=>!P.DEFENSIVE_SCENES.includes(id));
 for(const id of ids){
  const fin=P.getPlay(id).finish;
  for(const aspect of [1,1.21])for(const direction of [1,-1]){
   const track=M.createBroadcastCameraTrack({direction,aspect,type:'goal',sequence:id,finish:fin});
   const view=t=>{const f=track(t);cam.fov=f.fov;cam.aspect=aspect;cam.near=.1;cam.far=300;cam.position.set(...f.position);cam.lookAt(...f.target);cam.updateProjectionMatrix();cam.updateMatrixWorld();
    return p=>{v.set(...M.worldPosition(p,direction)).project(cam);return Math.max(Math.abs(v.x),Math.abs(v.y))}};
   for(let t=M.SHOT_TIME-.4;t<=M.SHOT_TIME+.1;t+=.05){
    const see=view(t),r=M.runPosition(0,t,id);
    for(const y of [0,1.85])assert.ok(see([r[0],y,r[1]])<.95,`scorer out of frame: ${id} aspect ${aspect} dir ${direction} t ${t.toFixed(2)}`);
   }
   const see=view(M.IMPACT_TIME);
   for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4])assert.ok(see([x,2.44,z])<1,`goal out of frame: ${id} ${aspect} ${direction}`);
  }
 }
});
