import test from 'node:test';
import assert from 'node:assert/strict';
import {createFooteraNaturalLocomotion} from '../3d-player-evolution-natural-locomotion.mjs';

class Quaternion{
 constructor(v){this.v=v}
 clone(){return new Quaternion(this.v)}
 slerp(b,a){this.v=this.v*(1-a)+b.v*a;return this}
 normalize(){return this}
}
function fixture(){
 const strides={walk:.8,jog:1.6,run:2.55,sprint:3.0};
 const capturedPose=new Map();
 return{
  clipNames:Object.keys(strides),
  getOriginalPose:()=>capturedPose,
  sample(clip,cycles){
   const q=new Quaternion(Object.keys(strides).indexOf(clip));
   const pose=new Map([['pelvis',q],['thigh_l',new Quaternion(1)],
    ['thigh_r',new Quaternion(2)]]);
   capturedPose.set(clip,pose);
   return{pose,frame:cycles*30};
  },
  rootTravel(clip,cycles){
   if(!strides[clip])throw Error('Invalid fixture clip');
   return {x:0,y:0,z:strides[clip]*cycles};
  }
 };
}
test('original source stride measures and speed nodes are traceable',()=>{
 const a=createFooteraNaturalLocomotion(fixture());
 assert.equal(a.calibration.length,4);
 assert.deepEqual(a.calibration.map(c=>c.strideMetres),[.8,1.6,2.55,3]);
 assert.equal(a.calibration[2].capturedSpeedMps,2.55*1.7);
 assert.deepEqual(a.limits.speedNodes,[1.25,2.65,4.55,6.75]);
});
test('quaternions are crossfaded, capture samples remain untouched',()=>{
 const mocap=fixture(),a=createFooteraNaturalLocomotion(mocap,
  {maxAcceleration:18});
 let result;
 a.sample({time:0,targetSpeed:3.4});
 for(let i=1;i<20;i++)result=a.sample({time:i*.08,targetSpeed:3.4});
 assert.ok(result.clipWeights.jog>0&&result.clipWeights.run>0);
 assert.ok(Math.abs(result.clipWeights.jog+result.clipWeights.run-1)<1e-9);
 assert.equal(result.pose.size,3);
 assert.ok(result.pose.get('pelvis').v>1&&result.pose.get('pelvis').v<2);
 assert.equal(mocap.getOriginalPose().get('jog').get('pelvis').v,1);
 assert.equal(mocap.getOriginalPose().get('run').get('pelvis').v,2);
});
test('speed envelope prevents teleporting when accelerating and braking',()=>{
 const a=createFooteraNaturalLocomotion(fixture());
 a.sample({time:0,targetSpeed:7});
 let prev=a.sample({time:.05,targetSpeed:7});
 for(let t=.10;t<=1.5;t+=.05){
  const result=a.sample({time:t,targetSpeed:t<.75?7:0});
  assert.ok(Math.abs(result.speedMps-prev.speedMps)<=8*.051);
  assert.ok(result.rootDisplacementMetres>=prev.rootDisplacementMetres);
  assert.ok(result.rootDisplacementMetres-prev.rootDisplacementMetres<=7*.051);
  assert.ok(Number.isFinite(result.accelerationMps2));
  prev=result;
 }
 assert.ok(prev.speedMps<1);
});
test('sampling same time is idempotent and seek does not use stale root',()=>{
 const a=createFooteraNaturalLocomotion(fixture());
 a.sample({time:0,targetSpeed:4});
 const s=a.sample({time:.1,targetSpeed:4}),again=a.sample({time:.1,targetSpeed:4});
 assert.deepEqual(s.rootTravel,again.rootTravel);
 const seek=a.sample({time:.01,targetSpeed:6});
 assert.deepEqual(seek.rootTravel,[0,0,0]);
 assert.equal(seek.speedMps,0);
 const gap=a.sample({time:1,targetSpeed:6});
 assert.equal(gap.rootDisplacementMetres,0);
});
test('each player locomotion state is independent',()=>{
 const m=fixture(),a=createFooteraNaturalLocomotion(m),b=createFooteraNaturalLocomotion(m);
 a.sample({time:0,targetSpeed:5});b.sample({time:0,targetSpeed:1});
 for(const t of [.1,.2,.3]){a.sample({time:t,targetSpeed:5});b.sample({time:t,targetSpeed:1})}
 const fast=a.sample({time:.4,targetSpeed:5});
 const slow=b.sample({time:.4,targetSpeed:1});
 assert.ok(fast.speedMps>slow.speedMps);
 assert.notDeepEqual(fast.rootTravel,slow.rootTravel);
});
test('invalid input and impossible contact calibration fail loudly',()=>{
 const m=fixture();
 assert.throws(()=>createFooteraNaturalLocomotion(null),TypeError);
 assert.throws(()=>createFooteraNaturalLocomotion(m,{maxAcceleration:-1}),RangeError);
 assert.throws(()=>createFooteraNaturalLocomotion(m,{speedNodes:[2,3,1,5]}),RangeError);
 const a=createFooteraNaturalLocomotion(m);
 assert.throws(()=>a.sample({time:-1,targetSpeed:1}),RangeError);
 assert.throws(()=>a.sample({time:1,targetSpeed:999}),RangeError);
});
