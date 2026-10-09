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
 assert.equal(sampleWinger2(3.08,'cut_inside_left','finesse').active,false);
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
