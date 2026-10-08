const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const load=()=>import('../3d-squad-motion.mjs');
function joint(){return{position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0}}}
function actor(){return{root:joint(),rig:joint(),upper:joint(),arms:[joint(),joint()],elbows:[joint(),joint()],legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()],gait:[{support:true},{support:false}]}}
function pose(p){return[p.rig,p.upper,...p.arms,...p.elbows,...p.legs,...p.knees,...p.ankles].flatMap(j=>Object.values(j.rotation))}
test('all 15 instanced field players have unsynchronized upper/lower body motions',async()=>{
 const m=await load(),kinds=new Set();
 for(let index=1;index<16;index++){
  const p=actor(),baseline=actor(),phase=2.37+index*1.27;
  m.applySquadLocomotion(p,index,2.8,.78,index%2?.10:-.10,phase,.4,index>=8?5:20);
  assert.ok(Math.hypot(...pose(p))>.25,'athlete '+index+' must have visible motion');
  assert.ok(pose(p).every(Number.isFinite));
  kinds.add(p.upper.rotation.z.toFixed(6));
  assert.deepEqual(p.root.position,baseline.root.position,'no position change');
 }
 assert.ok(kinds.size>=10,'individual gait phases must differ');
});
test('foot-plant preserved and acceleration/marking visibly differ',async()=>{
 const m=await load(),fast=actor(),slow=actor();
 m.applySquadLocomotion(fast,8,3.1,.94,.13,1.56,.8,3);
 m.applySquadLocomotion(slow,8,3.1,.1,0,1.56,0,30);
 assert.equal(fast.ankles[0].rotation.x,0,'standing boot untouched');
 assert.ok(fast.ankles[1].rotation.x>.11,'airborne boot clears turf');
 assert.ok(fast.knees[1].rotation.x<-.25,'free knee bends');
 assert.ok(Math.abs(fast.arms[1].rotation.x)>.2,'visible arm drive');
 assert.ok(fast.arms[1].rotation.z>slow.arms[1].rotation.z+.15,'nearby marker braces');
});
test('idle scanning without walking in place; deterministic and ball-independent',async()=>{
 const m=await load(),a=actor(),b=actor();
 m.applySquadLocomotion(a,4,2,0,0,0,0,99);
 m.applySquadLocomotion(b,4,2,0,0,0,0,99);
 assert.deepEqual(pose(a),pose(b));
 assert.ok(Math.abs(a.upper.rotation.y)>.01);
 assert.equal(a.ankles[0].rotation.x,0);
 assert.equal(a.ankles[1].rotation.x,0);
 const s=readFileSync(require('node:path').resolve(__dirname,'../3d-squad-motion.mjs'),'utf8');
 assert.ok(!s.includes('Math.random')&&!s.includes('ball.position')&&!s.includes('root.position.'));
});
