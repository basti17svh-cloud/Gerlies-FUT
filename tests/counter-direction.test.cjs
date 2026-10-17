const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');
const sequence='extended_turnover_counter',time=seconds=>seconds/20*5.4;
test('counter reverses possession and forward travel without changing either team goal in any period',async()=>{
 const E=await import('../3d-extended-match.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const team of ['home','away'])for(const period of [1,2,3,4]){
  const other=team==='home'?'away':'home',direction=H.getAttackDirection(team,period),opponentDirection=H.getAttackDirection(other,period);
  const ball=seconds=>M.worldPosition(M.ballPosition('goal',time(seconds),sequence),direction);
  for(const [start,end,owner,dir] of [[0,2.6,9,opponentDirection],[4.6,7.8,8,opponentDirection],[8.4,12.8,6,direction],[15.1,16.9,1,direction],[19.02,19.05,0,direction]]){
   assert.equal(E.extendedControl(time(start),sequence).index,owner);
   assert.ok((ball(end)[2]-ball(start)[2])*(-dir)>0,`${team}/${period}: carrier ${owner} advances toward opponent goal`);
  }
  assert.equal(E.extendedPhase(sequence,0,team).team,other);
  assert.equal(E.extendedPhase(sequence,time(10),team).team,team);
  const finish=M.worldPosition(M.ballPosition('goal',6.65,sequence),direction);
  assert.ok(finish[2]*direction< -52.5,'shot enters opponent goal');
 }
});
test('counter uses the normal side-on broadcast rail with continuous mobile ball and goal coverage',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),T=await import('../vendor/three/three.module.min.js');
 for(const direction of [-1,1])for(const aspect of [.688,.748,.792,1.8])for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post']){
  const track=M.createBroadcastCameraTrack({direction,aspect,sequence,type}),camera=new T.PerspectiveCamera(32,aspect,.5,350);
  const normal=M.cameraState(direction,0,aspect,'goal','central'),rail=normal.position.map((v,i)=>(v-normal.target[i])/normal.distance);
  let last;
  for(let n=0;n<=104;n++){
   const t=n/10,c=track(t);
   assert.ok(Math.abs(c.distance-M.BROADCAST_CAMERA_DISTANCE)<1e-8);
   c.position.forEach((v,i)=>assert.ok(Math.abs((v-c.target[i])/c.distance-rail[i])<1e-8,'same touchline angle'));
   if(last)assert.ok(Math.hypot(...c.position.map((v,i)=>v-last[i]))<3,'no camera cut');last=c.position;
   camera.position.set(...c.position);camera.fov=c.fov;camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   const points=[M.ballPosition(type,t,sequence)];
   if(t>=5.4)points.push(...[-3.66,3.66].flatMap(x=>[-52.5,-54.4].map(z=>[x,2.44,z])));
   for(const p of points){const screen=new T.Vector3(...M.worldPosition(p,direction)).project(camera);assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,`${direction}/${aspect}/${t}: ball or goal cropped`)}
  }
 }
});
