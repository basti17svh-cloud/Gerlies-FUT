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
