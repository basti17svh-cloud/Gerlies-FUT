const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const file=pathToFileURL(path.resolve(__dirname,'../3d-motion-2.mjs')).href;
test('Motion 2.0 authors a complete right-wing inside cut and finesse finish',async()=>{
 const {sampleWinger2,MOTION_2_SHOT}=await import(file);
 assert.equal(MOTION_2_SHOT,5.4);
 const stages=[[2.8,'anticipate'],[3.08,'outside-foot-lock'],[3.5,'explode-inside'],[5.08,'wind-up'],[5.30,'shooting-plant'],[5.75,'follow-through']];
 for(const [time,expected] of stages){
  const a=sampleWinger2(time),b=sampleWinger2(time);
  assert.deepEqual(a,b,'scrubbing to the same moment produces the same stance');
  assert.equal(a.phase,expected,time+'s stage');
 }
 assert.equal(sampleWinger2(3.08,'central','finesse').active,false);
 assert.equal(sampleWinger2(3.08,'cut_inside_left','finesse').active,true);
 assert.equal(sampleWinger2(3.08,'cut_inside_right','power').active,false);
});
test('Support-leg IK keeps foot under body and knee physically bent on both turns',async()=>{
 const {solveSupportLeg}=await import(file);
 const r=solveSupportLeg(18,-34,.4,-.05,17.91,-34.16);
 assert.ok(r.dist>.45&&r.dist<.83);
 assert.ok(r.knee<-.2&&r.knee>-2.1,'knee flexes instead of hyperextending');
 assert.ok(Math.abs(r.hip)<1.2&&Math.abs(r.ankle)<=1);
 const leg=.43,finalY=leg*Math.cos(r.hip)+leg*Math.cos(r.hip+r.knee);
 assert.ok(Math.abs(finalY+r.vertical)<.055,'solved ankle height matches planted turf');
 const second=solveSupportLeg(9,-39,-.5,0,9.2,-39.1);
 assert.ok([second.hip,second.knee,second.ankle].every(Number.isFinite));
});
test('Finesse impact remains unchanged at precisely 5.4s',async()=>{
 const {sampleWinger2,sampleDefender2}=await import(file);
 const kick=sampleWinger2(5.4),before=sampleWinger2(5.3999),after=sampleWinger2(5.4001);
 assert.ok(kick.shotPin>.1,'support leg planted for shot');
 assert.equal(kick.finishFollow,0,'right-foot canonical contact not overridden');
 assert.ok(after.finishFollow>=before.finishFollow);
 assert.equal(sampleDefender2(3.1,99).wrongFoot,0,'far defender never reacts');
 assert.ok(sampleDefender2(3.1,4).wrongFoot>.1,'near defender reads cut');
});

