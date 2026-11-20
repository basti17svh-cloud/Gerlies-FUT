/**
 * Isolated 2-bone foot planting for the experimental Evolution rig.
 * Runs AFTER captured gait pose, returns absolute hip/knee/ankle quaternions
 * for PoseDirector layer 'ik'. It leaves no direct mutations after sampling.
 *
 * Stance anchors are derived from the SAME baked Mixamo gait at touchdown;
 * no arbitrary shoe teleport to the model's rest pose. The foot orientation
 * follows the captured toe roll. Works in root-local space for IN-PLACE
 * animation previews only: moving world-route locking still needs its own
 * integration and ground tests before any live-game rollout.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {collectFooteraBones} from './3d-player-evolution-rig.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const TMP=new THREE.Vector3();
export function footeraStanceWeight(phase,side){
 if(!Number.isFinite(phase)||!['l','r'].includes(side))
  throw new RangeError('Invalid stance phase/side');
 // left foot touches down when leftForward=0; opposite foot half-cycle later.
 const p=(((phase+(side==='r'?.5:0))%1)+1)%1;
 return smooth(0,.08,p)*(1-smooth(.43,.55,p));
}
export function createFooteraFootPlant(root,mocap){
 const bones=collectFooteraBones(root).bones;
 if(!mocap?.anchor)throw new TypeError('Missing captured-gait ankle anchors');
 const legs=['l','r'].map(side=>{
  const upper=bones.get('thigh_'+side),mid=bones.get('calf_'+side),end=bones.get('foot_'+side);
  if(!upper||!mid||!end)throw new Error('Missing leg IK joint: '+side);
  root.updateMatrixWorld(true);
  const hip=upper.getWorldPosition(new THREE.Vector3()),knee=mid.getWorldPosition(new THREE.Vector3()),
   ankle=end.getWorldPosition(new THREE.Vector3());
  return {side,upper,mid,end,upperLen:hip.distanceTo(knee),
   lowerLen:knee.distanceTo(ankle)};
 });
 const up=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3(),
  direction=new THREE.Vector3(),pole=new THREE.Vector3(),desiredKnee=new THREE.Vector3(),
  target=new THREE.Vector3(),from=new THREE.Vector3(),to=new THREE.Vector3(),
  swingQ=new THREE.Quaternion(),worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 function aim(bone,child,point){
  bone.getWorldPosition(up);child.getWorldPosition(from).sub(up);
  to.copy(point).sub(up);
  if(from.lengthSq()<1e-9||to.lengthSq()<1e-9)return;
  swingQ.setFromUnitVectors(from.normalize(),to.normalize());
  bone.getWorldQuaternion(worldQ).premultiply(swingQ);
  bone.parent.getWorldQuaternion(parentQ).invert();
  bone.quaternion.copy(parentQ).multiply(worldQ).normalize();
  bone.updateMatrixWorld(true);
 }
 function solve(limb,goal){
  const {upper,mid,end,upperLen,lowerLen}=limb;
  upper.getWorldPosition(up);mid.getWorldPosition(knee);
  direction.copy(goal).sub(up);
  const rawDist=direction.length();
  if(rawDist<.01)return false;
  // Cannot stretch a real leg or collapse it through the pelvis.
  const distance=clamp(rawDist,Math.abs(upperLen-lowerLen)+.004,upperLen+lowerLen-.004);
  direction.normalize();
  pole.copy(knee).sub(up);
  pole.addScaledVector(direction,-pole.dot(direction));
  if(pole.lengthSq()<1e-7){
   pole.set(0,0,-1).applyQuaternion(root.getWorldQuaternion(worldQ));
   pole.addScaledVector(direction,-pole.dot(direction));
  }
  pole.normalize();
  const cosine=clamp((upperLen*upperLen+distance*distance-lowerLen*lowerLen)/
   (2*upperLen*distance),-1,1);
  desiredKnee.copy(up).addScaledVector(direction,upperLen*cosine)
   .addScaledVector(pole,upperLen*Math.sqrt(Math.max(0,1-cosine*cosine)));
  target.copy(up).addScaledVector(direction,distance);
  aim(upper,mid,desiredKnee);
  aim(mid,end,target);
  return true;
 }
 function computePose({clip='run',phase=0,strength=1,anchorWorlds=null}={}){
  if(!Number.isFinite(phase)||!Number.isFinite(strength)||strength<0||strength>1)
   throw new RangeError('Invalid foot plant arguments');
  const pose=new Map(),results={};
  for(const leg of legs){
   const {side,upper,mid,end}=leg;
   const weight=footeraStanceWeight(phase,side)*strength;
   const stats={weight,active:false,errorBefore:0,errorAfter:0,correction:0};
   results[side]=stats;
   if(weight<.01)continue;
   const prior=[upper,mid,end].map(b=>b.quaternion.clone());
   root.updateMatrixWorld(true);
   const footQ=end.getWorldQuaternion(new THREE.Quaternion());
   const current=end.getWorldPosition(new THREE.Vector3());
   const anchor=anchorWorlds?.[side]
    ?new THREE.Vector3(...anchorWorlds[side])
    :root.localToWorld(mocap.anchor(clip,side));
   // In the stationary 3D lab, anchor is a captured mid-stance footprint.
   // Never apply huge corrections to a bad retarget or unreachable target.
   const shift=anchor.clone().sub(current);
   stats.errorBefore=Math.hypot(shift.x,shift.z);
   const wanted=shift.length(),maxShift=.18;
   const bounded=Math.min(1,maxShift/Math.max(wanted,1e-9))*weight;
   const goal=current.clone().addScaledVector(shift,bounded);
   stats.correction=goal.distanceTo(current);
   try{
    if(solve(leg,goal)){
     end.parent.getWorldQuaternion(parentQ).invert();
     end.quaternion.copy(parentQ).multiply(footQ).normalize();
     root.updateMatrixWorld(true);
     const corrected=end.getWorldPosition(TMP);
     stats.errorAfter=Math.hypot(corrected.x-anchor.x,corrected.z-anchor.z);
     stats.active=true;
     for(const b of [upper,mid,end])pose.set(b.name,b.quaternion.clone());
    }
   }finally{
    [upper,mid,end].forEach((b,i)=>b.quaternion.copy(prior[i]));
    root.updateMatrixWorld(true);
   }
  }
  return{pose,feet:results,source:'2-bone IK with Mixamo touchdown anchors'};
 }
 return{computePose,legs:legs.length};
}
