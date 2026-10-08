const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const A=()=>import('../3d-action-motion.mjs');
function bone(){return{rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}}}
function actor(){return{root:bone(),rig:bone(),upper:bone(),shadow:bone(),legs:[bone(),bone()],knees:[bone(),bone()],ankles:[bone(),bone()],arms:[bone(),bone()],elbows:[bone(),bone()]}}
test('TV-scale winger cut plants outside boot, banks and counterturns then releases cleanly',async()=>{
 const a=await A(),p=actor();
 const t=3.1,m=a.applyVisibleInvertedCut(p,t,'cut_inside_right');
 assert.ok(m.plant>.5&&m.redirect>.3);
 assert.ok(p.upper.rotation.z>.1);
 assert.ok(p.knees[1].rotation.x<-.10);
 const left=actor();a.applyVisibleInvertedCut(left,t,'cut_inside_left');
 assert.ok(left.upper.rotation.z<-.10,'mirrored outside-leg banking');
 const central=actor();a.applyVisibleInvertedCut(central,t,'central');
 assert.equal(central.upper.rotation.z,0);
 const contact=actor();assert.equal(a.applyVisibleInvertedCut(contact,5.4,'cut_inside_right').plant,0);
 assert.equal(contact.upper.rotation.z,0,'kick contact untouched');
});
test('Goalkeeper full-body push, flight, grounded landing with mirrored lateral travel',async()=>{
 const a=await A(),p=actor();
 const warm=a.divingBodyTrajectory(5.45,'big_chance_saved','classic',1);
 const flight=a.divingBodyTrajectory(6.4,'big_chance_saved','classic',1);
 const left=a.divingBodyTrajectory(6.4,'big_chance_saved','classic',-1);
 const landing=a.divingBodyTrajectory(7.14,'big_chance_saved','classic',1);
 assert.equal(warm.lateral,0);
 assert.ok(flight.flight>.5&&flight.lateral>.25,'keeper torso actually moves sideways');
 assert.ok(Math.abs(flight.lateral+left.lateral)<1e-12);
 assert.ok(landing.landing>.35,'landing is its own pose');
 const m=a.applyVisibleKeeperFlight(p,6.4,'big_chance_saved','classic',2.52);
 assert.ok(p.root.position.x>.25&&m.flight>.5);
 assert.ok(p.rig.rotation.z>.12,'keeper visible sideways lean');
 assert.equal(p.root.position.y+p.shadow.position.y,.0,'shadow stays on ground');
});
test('No extra shift after recovery and no screen/camera/ball result alteration',async()=>{
 const a=await A(),p=actor();
 assert.equal(a.divingBodyTrajectory(9.2,'goal','classic',1).lateral,0);
 a.applyVisibleKeeperFlight(p,9.2,'goal','classic',2.65);
 assert.equal(p.root.position.x,0);
 const code=readFileSync(require('node:path').resolve(__dirname,'../3d-action-motion.mjs'),'utf8');
 assert.ok(!code.includes('Math.random'));
 assert.ok(!code.includes('shotResult'));
});

test('motion repertoire gives dribble two opposing planted steps and separate acceleration',async()=>{
 const a=await A();
 const first=a.contextualAttackTrajectory(2.17,'dribble');
 const second=a.contextualAttackTrajectory(3.25,'dribble');
 const burst=a.contextualAttackTrajectory(4.15,'dribble');
 assert.ok(first.step>.5&&first.reverse<.01);
 assert.ok(second.reverse>.5&&second.step<.01);
 assert.ok(burst.drive>.5);
 const left=actor(),right=actor();
 a.applyContextualAttackerMotion(left,2.17,'halfspace_left');
 a.applyContextualAttackerMotion(right,2.17,'halfspace_right');
 assert.equal(left.upper.rotation.z,0);
 assert.equal(right.upper.rotation.z,0);
 const f=actor(),g=actor();
 a.applyContextualAttackerMotion(f,3.16,'halfspace_left');
 a.applyContextualAttackerMotion(g,3.16,'halfspace_right');
 assert.ok(f.upper.rotation.z<-.1&&g.upper.rotation.z>.1,'mirrored directional setup');
});
test('one-two, through runs, crossing winger and double feint use independent animations',async()=>{
 const a=await A();
 for(const [name,time,kind] of [['one_two',2.68,'one_two'],['through_ball',3.30,'burst'],['cutback_right',2.75,'cutback'],['wing_left',2.75,'wing']]){
  const role=kind==='cutback'||kind==='wing'?1:0;
  const p=actor(),m=a.applyContextualAttackerMotion(p,time,name,role);
  assert.equal(m.kind,kind);
  assert.ok(Math.abs(p.upper.rotation.z)+Math.abs(p.upper.rotation.x)>.04,name);
 }
 const fake=a.invertedCutBodyTrajectory(2.30,'double_feint_right');
 const planted=a.invertedCutBodyTrajectory(3.3,'double_feint_right');
 assert.ok(fake.feint>.4&&fake.plant===0,'first feint opposite the second planted cut');
 assert.ok(planted.plant>.4&&planted.feint===0);
 const wide=actor();
 assert.equal(a.applyContextualAttackerMotion(wide,3.61,'wing_left',1).step,0);
 assert.equal(wide.upper.rotation.z,0,'wing delivery contact must remain untouched');
 const contact=actor();
 a.applyContextualAttackerMotion(contact,5.4,'dribble');
 assert.equal(contact.upper.rotation.z,0,'shot impact must remain untouched');
 assert.equal(contact.legs[1].rotation.x,0,'ball-striking limb untouched');
});
test('keeper post-save recovery is visible but never shifts save contact or result',async()=>{
 const a=await A(),early=a.divingBodyTrajectory(6.65,'big_chance_saved','fingertip',1),late=a.divingBodyTrajectory(8.36,'big_chance_saved','fingertip',1);
 assert.equal(early.recover,0);
 assert.ok(late.recover>.2);
 const p=actor();a.applyVisibleKeeperFlight(p,8.36,'big_chance_saved','fingertip',2.2);
 assert.ok(Math.abs(p.upper.rotation.y)>.02);
 assert.equal(p.root.position.y+p.shadow.position.y,0);
 const fail=actor();a.applyVisibleKeeperFlight(fail,8.36,'goal','classic',2.2);
 assert.equal(fail.upper.rotation.y,0);
});
