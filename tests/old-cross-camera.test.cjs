const test=require('node:test'),assert=require('node:assert/strict');
test('V21.151: actual broadcast camera keeps crosser through release and full goal at finish',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),T=await import('../vendor/three/three.module.min.js');
 const sequences=M.PLAY_SEQUENCES.filter(s=>M.cameraDelivery(s));
 assert.ok(sequences.length>=20);
 for(const sequence of sequences)for(const direction of [-1,1])for(const width of [360,390,412]){
  const aspect=width/340,d=M.cameraDelivery(sequence),sample=M.createBroadcastCameraTrack({sequence,direction,aspect});
  const camera=new T.PerspectiveCamera(30,aspect,.1,250);
  const point=p=>new T.Vector3(...M.worldPosition(p,direction)).project(camera);
  let previous=null;
  for(let i=0;i<=130;i++){
   const time=i*.08,c=sample(time);assert.ok(c.position[0]>0,sequence+' fixed TV sideline');
   if(previous){assert.ok(Math.hypot(...c.target.map((v,j)=>v-previous.target[j]))<1.1,sequence+' smooth pan');assert.ok(Math.abs(c.fov-previous.fov)<.06,'no zoom pumping');}
   previous=c;
  }
  for(const time of [d.release-.35,d.release,d.release+.2,5.4,6.65]){
   const c=sample(time);camera.position.set(...c.position);camera.fov=c.fov;camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   if(time<=d.release+.2){
    const p=M.runPosition(d.passer,time,sequence);
    for(const y of [0,1.8]){const v=point([p[0],y,p[1]]);assert.ok(Math.abs(v.x)<.90&&Math.abs(v.y)<.90,`${sequence} ${direction}: crosser safe at ${time}`);}
   }
   if(time>=5.4)for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4]){const v=point([x,2.44,z]);assert.ok(Math.abs(v.x)<.98&&Math.abs(v.y)<.98,sequence+' entire goal visible');}
  }
 }
});
test('V21.151: pitch framing reduces far-side stands without changing new attack camera',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),T=await import('../vendor/three/three.module.min.js');
 const {createStableCameraTrack}=await import('../3d-camera-director.mjs');
 for(const sequence of ['wing_left','cutback_left','overlap_left_high']){
  const time=M.cameraDelivery(sequence).release,aspect=390/340;
  const before=createStableCameraTrack(t=>M.cameraState(1,t,aspect,'goal',sequence))(time),after=M.createBroadcastCameraTrack({sequence,direction:1,aspect})(time);
  const edge=s=>{const c=new T.PerspectiveCamera(s.fov,aspect,.1,250);c.position.set(...s.position);c.lookAt(...s.target);c.updateMatrixWorld();return new T.Vector3(-34,0,s.target[2]).project(c).y};
  assert.ok(edge(after)>edge(before)+.15,sequence+' less of screen above far touchline');
 }
 for(const sequence of ['layoff_distance','six_yard_square_left','diagonal_lob_finish','central'])assert.equal(M.cameraDelivery(sequence),null);
});
