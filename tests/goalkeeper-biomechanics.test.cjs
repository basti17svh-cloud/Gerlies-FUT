const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),load=()=>import('../3d-goalkeeper-biomechanics.mjs');
const part=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
const rig=()=>({root:part(),rig:part(),upper:part(),shadow:part(),
 arms:[part(),part()],elbows:[part(),part()],legs:[part(),part()],
 knees:[part(),part()],ankles:[part(),part()]});

test('keeper loads, launches, absorbs and recovers with separate phases',async()=>{
 const {sampleGoalkeeperMotion:sample}=await load();
 const early=sample(4.7,'big_chance_saved','classic',2.5,1.1),
       loaded=sample(5.62,'big_chance_saved','classic',2.5,1.1),
       flight=sample(6.34,'big_chance_saved','classic',2.5,1.1),
       ground=sample(7.45,'big_chance_saved','classic',2.5,1.1),
       up=sample(9.6,'big_chance_saved','classic',2.5,1.1);
 assert.ok(early.shuffle>.25);
 assert.ok(loaded.plant>.3);
 assert.ok(flight.flight>.70);
 assert.ok(ground.grounded>.7);
 assert.equal(up.rise,1);
 for(const item of [early,loaded,flight,ground,up])
  assert.ok(Object.values(item).filter(v=>typeof v==='number').every(Number.isFinite));
});

test('asymmetric hips, knees and reaching arms mirror for both shot corners',async()=>{
 const {applyGoalkeeperMotion:apply}=await load(),a=rig(),b=rig(),t=6.27;
 const right=apply(a,t,{tilt:.9,y:.36},'big_chance_saved','parry',2.52,1.1),
  left=apply(b,t,{tilt:-.9,y:.36},'big_chance_saved','parry',-2.52,1.1);
 assert.equal(right.side,1);assert.equal(left.side,-1);
 assert.notEqual(a.legs[0].rotation.x,a.legs[1].rotation.x);
 assert.notEqual(a.knees[0].rotation.x,a.knees[1].rotation.x);
 assert.ok(Math.abs(a.root.position.x+b.root.position.x)<.001);
 assert.ok(a.arms[0].rotation.z<0&&b.arms[1].rotation.z>0);
 assert.ok(a.rig.rotation.z>0&&b.rig.rotation.z<0);
});

test('different save styles have distinct postures and conceded shots do not fake catches',async()=>{
 const {applyGoalkeeperMotion:apply}=await load(),poses=new Set();
 for(const kind of ['classic','fingertip','parry','low_reflex','rush_spread','high_reach']){
  const body=rig();apply(body,6.30,{tilt:.8,y:.4},'big_chance_saved',kind,2.52,1.1);
  poses.add(JSON.stringify([body.rig.rotation.x,body.upper.rotation.y,body.legs[0].rotation.z,body.arms[0].rotation.x,body.elbows[0].rotation.x]));
 }
 assert.equal(poses.size,6);
 const goal=rig(),save=rig();
 apply(goal,6.30,{tilt:.8,y:.4},'goal','classic',2.52,1.1);
 apply(save,6.30,{tilt:.8,y:.4},'big_chance_saved','classic',2.52,1.1);
 assert.ok(Math.abs(goal.arms[0].rotation.z)<Math.abs(save.arms[0].rotation.z));
});

test('keeper animation is deterministic and cannot consume simulation RNG',async()=>{
 const {applyGoalkeeperMotion:apply,sampleGoalkeeperMotion:sample}=await load();
 const source=fs.readFileSync(path.join(root,'3d-goalkeeper-biomechanics.mjs'),'utf8');
 for(const forbidden of ['Math.random','match.','window.','document.'])assert.ok(!source.includes(forbidden),forbidden);
 const one=rig(),two=rig(),base={tilt:-1,y:.3};
 apply(one,6.4,base,'big_chance_saved','fingertip',-2.5,2.05);
 apply(two,6.4,base,'big_chance_saved','fingertip',-2.5,2.05);
 assert.deepEqual(one,two);
 assert.deepEqual(sample(6.4,'goal','classic',-2.5),sample(6.4,'goal','classic',-2.5));
});

test('a shot far outside the post does not drag the keeper out of the goalmouth',async()=>{
 const {applyGoalkeeperMotion:apply}=await load();
 for(const side of [-1,1]){
  const body=rig();apply(body,6.65,{x:side*.8,y:.4,tilt:side},'big_chance_missed','classic',side*6.05,1.5);
  assert.ok(Math.abs(body.root.position.x)<1.2);
 }
});

test('scene delegates to one keeper controller; saved ball gets short contact-only glove IK',()=>{
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.ok(scene.includes('applyGoalkeeperMotion(keeper,time,kp'));
 for(const obsolete of ['animateGoalkeeperDive(keeper,time','applyKeeperMocap(keeper,time','keeperClipWeight='])
  assert.ok(!scene.includes(obsolete),obsolete);
 assert.ok(scene.includes('if(saved&&toContact>.001)'));
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.ok(sw.includes('./3d-goalkeeper-biomechanics.mjs?v=21114'));
});
