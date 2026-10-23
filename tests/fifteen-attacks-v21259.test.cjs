const test=require('node:test'),assert=require('node:assert/strict');
const H=require('../3d-highlights.js');
const outcomes=['goal','big_chance_saved','shot_post','big_chance_missed'];
test('V21.259: exactly 15 new registered and non-duplicate movement/finish recipes',async()=>{
 const P=await import('../3d-playbook.mjs');
 assert.equal(P.PLAYBOOK.length,117);
 assert.equal(P.V259_ATTACK_IDS.length,15);
 assert.equal(new Set(P.PLAYBOOK_IDS).size,117);
 assert.equal(P.MORE_ATTACK_IDS.length,42);
 const old=new Set(P.PLAYBOOK.slice(0,102).map(p=>[p.family,p.finish,p.delivery,p.order.join(':')].join('|')));
 const novel=new Set();
 for(const id of P.V259_ATTACK_IDS){
  const p=P.getPlay(id),h=H.PLAYBOOK_SCENES.find(s=>s.id===id);
  assert.ok(h&&p,'selectable play '+id);
  assert.deepEqual([h.family,h.finish,h.seconds,h.tags],[p.family,p.finish,p.seconds,p.tags],id);
  const signature=[p.family,p.finish,p.delivery,p.order.join(':')].join('|');
  assert.ok(!old.has(signature),'existing move duplicated: '+id);
  assert.ok(!novel.has(signature),'new move duplicated: '+id);
  novel.add(signature);
  assert.ok(P.hasAuthoredFinish(id),id+' has own finish');
  assert.ok(p.order.length>=3&&p.order.at(-1)===0,id+' has visible buildup');
  const beats=P.playTouches(p);
  assert.equal(beats.length,p.order.length-1,id);
  for(let i=0;i<beats.length;i++){
   const b=beats[i];
   assert.equal(b.passer,p.order[i]);
   assert.equal(b.receiver,p.order[i+1]);
   assert.ok(b.release>=.3&&b.arrival>b.release+.2&&b.arrival<=5.4,id+' timed pass');
   if(i)assert.ok(b.release>beats[i-1].arrival+.06,id+' time for receipt');
  }
 }
});
test('V21.259: no teleporting ball, shot anchor matches runner, outcome remains authoritative',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs');
 const origins=new Set(),shooters=new Set();
 for(const id of P.V259_ATTACK_IDS){
  const p=P.getPlay(id),start=P.playPosition(p.order[0],0,p);
  origins.add(start.map(x=>Math.round(x)).join(','));
  const shot=M.runPosition(0,M.SHOT_TIME,id);
  shooters.add(shot.map(x=>Math.round(x)).join(','));
  for(const side of [-1,1])for(const type of outcomes){
   const placement={side,zone:'corner',height:'high'};
   const contact=M.shotContact(id,p.finish,placement);
   assert.ok(Math.hypot(contact[0]-shot[0],contact[2]-shot[1])<1,id+' actual boot at contact');
   const boundaries=[...P.playTouches(p).flatMap(x=>[x.release,x.arrival]),5.14,5.15,5.4,6.65];
   for(const t of boundaries){
    const a=M.ballPosition(type,t-.00001,id,p.finish,'classic',placement);
    const b=M.ballPosition(type,t+.00001,id,p.finish,'classic',placement);
    assert.ok(a.every(Number.isFinite)&&b.every(Number.isFinite));
    assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.06,id+' '+type+' discontinuity at '+t);
   }
   const at=M.shotArrival(type,id,p.finish,placement);
   const hit=M.ballPosition(type,at,id,p.finish,'classic',placement);
   const expected=M.shotImpact(type,id,p.finish,placement);
   assert.ok(Math.hypot(...hit.map((v,i)=>v-expected[i]))<.001,id+' '+type+' hit type preserved');
  }
 }
 assert.ok(origins.size>=7,'different starting lanes');
 assert.ok(shooters.size>=13,'different finishing positions');
});
test('V21.259: fixed-distance TV coverage, no in-play camera zoom or sudden cut',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const id of P.V259_ATTACK_IDS){
  const p=P.getPlay(id);
  for(const direction of [-1,1])for(const aspect of [360/340,412/340]){
   const track=M.createBroadcastCameraTrack({direction,aspect,sequence:id,type:'goal',finish:p.finish});
   let prev=track(0),min=Infinity,max=0;
   for(let t=.04;t<=5.4;t+=.04){
    const c=track(t);
    assert.ok(c.position[0]>0&&c.position[1]>0,id+' standard TV side');
    assert.ok(Math.hypot(...c.position.map((v,i)=>v-c.target[i]))>=31,id+' no close-up');
    assert.ok(Math.hypot(...c.target.map((v,i)=>v-prev.target[i]))<.75,id+' stable pan');
    assert.ok(Math.abs(c.fov-prev.fov)<.06,id+' no zoom jump');
    min=Math.min(min,c.fov);max=Math.max(max,c.fov);prev=c;
   }
   assert.ok(max-min<.6,id+' no in-play focal zoom');
  }
 }
});
test('V21.259: every new play is reachable via the usual selection',async()=>{
 const P=await import('../3d-playbook.mjs');
 const observed=new Set();
 for(let i=0;i<22000;i++){
  const e={id:'v259:'+i,type:outcomes[i%outcomes.length],team:'home',minute:i%90,playerName:'ST',creatorName:'ZM',creationType:'assist'};
  observed.add(H.choosePresentation(e).sequence);
 }
 for(const id of P.V259_ATTACK_IDS)assert.ok(observed.has(id),id+' must be reachable');
});
