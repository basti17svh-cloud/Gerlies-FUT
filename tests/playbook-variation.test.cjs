const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const importPlaybook=()=>import('../3d-playbook.mjs');
test('V21.86: thirty distinct authored attacking sequences, not just different labels',async()=>{
 const {PLAYBOOK,getPlay,PLAYBOOK_IDS,playTouches}=await importPlaybook();
 assert.equal(PLAYBOOK.length,60);
 assert.equal(new Set(PLAYBOOK_IDS).size,60);
 assert.ok(PLAYBOOK.every(p=>p.order.length>=2&&p.order.at(-1)===0&&p.seconds>=9&&p.seconds<=20));
 assert.ok(new Set(PLAYBOOK.map(p=>p.order.join(','))).size>=18);
 assert.ok(PLAYBOOK.every(p=>playTouches(p).length===p.order.length-1));
 for(const id of PLAYBOOK_IDS)assert.equal(getPlay(id).id,id);
});
test('V21.86: ball flight reaches the actual animated passer and receiver in every sequence',async()=>{
 const {PLAYBOOK,playTouches,playBall,playPosition}=await importPlaybook(),contact=[.105,.17,-37.25];
 for(const p of PLAYBOOK){
  const {shotContact}=await import('../3d-highlights-scene.mjs');
  const contact=shotContact(p.id,p.finish);
  for(const beat of playTouches(p)){
   const from=playBall(p,beat.release,contact),to=playBall(p,beat.arrival-.00001,contact);
   const origin=playPosition(beat.passer,beat.release,p),receiver=playPosition(beat.receiver,beat.arrival,p);
   assert.ok(Math.hypot(from[0]-origin[0],from[2]-origin[1])<.70,p.id+' pass release');
   assert.ok(Math.hypot(to[0]-receiver[0],to[2]-receiver[1])<.9,p.id+' pass receipt');
   const mid=playBall(p,(beat.release+beat.arrival)/2,contact);
   assert.ok(mid[1]>=.13&&mid[1]<4,p.id+' valid pass arc');
  }
  assert.deepEqual(playBall(p,5.4,contact),contact,p.id+' canonical shot contact');
 }
});
test('V21.86: attacking choreography and interceptions are stateless and independent from RNG',async()=>{
 const s=fs.readFileSync(path.join(root,'3d-playbook.mjs'),'utf8');
 assert.doesNotMatch(s,/Math\.random\s*\(/);
 assert.doesNotMatch(s,/match\./);
 const {PLAYBOOK,playBall,DEFENSIVE_SCENES,defenseBall,defensePosition}=await importPlaybook();
 for(const p of PLAYBOOK)for(const t of [0,.8,1.6,2.8,4.2,5.4]){
  const point=playBall(p,t,[.105,.17,-37.25]);
  assert.ok(point.every(Number.isFinite),p.id);
  assert.deepEqual(point,playBall(p,t,[.105,.17,-37.25]));
 }
 assert.equal(DEFENSIVE_SCENES.length,4);
 for(const id of DEFENSIVE_SCENES){
  const take=defenseBall(4.4,id),defender=defensePosition(8,4.4,id),after=defenseBall(7.2,id);
  assert.ok(Math.hypot(take[0]-defender[0],take[2]-defender[1])<.65,id+' ball won at foot');
  assert.ok(after[2]>take[2]+3,id+' defender carries away from goal');
  assert.ok(after.every(Number.isFinite));
 }
});
test('V21.107: actual ball-won highlights require an eligible display mode',()=>{
 const H=require('../3d-highlights.js');
 assert.equal(H.accepts('ball_won','off'),false);
 assert.equal(H.accepts('ball_won','important'),true);
});

test('V21.86: all authored scene PlayStyles match the actual Footera registry',async()=>{
 const H=require('../3d-highlights.js');
 const P=await import('../3d-playbook.mjs');
 const ids=new Set(require('../playstyles.js').definitions.map(style=>style.id));
 for(const scene of H.PLAYBOOK_SCENES){
  const authored=P.getPlay(scene.id);
  assert.ok(authored,'missing authored movement: '+scene.id);
  assert.deepEqual([...scene.tags],[...authored.tags],scene.id+' must use identical style weights');
  for(const id of scene.tags)assert.ok(ids.has(id),'unknown PlayStyle: '+scene.id+' / '+id);
 }
});

test('V21.89: 10 additional attacks have visible nonidentical running routes and readable finishes',async()=>{
 const {getPlay,playRouteSignature,playPosition,playBall}=await importPlaybook();
 const names=['reverse_cutback_left','reverse_cutback_right','blindside_overlap_left','blindside_overlap_right',
  'diagonal_counter_left','diagonal_counter_right','edge_of_box_recycle','back_post_sweep','late_midfield_runner','short_corner_combo'];
 const endings=new Set(),shapes=new Set();
 for(const id of names){
  const p=getPlay(id);assert.ok(p,id+' registered');
  const start=playPosition(p.order[0],0,p),mid=playPosition(p.order[0],2.6,p);
  assert.notDeepEqual(start,mid,id+' actual run');
  shapes.add(JSON.stringify([playRouteSignature(p),p.order]));
  const contact=playBall(p,5.4,[.105,.14,-37.2]);
  endings.add(p.finish);assert.deepEqual(contact,[.105,.14,-37.2],id+' immutable kick anchor');
 }
 assert.equal(shapes.size,10);assert.ok(endings.size>=3);
});

test('V21.90: closer camera shows the beginning and continuation of real passes on phone',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await importPlaybook(),
  T=await import('../vendor/three/three.module.min.js');
 for(const id of ['triangle_left','wall_pass_right','diagonal_counter_left','reverse_cutback_right','blindside_overlap_left']){
  const plan=P.getPlay(id),first=P.playTouches(plan)[0];
  for(const direction of [-1,1])for(const aspect of [390/340,1.7]){
   const camera=new T.PerspectiveCamera(30,aspect,.1,250);
   for(const time of [.08,first.release+.12,first.arrival-.02,3.2,5.2]){
    const c=M.cameraState(direction,time,aspect,'goal',id,plan.finish);
    assert.ok(c.distance>=M.MIN_CAMERA_DISTANCE&&c.distance<52.5,id+' close framing');
    assert.ok(c.position[0]>0&&c.position[1]>0,id+' sideline never flips');
    camera.position.set(...c.position);camera.fov=c.fov;camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const ball=new T.Vector3(...M.worldPosition(M.ballPosition('goal',time,id,plan.finish),direction)).project(camera);
    assert.ok(Math.abs(ball.x)<.98&&Math.abs(ball.y)<.98&&ball.z<1,id+' ball remains visible at '+time);
   }
  }
 }
});

