'use strict';
// V21.445 Traumtore (Basti 16.11.2026: "Die Tore sehen tatsächlich viele sehr identisch aus").
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../3d-highlights.js');
const outcomes=['goal','big_chance_saved','shot_post','big_chance_missed'];
const dist=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));

test('V21.445: thirteen dream goals registered in both selectors with their own technique',async()=>{
 const D=await import('../3d-dream-goals.mjs'),P=await import('../3d-playbook.mjs');
 assert.equal(D.DREAM_GOAL_IDS.length,62);// V21.449: +21, V21.450: +15, V21.451: +13 new scenes
 assert.deepEqual([...P.DREAM_GOAL_IDS],[...D.DREAM_GOAL_IDS]);
 const styles=new Set();
 for(const id of D.DREAM_GOAL_IDS){
  const p=P.getPlay(id),record=H.PLAYBOOK_SCENES.find(v=>v.id===id),rule=D.DREAM_RULES[id];
  assert.ok(p&&record,'registered: '+id);
  assert.equal(record.family,p.family,id);assert.equal(record.finish,p.finish,id);assert.equal(record.seconds,p.seconds,id);
  assert.ok(P.hasAuthoredFinish(id),id);
  assert.equal(p.order.at(-1),0,'finisher receives the last ball: '+id);
  assert.equal(H.creatorActor(id),p.order.at(-2),id);
  assert.equal(H.dreamFinish(id),rule.finish,id);
  assert.deepEqual(H.DREAM_RULES[id].kinds,rule.kinds,id);assert.deepEqual(H.DREAM_RULES[id].sims,rule.sims,id);
  assert.equal(H.DREAM_RULES[id].foot,rule.foot,id);
  styles.add(rule.style);
 }
 for(const s of ['curl','outside','dip','knuckle','backheel','bicycle','dive','volley'])assert.ok(styles.has(s),'technique '+s);
});

test('V21.445: dream goals keep the simulated result and a continuous ball',async()=>{
 const D=await import('../3d-dream-goals.mjs'),M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs');
 for(const id of D.DREAM_GOAL_IDS){
  const fin=P.getPlay(id).finish;
  for(const placement of [null,{side:1,zone:'corner',height:'high'},{side:-1,zone:'inside',height:'low'}])for(const type of outcomes){
   const contact=M.shotContact(id,fin,placement);
   assert.ok(dist(contact,M.ballPosition(type,M.SHOT_TIME,id,fin,'classic',placement))<1e-6,'kick contact '+id);
   const arrived=M.ballPosition(type,M.shotArrival(type,id,fin,placement),id,fin,'classic',placement);
   assert.ok(dist(arrived,M.shotImpact(type,id,fin,placement))<1e-3,'outcome '+type+' unchanged: '+id);
  }
  let prev=M.ballPosition('goal',0,id,fin);
  for(let t=.01;t<=M.IMPACT_TIME+.6;t+=.01){
   const b=M.ballPosition('goal',t,id,fin);
   assert.ok(b.every(Number.isFinite)&&b[1]>=.1,'ball above turf '+id+' '+t);
   assert.ok(dist(b,prev)<.45,'no teleport '+id+' at '+t.toFixed(2));prev=b;
  }
  for(let t=0;t<=5.4;t+=.1)assert.ok(M.runPosition(0,t,id).every(Number.isFinite),id);
 }
});

