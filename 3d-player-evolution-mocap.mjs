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
 return{sample,anchor,applyTranslation,reset,sourceClips:FOOTERA_MOCAP_GAITS,
  boneCount:all.length,hipRest:pelvisRest.clone()};
}
