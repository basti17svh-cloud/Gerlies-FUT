const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const file=pathToFileURL(path.resolve(__dirname,'../3d-motion-transition.mjs')).href;
test('Motion 2.3 has distinct deterministic brake, release and pass cushion for gameplay sequences',async()=>{
 const {sampleMotion23}=await import(file);
 const s=(t,q)=>sampleMotion23(t,.7,.04,2.9,0,q,'carrier');
 const brake=s(2.52,'dribble'),launch=s(3.25,'dribble'),receive=s(4.56,'through_ball');
 assert.equal(brake.phase,'brake-to-control');assert.ok(brake.brake>.75);
 assert.equal(launch.phase,'accelerate-away');assert.ok(launch.launch>.75);
 assert.equal(receive.phase,'cushion-pass');assert.ok(receive.cushion>.60);
 assert.deepEqual(s(2.52,'dribble'),brake);
 assert.ok(s(5.4,'through_ball').contact<1e-10,'canonical 5.4s kick unchanged');
 const mirrored=sampleMotion23(3.08,.7,-.08,1,0,'cut_inside_left','carrier');
 assert.equal(mirrored.contact,0,'existing winger 2.2 owns the cut');
 assert.equal(s(2.52,'central').brake,0,'unrelated carrier event not given a scripted brake');
});
test('PlayStyles modify only the corresponding visual transition pose',async()=>{
 const {sampleMotion23,applyMotion23}=await import(file);
 const args=[4.56,.7,0,1.4,0,'through_ball','carrier'];
 const base=sampleMotion23(...args),styled=sampleMotion23(...args,[{id:'first-touch',plus:true}]);
 assert.ok(styled.cushion>base.cushion);
 const b=sampleMotion23(3.25,.7,0,1.4,0,'dribble','carrier');
 const fast=sampleMotion23(3.25,.7,0,1.4,0,'dribble','carrier',[{id:'quick-step',plus:true}]);
 assert.ok(fast.launch>b.launch);
 const mock=()=>({gait:[{support:true},{support:false}],upper:{rotation:{x:0,y:0,z:0}},rig:{position:{y:0},rotation:{y:0}},
  arms:[{rotation:{x:0,z:0}},{rotation:{x:0,z:0}}],legs:[{rotation:{x:0}},{rotation:{x:0}}],
  knees:[{rotation:{x:0}},{rotation:{x:0}}],ankles:[{rotation:{x:0}},{rotation:{x:0}}]});
 const player=mock();applyMotion23(player,...args,[{id:'first-touch',plus:true}]);
 assert.ok(player.legs[1].rotation.x>.18,'free foot visibly receives pass');
 assert.ok(player.knees[0].rotation.x<-.09,'supporting knee cushions');
 const before=JSON.stringify(mock()),none=mock();applyMotion23(none,5.4,.7,.06,2,0,'through_ball','carrier');
 assert.equal(JSON.stringify(none),before,'shot-contact skeleton not changed');
});
test('All motion transition outputs are finite and symmetric on banking turns',async()=>{
 const {sampleMotion23,applyMotion23}=await import(file);
 for(const t of [0,1.12,2.52,3.25,4.56,5.4,9.1]){
  for(const sequence of ['dribble','through_ball','one_two','cut_inside_left','cut_inside_right']){
   const a=sampleMotion23(t,.62,.1,2.5,-.3,sequence,'carrier');
   for(const k of ['cushion','brake','launch','bank','contact'])assert.ok(Number.isFinite(a[k]));
  }
 }
 const a=sampleMotion23(2.52,.62,.1,2.5,-.3,'dribble','provider');
 const b=sampleMotion23(2.52,.62,-.1,2.5,-.3,'dribble','provider');
 assert.ok(Math.abs(a.bank+b.bank)<1e-8);
});
