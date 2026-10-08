const test=require('node:test');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
const moduleFile=pathToFileURL(path.resolve(__dirname,'../3d-motion-lab.mjs')).href;
test('Motion Lab is deterministic and pure at any timestamp',async()=>{
 const {sampleLabMotion,MOTION_LAB_SHOT_TIME}=await import(moduleFile);
 assert.equal(MOTION_LAB_SHOT_TIME,5.4);
 const args=['attacker',3.06,'cut_inside_right',.66,.08,13,.2,4];
 const a=sampleLabMotion(...args),b=sampleLabMotion(...args);
 assert.deepEqual(a,b);
 assert.equal(a.phase,'plant');
 assert.ok(a.crouch>.055,'outside-foot loading changes the body silhouette');
 assert.ok(Math.abs(a.bank)>.15,'plant creates significant visible leaning');
 assert.ok(a.knees[1]<-.55,'outside knee visibly compresses on right cut');
 assert.ok(a.hips.every(Number.isFinite));
 assert.ok(a.ankles.every(Number.isFinite));
});
test('Left and right cuts are mirrored, with a real acceleration phase',async()=>{
 const {sampleLabMotion}=await import(moduleFile);
 const right=sampleLabMotion('attacker',3.06,'cut_inside_right',.66,.08,13,.2,4);
 const left=sampleLabMotion('attacker',3.06,'cut_inside_left',.66,-.08,13,.2,4);
 assert.ok(right.bank>0&&left.bank<0,'cut leans in opposite directions');
 assert.ok(right.knees[1]<left.knees[1],'right outside leg loaded');
 assert.ok(left.knees[0]<right.knees[0],'left outside leg loaded');
 const after=sampleLabMotion('attacker',3.50,'cut_inside_right',.72,0,17,.5,4);
 assert.equal(after.phase,'accelerate');
 assert.ok(after.yaw>0,'hips and shoulders redirect toward the inside');
 const plain=sampleLabMotion('attacker',3.06,'through_ball',.66,.08,13,.2,4);
 assert.ok(Math.abs(plain.bank)<Math.abs(right.bank)*.5,'cut is structurally different from straight run');
});
test('New defender has a low tracking and jockey state independent of scorer',async()=>{
 const {sampleLabMotion}=await import(moduleFile);
 const close=sampleLabMotion('defender',3.85,'cut_inside_right',.54,.03,14,-.2,4);
 const far=sampleLabMotion('defender',3.85,'cut_inside_right',.54,.03,14,-.2,99);
 assert.equal(close.phase,'jockey');
 assert.ok(close.crouch>far.crouch+.07);
 assert.ok(close.knees[0]<far.knees[0]);
 assert.ok(close.spread[1]>far.spread[1]);
 assert.equal(close.enabled,1);
});
test('Striker motion relinquishes the authoritative 5.4s shot and resumes later',async()=>{
 const {sampleLabMotion}=await import(moduleFile);
 const atContact=sampleLabMotion('attacker',5.4,'cut_inside_right',.55,0,20,0,4);
 const before=sampleLabMotion('attacker',4.15,'cut_inside_right',.55,0,19,0,4);
 const after=sampleLabMotion('attacker',6.5,'cut_inside_right',.55,0,25,0,4);
 assert.equal(atContact.enabled,0,'existing verified contact choreography remains in charge');
 assert.equal(before.enabled,1);assert.equal(after.enabled,1);
});
