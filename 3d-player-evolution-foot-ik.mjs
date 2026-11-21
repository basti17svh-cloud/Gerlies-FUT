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
import {footeraSwingClearance} from './3d-player-evolution-shoe-phases.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const DEG=180/Math.PI;
const MAX_KNEE_LATERAL=14/DEG;
const MAX_FOOT_REACH=.18;
const EPS=1e-8;
const getPoint=(b)=>b.getWorldPosition(new THREE.Vector3());
const UP=new THREE.Vector3(0,1,0);
const MAX_SOLE_LIFT=.07,MAX_SOLE_ROLL=.20;

/**
 * Record sole landmarks from the actual skinned boot vertices IN BIND POSE.
 * Markers stay foot-local, hence later follow real Mixamo foot rotations.
 * A kinematic bone-only fallback is kept for synthetic unit-test rigs.
 */
function measureSoleMarkers(root,foot,ball){
 root.updateMatrixWorld(true);
 const ballLocal=foot.worldToLocal(getPoint(ball));
 // Bone-local Y is not necessarily world-up in imported MetaHuman rigs.
 // Keep the full anatomical local toe axis; only floor measurements project
 // to world horizontal after the bone transforms are applied.
 const forward=ballLocal.clone();
 if(forward.lengthSq()<1e-6)throw new Error('Invalid toe marker: zero foot-to-ball length');
 forward.normalize();
 const vertices=[];
 root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!/boot/i.test(mesh.name))return;
  const pos=mesh.geometry?.getAttribute('position');
  const joints=mesh.geometry?.getAttribute('skinIndex');
  const weights=mesh.geometry?.getAttribute('skinWeight');
  if(!pos||!joints||!weights||!mesh.skeleton)return;
  const indices=['getX','getY','getZ','getW'];
  for(let i=0;i<pos.count;i++){
   let influence=0;
   for(const read of indices){
    const b=mesh.skeleton.bones[joints[read](i)];
    if(b===foot||b===ball)influence+=weights[read](i);
   }
   if(influence<.28)continue;
   const worldPoint=new THREE.Vector3().fromBufferAttribute(pos,i);
   mesh.localToWorld(worldPoint);
   const worldHeight=worldPoint.y;
   const point=foot.worldToLocal(worldPoint);
   vertices.push({point,worldHeight,progress:point.dot(forward)});
  }
 });
 // Imported foot-bone LOCAL Y can point towards the toes rather than UP.
 // Never select outsole candidates by the local foot y coordinate.
 const fallback=()=>({heel:ballLocal.clone().multiplyScalar(-.33),
  toe:ballLocal.clone(),meshCalibrated:false,vertexCount:vertices.length});
 if(vertices.length<24)return fallback();
 const byProgress=[...vertices].sort((a,b)=>a.progress-b.progress);
 const band=Math.max(8,Math.floor(byProgress.length*.24));
 const centroid=arr=>arr.reduce((v,p)=>v.add(p.point),new THREE.Vector3())
  .multiplyScalar(1/arr.length);
 // Separate anatomical heel/toe portions first, THEN pick their lowest
 // genuine skinned boot surface samples in world +Y.
 const soleBand=arr=>arr.sort((a,b)=>a.worldHeight-b.worldHeight)
  .slice(0,Math.max(4,Math.floor(arr.length*.24)));
 const heel=centroid(soleBand(byProgress.slice(0,band)));
 const toe=centroid(soleBand(byProgress.slice(-band)));
 if(![heel.x,heel.y,heel.z,toe.x,toe.y,toe.z].every(Number.isFinite)||
    heel.distanceTo(toe)<.07)return fallback();
 return{heel,toe,meshCalibrated:true,vertexCount:vertices.length};
}
function soleWorld(limb){
 const heel=limb.end.localToWorld(limb.sole.heel.clone());
 const toe=limb.end.localToWorld(limb.sole.toe.clone());
 return{heel,toe,lowest:Math.min(heel.y,toe.y),
  span:Math.hypot(toe.x-heel.x,toe.z-heel.z)};
}

export function footeraStanceWeight(phase,side){
 if(!Number.isFinite(phase)||!['l','r'].includes(side))
  throw new RangeError('Invalid stance phase/side');
 const p=(((phase+(side==='r'?.5:0))%1)+1)%1;
 return smooth(0,.08,p)*(1-smooth(.43,.55,p));
}

/**
 * Optional FLAT LAB WORLD contact-root vertical resolver. The 2-bone IK must
 * not stretch a knee to force a badly pitched boot onto the ground. Translate
 * the entire preview player by at most 10 cm after the captured-leg solve.
 * No change to the 52 original quaternions, 60-bone rest pose, or horizontal
 * authoritative root trajectory. Never use as live-game terrain collision.
 */
