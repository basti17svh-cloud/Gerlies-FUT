const test=require('node:test'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const file=pathToFileURL(path.resolve(__dirname,'../3d-duel-contact.mjs')).href;
const ballAt=t=>[12+(t-3)*-.8,.14,-33-(t-3)*2.6];
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
test('contact demo actively stages the defender against the moving ball',async()=>{
 const m=await import(file);
 for(const seq of ['cut_inside_right','cut_inside_left']){
  for(const action of ['slide_attempt','block_attempt']){
   const at=action==='slide_attempt'?m.SLIDE_CONTACT:m.BLOCK_CONTACT;
   const pos=m.stagedDefenderPosition(action,at,seq,ballAt,[0,0]),b=ballAt(at);
   assert.ok(d(pos,[b[0],b[2]])<.75,action+' must actually meet the ball');
   assert.deepEqual(m.stagedDefenderPosition(action,at,seq,ballAt,[0,0]),pos);
   if(action==='slide_attempt'){
    const end=m.stagedDefenderPosition(action,at+.85,seq,ballAt,[0,0]);
    assert.ok(d(pos,end)>1.9,'the slide must TRAVEL across the grass after boot contact');
   }
  }
 }
 assert.deepEqual(m.stagedDefenderPosition('jockey',4,'cut_inside_right',ballAt,[9,7]),[9,7]);
});
test('ball is truly deflected before the goal, without discontinuity at contact',async()=>{
 const m=await import(file);
 for(const action of ['slide_attempt','block_attempt']){
  const at=action==='slide_attempt'?m.SLIDE_CONTACT:m.BLOCK_CONTACT;
  assert.deepEqual(m.stagedBallPosition(action,at,'cut_inside_right',ballAt),ballAt(at));
  const after=m.stagedBallPosition(action,at+1.1,'cut_inside_right',ballAt);
  assert.ok(Math.abs(after[0]-ballAt(at+1.1)[0])>2.4);
  assert.ok(after[2]>ballAt(at+1.1)[2]-.25,'trajectory cannot continue toward goal');
 }
 assert.deepEqual(m.stagedBallPosition('jockey',7,'cut_inside_right',ballAt),ballAt(7));
});
test('slide is a substantial grounded body tilt with a clearly extended leg',async()=>{
 const m=await import(file);
 const s=m.contactStage('slide_attempt',3.62);
 assert.ok(s.hold>.80&&s.flight>.80);
 const make=()=>({rig:{position:{y:0},rotation:{x:0,z:0}},upper:{rotation:{x:0,y:0,z:0}},
 legs:[{rotation:{x:0}},{rotation:{x:0}}],knees:[{rotation:{x:0}},{rotation:{x:0}}],
 ankles:[{rotation:{x:0}},{rotation:{x:0}}],
 arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}]});
 const player=make(),stage=m.applyContactStage(player,'slide_attempt',3.62,true);
 assert.ok(Math.abs(player.rig.rotation.x)>1.14,'body stays close to horizontal');
 assert.ok(stage.extension>1.7,'long leading leg fully extends into the tackle');
 const defender=make();m.applyContactStage(defender,'block_attempt',5.72,true);
 assert.ok(defender.legs[1].rotation.x>.85,'meaningful blocking leg extension');
 const untouched=make(),before=JSON.stringify(untouched);
 m.applyContactStage(untouched,'jockey',5.72);
 assert.equal(JSON.stringify(untouched),before);
});

test('shot-block recovery stays grounded and avoids the exaggerated backward stumble',async()=>{
 const {contactStage,applyContactStage}=await import(file);
 const fresh=()=>({rig:{position:{y:0},rotation:{x:0,z:0}},upper:{rotation:{x:0,y:0,z:0}},
  legs:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  knees:[{rotation:{x:0}},{rotation:{x:0}}],
  ankles:[{rotation:{x:0}},{rotation:{x:0}}],
  arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}]});
 for(const t of [5.16,5.45,5.62,5.74,5.95,6.18,6.45,6.70]){
  const p=fresh(),stage=applyContactStage(p,'block_attempt',t,true);
  assert.ok(Math.abs(p.upper.rotation.x)<.16,'upright torso at '+t);
  assert.ok(Math.abs(p.upper.rotation.z)<.11,'no uncontrolled sideways fall at '+t);
  assert.ok(Math.abs(p.arms[0].rotation.z)<.33&&Math.abs(p.arms[1].rotation.z)<.33,
   'do not spread both arms like an airplane at '+t);
  assert.ok(p.rig.position.y>-.10,'support leg remains grounded at '+t);
  assert.ok(stage.extension<1.1,'blocking foot does not overextend at '+t);
 }
 const p=fresh(),impact=applyContactStage(p,'block_attempt',5.74,true);
 assert.ok(impact.extension>.95,'still enough leg extension to intercept shot');
 assert.ok(p.legs[1].rotation.z>.25,'shank deflects across the shot line');
 assert.ok(contactStage('block_attempt',6.7).extend<.001,
  'the blocking leg lowers again before the end of recovery');
});
