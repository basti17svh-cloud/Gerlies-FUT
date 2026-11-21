import test from 'node:test';
import assert from 'node:assert/strict';
import {createFooteraPlantLock,footeraCapturedStance}
 from '../3d-player-evolution-plant-lock.mjs';
const f=(x=0,y=0,z=0)=>({ankle:[x,y+.08,z],heel:[x-.07,y,z],
 toe:[x+.15,y+.02,z],lowest:y});
const frames=(x=0,y=0)=>({l:f(x,y,0),r:f(-x,y,.13)});
test('captured left/right phases alternate without scripted leg paths',()=>{
 assert.ok(footeraCapturedStance(.22,'l')>.99);
 assert.ok(footeraCapturedStance(.22,'r')<.01);
 assert.ok(footeraCapturedStance(.72,'r')>.99);
 assert.ok(footeraCapturedStance(.72,'l')<.01);
 assert.throws(()=>footeraCapturedStance(NaN,'l'),RangeError);
});
test('planted world ankle target never follows shoe slide or vertical hover',()=>{
 const lock=createFooteraPlantLock();
 let a=lock.sample({time:0,key:'walk',phase:.20,feet:frames(0,.21)});
 assert.equal(a.active.length,1);
 assert.equal(a.feet.l.touchdown,true);
 // The ankle stays 8 cm above the measured sole; target is floor + 3 mm + 8 cm.
 assert.ok(Math.abs(a.feet.l.anchor[1]-.083)<1e-9);
 const target=a.feet.l.anchor;
 for(let i=1;i<12;i++){
  a=lock.sample({time:i/60,key:'walk',phase:.20+i*.004,
   feet:frames(i*.012,.21)});
  assert.deepEqual(a.feet.l.anchor,target);
  assert.ok(a.feet.l.driftXZ>0);
 }
 assert.ok(lock.measure(frames(.13,.21)).l.hover>.2);
 assert.ok(!a.feet.r.locked);
});
test('left toe-off releases, right touchdown locks independently',()=>{
 const lock=createFooteraPlantLock();
 lock.sample({time:0,key:'gait',phase:.35,feet:frames()});
 const a=lock.sample({time:1/60,key:'gait',phase:.62,feet:frames(.02)});
 assert.equal(a.feet.l.locked,false);
 assert.equal(a.feet.r.locked,true);
 assert.equal(a.feet.r.phase,'mid-stance');
 assert.ok(a.feet.r.touchdown);
});
test('directional backpedal retains the same contact footprint',()=>{
 const lock=createFooteraPlantLock();
 const a=lock.sample({time:.6,key:'backpedal',supportSide:'l',
  supportWeight:.9,supportProgress:.2,feet:frames(0,.02)});
 const b=lock.sample({time:.65,key:'backpedal',supportSide:'l',
  supportWeight:.95,supportProgress:.4,feet:frames(-.08,.03)});
 assert.deepEqual(b.feet.l.anchor,a.feet.l.anchor);
 assert.ok(b.feet.l.driftXZ>.07);
 assert.equal(b.feet.r.weight,0);
});
test('seeking and changing clip resets locked position, NaN is rejected',()=>{
 const lock=createFooteraPlantLock();
 const a=lock.sample({time:1,key:'sprint',phase:.25,feet:frames()});
 const b=lock.sample({time:.2,key:'sprint',phase:.25,feet:frames(.2)});
 assert.notDeepEqual(a.feet.l.anchor,b.feet.l.anchor);
 const c=lock.sample({time:.3,key:'jog',phase:.25,feet:frames(-.1)});
 assert.ok(c.feet.l.touchdown);
 assert.throws(()=>lock.sample({time:1,key:'a',phase:.25,feet:frames(NaN)}),TypeError);
 assert.throws(()=>createFooteraPlantLock({engage:.03,release:.09}),RangeError);
});