export function footeraGroundRootOffset(feet,{groundY=0,maxOffset=.10}={}){
 if(!Number.isFinite(groundY)||!Number.isFinite(maxOffset)||
    maxOffset<=0||maxOffset>.15)throw new RangeError('Invalid root-ground limits');
 const support=Object.values(feet||{}).filter(f=>f?.active&&
  Number.isFinite(f.weight)&&f.weight>.35&&
  Number.isFinite(f.heelHeight)&&Number.isFinite(f.toeHeight));
 if(!support.length)return 0;
 const nearest=support.reduce((a,b)=>Math.min(a.heelHeight,a.toeHeight)<
  Math.min(b.heelHeight,b.toeHeight)?a:b);
 const min=Math.min(nearest.heelHeight,nearest.toeHeight);
 return clamp(groundY+.003-min,-maxOffset,maxOffset)*
  smooth(.25,.8,nearest.weight);
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
  return {side,upper,mid,end,toe,sole:measureSoleMarkers(root,end,toe),
   upperLen:hip.distanceTo(knee),
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
                      anchorWorlds=null,groundContact=false,groundY=0,
                      contactWeights=null,contactPhases=null,footMotion=null,plantLock=false,
                      measuredSoles=null}={}){
  if(![phase,strength,kneeAlignment,groundY].every(Number.isFinite)||
   strength<0||strength>1||kneeAlignment<0||kneeAlignment>1||typeof plantLock!=='boolean'||
   groundY<-.2||groundY>.3||
   (contactWeights&&['l','r'].some(s=>contactWeights[s]!=null&&
    (!Number.isFinite(contactWeights[s])||contactWeights[s]<0||contactWeights[s]>1)))||
   (contactPhases&&['l','r'].some(s=>contactPhases[s]!=null&&
    (!Number.isFinite(contactPhases[s])||contactPhases[s]<0||contactPhases[s]>1))))
   throw new RangeError('Invalid foot plant or knee alignment arguments');
  const pose=new Map(),results={},knees={};
  for(const limb of legs){
   const {side,upper,mid,end}=limb;
   root.updateMatrixWorld(true);
   const current=getPoint(end);
   const anchor=anchorWorlds?.[side]
    ?new THREE.Vector3(...anchorWorlds[side])
    :root.localToWorld(mocap.anchor(clip,side));
   const sourceWeight=contactWeights?.[side]??footeraStanceWeight(phase,side);
   const weight=sourceWeight*strength;
   // Only the measured travelling swing shoe receives clearance/pitch help.
   const swing=clamp(footMotion?.[side]?.swing??0);
   const soleBefore=groundContact?soleWorld(limb):null;
   const shift=anchor.clone().sub(current);
   const stats={weight,active:false,errorBefore:Math.hypot(shift.x,shift.z),
    errorAfter:Math.hypot(shift.x,shift.z),correction:0};
   results[side]=stats;
   const wanted=shift.length(),reachLimit=plantLock&&weight>.01?Infinity:MAX_FOOT_REACH;
   stats.reachLimited=wanted>reachLimit;
   // A world-space stance target must not be secretly clamped to 29 cm.
   // The anatomical 2-bone solver already enforces the actual leg lengths.
   // Transition weight is feathered near heel strike/toe off but becomes
   // fully planted before the QA support threshold (0.65).
   const footWeight=plantLock?smooth(.10,.60,weight):weight;
   const bounded=Math.min(1,reachLimit/
    Math.max(wanted,1e-9))*footWeight;
   const goal=current.clone().addScaledVector(shift,bounded);
   // Keep the ankle within the existing 18 cm reach bound. A secondary,
   // bounded Y-only correction brings the actual outsole close to the pitch.
   // Swing shoes are NEVER pinned, and source toe-off remains free.
   const soleLift=soleBefore&&!plantLock&&weight>.01
    ?clamp(groundY+.004-soleBefore.lowest,-MAX_SOLE_LIFT,MAX_SOLE_LIFT)*weight
    :0;
   const trueLowest=measuredSoles?.[side]?.lowest??soleBefore?.lowest??null;
   const swingLift=soleBefore&&swing>.001
    ?footeraSwingClearance({lowest:soleBefore.lowest,groundY,swing}):0;
   // Collision belongs to the LEG, not an emergency lift of the whole root.
   // Predict where the real boot surface will be after the ankle translation.
   // Support keeps its world XZ lock, while vertical ankle position follows
   // the actual outsole even when captured toe pitch changes during stance.
   let outsoleYCorrection=0;
   if(plantLock&&trueLowest!==null&&groundContact){
    const remaining=groundY+.003-(trueLowest+goal.y-current.y);
    if(weight>.10){
     outsoleYCorrection=clamp(remaining,-.30,.30)*footWeight;
    }else{
     // Unplanted feet are free in XZ; only rescue genuine sole intersection.
     outsoleYCorrection=clamp(remaining,0,.30);
    }
   }
   goal.y+=soleLift+swingLift+outsoleYCorrection;
   stats.outsoleYCorrection=outsoleYCorrection;
   stats.trueLowestBefore=trueLowest;
   stats.soleLift=soleLift;
   stats.swingLift=swingLift;
   stats.swingWeight=swing;
   stats.footTargetFactor=bounded;
   stats.meshCalibrated=limb.sole.meshCalibrated;
   const plane=kneePlane(limb,goal);
   const deviationBefore=plane?.angle*DEG||0;
   const needsKnee=kneeAlignment>.001&&
    Math.abs(deviationBefore)>MAX_KNEE_LATERAL*DEG+.01;
   const beforeFlex=flexDegrees(limb);
   const kneeStats={deviationBeforeDeg:deviationBefore,deviationAfterDeg:deviationBefore,
    flexBeforeDeg:beforeFlex,flexAfterDeg:beforeFlex,aligned:false};
   knees[side]=kneeStats;
   if(weight<.01&&!needsKnee&&swingLift<.0002&&outsoleYCorrection<.0002)continue;
   const prior=[upper,mid,end].map(b=>b.quaternion.clone());
   const footQ=end.getWorldQuaternion(new THREE.Quaternion());
   try{
    const solved=solve(limb,goal,plane,kneeAlignment);
    if(solved){
     stats.anatomicalReachLimited=solved.requestedDistance>solved.reachedDistance+.003;
     // Keep the captured shoe roll and orientation; solving the leg should
     // not invent a new ankle pitch/yaw or alter the original Mixamo timing.
     end.parent.getWorldQuaternion(parentQ).invert();
     end.quaternion.copy(parentQ).multiply(footQ).normalize();
     root.updateMatrixWorld(true);
     // Original captured shoe orientation dominates touchdown and toe-off.
     // During true support only, correct a measured heel/toe height gradient
     // around the anatomical lateral axis. No synthetic sine/clip is added.
     const wrapped=((phase+(side==='r'?.5:0))%1+1)%1;
     const progress=contactPhases?.[side]??clamp(wrapped/.55);
     let rollDeg=0;
     if(soleBefore&&weight>.01){
      const measured=soleWorld(limb);
      if(measured.span>.055){
       const forward=measured.toe.clone().sub(measured.heel).setY(0).normalize();
       const axis=new THREE.Vector3().crossVectors(UP,forward).normalize();
       const desired=clamp(Math.atan2(measured.toe.y-measured.heel.y,
         measured.span),-MAX_SOLE_ROLL,MAX_SOLE_ROLL);
       const flatten=smooth(.12,.30,progress)*
        (1-smooth(.73,.94,progress))*weight;
       // Prevent visibly pointed-down toes skimming the pitch in swing.
       // Do not rotate a shoe with sufficient original airborne clearance.
       const nearPitch=1-smooth(.035,.09,measured.lowest-groundY);
       const flightPitch=Math.min(0,desired)*swing*nearPitch;
       const roll=desired*flatten+flightPitch;
       stats.flightPitchDeg=flightPitch*DEG;
       if(Math.abs(roll)>1e-8){
        end.getWorldQuaternion(worldQ);
        worldQ.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,roll));
        end.parent.getWorldQuaternion(parentQ).invert();
        end.quaternion.copy(parentQ).multiply(worldQ).normalize();
        root.updateMatrixWorld(true);
       }
       rollDeg=roll*DEG;
      }
     }
     const contactSole=soleBefore?soleWorld(limb):null;
     stats.rollDeg=rollDeg;
     stats.heelHeight=contactSole?.heel.y??null;
     stats.toeHeight=contactSole?.toe.y??null;
     stats.floorPenetration=contactSole?
      Math.max(0,groundY-contactSole.lowest):null;
     stats.contactProgress=progress;
     const corrected=getPoint(end);
     stats.errorAfter=Math.hypot(corrected.x-anchor.x,corrected.z-anchor.z);
     stats.errorAfter3D=corrected.distanceTo(anchor);
     stats.errorVertical=corrected.y-anchor.y;
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
   source:groundContact
    ?'Captured Mixamo + measured boot outsole, bounded ground correction / foot roll / knee IK'
    :'Captured Mixamo + anatomical pelvis-space knee pole + bounded 2-bone foot IK'};
 }
 function measureFeet(){
  root.updateMatrixWorld(true);
  return Object.fromEntries(legs.map(limb=>{
   const sole=soleWorld(limb);
   return[limb.side,{ankle:getPoint(limb.end).toArray(),
    heel:sole.heel.toArray(),toe:sole.toe.toArray(),lowest:sole.lowest}];
  }));
 }
 return{computePose,measureFeet,legs:legs.length,maxLateralDegrees:MAX_KNEE_LATERAL*DEG,
  soles:Object.fromEntries(legs.map(x=>[x.side,{meshCalibrated:x.sole.meshCalibrated,
   vertexCount:x.sole.vertexCount}])),
  maxSoleLift:MAX_SOLE_LIFT,maxSoleRollDegrees:MAX_SOLE_ROLL*DEG};
}
