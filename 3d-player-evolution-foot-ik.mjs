/**
 * Experimental 60-bone Footera / Mixamo lower limb constraint and foot plant.
 * Runs AFTER the captured original gait. No changes to the mocap data,
 * original bones, bind matrices, or live gameplay. Returns absolute LOCAL
 * quaternions for PoseDirector's IK layer, restoring the input pose afterward.
 *
 * Root cause of the lateral-knee artifact: the original two-link IK selected
 * the knee pole from the *already retargeted* knee, without an anatomical
 * flexion plane. A sideways knee from an imperfect capture retarget therefore
 * became the solver's preferred bend direction, and could persist through
 * successive stance phases. The new pole is referenced to the pelvis and
 * the bind-pose toe-forward direction; only out-of-plane bending is corrected.
 * Actual hip, knee and ankle lengths, source swing/stance timing and the
 * captured ankle world orientation are preserved.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {collectFooteraBones} from './3d-player-evolution-rig.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const DEG=180/Math.PI;
const MAX_KNEE_LATERAL=14/DEG;
const MAX_FOOT_REACH=.18;
const EPS=1e-8;
const getPoint=(b)=>b.getWorldPosition(new THREE.Vector3());

export function footeraStanceWeight(phase,side){
 if(!Number.isFinite(phase)||!['l','r'].includes(side))
  throw new RangeError('Invalid stance phase/side');
 const p=(((phase+(side==='r'?.5:0))%1)+1)%1;
 return smooth(0,.08,p)*(1-smooth(.43,.55,p));
}

export function createFooteraFootPlant(root,mocap){
 if(!mocap?.anchor)throw new TypeError('Missing captured-gait ankle anchors');
 const bones=collectFooteraBones(root).bones,pelvis=bones.get('pelvis');
 if(!pelvis)throw new Error('Missing pelvis for anatomical knee reference');
 root.updateMatrixWorld(true);
 const pelvisInv=pelvis.getWorldQuaternion(new THREE.Quaternion()).invert();
 const legs=['l','r'].map(side=>{
  const upper=bones.get('thigh_'+side),mid=bones.get('calf_'+side),
   end=bones.get('foot_'+side),toe=bones.get('ball_'+side);
  if(!upper||!mid||!end||!toe)throw new Error('Missing leg IK joint: '+side);
  const hip=getPoint(upper),knee=getPoint(mid),ankle=getPoint(end);
  // Bind-pose heel -> toe determines the player's anatomical anterior,
  // expressed in local pelvis coordinates so turns/yaw do not move the pole
  // into the global Z plane.
  const forwardLocal=getPoint(toe).sub(ankle).applyQuaternion(pelvisInv);
  forwardLocal.y=0;
  if(forwardLocal.lengthSq()<1e-5)
   throw new Error('Missing anatomical toe-forward axis: '+side);
  forwardLocal.normalize();
  return {side,upper,mid,end,upperLen:hip.distanceTo(knee),
   lowerLen:knee.distanceTo(ankle),forwardLocal};
 });
 const parentQ=new THREE.Quaternion();
 const swingQ=new THREE.Quaternion(),worldQ=new THREE.Quaternion();

 function aim(bone,child,point){
  const origin=getPoint(bone),from=getPoint(child).sub(origin),to=point.clone().sub(origin);
  if(from.lengthSq()<EPS||to.lengthSq()<EPS)return;
  swingQ.setFromUnitVectors(from.normalize(),to.normalize());
  bone.getWorldQuaternion(worldQ).premultiply(swingQ);
  bone.parent.getWorldQuaternion(parentQ).invert();
  bone.quaternion.copy(parentQ).multiply(worldQ).normalize();
  bone.updateMatrixWorld(true);
 }
 function kneePlane(limb,goal){
  const hip=getPoint(limb.upper),knee=getPoint(limb.mid);
  const direction=goal.clone().sub(hip);
  if(direction.lengthSq()<1e-6)return null;
  direction.normalize();
  // Reference forward follows capture-driven pelvis rotation, rather than
  // staying fixed in the scene when the player turns or changes direction.
  const forward=limb.forwardLocal.clone()
   .applyQuaternion(pelvis.getWorldQuaternion(new THREE.Quaternion()));
  forward.addScaledVector(direction,-forward.dot(direction));
  if(forward.lengthSq()<1e-6)return null;
  forward.normalize();
  const lateral=new THREE.Vector3().crossVectors(direction,forward).normalize();
  const observed=knee.sub(hip);
  observed.addScaledVector(direction,-observed.dot(direction));
  if(observed.lengthSq()<1e-8)observed.copy(forward);
  else observed.normalize();
  const angle=Math.atan2(observed.dot(lateral),observed.dot(forward));
  return{angle,observed,direction,forward,lateral,hip};
 }
 function flexDegrees(limb){
  const hip=getPoint(limb.upper),knee=getPoint(limb.mid),ankle=getPoint(limb.end);
  const u=hip.sub(knee).normalize(),l=ankle.sub(knee).normalize();
  return Math.acos(clamp(u.dot(l),-1,1))*DEG;
 }
 function solve(limb,goal,plane,kneeAlignment){
  const {upper,mid,end,upperLen,lowerLen}=limb;
  const hip=getPoint(upper),diff=goal.clone().sub(hip),rawDist=diff.length();
  if(rawDist<.01)return null;
  const distance=clamp(rawDist,Math.abs(upperLen-lowerLen)+.004,
   upperLen+lowerLen-.004);
  diff.normalize();
  // The capture already contains genuine forward knee flexion. Constrain
  // ONLY its lateral pole component to a plausible hinge cone (14 degrees),
  // retaining safe lateral loading within that cone.
  let pole=plane?.observed.clone()||limb.forwardLocal.clone()
   .applyQuaternion(pelvis.getWorldQuaternion(new THREE.Quaternion()));
  const before=plane?.angle||0;
  const after=clamp(before,-MAX_KNEE_LATERAL,MAX_KNEE_LATERAL);
  if(plane&&kneeAlignment>0&&Math.abs(before-after)>1e-5){
   const anatomical=plane.forward.clone().multiplyScalar(Math.cos(after))
    .addScaledVector(plane.lateral,Math.sin(after));
   pole.lerp(anatomical,kneeAlignment).normalize();
  }
  pole.addScaledVector(diff,-pole.dot(diff)).normalize();
  if(pole.lengthSq()<EPS)return null;
  const cosine=clamp((upperLen*upperLen+distance*distance-lowerLen*lowerLen)/
   (2*upperLen*distance),-1,1);
  const bend=upperLen*Math.sqrt(Math.max(0,1-cosine*cosine));
  const desiredKnee=hip.clone().addScaledVector(diff,upperLen*cosine)
   .addScaledVector(pole,bend);
  const reachable=hip.clone().addScaledVector(diff,distance);
  aim(upper,mid,desiredKnee);
  aim(mid,end,reachable);
  return{requestedDistance:rawDist,reachedDistance:distance};
 }
 function computePose({clip='run',phase=0,strength=1,kneeAlignment=strength,
                      anchorWorlds=null}={}){
  if(![phase,strength,kneeAlignment].every(Number.isFinite)||
   strength<0||strength>1||kneeAlignment<0||kneeAlignment>1)
   throw new RangeError('Invalid foot plant or knee alignment arguments');
  const pose=new Map(),results={},knees={};
  for(const limb of legs){
   const {side,upper,mid,end}=limb;
   root.updateMatrixWorld(true);
   const current=getPoint(end);
   const anchor=anchorWorlds?.[side]
    ?new THREE.Vector3(...anchorWorlds[side])
    :root.localToWorld(mocap.anchor(clip,side));
   const weight=footeraStanceWeight(phase,side)*strength;
   const shift=anchor.clone().sub(current);
   const stats={weight,active:false,errorBefore:Math.hypot(shift.x,shift.z),
    errorAfter:Math.hypot(shift.x,shift.z),correction:0};
   results[side]=stats;
   const wanted=shift.length(),bounded=Math.min(1,MAX_FOOT_REACH/
    Math.max(wanted,1e-9))*weight;
   const goal=current.clone().addScaledVector(shift,bounded);
   const plane=kneePlane(limb,goal);
   const deviationBefore=plane?.angle*DEG||0;
   const needsKnee=kneeAlignment>.001&&
    Math.abs(deviationBefore)>MAX_KNEE_LATERAL*DEG+.01;
   const beforeFlex=flexDegrees(limb);
   const kneeStats={deviationBeforeDeg:deviationBefore,deviationAfterDeg:deviationBefore,
    flexBeforeDeg:beforeFlex,flexAfterDeg:beforeFlex,aligned:false};
   knees[side]=kneeStats;
   if(weight<.01&&!needsKnee)continue;
   const prior=[upper,mid,end].map(b=>b.quaternion.clone());
   const footQ=end.getWorldQuaternion(new THREE.Quaternion());
   try{
    if(solve(limb,goal,plane,kneeAlignment)){
     // Keep the captured shoe roll and orientation; solving the leg should
     // not invent a new ankle pitch/yaw or alter the original Mixamo timing.
     end.parent.getWorldQuaternion(parentQ).invert();
     end.quaternion.copy(parentQ).multiply(footQ).normalize();
     root.updateMatrixWorld(true);
     const corrected=getPoint(end);
     stats.errorAfter=Math.hypot(corrected.x-anchor.x,corrected.z-anchor.z);
     stats.correction=corrected.distanceTo(current);
     stats.active=weight>=.01;
     const afterPlane=kneePlane(limb,corrected);
     kneeStats.deviationAfterDeg=(afterPlane?.angle||0)*DEG;
     kneeStats.flexAfterDeg=flexDegrees(limb);
     kneeStats.aligned=needsKnee;
     for(const b of [upper,mid,end])pose.set(b.name,b.quaternion.clone());
    }
   }finally{
    [upper,mid,end].forEach((b,i)=>b.quaternion.copy(prior[i]));
    root.updateMatrixWorld(true);
   }
  }
  return{pose,feet:results,knees,
   source:'Captured Mixamo + anatomical pelvis-space knee pole + bounded 2-bone foot IK'};
 }
 return{computePose,legs:legs.length,maxLateralDegrees:MAX_KNEE_LATERAL*DEG};
}
