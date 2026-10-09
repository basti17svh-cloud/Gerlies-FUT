'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../3d-footwork-dynamics.mjs');
const snapshot=s=>JSON.parse(JSON.stringify(s));
const part=()=>({rotation:{x:0,y:0,z:0}});
const body=p=>JSON.stringify({rig:p.rig,upper:p.upper,legs:p.legs,knees:p.knees,ankles:p.ankles});
const actor=()=>({rig:{position:{y:0},rotation:{x:0,y:0,z:0}},upper:part(),
 legs:[part(),part()],knees:[part(),part()],ankles:[part(),part()],
 footworkState:{feet:[{},{}]}});
test('V21.78: stance to swing cycles stay continuous, and both boots alternate',async()=>{
 const {sampleFootwork,FOOTERA_FOOTWORK_VERSION}=await load();
 assert.match(FOOTERA_FOOTWORK_VERSION,/21\.78/);
 const v=.84,duty=.60-.32*v;
 const around=t=>snapshot(sampleFootwork(1.8,v,0,-.6,t,{feet:[{},{}]}));
 const a=around((duty-.0001)*2*Math.PI),b=around((duty+.0001)*2*Math.PI);
 for(const key of ['anklePitch','kneePitch','hipPitch','hipRoll','ankleYaw']){
  assert.ok(Math.abs(a.feet[0][key]-b.feet[0][key])<.01,'toe-off boundary: '+key);
 }
 const support=around(.18*Math.PI),swing=around(Math.PI);
 assert.equal(support.feet[0].support,true);
 assert.equal(swing.feet[0].support,false);
 assert.equal(swing.feet[1].support,true);
 assert.ok(swing.feet[0].anklePitch>.02,'airborne boot actively dorsiflexes');
 assert.ok(swing.feet[0].swing>.2);
});
test('V21.78: braking load, acceleration and mirrored turns are physically distinct',async()=>{
 const {sampleFootwork}=await load();
 const s=(turn,acceleration)=>snapshot(sampleFootwork(1.8,.85,turn,acceleration,.55,{feet:[{},{}]}));
 const brake=s(.08,-.8),burst=s(.08,.8);
 assert.ok(brake.brake>.6&&brake.burst===0);
 assert.ok(burst.burst>.6&&burst.brake===0);
 assert.ok(brake.rigDrop>0&&brake.torsoPitch>0&&burst.torsoPitch<0);
 const right=s(.12,-.3),left=s(-.12,-.3);
 assert.ok(Math.abs(right.feet[0].ankleYaw+left.feet[0].ankleYaw)<1e-12);
 assert.ok(Math.abs(right.bank+left.bank)<1e-12);
 assert.deepEqual(s(.08,-.8),brake,'repeated absolute-time frames are identical');
});
test('V21.78: old shot contact and goalkeeper stay untouched by the additive run layer',async()=>{
 const {sampleFootwork,applyFootwork}=await load();
 const player=actor();
 for(const t of [4.9,5.12,5.4,5.6,5.95]){
  const before=body(actor());
  const p=actor();const sampled=applyFootwork(p,t,.84,.1,-.65,Math.PI);
  assert.equal(sampled.weight,0,'footwork silenced at shot time '+t);
  assert.equal(body(p),before,'no joint drift during canonical contact '+t);
 }
 const running=actor();const originalRoot=JSON.stringify(running.rig.rotation);
 applyFootwork(running,1.65,.84,.1,-.65,Math.PI);
 assert.ok(running.rig.position.y<0,'braking lowers centre of mass');
 assert.equal(JSON.stringify(running.rig.rotation),originalRoot,'world-facing root is never rotated');
 const seek=actor();applyFootwork(seek,2.55,.73,-.07,-.4,7);
 const first=JSON.stringify(seek);
 applyFootwork(seek,2.55,.73,-.07,-.4,7);
 // Real scene invokes resetPose every update; replay on a reset actor.
 const replay=actor();applyFootwork(replay,2.55,.73,-.07,-.4,7);
 assert.equal(JSON.stringify(replay),first);
 assert.ok(sampleFootwork(6.6,.75,0,0,3,{feet:[{},{}]}).weight>.5,'running returns after shot');
});
test('V21.78: bounded on LOW, no action-layer modification of sim result or goalkeeper',async()=>{
 const {sampleFootwork}=await load();
 for(const time of [0,.12,1.4,3.1,4.71,4.89,4.9,5.4,6.25,6.5,9.9,NaN,Infinity]){
  const s=sampleFootwork(time,.9,.14,-1,13,{feet:[{},{}]});
  assert.ok(s.weight>=0&&s.weight<=1);
  for(const f of s.feet)for(const [key,value] of Object.entries(f))
   if(typeof value==='number')assert.ok(Number.isFinite(value)&&Math.abs(value)<(key==='swing'||key==='load'?1.001:.5),key);
 }
 const fs=require('node:fs'),path=require('node:path');
 const root=path.resolve(__dirname,'..');
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(scene,/applyFootwork\(p,time,speed,turn,acceleration,stride,guard\)/);
 assert.match(scene,/footworkState:\{feet:\[\{\},\{\}\]\}/);
 assert.match(scene,/groundedFootwork:/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'3d-footwork-dynamics.mjs'),'utf8'),/Math\.random|setTimeout|fetch\(/);
});

test('V21.78: sprint arm pump counters each step and cornering has mirrored body load',async()=>{
 const {applyFootwork,sampleFootwork}=await load();
 const walk=sampleFootwork(2,.3,0,.1,Math.PI/2);
 const sprint=sampleFootwork(2,.92,0,.1,Math.PI/2);
 assert.ok(sprint.sprint>.95&&walk.sprint<.001);
 assert.ok(Math.abs(sprint.armDrive)>.07);
 const p=actor();p.arms=[part(),part()];p.elbows=[part(),part()];
 applyFootwork(p,2,.92,0,.1,Math.PI/2);
 assert.ok(Math.abs(p.arms[0].rotation.x+p.arms[1].rotation.x)<1e-12);
 assert.ok(Math.abs(p.elbows[0].rotation.x)>.05);
 const left=sampleFootwork(2,.9,-.14,-.8,.7);
 const right=sampleFootwork(2,.9,.14,-.8,.7);
 assert.ok(Math.abs(left.feet[0].ankleYaw+right.feet[0].ankleYaw)<1e-12);
 assert.ok(Math.abs(left.torsoRoll+right.torsoRoll)<.03);
});
test('V21.78: shot plant ends before 4.90s and header/volley stay protected',async()=>{
 const {applyShotApproach}=await load();
 const player=actor();player.arms=[part(),part()];
 const w=applyShotApproach(player,4.52,'power','cut_inside_right');
 assert.ok(w>.7);assert.ok(player.legs[0].rotation.x<0&&player.legs[1].rotation.x<0);
 for(const t of [4.9,5.12,5.4,5.98]){
  const a=actor();a.arms=[part(),part()];
  assert.equal(applyShotApproach(a,t,'power'),0);
  assert.equal(a.legs[0].rotation.x,0);
  assert.equal(a.upper.rotation.y,0);
 }
 assert.equal(applyShotApproach(player,4.52,'header'),0);
 assert.equal(applyShotApproach(player,4.52,'volley'),0);
});
