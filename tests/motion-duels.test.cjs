const test=require('node:test'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const source=pathToFileURL(path.resolve(__dirname,'../3d-motion-duels.mjs')).href;
const rig=()=>({root:{position:{x:0,z:0},rotation:{y:0}},
 upper:{rotation:{x:0,y:0,z:0}},rig:{rotation:{y:0},position:{y:0}},
 legs:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],
 knees:[{rotation:{x:0}},{rotation:{x:0}}],
 ankles:[{rotation:{x:0}},{rotation:{x:0}}],
 arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}]});
test('2.4 jockey footwork mirrors and double feints get a visible wrong read',async()=>{
 const {sampleDefensiveDuels,applyDefensiveDuels}=await import(source);
 const right=sampleDefensiveDuels(3.25,4,'jockey','double_feint_right');
 const left=sampleDefensiveDuels(3.25,4,'jockey','double_feint_left');
 assert.equal(right.side,1);assert.equal(left.side,-1);
 assert.ok(right.shuffle>.5&&left.shuffle>.5);
 assert.ok(sampleDefensiveDuels(2.20,4,'jockey','double_feint_left').wrongRead>.4);
 const a=rig(),b=rig();applyDefensiveDuels(a,3.25,4,'jockey','double_feint_right');
 applyDefensiveDuels(b,3.25,4,'jockey','double_feint_left');
 assert.ok(a.legs[1].rotation.x>.1&&b.legs[0].rotation.x>.1,'lateral support legs mirror');
 assert.ok(a.upper.rotation.z*b.upper.rotation.z<0,'lateral lean mirrors');
 assert.deepEqual(sampleDefensiveDuels(3.25,4,'jockey','double_feint_left'),left,'scrubbing remains deterministic');
});
test('2.5 blocking pose depends on the existing defensive action, never on future scoring',async()=>{
 const {sampleDefensiveDuels,applyDefensiveDuels}=await import(source);
 const block=sampleDefensiveDuels(5.08,4,'block_attempt','cut_inside_right');
 const press=sampleDefensiveDuels(5.08,4,'close_down','cut_inside_right');
 const passive=sampleDefensiveDuels(5.08,4,'jockey','cut_inside_right');
 assert.equal(block.phase,'shot-block');assert.ok(block.block>.65);
 assert.ok(press.step>.4);assert.ok(block.block>passive.block);
 const normal=rig(),strong=rig();applyDefensiveDuels(normal,5.08,4,'block_attempt','cut_inside_right');
 applyDefensiveDuels(strong,5.08,4,'block_attempt','cut_inside_right',[{id:'block',plus:true}]);
 assert.ok(Math.abs(strong.legs[1].rotation.x)>Math.abs(normal.legs[1].rotation.x));
 const far=rig(),copy=JSON.stringify(far);
 applyDefensiveDuels(far,5.08,99,'block_attempt','cut_inside_right');
 assert.equal(JSON.stringify(far),copy,'out of reach must never trigger a tackle');
});
test('2.6 players regain balance but preserve routes, contact and post-result events',async()=>{
 const {sampleDefensiveDuels,sampleFinishBalance,applyFinishBalance,applyDefensiveDuels}=await import(source);
 assert.ok(sampleDefensiveDuels(6.08,5,'close_down','dribble').recovery>.4);
 assert.ok(sampleFinishBalance(6.25,'finesse').load>.7);
 for(const fin of ['header','volley','bicycle'])assert.equal(sampleFinishBalance(6.25,fin).load,0);
 const striker=rig(),defender=rig(),before=JSON.stringify(striker);
 applyFinishBalance(striker,5.4,'finesse');
 assert.equal(JSON.stringify(striker),before,'5.4 s right-foot shot contact unchanged');
 applyFinishBalance(striker,6.25,'finesse');
 applyDefensiveDuels(defender,6.08,5,'close_down','dribble');
 assert.ok(Math.abs(striker.knees[0].rotation.x)>.10);
 assert.ok(Math.abs(defender.upper.rotation.x)>.08);
 assert.equal(striker.root.position.x,0);assert.equal(defender.root.position.z,0);
 assert.equal(sampleFinishBalance(7.05,'finesse').load,0,'do not override outcome reaction');
});
test('2.4 to 2.6 remain finite and inactive after scene ends or outside action reach',async()=>{
 const {sampleDefensiveDuels,sampleFinishBalance}=await import(source);
 for(const sequence of ['cut_inside_left','cut_inside_right','double_feint_left','double_feint_right','dribble']){
  for(const time of [0,2.2,3.25,4.7,5.08,5.4,6.08,7.5,10.4]){
   const p=sampleDefensiveDuels(time,7,'jockey',sequence);
   for(const key of ['near','jockey','wrongRead','shuffle','read','block','step','recovery'])
    assert.ok(Number.isFinite(p[key]),key+' finite');
  }
  assert.equal(sampleDefensiveDuels(5.08,99,'jockey',sequence).block,0);
 }
 assert.equal(sampleFinishBalance(10.4,'normal').load,0);
});
