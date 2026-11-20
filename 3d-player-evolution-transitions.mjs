/**
 * Footera Player Evolution 2.0 - genuine Mixamo directional transitions.
 * LAB ONLY: mixes the real baked 52-bone local quaternions from jog/run with
 * strafe-left/right and backpedal captures. Does not invent a side-step with
 * procedural hip, leg or arm oscillation. No live-game root translation.
 *
 * IMPORTANT: Crossfades preserve continuous joint orientation but do not
 * guarantee world-space shoe plant. True football cuts will additionally need
 * captured velocity/heading, live match root and transition-foot constraints.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {FOOTERA_EVOLUTION_BONES,collectFooteraBones} from './3d-player-evolution-rig.mjs';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
export const FOOTERA_DIRECTION_MOVES=Object.freeze(['strafeLeft','strafeRight','backpedal']);

export function createFooteraDirectionalTransitions(root,capture){
 if(!root?.traverse||typeof capture?.sample!=='function')
  throw new TypeError('Required rig and authentic captured-gait sampler');
 const bones=collectFooteraBones(root).bones,all=FOOTERA_EVOLUTION_BONES.map(b=>b.name);
 const pelvis=bones.get('pelvis'),pelvisRest=pelvis.position.clone();
 if(!['foot_l','foot_r'].every(n=>bones.get(n)))throw new Error('Missing directional foot joints');
 for(const name of FOOTERA_DIRECTION_MOVES){
  const check=capture.sample(name,0);
  if(check.pose.size!==all.length||!check.source.includes('Mixamo'))
   throw new Error('Missing original Mixamo directional capture: '+name);
 }
 function blend({from='run',to='strafeLeft',fromPhase=0,toPhase=0,weight=0}={}){
  if(![fromPhase,toPhase,weight].every(Number.isFinite)||weight<0||weight>1)
   throw new RangeError('Invalid direction blend parameters');
  if(!FOOTERA_DIRECTION_MOVES.includes(to))throw new RangeError('Unknown target direction');
  if(!['walk','jog','run','sprint',...FOOTERA_DIRECTION_MOVES].includes(from))
   throw new RangeError('Unknown source direction');
  const a=capture.sample(from,fromPhase),b=capture.sample(to,toPhase);
  const eased=ease(weight);
  const pose=new Map();
  for(const bone of all){
   const x=a.pose.get(bone),y=b.pose.get(bone);
   if(!x||!y)throw new Error('Incomplete real Mixamo capture: '+bone);
   pose.set(bone,x.clone().slerp(y,eased).normalize());
  }
  const translation={
   x:0,y:a.translation.y*(1-eased)+b.translation.y*eased,z:0
  };
  // Reconstruct shoe targets from the actual FK chain after quaternion blend;
  // linear foot-position interpolation would invent physically false targets.
  const previous=new Map(all.map(n=>[n,bones.get(n).quaternion.clone()]));
  const oldPelvis=pelvis.position.clone();
  let feet;
  try{
   for(const n of all)bones.get(n).quaternion.copy(pose.get(n));
   pelvis.position.copy(pelvisRest).add(new THREE.Vector3(0,translation.y,0));
   root.updateMatrixWorld(true);
   feet=Object.fromEntries(['l','r'].map(side=>[side,
    root.worldToLocal(bones.get('foot_'+side).getWorldPosition(
     new THREE.Vector3())).toArray()]));
  }finally{
   for(const n of all)bones.get(n).quaternion.copy(previous.get(n));
   pelvis.position.copy(oldPelvis);
   root.updateMatrixWorld(true);
  }
  return{pose,feet,translation,from,to,weight,easedWeight:eased,
   fromFrame:a.frame,toFrame:b.frame,phase:a.phase,clip:from+' → '+to,
   source:'Crossfade of original baked Adobe Mixamo directional capture quaternions',
   worldFootPlantGuaranteed:false,liveRootMotion:false};
 }
 /**
  * Single run -> directional move -> run showcase, continuous at the two
  * fade boundaries. Motion phase is derived from monotonic absolute time to
  * avoid clock reset/snap at a cut threshold; transition is not looped.
  */
 function sampleSequence({time=0,direction='strafeLeft'}={}){
  if(!Number.isFinite(time)||time<0||time>3)
   throw new RangeError('Direction preview time must be 0..3 s');
  if(!FOOTERA_DIRECTION_MOVES.includes(direction))throw new RangeError('Unknown direction');
  const fromPhase=time*1.7,toPhase=time*(direction==='backpedal'?1.28:1.55);
  if(time<=.65)return blend({to:direction,fromPhase,toPhase,weight:0});
  if(time<=1.05)return blend({to:direction,fromPhase,toPhase,weight:(time-.65)/.40});
  if(time<=1.55)return blend({to:direction,fromPhase,toPhase,weight:1});
  if(time<=1.95)return blend({to:direction,fromPhase,toPhase,weight:1-(time-1.55)/.40});
  return blend({to:direction,fromPhase,toPhase,weight:0});
 }
 return{blend,sampleSequence,moves:FOOTERA_DIRECTION_MOVES,
  captureSource:'Footera embedded Adobe Mixamo'};
}
