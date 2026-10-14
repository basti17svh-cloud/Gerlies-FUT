const test=require('node:test'),assert=require('node:assert/strict');
const H=require('../3d-highlights.js');
test('V21.146: new attacks reach their actual shooter continuously for every result and direction',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs');
 assert.equal(P.NEW_ATTACK_IDS.length,12);
 const endpoints=new Set();
 for(const id of P.NEW_ATTACK_IDS){
  const plan=P.getPlay(id),registered=H.PLAYBOOK_SCENES.find(p=>p.id===id);
  assert.deepEqual([registered.family,registered.finish,registered.seconds],[plan.family,plan.finish,plan.seconds]);
  const shooter=M.runPosition(0,M.SHOT_TIME,id);endpoints.add(JSON.stringify(shooter));
  const touches=P.playTouches(plan);
  for(let i=0;i<touches.length;i++)assert.ok(touches[i].release<(touches[i].arrival)&&(!i||touches[i].release>touches[i-1].arrival));
  for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post'])for(const side of [-1,1]){
   const placement={side,zone:'corner',height:'high'},contact=M.shotContact(id,plan.finish,placement);
   assert.ok(Math.hypot(contact[0]-shooter[0],contact[2]-shooter[1])<1,id+' contact at shooter');
   assert.deepEqual(M.ballPosition(type,5.4,id,plan.finish,'classic',placement),contact);
   for(const time of [...touches.flatMap(t=>[t.release,t.arrival]),5.14,5.15,5.4,6.65]){
    const before=M.ballPosition(type,time-.00001,id,plan.finish,'classic',placement),after=M.ballPosition(type,time+.00001,id,plan.finish,'classic',placement);
    assert.ok(Math.hypot(...before.map((v,i)=>v-after[i]))<.02,id+' continuous ball at '+time);
   }
  }
 }
 assert.ok(endpoints.size>=11,'distinct shot locations');
 for(const id of ['layoff_distance','switch_distance_left','edge_pullback_right'])assert.ok(M.runPosition(0,5.4,id)[1]>-36,'outside penalty box');
 for(const id of ['near_post_driven_left','near_post_header_right']){
  const p=P.getPlay(id),last=P.playTouches(p).at(-1),from=P.playPosition(last.passer,last.release,p),to=P.playPosition(0,5.4,p);
  assert.equal(Math.sign(from[0]),Math.sign(to[0]),'near post on delivery side');assert.ok(to[1]<-44);
 }
 for(const id of ['six_yard_square_left','counter_square_right']){
  const p=P.getPlay(id),last=P.playTouches(p).at(-1),from=P.playPosition(last.passer,last.release,p),to=P.playPosition(0,5.4,p);
  assert.ok(from[0]*to[0]<0&&Math.abs(from[1]-to[1])<3,'square pass across goal');
 }
});
test('V21.146: every new attack is reachable in normal selection; phone camera keeps ball visible',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs'),T=await import('../vendor/three/three.module.min.js');
 const seen=new Set();
 for(let i=0;i<5000;i++)seen.add(H.choosePresentation({id:'new-attacks-'+i,type:'goal',team:'home',minute:i%90,playerName:'ST',creatorName:'ZM',creationType:'assist'}).sequence);
 for(const id of P.NEW_ATTACK_IDS){
  assert.ok(seen.has(id),id+' selected in production');
  const p=P.getPlay(id);
  for(const dir of [-1,1])for(const width of [360,390,412])for(const time of [0,.8,2.2,3.8,4.8,5.4,6.65]){
   const aspect=width/340,c=M.cameraState(dir,time,aspect,'goal',id,p.finish),camera=new T.PerspectiveCamera(c.fov,aspect,.1,250);
   camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   const b=new T.Vector3(...M.worldPosition(M.ballPosition('goal',time,id,p.finish),dir)).project(camera);
   assert.ok(Math.abs(b.x)<.98&&Math.abs(b.y)<.98&&b.z<1,`${id} ${dir} ${width} at ${time}: ball visible`);
   if(time>=4.8)for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4]){
    const roof=new T.Vector3(...M.worldPosition([x,2.44,z],dir)).project(camera);
    assert.ok(Math.abs(roof.x)<.98&&Math.abs(roof.y)<.98,`${id}: entire goal visible before shot`);
   }
  }
 }
});