test('V21.159: receptions cushion every actor and release before the next kick',async()=>{
 const P=await importPlaybook(),M=await import('../3d-highlights-scene.mjs');
 const C=await import('../3d-action-continuity.mjs');
 let count=0;const actors=new Set();
 const joint=()=>({rotation:{x:.4,y:0,z:0}});
 for(const plan of P.PLAYBOOK)for(const touch of P.playTouches(plan)){
  const r=P.playReception(plan,touch.receiver,touch.arrival);
  assert.equal(M.controlCarrier(touch.release,plan.id).weight,0,'release detaches boot guide');
  if(!r)continue;
  count++;actors.add(touch.receiver);
  const bone=()=>({root:joint(),upper:joint(),legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()],arms:[joint(),joint()]});
  const p=bone();C.applyReceptionContinuity(p,r,Math.PI,0);
  assert.ok(Math.abs(p.root.rotation.y)<=.42,'never face backwards to trap a pass');
  assert.ok(p.knees.some(k=>k.rotation.x<0),'receiving knee cushions');
  assert.equal(P.playReception(plan,touch.receiver,r.end),null,'release pose before kick');
  assert.ok(M.controlCarrier(touch.arrival,plan.id).weight<.001,'no ball snap on reception');
  for(let t=r.start+.001;t<r.end-.001;t+=.01){
   const a=P.playReception(plan,touch.receiver,t-.0001)?.routeTime??t-.0001;
   const b=P.playReception(plan,touch.receiver,t+.0001)?.routeTime??t+.0001;
   assert.ok(b>a,'controlled movement never reverses the route clock');
  }
 }
 assert.ok(count>100);assert.ok(actors.size>=7);
 for(const id of ['near_post_header_right','back_post_volley_left','six_yard_square_left'])
  assert.equal(P.playReception(P.getPlay(id),0,5.4),null,'direct finish never traps');
});

test('V21.159: support runs open a return lane while contact anchors stay continuous',async()=>{
 const P=await importPlaybook(),M=await import('../3d-highlights-scene.mjs');
 let runs=0;
 for(const plan of P.PLAYBOOK){
  const contact=M.shotContact(plan.id,plan.finish);
  for(let t=0;t<5.4;t+=.1)for(let actor=0;actor<8;actor++){
   const shift=P.playSupportRun(plan,actor,t);
   assert.ok(Math.hypot(...shift)<1.3,'bounded support run');
   if(Math.hypot(...shift)>.6)runs++;
  }
  for(const touch of P.playTouches(plan)){
   assert.deepEqual(P.playSupportRun(plan,touch.passer,touch.release),[0,0]);
   assert.deepEqual(P.playSupportRun(plan,touch.receiver,touch.arrival),[0,0]);
   for(const t of [touch.release,touch.arrival]){
    const a=P.playBall(plan,t-.000001,contact),b=P.playBall(plan,t+.000001,contact);
    assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.002,plan.id+' continuous contact');
   }
  }
  assert.deepEqual(P.playBall(plan,5.4,contact),contact);
 }
 assert.ok(runs>100,'passers actually move into supporting lanes');
});
