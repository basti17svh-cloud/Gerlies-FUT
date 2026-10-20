const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');
// V21.195: more and more varied 3D scenes. All of it is presentation only.
test('set pieces cut to their own TV angle: behind the penalty taker, over the wall; corners use the normal TV camera',async()=>{
 const E=await import('../3d-extended-match.mjs');
 for(const direction of [1,-1]){
  const penalty=E.extendedSetPieceCamera('extended_penalty',5,direction,.9);
  assert.equal(penalty.shot,'behind-taker');
  // Behind the spot, looking at the goal the taker shoots at.
  assert.ok(Math.abs(penalty.position[2])<Math.abs(penalty.target[2]));
  assert.ok(Math.sign(penalty.target[2])===-direction);
  assert.ok(E.extendedSetPieceCamera('extended_free_kick',3,direction,.9));
  // V21.203 (Basti): no corner-flag angle any more.
  for(const t of [1,2.5,4,6])for(const seq of ['extended_corner','extended_corner_right'])assert.equal(E.extendedSetPieceCamera(seq,t,direction,.9),null);
 }
 // The ordinary broadcast picture returns afterwards and for other restarts.
 assert.equal(E.extendedSetPieceCamera('extended_penalty',8,1,.9),null);
 assert.equal(E.extendedSetPieceCamera('extended_corner',1,1,.9),null);
 assert.equal(E.extendedSetPieceCamera('extended_throw_in',4,1,.9),null);
});
test('a corner is finished with a header unless the simulation chose a volley or bicycle kick',()=>{
 const corner=finish=>H.choosePresentation({id:'c',type:'goal',sceneKind:'corner',finish}).finish;
 assert.equal(corner('normal'),'header');assert.equal(corner(''),'header');assert.equal(corner('volley'),'volley');
 assert.equal(H.choosePresentation({id:'p',type:'goal',sceneKind:'penalty',finish:'normal'}).finish,'normal');
});
test('star moments: screamers, volleys, bicycle kicks and solo feints are reachable for simulated chances',()=>{
 const seen=(fields,count=3000)=>{const s=new Set();for(let i=0;i<count;i++)s.add(H.choosePresentation({id:'star-'+i,type:'goal',team:'home',creatorName:'ZM',...fields}).sequence);return s};
 const distance=seen({actionKind:'distance',finish:'power'});
 assert.ok(distance.has('long_shot')&&distance.has('power_drive'));
 assert.ok(seen({actionKind:'distance',finish:'finesse'}).has('finesse_halfspace'));
 assert.ok(seen({actionKind:'dribble',finish:'normal',creatorName:''}).has('double_feint_left'));
 const volley=seen({actionKind:'cross',finish:'volley'});
 assert.ok(volley.has('volley_left')&&!volley.has('bicycle'),'no bicycle kick without the Acrobatic PlayStyle');
 const acrobat=[...Array(3000)].map((_,i)=>H.choosePresentation({id:'bike-'+i,type:'goal',creatorName:'ZM',actionKind:'cross',finish:'volley',playerStyles:[{id:'acrobatic',plus:true}]}));
 const bike=acrobat.find(x=>x.sequence==='bicycle');
 assert.ok(bike);assert.equal(bike.finish,'bicycle');
});
test('drama: some misses are cleared off the line, saves and goals never are',()=>{
 const action=(type,i,seq='central')=>H.chooseReactions({id:'m'+i,type,sequence:seq,finish:'normal'}).keeperAction;
 const misses=[...Array(400)].map((_,i)=>action('big_chance_missed',i));
 assert.ok(misses.includes('line_clear')&&misses.includes('beaten'));
 for(let i=0;i<200;i++){assert.notEqual(action('big_chance_saved',i),'line_clear');assert.equal(action('goal',i),'beaten');assert.notEqual(action('big_chance_missed',i,'extended_corner'),'line_clear')}
});
test('drama: the cleared ball stops on the line in front of the net and flies back out',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const at=M.ballPosition('big_chance_missed',M.IMPACT_TIME,'central','normal','line_clear');
 assert.ok(Math.abs(at[0])<3.66&&at[2]>-52.5,'blocked inside the posts, before the goal line');
 const later=M.ballPosition('big_chance_missed',M.IMPACT_TIME+1.5,'central','normal','line_clear');
 assert.ok(later[2]>at[2]+8&&Math.abs(later[0])>10);
});
test('drama: only a late equaliser or winner counts as a late goal',async()=>{
 const {lateGoalDrama}=await import('../3d-highlights-scene.mjs');
 const goal=(minute,home,away,team='home')=>lateGoalDrama({type:'goal',minute,team,scoreBeforeHome:home,scoreBeforeAway:away});
 assert.equal(goal(90,1,1),'winner');assert.equal(goal(89,0,1),'equaliser');assert.equal(goal(92,1,1,'away'),'winner');assert.equal(goal(91,2,1,'away'),'equaliser');
 assert.equal(goal(90,2,0),null);assert.equal(goal(70,1,1),null);assert.equal(goal(90,0,2),null);
 assert.equal(lateGoalDrama({type:'big_chance_saved',minute:90,scoreBeforeHome:1,scoreBeforeAway:1}),null);
 assert.equal(lateGoalDrama({type:'goal',minute:90,team:'home'}),null);
});
