/** Footera Step 11: capture-linked shoe flight without moving the support shoe. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFooteraShoePhaseTracker,footeraGaitSwing,footeraSwingClearance}
 from '../3d-player-evolution-shoe-phases.mjs';

test('Genuine captured gait timing permits clearance only in swing, staggered L/R',()=>{
 assert.equal(footeraGaitSwing(.20,'l'),0);
 assert.ok(footeraGaitSwing(.75,'l')>.98);
 assert.equal(footeraGaitSwing(.70,'r'),0);
 assert.ok(footeraGaitSwing(.25,'r')>.98);
 assert.ok(footeraGaitSwing(.975,'l')<.5,'Touchdown must fade the correction');
 assert.throws(()=>footeraGaitSwing(NaN,'l'),RangeError);
});
test('Clearance lifts only moving swing, with finite anatomical limit',()=>{
 assert.equal(footeraSwingClearance({lowest:-.04,swing:0}),0);
 const lift=footeraSwingClearance({lowest:-.04,swing:1});
 assert.ok(lift>.07&&lift<.09,'Near-floor toe must clear pitch');
 assert.ok(footeraSwingClearance({lowest:-1,swing:1})<=.105);
 assert.equal(footeraSwingClearance({lowest:.12,swing:1}),0);
 assert.throws(()=>footeraSwingClearance({lowest:NaN}),RangeError);
});
test('Measured world movement activates opposite swing foot without disturbing support',()=>{
 const track=createFooteraShoePhaseTracker();
 const frame=x=>({l:[0,.02,0],r:[x,.015,.1]});
 assert.equal(track.sample({time:0,key:'cut',supportSide:'l',feet:frame(0)}).r.swing,0);
 const a=track.sample({time:.04,key:'cut',supportSide:'l',feet:frame(.08)});
 assert.ok(a.r.swing>.35,'Moving shoe should start flight correction');
 assert.equal(a.l.swing,0,'Pinned shoe must never lift');
 const b=track.sample({time:.08,key:'cut',supportSide:'l',feet:frame(.16)});
 assert.ok(b.r.swing>a.r.swing,'Stable velocity should smooth the swing');
 assert.equal(b.l.swing,0);
 const switchFrame=track.sample({time:.12,key:'cut',supportSide:'r',feet:frame(.17)});
 assert.equal(switchFrame.r.swing,0,'New support becomes pinned immediately');
 assert.equal(switchFrame.l.swing,0);
});
test('Seek, direction change and large frame gap do not leak phase memory',()=>{
 const track=createFooteraShoePhaseTracker(),feet={l:[0,0,0],r:[0,0,0]};
 track.sample({time:0,key:'left',feet,supportSide:'l'});
 track.sample({time:.05,key:'left',feet:{...feet,r:[.1,0,0]},supportSide:'l'});
 const changed=track.sample({time:.06,key:'right',feet,supportSide:'r'});
 assert.equal(changed.l.swing,0);
 const gap=track.sample({time:.8,key:'right',feet,supportSide:'r'});
 assert.equal(gap.l.swing,0);
 const back=track.sample({time:.4,key:'right',feet,supportSide:'r'});
 assert.equal(back.l.swing,0);
 assert.throws(()=>track.sample({time:0,key:'left',feet,supportSide:'a'}),RangeError);
});
