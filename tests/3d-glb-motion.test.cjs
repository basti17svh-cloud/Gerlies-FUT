'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const motionImport=import(pathToFileURL(path.resolve(__dirname,'../3d-glb-motion.mjs')).href);
const input={speed:.8,turn:0,acceleration:.2,control:.35,stride:2.4,finish:'finesse'};
test('V21.72 GLB motion is deterministic, finite and bounded for any seek',async()=>{
 const {sampleGlbBodyMotion}=await motionImport;
 const sample=t=>sampleGlbBodyMotion(t,{...input,sequence:'cut_inside_right'});
 assert.deepEqual(sample(3.1),sample(3.1));
 const fields=Object.keys(sample(3.1));
 for(const t of [0,.8,1.55,2.9,3.1,4.91,5.4,5.76,6.1,10.4,Infinity,NaN]){
  const s=sample(t);
  for(const f of fields)assert.ok(Number.isFinite(s[f]),f+' at '+t);
  assert.ok(Math.abs(s.headYaw)<=.221&&Math.abs(s.spineYaw)<.4);
  assert.ok(Math.abs(s.pelvisYaw)<.3);
 }
});
test('V21.72 GLB mirrored cuts, run-to-strike and canonical 5.4 second contact',async()=>{
 const {sampleGlbBodyMotion}=await motionImport;
 const right=sampleGlbBodyMotion(3.1,{...input,sequence:'cut_inside_right'});
 const left=sampleGlbBodyMotion(3.1,{...input,sequence:'cut_inside_left'});
 assert.ok(right.cut>.2&&left.cut>.2);
 assert.ok(Math.abs(right.pelvisYaw+left.pelvisYaw)<1e-12);
 const sprint=sampleGlbBodyMotion(1.55,{...input,sequence:'central'});
 const setup=sampleGlbBodyMotion(5.19,{...input,sequence:'central'});
 const follow=sampleGlbBodyMotion(5.79,{...input,sequence:'central'});
 assert.ok(sprint.running>setup.running&&setup.shot>.5);
 assert.ok(follow.follow>.3&&Math.abs(follow.spinePitch-sprint.spinePitch)>.005);
 const contact=sampleGlbBodyMotion(5.4,{...input,sequence:'central'});
 assert.equal(contact.kneeCushion,0,'original knee contact is untouched');
 assert.equal(contact.leftToeLift,0,'support boot contact is untouched');
 assert.equal(contact.rightToeLift,0,'striking boot contact is untouched');
});
