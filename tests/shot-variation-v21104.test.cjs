const test=require('node:test'),assert=require('node:assert/strict');
const H=require('../3d-highlights.js');

test('deterministic shot placement uses both goal corners and three target lanes',()=>{
 const directions=new Set(),zones=new Set(),history=[];
 for(let n=0;n<90;n++){
  const event={id:'chance:'+n,minute:n,team:'home',type:'goal',sequence:'central',finish:'normal'};
  const target=H.chooseShotPlacement(event,history);
  assert.deepEqual(target,H.chooseShotPlacement(event,history));
  assert.ok(Object.isFrozen(target));
  directions.add(target.side);zones.add(target.zone);history.push({shotSide:target.side});
 }
 assert.equal(directions.size,2);assert.equal(zones.size,3);
});

test('each visual result remains a goal, save, miss or post for either corner',async()=>{
 const S=await import('../3d-highlights-scene.mjs');
 for(const type of H.TYPES)for(const side of [-1,1]){
  const placement={side,zone:'corner',height:'high'},impact=S.shotImpact(type,'central','normal',placement);
  assert.equal(Math.sign(impact[0]),side);
  assert.deepEqual(S.ballPosition(type,S.IMPACT_TIME,'central','normal','classic',placement),impact);
  assert.equal(Math.sign(S.keeperPose(type,S.IMPACT_TIME,'normal','central','classic',placement).x),side);
  if(type==='goal')assert.ok(Math.abs(impact[0])<3.66&&impact[1]<2.44);
  if(type==='big_chance_missed')assert.ok(Math.abs(impact[0])>3.66);
  if(type==='shot_post')assert.ok(Math.abs(Math.abs(impact[0])-3.66)<.16);
 }
});

test('new tactical routes have different runs but the same canonical ball contact',async()=>{
 const P=await import('../3d-playbook.mjs');
 const ids=['halfspace_overload_left','halfspace_overload_right','counter_reversal_left','counter_reversal_right',
  'wing_isolation_left','wing_isolation_right','late_cutback_left','late_cutback_right'];
 const positions=new Set();
 for(const id of ids){
  const plan=P.getPlay(id);
  assert.ok(plan,'missing '+id);
  assert.ok(H.PLAYBOOK_SCENES.some(item=>item.id===id),'not selectable '+id);
  assert.deepEqual(P.playBall(plan,5.4,[.105,.14,-37.2]),[.105,.14,-37.2]);
  positions.add(JSON.stringify(P.playPosition(0,2.7,plan)));
 }
 assert.ok(positions.size>=5,'needs visibly different attack lanes');
});

test('immutable queue snapshots retain placement without exposing live state',()=>{
 const event={id:'goal:3',type:'goal',minute:31,team:'away',playerId:'9',playerName:'Stürmer',
  shotPlacement:{side:-1,zone:'corner',height:'low'}};
 const copy=H.snapshot(event);
 event.shotPlacement.side=1;
 assert.deepEqual(copy.shotPlacement,{side:-1,zone:'corner',height:'low'});
 assert.ok(Object.isFrozen(copy.shotPlacement));
});
