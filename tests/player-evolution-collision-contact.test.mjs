/** Step 10: hard collision invariants and temporal lookahead regression. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFooteraCollisionSafeContact} from '../3d-player-evolution-collision-contact.mjs';

test('Sole collision barrier takes priority over Step-9 velocity smoothing',()=>{
 const contact=createFooteraCollisionSafeContact();
 const sequence=[.04,.035,.02,-.012,-.047,-.072,-.094,-.061,-.013,.025];
 let overrides=0,violations=0;
 for(let i=0;i<sequence.length;i++){
  const height=sequence[i];
  const q=contact.sample({time:i/60,key:'sprint',target:-.04,floorLowest:height});
  if(q.safetyOverride)overrides++;
  if(q.residual>1e-6)violations++;
  assert.ok(q.offset>=.003-height-1e-8,
    'Collision lower bound broken at actual sole frame '+i);
  assert.ok(q.offset<=contact.limits.maxOffset+.00001);
  assert.ok(q.required<=contact.limits.maxOffset);
 }
 assert.equal(violations,0);
 assert.ok(overrides>0,'Expected a measured emergency lift, not a hidden velocity clamp');
});

test('Rising real-sole constraint is predicted before it crosses the pitch',()=>{
 const contact=createFooteraCollisionSafeContact({maxRate:1,leadTime:.12});
 const first=contact.sample({key:'run',time:0,target:0,floorLowest:.09});
 const next=contact.sample({key:'run',time:1/60,target:0,floorLowest:.045});
 assert.equal(first.reset,true);
 assert.ok(next.lookaheadBound>next.hardBound,'No prospective contact anticipation');
 assert.equal(next.residual,0,'Lookahead may not bypass actual collision floor');
 assert.ok(Number.isFinite(next.velocity));
});

test('Contact controller reports unreachable source poses, resets on seeking and clip changes',()=>{
 const contact=createFooteraCollisionSafeContact({maxOffset:.12});
 const excessive=contact.sample({time:0,key:'run',target:0,floorLowest:-.18});
 assert.equal(excessive.limitExceeded,true);
 assert.ok(excessive.residual>.05,'Unsolvable shoe collision must remain observable');
 const safe=contact.sample({time:1,key:'sprint',target:0,floorLowest:.004});
 assert.ok(safe.reset);
 assert.equal(safe.residual,0);
 const seek=contact.sample({time:.2,key:'sprint',target:0,floorLowest:0});
 assert.equal(seek.reset,true);
 contact.reset();
 assert.equal(contact.sample({time:.3,key:'run',target:0,floorLowest:0}).reset,true);
 assert.throws(()=>contact.sample({time:NaN,key:'run',target:0,floorLowest:0}),RangeError);
 assert.throws(()=>contact.sample({time:0,key:'run',target:0,floorLowest:NaN}),RangeError);
 assert.throws(()=>createFooteraCollisionSafeContact({maxRate:-1}),RangeError);
});

test('Repeated timestamps never integrate the root twice',()=>{
 const contact=createFooteraCollisionSafeContact();
 const a=contact.sample({time:0,key:'walk',target:-.02,floorLowest:.02});
 const b=contact.sample({time:0,key:'walk',target:.08,floorLowest:-.02});
 assert.equal(a.offset,b.offset);
 assert.equal(b.reset,false);
 assert.ok(b.residual>0,'Same-time conflicting pose must expose unmet collision');
});
