/**
 * Footera Player Evolution - capture-preserving shoulder abduction retarget.
 * Experimental 60-bone studio only. This is NOT a procedural walk cycle:
 * original baked Adobe Mixamo keys, pelvis, spine, clavicle, elbows and hands
 * remain the animation source. Only excessive OUTWARD upper-arm separation
 * caused by target A/T-pose differences is gently bounded in torso space.
 *
 * Sample after a complete Mixamo PoseDirector commit, and submit its returned
 * absolute LOCAL quaternions to the director's "contact" layer before IK.
 * All temporary manipulations are restored before returning.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {collectFooteraBones} from './3d-player-evolution-rig.mjs';

const DEG=180/Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const point=bone=>bone.getWorldPosition(new THREE.Vector3());

export function createFooteraShoulderAlignment(root,{
 maxAbductionDeg=34,softStartDeg=25,maxCorrectionDeg=45
}={}){
 if(![maxAbductionDeg,softStartDeg,maxCorrectionDeg].every(Number.isFinite)||
  softStartDeg<0||maxAbductionDeg<=softStartDeg||maxAbductionDeg>60||
  maxCorrectionDeg<=0||maxCorrectionDeg>70)
  throw new RangeError('Invalid shoulder alignment limits');
 const bones=collectFooteraBones(root).bones;
 const pelvis=bones.get('pelvis'),chest=bones.get('spine_03');
 const sides=['l','r'].map(side=>({
  side,upper:bones.get('upperarm_'+side),elbow:bones.get('lowerarm_'+side),
  clavicle:bones.get('clavicle_'+side)
 }));
 if(!pelvis||!chest||sides.some(x=>!x.upper||!x.elbow||!x.clavicle))
  throw new Error('Missing anatomical shoulder references');
 const maxSide=Math.sin(maxAbductionDeg/DEG),
  startSide=Math.sin(softStartDeg/DEG),
  endSide=Math.sin((maxAbductionDeg+4)/DEG);
 const correctionLimit=maxCorrectionDeg/DEG;
 function measure(side){
  root.updateMatrixWorld(true);
  const arm=side.elbow.getWorldPosition(new THREE.Vector3())
   .sub(point(side.upper));
  if(arm.lengthSq()<1e-8)return null;
  const left=point(sides[0].clavicle),right=point(sides[1].clavicle);
  const up=point(chest).sub(point(pelvis));
  if(up.lengthSq()<1e-8)return null;
  up.normalize();
  const outward=left.sub(right);
  if(side.side==='r')outward.negate();
  outward.addScaledVector(up,-outward.dot(up));
  if(outward.lengthSq()<1e-8)return null;
  outward.normalize();
  const dir=arm.normalize(),lateral=Math.max(0,dir.dot(outward));
  return{dir,outward,up,lateral,abductionDeg:Math.asin(clamp(lateral,0,1))*DEG,
   downwards:dir.dot(up.clone().negate())};
 }
 function sample({enabled=true,strength=1}={}){
  if(!Number.isFinite(strength)||strength<0||strength>1)
   throw new RangeError('Invalid shoulder-alignment strength');
  const pose=new Map(),arms={};
  for(const item of sides){
   const before=measure(item);
   const info={beforeDeg:before?.abductionDeg??null,afterDeg:before?.abductionDeg??null,
    changeDeg:0,active:false};
   arms[item.side]=info;
   if(!enabled||strength===0||!before)continue;
   // Skip genuine overhead action/raised hands. Football locomotion generally
   // keeps the elbow below the shoulder; raised motions must be source-owned.
   if(before.downwards<-.12||before.lateral<=startSide)continue;
   const excess=Math.max(0,before.lateral-maxSide);
   if(excess<=1e-7)continue;
   const desiredSide=before.lateral-excess*
    smooth(startSide,endSide,before.lateral)*strength;
   // Preserve the ORIGINAL capture's fore/aft vs downward component ratio.
   // Only rotate the humerus enough to reduce lateral abduction.
   const other=before.dir.clone().addScaledVector(before.outward,-before.lateral);
   if(other.lengthSq()<1e-7)other.copy(before.up).negate();
   other.normalize();
   const target=other.multiplyScalar(Math.sqrt(Math.max(0,1-desiredSide*desiredSide)))
    .addScaledVector(before.outward,desiredSide).normalize();
   const difference=before.dir.angleTo(target);
   if(difference<=1e-6)continue;
   const applied=Math.min(difference,correctionLimit);
   if(applied<difference)target.copy(before.dir).lerp(target,applied/difference).normalize();
   const original=item.upper.quaternion.clone();
   try{
    const q=new THREE.Quaternion().setFromUnitVectors(before.dir,target);
    const world=item.upper.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
    const invParent=item.upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    item.upper.quaternion.copy(invParent.multiply(world)).normalize();
    root.updateMatrixWorld(true);
    const after=measure(item);
    if(!after)throw new Error('Shoulder lost valid alignment');
    info.afterDeg=after.abductionDeg;
    info.changeDeg=before.abductionDeg-after.abductionDeg;
    info.active=info.changeDeg>1e-4;
    if(info.active)pose.set(item.upper.name,item.upper.quaternion.clone());
   }finally{
    item.upper.quaternion.copy(original);
    root.updateMatrixWorld(true);
   }
  }
  return{pose,arms,source:'Original Mixamo captured arm swing + bounded torso-space shoulder retarget',
   limits:{maxAbductionDeg,softStartDeg,maxCorrectionDeg}};
 }
 return{sample,inspect:()=>Object.fromEntries(sides.map(s=>[s.side,measure(s)])),
  sourceBones:['upperarm_l','upperarm_r'],maxAbductionDeg};
}
