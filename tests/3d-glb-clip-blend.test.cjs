'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../3d-glb-clip-blend.mjs');
const info={speed:.86,stride:8.2,sequence:'central'};
const at=(sample,t,overrides={},enabled=true)=>({...sample(t,{...info,...overrides},enabled)});
test('V21.75 real CC0 captured locomotion is deterministic and visibly phase-driven',async()=>{
 const {createGlbClipLayer,GLB_CLIP_LAYER_VERSION}=await load();
 assert.match(GLB_CLIP_LAYER_VERSION,/21\.75/);
 const sample=createGlbClipLayer(),a=at(sample,1.2);
 assert.deepEqual(a,at(sample,1.2));
 assert.equal(a.source,'Quaternius CC0');
 assert.equal(a.clip,'Sprint_Loop');
 assert.ok(a.weight>.25);
 const changes=[0,.25,.50,.75].map(i=>at(sample,2,{stride:8.2+i*Math.PI*2}).leftArmPitch);
 assert.ok(changes.some(v=>Math.abs(v-changes[0])>.02),'captured shoulder swing varies through stride');
 for(const t of [0,1.1,3.1,4.62,4.94,5.4,6.03,6.37,10.4,NaN])
  for(const [k,v] of Object.entries(at(sample,t)))if(typeof v==='number')assert.ok(Number.isFinite(v),k+' at '+t);
});
test('V21.75 walk jog sprint crossfades are continuous',async()=>{
 const sample=(await load()).createGlbClipLayer();
 for(const edge of [.22,.52,.82]){
  const lo=at(sample,2,{speed:edge-.0001}),hi=at(sample,2,{speed:edge+.0001});
  for(const field of ['torsoPitch','torsoRoll','leftArmPitch','rightArmPitch','leftElbow','rightElbow','weight'])
   assert.ok(Math.abs(lo[field]-hi[field])<.006,edge+' '+field+' continuous');
 }
 assert.equal(at(sample,2,{speed:.3}).clip,'Walk_Loop');
 assert.equal(at(sample,2,{speed:.66}).clip,'Jog_Fwd_Loop');
 assert.equal(at(sample,2,{speed:.9}).clip,'Sprint_Loop');
});
test('V21.75 cut suppression shot contact and reversible procedural fallback',async()=>{
 const sample=(await load()).createGlbClipLayer(),run=at(sample,2),cut=at(sample,3.12,{sequence:'cut_inside_right'});
 assert.ok(cut.weight<run.weight*.8);
 const contact=at(sample,5.4);assert.equal(contact.weight,0);
 for(const name of ['torsoPitch','leftArmPitch','rightArmPitch','leftElbow','rightElbow'])assert.equal(contact[name],0);
 assert.ok(at(sample,6.5).weight>.2);
 assert.equal(at(sample,2,{},false).weight,0);
 assert.deepEqual(at(sample,2),run);
});