test('V21.445: each technique flies its own way',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),D=await import('../3d-dream-goals.mjs');
 const bulge=id=>{const fin=D.dreamFinish(id),c=M.shotContact(id,fin),i=M.shotImpact('goal',id,fin);let m=0;
  for(let t=M.SHOT_TIME;t<=M.shotArrival('goal',id,fin);t+=.02){const b=M.ballPosition('goal',t,id,fin),u=(c[2]-b[2])/(c[2]-i[2]);m=Math.max(m,Math.abs(b[0]-(c[0]+(i[0]-c[0])*u)))}return m};
 // Robben: from the right, far post, and a visible bend.
 for(const [id,side] of [['dream_robben_cut_right',1],['dream_robben_cut_left',-1]]){
  assert.ok(Math.sign(M.runPosition(0,M.SHOT_TIME,id)[0])===side,id);
  assert.ok(Math.sign(M.shotImpact('goal',id,'finesse')[0])===-side,'far post '+id);
  assert.ok(bulge(id)>1,'curls '+id);
 }
 const peak=id=>{let y=0;for(let t=M.SHOT_TIME;t<M.IMPACT_TIME;t+=.02)y=Math.max(y,M.ballPosition('goal',t,id,D.dreamFinish(id))[1]);return y};
 assert.ok(peak('dream_rocket_dip')>M.shotImpact('goal','dream_rocket_dip','power')[1]+.6,'rises, then dips under the bar');
 assert.ok(M.runPosition(0,M.SHOT_TIME,'dream_rocket_dip')[1]>-26,'from distance');
 assert.ok(M.shotContact('dream_backheel_left','backheel')[2]<-46,'heel flick in the six-yard area');
 assert.ok(M.shotContact('dream_diving_header_right','header')[1]<.8,'diving header at knee height');
 assert.ok(M.shotContact('dream_bicycle_right','bicycle')[1]>1.4,'overhead kick');
 assert.ok(D.dreamShotRate('dream_backheel_left')>2&&D.dreamShotRate('dream_rocket_dip')===1.5);
 assert.ok(D.dreamFinishPose('dream_diving_header_right',5.6).pitch<-1,'flat dive');
 assert.ok(D.dreamFinishPose('dream_backheel_left',5.4).legs[1][1]<-.8,'heel up behind');
});

test('V21.445: playback runs a heel flick faster, the same for every outcome',async()=>{
 const C=await import('../3d-playback-clock.mjs');
 const real=(sequence,type)=>{const p=C.createHighlightPlayback({type,sequence,playSeconds:10.4});return p.totalSeconds};
 for(const type of outcomes){
  assert.ok(real('dream_backheel_left',type)<real('dream_rocket_dip',type));
  assert.equal(real('dream_backheel_left',type)-real('dream_rocket_dip',type),real('dream_backheel_left','goal')-real('dream_rocket_dip','goal'));
 }
});

test('V21.445: dream goals show up in real matches, only for a fitting chance',()=>{
 const want={dribble:['normal','finesse','low_driven','power'],cutback:['normal','low_driven'],distance:['power','normal'],cross:['header','volley'],combination:['normal','finesse','volley'],through:['normal','chip','finesse','power'],switch:['normal','finesse']};
 const seen=new Set();
 for(const [kind,finishes] of Object.entries(want))for(let i=0;i<4500;i++){
  const finish=finishes[i%finishes.length];
  const v=H.choosePresentation({id:'dream'+i,matchId:'m'+(i%40),type:outcomes[i%4],minute:i%90,actionKind:kind,finish,creatorName:'Kimmich',playerName:'P'+i,shotFoot:i%3?'Right':'Left',scorerSlot:['ST','RW','LW','CAM'][i%4]});
  const rule=H.DREAM_RULES[v.sequence];if(!rule)continue;
  seen.add(v.sequence);
  assert.ok(rule.kinds.includes(kind)&&rule.sims.includes(finish),v.sequence+' for '+kind+'/'+finish);
  assert.equal(v.finish,rule.finish);
 }
 assert.equal(seen.size,62,'every dream goal reachable: '+[...seen].join(','));
 // Never a header scene for a flat ball, never a heel flick for a cross.
 for(let i=0;i<600;i++){
  const v=H.choosePresentation({id:'c'+i,type:'goal',actionKind:'cutback',finish:'normal',creatorName:'K'});
  assert.ok(!['header','bicycle'].includes(v.finish),v.sequence);
 }
});