test('Motion 2.1 left/right cuts mirror the outside plant and body turn',async()=>{
 const {sampleWinger2,MOTION_2_SEQUENCES,isMotion2Sequence,applyWinger2}=await import(file);
 assert.deepEqual([...MOTION_2_SEQUENCES],['cut_inside_right','cut_inside_left','double_feint_right','double_feint_left']);
 const mock=()=>({root:{position:{x:0,z:0},rotation:{y:0}},rig:{position:{y:0},rotation:{y:0}},
  upper:{rotation:{x:0,y:0,z:0}},arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  legs:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  knees:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  ankles:[{rotation:{x:0,y:0,z:0}},{rotation:{x:0,y:0,z:0}}]});
 const right=sampleWinger2(3.08,'cut_inside_right'),left=sampleWinger2(3.08,'cut_inside_left');
 assert.equal(right.side,1);assert.equal(left.side,-1);
 assert.equal(right.outside,1);assert.equal(left.outside,0);
 assert.equal(right.inside,0);assert.equal(left.inside,1);
 const pr=mock(),pl=mock();
 applyWinger2(pr,3.08,'cut_inside_right','finesse',[0,0],[0,0]);
 applyWinger2(pl,3.08,'cut_inside_left','finesse',[0,0],[0,0]);
 assert.ok(pr.upper.rotation.z<-.05&&pl.upper.rotation.z>.05,'body lean mirrors');
 assert.ok(pr.legs[1].rotation.x!==0&&pl.legs[0].rotation.x!==0,'planted support boot mirrors');
 assert.ok(isMotion2Sequence('double_feint_left','finesse')&&isMotion2Sequence('double_feint_right','finesse'));
 assert.equal(isMotion2Sequence('cut_inside_left','power'),false);
});
test('Motion 2.1 feint, misread and recovery form independent deterministic states',async()=>{
 const {sampleWinger2,sampleDefender2}=await import(file);
 for(const sequence of ['double_feint_right','double_feint_left']){
  const fake=sampleWinger2(2.22,sequence),cut=sampleWinger2(3.08,sequence);
  assert.equal(fake.phase,'sell-feint');assert.ok(fake.fake>.5);
  assert.equal(cut.phase,'outside-foot-lock');assert.equal(cut.fake,0);
  assert.deepEqual(sampleWinger2(2.22,sequence),fake);
  const defender=sampleDefender2(2.22,3,sequence);
  assert.ok(defender.fakeRead>.2);
  assert.equal(defender.phase,'misread-feint');
  assert.ok(sampleDefender2(3.1,3,sequence).wrongFoot>.3);
  assert.ok(sampleDefender2(3.65,3,sequence).recover>.3);
  assert.equal(sampleDefender2(2.22,99,sequence).fakeRead,0);
 }
 assert.equal(sampleWinger2(2.22,'cut_inside_left').fake,0);
 assert.equal(sampleDefender2(2.22,3,'cut_inside_right').fakeRead,0);
});
test('Motion 2.1 shot kick leg remains under existing verified contact at 5.4s',async()=>{
 const {applyWinger2,sampleWinger2}=await import(file);
 const mock=()=>({root:{position:{x:0,z:0},rotation:{y:0}},rig:{position:{y:0},rotation:{y:0}},
 upper:{rotation:{x:0,y:0,z:0}},arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
 legs:[{rotation:{x:0,z:0}},{rotation:{x:.75,z:0}}],
 knees:[{rotation:{x:0,z:0}},{rotation:{x:-.05,z:0}}],
 ankles:[{rotation:{x:0,y:0,z:0}},{rotation:{x:0,y:0,z:0}}]});
 for(const sequence of ['cut_inside_right','cut_inside_left','double_feint_right','double_feint_left']){
  const player=mock();applyWinger2(player,5.4,sequence,'finesse',[0,0],[0,0]);
  assert.equal(player.legs[1].rotation.x,.75,'canonical shooting hip preserved '+sequence);
  assert.equal(player.knees[1].rotation.x,-.05,'canonical shooting knee preserved '+sequence);
  assert.equal(player.ankles[1].rotation.z,0,'canonical instep unchanged '+sequence);
  assert.equal(sampleWinger2(5.4,sequence).finishFollow,0);
 }
});

test('Motion 2.2 adds symmetrical first touch, settle and far-corner setup without changing contact',async()=>{
 const {sampleWinger2,applyWinger2}=await import(file);
 const mock=()=>({root:{position:{x:0,z:0},rotation:{y:0}},rig:{position:{y:0},rotation:{y:0}},
  upper:{rotation:{x:0,y:0,z:0}},arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  legs:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  knees:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
  ankles:[{rotation:{x:0,y:0,z:0}},{rotation:{x:0,y:0,z:0}}]});
 for(const seq of ['cut_inside_right','cut_inside_left','double_feint_right','double_feint_left']){
  const first=sampleWinger2(1.12,seq),settle=sampleWinger2(1.52,seq),aim=sampleWinger2(4.52,seq);
  assert.equal(first.phase,'first-touch');assert.ok(first.touch>.7);
  assert.equal(settle.phase,'settle-ball');assert.ok(settle.settle>.5);
  assert.equal(aim.phase,'spot-far-corner');assert.ok(aim.aim>.5);
  const at=sampleWinger2(5.4,seq);assert.equal(at.touch,0);assert.equal(at.settle,0);assert.equal(at.aim,0);
  const plain=mock(),styled=mock();
  applyWinger2(plain,1.12,seq,'finesse',[0,0],[0,0]);
  applyWinger2(styled,1.12,seq,'finesse',[0,0],[0,0],[{id:'first-touch',plus:true}]);
  assert.ok(Math.abs(styled.legs[first.inside].rotation.x)>Math.abs(plain.legs[first.inside].rotation.x));
  const prep=mock();applyWinger2(prep,4.52,seq,'finesse',[0,0],[0,0],[{id:'finesse-shot',plus:true}]);
  assert.ok(Math.abs(prep.upper.rotation.y)>.15);
  const kick=mock();kick.legs[1].rotation.x=.75;kick.knees[1].rotation.x=-.05;
  applyWinger2(kick,5.4,seq,'finesse',[0,0],[0,0],[{id:'first-touch',plus:true},{id:'finesse-shot',plus:true}]);
  assert.equal(kick.legs[1].rotation.x,.75);assert.equal(kick.knees[1].rotation.x,-.05);
  assert.equal(kick.ankles[1].rotation.z,0);
  assert.deepEqual(sampleWinger2(1.12,seq),first);
 }
 assert.equal(sampleWinger2(1.12,'central','finesse').touch,0);
 assert.equal(sampleWinger2(4.52,'cut_inside_right','power').aim,0);
});
