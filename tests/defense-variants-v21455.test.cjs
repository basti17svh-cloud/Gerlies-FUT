// V21.455 Abwehraktionen: wing shoulder duel, covering recovery tackle and a
// read pass lane, each mirrored. Only the picture of a real simulator ball win.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

test('new ball wins: human run speeds, no run-through, mirrored lanes',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs');
 const fresh=P.DEFENSIVE_SCENES.filter(s=>/_duel|_chase|_lane/.test(s));
 assert.equal(fresh.length,10);
 for(const seq of fresh){
  for(const i of [0,1,8]){
   let p=M.playerPosition(i,0,'ball_won',seq);
   for(let n=1;n<=1040;n++){const t=n/100,q=M.playerPosition(i,t,'ball_won',seq);assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])/.01<8.2,seq+' actor '+i+' speed at '+t);assert.ok(Math.abs(q[0])<=34&&Math.abs(q[1])<=52.5,seq+' on pitch');p=q}
  }
  // The winner arrives beside the carrier; he never runs through him first.
  for(let n=0;n<=420;n+=5){const t=n/100,a=M.playerPosition(0,t,'ball_won',seq),d=M.playerPosition(8,t,'ball_won',seq);assert.ok(Math.hypot(a[0]-d[0],a[1]-d[1])>.85,seq+' run-through at '+t)}
  if(seq.endsWith('_wide')){const base=seq.slice(0,-5);for(const t of [0,2,4.4,7]){const a=P.defensePosition(8,t,base),b=P.defensePosition(8,t,seq);assert.ok(Math.abs(a[0]+b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9,seq+' mirror')}}
 }
 // Each new lane really differs from the original scene.
 for(const seq of ['defense_standing_tackle_duel','defense_standing_tackle_chase','defense_interception_lane'])
  assert.ok(Math.hypot(...P.defensePosition(0,3,seq).map((v,i)=>v-P.defensePosition(0,3,seq.replace(/_duel|_chase|_lane/,''))[i]))>5,seq);
 assert.ok(P.isDefenseInterception('defense_interception_lane_wide')&&!P.isDefenseInterception('defense_slide_tackle_chase'));
});

test('the match bridge rotates through the variants without repeating',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
 const body=src.slice(src.indexOf('function queueMatchDefensive3D'),src.indexOf('function queueMatchGoal3D'));
 assert.match(body,/match\.lastDefenseSequence=sequence/);
 assert.doesNotMatch(body,/Math\.random/,'presentation draws no match randomness');
});
