'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../3d-highlights.js');

const events=['goal','big_chance_saved','shot_post','big_chance_missed'];
const dist=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const key=p=>[p.family,p.finish,p.delivery,p.order.join(',')].join('|');

test('V21.341: 36 new, selectable, distinct football scenes, never aliases',async()=>{
 const P=await import('../3d-playbook.mjs');
 const C=await import('../3d-cinematic-scenarios.mjs');
 const M=await import('../3d-highlights-scene.mjs');
 assert.equal(C.CINEMATIC_SCENE_IDS.length,36);
 assert.equal(new Set(C.CINEMATIC_SCENE_IDS).size,36);
 assert.equal(P.PLAYBOOK.length,185);
 assert.equal(H.PLAYBOOK_SCENES.length,185);
 assert.equal(M.PLAY_SEQUENCES.length,240);
 const old=new Set(P.PLAYBOOK.slice(0,-36).map(key));
 const fresh=new Set();
 const locations=new Set();
 for(const id of C.CINEMATIC_SCENE_IDS){
  const p=P.getPlay(id),record=H.PLAYBOOK_SCENES.find(v=>v.id===id);
  assert.ok(p&&record, 'registered in BOTH selectors: '+id);
  assert.equal(record.family,p.family,id);
  assert.equal(record.finish,p.finish,id);
  assert.equal(record.seconds,p.seconds,id);
  assert.ok(P.hasAuthoredFinish(id),'scripted individual player routes: '+id);
  assert.deepEqual(C.SCENARIO_STORIES[id].direct,false,id);
  assert.ok(!old.has(key(p)),'not a renamed old script: '+id);
  assert.ok(!fresh.has(key(p)),'no duplicate new script: '+id);
  fresh.add(key(p));
  assert.equal(H.creatorActor(id),p.order.at(-2),'correct creator in overlay: '+id);
  assert.equal(C.scenarioMotionActor(id),p.family==='dribble'?0:p.order.at(-2),id);
  assert.equal(p.order.at(-1),0,'finisher must receive actual last pass: '+id);
  const foot=M.runPosition(0,M.SHOT_TIME,id);
  locations.add(foot.map(v=>v.toFixed(1)).join(','));
  assert.ok(foot.every(Number.isFinite)&&Math.abs(foot[0])<=17&&foot[1]<-25&&foot[1]>-50,id);
 }
 assert.ok(locations.size>=26,'wide spread of distinct scoring positions');
 assert.deepEqual(new Set(P.CINEMATIC_SCENE_IDS),new Set(C.CINEMATIC_SCENE_IDS));
});

test('V21.341: multi-pass contact, coherent ownership and continuous ball routes',async()=>{
 const P=await import('../3d-playbook.mjs');
 const C=await import('../3d-cinematic-scenarios.mjs');
 const M=await import('../3d-highlights-scene.mjs');
 for(const id of C.CINEMATIC_SCENE_IDS){
  const p=P.getPlay(id),passes=P.playTouches(p);
  assert.equal(passes.length,p.order.length-1,id);
  let previous=0;
  for(let n=0;n<passes.length;n++){
   const touch=passes[n];
   assert.deepEqual([touch.passer,touch.receiver],[p.order[n],p.order[n+1]],id);
   assert.ok(touch.release>previous+.08&&touch.arrival>touch.release+.18&&touch.arrival<=5.0,'pass timing '+id);
   previous=touch.arrival;
   const a=P.playPosition(touch.passer,touch.release,p);
   const b=P.playPosition(touch.receiver,touch.arrival,p);
   assert.ok([...a,...b].every(Number.isFinite),'no NaN actors: '+id);
   assert.ok(a.every((v,i)=>Math.abs(v)<(i===0?37:65)),id);
   assert.equal(P.playCarrier(p,(touch.release+touch.arrival)/2),-1,'ball must be in flight: '+id);
   const ball0=P.playBall(p,touch.release,M.shotContact(id,p.finish));
   const ball1=P.playBall(p,touch.arrival,M.shotContact(id,p.finish));
   assert.ok(ball0.every(Number.isFinite)&&ball1.every(Number.isFinite),id);
  }
  for(const t of [0,.3,.82,1.6,2.4,3.3,4.2,5.0,5.4]){
   const p0=M.runPosition(0,t,id),bp=M.ballPosition('goal',t,id,p.finish);
   assert.ok([...p0,...bp].every(Number.isFinite),'scene time '+t+': '+id);
  }
  for(const t of [...passes.flatMap(x=>[x.release,x.arrival]),5.14,5.4]){
   const l=M.ballPosition('goal',t-.00001,id,p.finish);
   const r=M.ballPosition('goal',t+.00001,id,p.finish);
   assert.ok(dist(l,r)<.07,'ball does not teleport at '+t+' for '+id+' delta='+dist(l,r));
  }
 }
});

