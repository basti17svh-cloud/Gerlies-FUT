'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
test('support/recovery boundaries preserve foot velocity and smooth additive weights',async()=>{
 const {runningLeg}=await import('../3d-highlights-scene.mjs');
 const tau=2*Math.PI,h=1e-5;
 for(const speed of [.15,.4,.7,1])for(const boundary of [0,(.60-.32*speed)*tau]){
  const a=runningLeg(boundary-h,speed),b=runningLeg(boundary,speed),c=runningLeg(boundary+h,speed);
  for(const field of ['hip','knee','ankle','z','y','swingWeight']){
   assert.ok(Math.abs(c[field]-a[field])<.001,`${speed} ${field}: continuous position`);
   assert.ok(Math.abs((c[field]-b[field])/h-(b[field]-a[field])/h)<.004,`${speed} ${field}: continuous velocity`);
  }
 }
});
test('retarget applies player-space rotations on rotated and mirrored imported bones',async()=>{
 const T=await import('../vendor/three/three.module.min.js');
 const {createPlayerSpaceRetarget}=await import('../3d-player-prototype.mjs');
 for(const rootYaw of [0,1.2,-2.7])for(const axes of [[0,0,0],[Math.PI,0,0],[.2,1.1,-Math.PI/2]]){
  const root=new T.Group(),mount=new T.Group(),parent=new T.Bone(),bone=new T.Bone(),end=new T.Bone();
  root.rotation.y=rootYaw;mount.rotation.y=Math.PI;parent.rotation.set(.3,.2,.1);bone.rotation.set(...axes);end.position.y=.4;
  root.add(mount);mount.add(parent);parent.add(bone);bone.add(end);root.updateMatrixWorld(true);
  const q=bone.getWorldQuaternion(new T.Quaternion()),neutral=q.clone();
  const apply=createPlayerSpaceRetarget(new Map([['limb',bone]]),root);
  const delta=new T.Quaternion().setFromEuler(new T.Euler(.6,-.15,.25));
  const rootQ=root.getWorldQuaternion(new T.Quaternion());
  const expected=rootQ.clone().multiply(delta).multiply(rootQ.clone().invert()).multiply(neutral);
  apply('limb',.6,-.15,.25);root.updateMatrixWorld(true);
  assert.ok(bone.getWorldQuaternion(q).angleTo(expected)<1e-6);
  apply('limb',-.5,.9,.2);apply('limb',.6,-.15,.25);root.updateMatrixWorld(true);
  assert.ok(bone.getWorldQuaternion(q).angleTo(expected)<1e-6,'seek order cannot accumulate rotation');
 }
});
