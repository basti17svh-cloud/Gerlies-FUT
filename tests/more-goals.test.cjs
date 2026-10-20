const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');
// V21.204 (Basti): many more attacks and goal variants. Presentation only.
test('goal variants: in off the bar, in off the post and into the top corner, always ending in the net',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 for(const style of M.GOAL_STYLES)for(const side of [-1,1])for(const [seq,finish] of [['central','normal'],['long_shot','power'],['cut_inside_right','finesse'],['edge_rocket','power']]){
  const placement={side,zone:'corner',height:'high',style},hit=M.shotArrival('goal',seq,finish,placement),impact=M.shotImpact('goal',seq,finish,placement);
  assert.deepEqual(M.ballPosition('goal',hit,seq,finish,'classic',placement),impact,style+' reaches its impact point');
  if(style==='crossbar_in')assert.ok(impact[1]>2.2&&impact[1]<2.44&&Math.abs(impact[2]+52.5)<.1,'under the bar on the goal line');
  if(style==='post_in')assert.ok(Math.abs(Math.abs(impact[0])-3.46)<.01&&Math.sign(impact[0])===side,'inside of the post');
  if(style==='top_corner')assert.ok(impact[1]>2&&Math.abs(impact[0])>3,'top corner');
  let prev=null;
  for(let t=M.SHOT_TIME;t<=hit+M.goalNetDelay(placement)+1.2;t+=.01){
   const p=M.ballPosition('goal',t,seq,finish,'classic',placement);
   assert.ok(p.every(Number.isFinite)&&p[1]>=.1,style+' valid ball at '+t);
   if(prev)assert.ok(Math.hypot(...p.map((v,i)=>v-prev[i]))<.75,style+' continuous at '+t);
   prev=p;
  }
  const net=M.ballPosition('goal',hit+M.goalNetDelay(placement)+1,seq,finish,'classic',placement);
  assert.ok(net[2]<-52.7&&Math.abs(net[0])<3.6&&net[1]<2.44,style+' ends inside the goal');
 }
});
test('goal variants are chosen only for goals, kept by the snapshot and common for long shots',()=>{
 const count={},far={};
 for(let i=0;i<4000;i++){
  const e={id:'v'+i,type:'goal',team:'home',minute:i%90,playerName:'ST',creatorName:'ZM'},p=H.choosePresentation(e),pl=H.chooseShotPlacement({...e,...p});
  count[pl.style||'none']=(count[pl.style||'none']||0)+1;
  const l=H.chooseShotPlacement({...e,sequence:'long_shot',finish:'power'});far[l.style||'none']=(far[l.style||'none']||0)+1;
  if(pl.style==='top_corner')assert.deepEqual([pl.zone,pl.height],['corner','high']);
  assert.equal(H.chooseShotPlacement({...e,...p,type:'big_chance_saved'}).style,undefined);
  assert.equal(H.chooseShotPlacement({...e,sequence:'near_post_left',finish:'header'}).style,undefined);
 }
 for(const style of ['crossbar_in','post_in','top_corner'])assert.ok(count[style]>120,style+' shows up');
 assert.ok(count.none>count.crossbar_in*5,'special goals stay special');
 assert.ok(far.top_corner>1000,'long shots often go into the top corner');
 const snap=H.snapshot({id:'x',type:'goal',shotPlacement:{side:1,zone:'corner',height:'high',style:'crossbar_in'}});
 assert.equal(snap.shotPlacement.style,'crossbar_in');
 assert.equal(H.snapshot({id:'x',type:'goal',shotPlacement:{side:1,zone:'corner',height:'high',style:'<b>'}}).shotPlacement.style,undefined);
});
test('forty-two more attacks, each reachable, with its own finishing spot',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs');
 assert.equal(P.MORE_ATTACK_IDS.length,42);
 const seen=new Set(),spots=new Set();
 const kinds=[['distance','power'],['cross','header'],['cross','volley'],['cross','normal'],['through','normal'],['dribble','normal'],['combination','normal'],['switch','normal'],['cutback','normal'],[undefined,'normal'],['through','chip']];
 for(let i=0;i<20000;i++){const [actionKind,finish]=kinds[i%kinds.length];seen.add(H.choosePresentation({id:'more-'+i,type:['goal','big_chance_saved','big_chance_missed'][i%3],team:'home',minute:i%90,playerName:'ST',creatorName:'ZM',creationType:'assist',actionKind,finish}).sequence)}
 for(const id of P.MORE_ATTACK_IDS){
  assert.ok(seen.has(id),id+' selected in production');
  const plan=P.getPlay(id),registered=H.PLAYBOOK_SCENES.find(p=>p.id===id);
  assert.deepEqual([registered.family,registered.finish,registered.seconds],[plan.family,plan.finish,plan.seconds]);
  const shooter=M.runPosition(0,M.SHOT_TIME,id);spots.add(shooter.map(v=>Math.round(v)).join(','));
  const contact=M.shotContact(id,plan.finish,{side:1,zone:'corner',height:'high'});
  assert.ok(Math.hypot(contact[0]-shooter[0],contact[2]-shooter[1])<1,id+' contact at shooter');
 }
 assert.ok(spots.size>=30,'distinct shot locations: '+spots.size);
});