test('V21.341: scripted build-up never changes result, goalkeeper, save or post',async()=>{
 const P=await import('../3d-playbook.mjs');
 const C=await import('../3d-cinematic-scenarios.mjs');
 const M=await import('../3d-highlights-scene.mjs');
 for(const id of C.CINEMATIC_SCENE_IDS){
  const p=P.getPlay(id);
  for(const type of events){
   const contact=M.shotContact(id,p.finish,{side:1,zone:'corner',height:'high'});
   const shot=M.ballPosition(type,M.SHOT_TIME,id,p.finish,'classic',{side:1,zone:'corner',height:'high'});
   assert.ok(dist(contact,shot)<.00001,'match simulator keeps the actual kick contact '+id);
   const arrived=M.ballPosition(type,M.shotArrival(type,id,p.finish),id,p.finish);
   const expected=M.shotImpact(type,id,p.finish);
   assert.ok(dist(arrived,expected)<.0001,'result '+type+' not changed by cinematic scene '+id);
  }
 }
});

test('V21.341: 3D TV camera has fixed wide distance without discontinuous cuts',async()=>{
 const P=await import('../3d-playbook.mjs');
 const C=await import('../3d-cinematic-scenarios.mjs');
 const M=await import('../3d-highlights-scene.mjs');
 for(const id of C.CINEMATIC_SCENE_IDS){
  const p=P.getPlay(id);
  for(const dir of [-1,1])for(const aspect of [360/340,412/340]){
   const track=M.createBroadcastCameraTrack({direction:dir,aspect,sequence:id,type:'goal',finish:p.finish});
   let prev=track(0);
   for(let t=.08;t<=5.36;t+=.08){
    const frame=track(t);
    assert.ok([...frame.position,...frame.target,frame.fov].every(Number.isFinite),id);
    assert.ok(frame.position[0]>0&&frame.position[1]>0,'keep TV side: '+id);
    assert.ok(Math.hypot(...frame.position.map((x,i)=>x-frame.target[i]))>=30,'no sudden close-ups: '+id);
    assert.ok(dist(frame.target,prev.target)<3,'no camera cut: '+id+' t='+t);
    prev=frame;
   }
  }
 }
});

test('V21.341: all scenarios can actually be selected by regular highlight system',async()=>{
 const C=await import('../3d-cinematic-scenarios.mjs');
 const found=new Set();
 for(let i=0;i<26000;i++){
  const event={id:'cinematic:'+i,matchId:'cinematic-qa',type:events[i%4],minute:i%90,team:'home',playerName:'Stuermer',creatorName:'Zehner',creationType:'assist'};
  found.add(H.choosePresentation(event).sequence);
 }
 for(const id of C.CINEMATIC_SCENE_IDS)assert.ok(found.has(id),'reachable: '+id);
});

test('V21.341: extra footwork is pose-only, deterministic and off outside action',async()=>{
 const C=await import('../3d-cinematic-scenarios.mjs');
 const joint=()=>({rotation:{x:0,y:0,z:0}});
 const rig=()=>({rig:joint(),upper:joint(),legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()],arms:[joint(),joint()]});
 for(const id of C.CINEMATIC_SCENE_IDS){
  const actor=C.scenarioMotionActor(id),a=rig(),b=rig();
  assert.equal(C.applyScenarioPose(a,id,actor,0),0,id);
  const w=C.applyScenarioPose(a,id,actor,2.7);
  const wAgain=C.applyScenarioPose(b,id,actor,2.7);
  assert.ok(w>=0&&w<=1,id);
  assert.equal(w,wAgain,id);
  assert.deepEqual(a,b,'seekable pose '+id);
  assert.equal(C.applyScenarioPose(a,id,actor,9),0,id);
  assert.equal(C.applyScenarioPose(a,id,-1,2.7),0,'unrelated actor unaffected '+id);
 }
});
