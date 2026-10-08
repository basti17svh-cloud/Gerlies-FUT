const test=require('node:test'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url'),path=require('node:path');
const source=pathToFileURL(path.resolve(__dirname,'../3d-action-continuity.mjs')).href;
test('Foot touch precedes push and handover stays continuous',async()=>{
 const {touchContinuity}=await import(source);
 const impact=touchContinuity(Math.PI/2,1),push=touchContinuity(Math.PI*.75,1);
 assert.equal(impact.foot,0);assert.ok(impact.contact>.99&&impact.push<1e-9);
 assert.ok(push.push>.99&&push.contact<.10);
 for(const t of [0,Math.PI,Math.PI*2]){
  const a=touchContinuity(t-1e-5,1),b=touchContinuity(t+1e-5,1);
  assert.ok(Math.abs(a.contact-b.contact)<.001&&Math.abs(a.lead-b.lead)<.001);
 }
 assert.ok(touchContinuity(3*Math.PI/4,1,[{id:'rapid',plus:true}]).lead>push.lead);
 assert.ok(touchContinuity(3*Math.PI/4,1,[{id:'technical',plus:true}]).lead<push.lead);
});
test('Cross, ground pass, one-two and through-ball produce distinct delivery shapes',async()=>{
 const {deliverySignature}=await import(source);
 const expected={wing_left:'cross',through_ball:'through',low_cross_right:'cutback',one_two:'one-two',diagonal_switch:'switch',central:'ground'};
 for(const [seq,kind] of Object.entries(expected))assert.equal(deliverySignature(.5,seq).kind,kind);
 assert.equal(deliverySignature(.5,'wing_left').side,-1);
 assert.equal(deliverySignature(.5,'wing_left',[{id:'whipped-pass',plus:true}]).power,1.3);
});
test('Distinct PlayStyle actions preserve exact canonical 5.4s shot contact',async()=>{
 const {finishSignature,defenderSignature}=await import(source);
 for(const style of ['finesse','power','low_driven','chip']){
  const s=finishSignature(5.4,style,[{id:'power-shot',plus:true}]);
  assert.equal(s.load,0);assert.equal(s.follow,0);
 }
 assert.equal(finishSignature(5.05,'finesse',[{id:'finesse-shot',plus:true}]).accent,1.3);
 assert.equal(defenderSignature(2.25,99,'double_feint_right').feint,0);
 assert.ok(defenderSignature(2.25,2,'double_feint_right').feint>.1);
});
