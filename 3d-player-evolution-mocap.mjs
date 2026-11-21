/**
 * Footera Player Evolution: genuine baked Adobe Mixamo gait captures retargeted
 * to the experimental 60-joint GLB. Independent from live Footera gameplay.
 *
 * The existing capture core handles T-pose differences, world axes and bone
 * hierarchy. This adapter samples it into ABSOLUTE local 52-bone quaternions
 * without leaving any source mutations in the target. PoseDirector is the
 * exclusive animation owner; the eight twist bones remain correction joints.
 *
 * Locomotion/hipY data: already shipped with Footera, no synthetic replacement.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs';
import {FOOTERA_MIXAMO_GAIT} from './3d-mocap-mixamo-gait-data.mjs';
import {FOOTERA_MIXAMO} from './3d-mocap-mixamo-data.mjs';
import {FOOTERA_EVOLUTION_BONES,collectFooteraBones,auditFooteraRig}
 from './3d-player-evolution-rig.mjs';

const SOURCES=Object.freeze({
 walk:{data:FOOTERA_MIXAMO_GAIT,clip:'walk'},
 jog:{data:FOOTERA_MIXAMO,clip:'jog_fwd'},
 run:{data:FOOTERA_MIXAMO_GAIT,clip:'run'},
 sprint:{data:FOOTERA_MIXAMO_GAIT,clip:'sprint'}
});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=Number.isFinite;
export const FOOTERA_MOCAP_GAITS=Object.freeze(Object.keys(SOURCES));

export function createFooteraCapturedGait(root){
 if(!auditFooteraRig(root,{checkSkin:false}).ok)
  throw new Error('Cannot capture gait with an invalid evolution rig');
 const bones=collectFooteraBones(root).bones,all=FOOTERA_EVOLUTION_BONES.map(b=>b.name);
 const pelvis=bones.get('pelvis'),pelvisRest=pelvis.position.clone();
 const rest=new Map(all.map(name=>[name,bones.get(name).quaternion.clone()]));
 const rigs=new Map();
 for(const name of FOOTERA_MOCAP_GAITS){
  const source=SOURCES[name];
  const retarget=createCaptureRetarget(bones,root,source.data);
  if(!retarget?.clips?.[source.clip])throw new Error('Mixamo capture missing: '+name);
  rigs.set(name,{...source,retarget,capture:retarget.clips[source.clip]});
 }
 function frameAt(capture,phase){
  const shift=capture.keys?.leftForward??0;
  return (((phase+shift)%1+1)%1)*(capture.frames-1);
 }
 function hipOffset(capture,frame){
  const samples=capture.hipY;
  if(!samples||!samples.length)return 0;
  const i=Math.floor(frame),j=Math.min(samples.length-1,i+1),a=frame-i;
  const h=samples[i]*(1-a)+samples[j]*a;
  const mean=samples.reduce((acc,v)=>acc+v,0)/samples.length;
  // Preserve measured capture bounce, not an added procedural sine.
  return clamp(h-mean,-.045,.045);
 }
 function sample(clip,phase){
  if(!rigs.has(clip))throw new RangeError('Unsupported Mixamo gait: '+clip);
  if(!finite(phase))throw new RangeError('Invalid capture phase');
  const source=rigs.get(clip),frame=frameAt(source.capture,phase);
  const prior=new Map(all.map(n=>[n,bones.get(n).quaternion.clone()]));
  const before=pelvis.position.clone();
  try{
   for(const name of all)bones.get(name).quaternion.copy(rest.get(name));
   pelvis.position.copy(pelvisRest);
   root.updateMatrixWorld(true);
   const result=source.retarget.pose(source.clip,frame,{body:1,legs:1});
   if(result!==true)throw new Error('Mixamo capture failed: '+clip);
   const y=hipOffset(source.capture,frame);
   pelvis.position.copy(pelvisRest);pelvis.position.y+=y;
   root.updateMatrixWorld(true);
   const pose=new Map(all.map(n=>[n,bones.get(n).quaternion.clone()]));
   const feet={};
   for(const side of ['l','r']){
    const ankle=bones.get('foot_'+side).getWorldPosition(new THREE.Vector3());
    feet[side]=root.worldToLocal(ankle).toArray();
   }
   return{pose,clip,frame,phase:((phase%1)+1)%1,
    translation:{x:0,y,z:0},feet,source:'Footera baked Adobe Mixamo'};
  }finally{
   for(const name of all)bones.get(name).quaternion.copy(prior.get(name));
   pelvis.position.copy(before);root.updateMatrixWorld(true);
  }
 }
 // Root distance comes from the captured shoe path during its stance.
 // Without movement of the WHOLE player, an in-place animated shoe can slide
 // over half a metre; stretching the knee to correct that is unphysical.
 // This track is only for a free-moving preview root, not the live match path.
 const travelInfo=new Map();
 function getTravelInfo(clip){
  if(!rigs.has(clip))throw new RangeError('Unsupported Mixamo gait: '+clip);
  if(!travelInfo.has(clip)){
   const p0=sample(clip,0).feet,p5=sample(clip,.5).feet;
   const leftStart=new THREE.Vector3(...p0.l),rightStart=new THREE.Vector3(...p5.r);
   const dL=leftStart.clone().sub(new THREE.Vector3(...p5.l));
   const dR=rightStart.clone().sub(new THREE.Vector3(...p0.r));
   dL.y=0;dR.y=0;
   // Reject implausible strides caused by broken retargeting rather than
   // injecting giant synthetic root motions into the preview.
   if(dL.length()>1.4||dR.length()>1.4)
    throw new Error('Unphysical captured stride: '+clip);
   travelInfo.set(clip,{leftStart,rightStart,dL,dR,
    stride:dL.clone().add(dR)});
  }
  return travelInfo.get(clip);
 }
 function rootTravel(clip,absoluteCycles,feet=null){
  if(!Number.isFinite(absoluteCycles))throw new RangeError('Invalid root motion phase');
  const c=Math.floor(absoluteCycles),p=absoluteCycles-c;
  const info=getTravelInfo(clip),liveFeet=feet||sample(clip,p).feet;
  const local=p<.5?
   info.leftStart.clone().sub(new THREE.Vector3(...liveFeet.l)):
   info.dL.clone().add(info.rightStart).sub(new THREE.Vector3(...liveFeet.r));
  local.y=0;
  return local.addScaledVector(info.stride,c);
 }
 function worldFootAnchor(clip,absoluteCycles,side,basePosition,rootQuaternion){
  if(!['l','r'].includes(side)||!Number.isFinite(absoluteCycles))
   throw new RangeError('Invalid world footprint');
  const touchdown=Math.floor(absoluteCycles)+(side==='r'?.5:0);
  const displacement=rootTravel(clip,touchdown);
  return anchor(clip,side).add(displacement)
   .applyQuaternion(rootQuaternion).add(basePosition);
 }
 const anchors=new Map();
 function anchor(clip,side){
  if(!['l','r'].includes(side))throw new RangeError('Unknown foot: '+side);
  const key=clip+side;
  if(!anchors.has(key)){
   const phase=side==='l'?0:.5;
   anchors.set(key,Float32Array.from(sample(clip,phase).feet[side]));
  }
  return new THREE.Vector3(...anchors.get(key));
 }
 function applyTranslation(translation){
  if(!translation||!finite(translation.y)||!finite(translation.x)||!finite(translation.z))
   throw new TypeError('Invalid capture hip translation');
  pelvis.position.copy(pelvisRest).add(
   new THREE.Vector3(clamp(translation.x,-.045,.045),
    clamp(translation.y,-.045,.045),clamp(translation.z,-.045,.045)));
  root.updateMatrixWorld(true);
 }
 function reset(){pelvis.position.copy(pelvisRest);root.updateMatrixWorld(true)}
 return{sample,anchor,rootTravel,worldFootAnchor,applyTranslation,reset,sourceClips:FOOTERA_MOCAP_GAITS,
  boneCount:all.length,hipRest:pelvisRest.clone()};
}
