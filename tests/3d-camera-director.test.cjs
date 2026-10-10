const test=require('node:test'),assert=require('node:assert/strict');
const maybe=async()=>await import('../3d-camera-director.mjs');
test('TV camera prevents sudden refocusing and lens pumping at scripted cuts',async()=>{
 const {createStableCameraTrack}=await maybe();
 const raw=t=>({position:[46,30,t<2.5?-20:-6],target:[t<2.5?-8:14,.9,t<2.5?-24:-40],fov:t<2.5?27.5:56,distance:46,phase:'build'});
 const sampled=createStableCameraTrack(raw,{duration:10.4});
 let last=sampled(0),max=0;
 for(let t=.025;t<=10.4;t+=.025){
  const now=sampled(t),shift=Math.hypot(...now.target.map((v,i)=>v-last.target[i]));
  assert.ok(shift<.55,'focus cannot jump after a sudden scripted camera target change');
  assert.ok(Math.abs(now.fov-last.fov)<.03,'lens must not pump on a frame');
  max=Math.max(max,shift);last=now;
 }
 assert.ok(max>0,'the lens and camera must not freeze');
 assert.deepEqual(sampled(2.5),sampled(2.5),'seek is deterministic');
 assert.deepEqual(sampled(6),sampled(6),'replay must not depend on frame order');
 assert.deepEqual(sampled(-1),sampled(0),'clip is clamped at start');
 assert.deepEqual(sampled(99),sampled(10.4),'clip is clamped at end');
});
test('Footera authored attacks use a close, stable camera from either direction',async()=>{
 const {createStableCameraTrack}=await maybe();
 const {cameraState}=await import('../3d-highlights-scene.mjs');
 for(const seq of ['central','through_ball','wing_left','wing_right','cutback_left','cutback_right','diagonal_switch','triangle_left','triangle_right','midfield_switch','overlap_left_high','inside_link_right']){
  for(const direction of [-1,1]){
   const frame=createStableCameraTrack(t=>cameraState(direction,t,1.1,'goal',seq));
   let prev=frame(0),minFov=100,maxFov=0;
   for(let i=1;i<=260;i++){
    const t=i*.04,cam=frame(t);
    for(const x of [...cam.position,...cam.target,cam.fov])assert.ok(Number.isFinite(x),seq+' camera values must be finite');
    assert.ok(cam.position[0]>30&&cam.position[1]>20,seq+' camera stays on same broadcast side');
    assert.ok(Math.hypot(...cam.target.map((v,j)=>v-prev.target[j]))<.75,seq+' camera cannot jerk between frames');
    assert.ok(Math.abs(cam.fov-prev.fov)<.05,seq+' no sudden zoom');
    assert.ok(cam.fov<=35.5&&cam.fov>=27.0,seq+' tight match framing');
    minFov=Math.min(minFov,cam.fov);maxFov=Math.max(maxFov,cam.fov);prev=cam;
   }
   assert.ok(maxFov-minFov<.5,seq+' zoom should not oscillate across a highlight');
  }
 }
});

test('V21.99: wing camera cannot rush closer than broadcast safety envelope',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 for(const aspect of [360/300,390/300,412/300])
  for(const sequence of ['wing_left','wing_right','reverse_cutback_left','switch_overlap_high'])
   for(const direction of [-1,1])for(const time of [0,2.7,4.3,5.1]){
    const c=S.cameraState(direction,time,aspect,'goal',sequence);
    const measured=Math.hypot(...c.position.map((v,i)=>v-c.target[i]));
    assert.ok(measured>=37.5,sequence+' time '+time+' measured '+measured);
    assert.ok(c.position[0]>0,'broadcast camera stays on the same sideline');
   }
});
