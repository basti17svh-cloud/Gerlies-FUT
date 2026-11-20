/**
 * Experimental biomechanics layer for Footera Player Evolution 2.0.
 * Test branch only. The existing 52 primary joints are still owned by the
 * PoseDirector; this sampler RETURNs quaternion poses instead of writing them.
 * The only additive transform applied here is a bounded, rest-relative pelvis
 * translation. No change to root motion, gameplay physics or foot IK.
 */
import * as THREE from './vendor/three/three.module.min.js';

const TAU=Math.PI*2;
const REQUIRED=['pelvis','spine_01','spine_02','spine_03','neck_01',
 'thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r',
 'clavicle_l','clavicle_r','upperarm_l','upperarm_r',
 'lowerarm_l','lowerarm_r'];
const clamp=(x,low,high)=>Math.min(high,Math.max(low,x));

export function createFooteraGaitMotion(root){
 if(!root||typeof root.traverse!=='function')throw new TypeError('Expected 3D model root');
 const joints=new Map();
 root.traverse(object=>{if(object.isBone)joints.set(object.name,object)});
 for(const name of REQUIRED)if(!joints.has(name))
  throw new Error('Missing gait joint: '+name);
 const base=new Map(REQUIRED.map(name=>[name,joints.get(name).quaternion.clone()]));
 const pelvis=joints.get('pelvis'),origin=pelvis.position.clone();
 const angles=new THREE.Euler();
 const delta=new THREE.Quaternion();
 const offset=new THREE.Vector3();
 function sample(time,{cadence=1.45,strength=1}={}){
  if(!Number.isFinite(time)||!Number.isFinite(cadence)||
     cadence<.4||cadence>3||!Number.isFinite(strength)||strength<0||strength>1)
   throw new RangeError('Gait arguments out of range');
  const phase=time*TAU*cadence,lead=Math.sin(phase),double=Math.sin(2*phase);
  const lLift=Math.max(0,lead),rLift=Math.max(0,-lead);
  const yaw=.085*lead*strength,roll=.046*lead*strength;
  const pitch=(.014+.015*double)*strength;
  const pose=new Map();
  const set=(name,x=0,y=0,z=0)=>{
   delta.setFromEuler(angles.set(x,y,z,'XYZ'));
   pose.set(name,base.get(name).clone().multiply(delta).normalize());
  };
  // Frontal plane weight shift + transverse rotation are intentionally small.
  // Core counters these rotations instead of following pelvis like a block.
  set('pelvis',pitch,yaw,roll);
  set('spine_01',-.50*pitch,-.62*yaw,-.63*roll);
  set('spine_02',-.25*pitch,-.31*yaw,-.27*roll);
  set('spine_03',-.12*pitch,-.18*yaw,-.18*roll);
  set('neck_01',.10*pitch,.08*yaw,.10*roll);
  set('clavicle_l',0,-.045*lead*strength,0);
  set('clavicle_r',0,.045*lead*strength,0);
  set('thigh_l',.43*lead*strength,.015*lead*strength,-.045*lLift*strength);
  set('thigh_r',-.43*lead*strength,.015*lead*strength,.045*rLift*strength);
  set('calf_l',(-.12-.60*lLift)*strength);
  set('calf_r',(-.12-.60*rLift)*strength);
  set('foot_l',(.06*lead-.09*lLift)*strength);
  set('foot_r',(-.06*lead-.09*rLift)*strength);
  // Arms counter-swing the opposite legs, elbows remain comfortably flexed.
  set('upperarm_l',-.30*lead*strength,0,-.045*strength);
  set('upperarm_r',.30*lead*strength,0,.045*strength);
  set('lowerarm_l',(-.22-.10*lLift)*strength);
  set('lowerarm_r',(-.22-.10*rLift)*strength);
  // Pelvis local translation must be relative to captured bind pose.
  // Caps avoid planted feet tearing away in the absence of IK.
  const translation={
   x:.016*lead*strength,
   y:(.006*(1-Math.cos(2*phase)))*strength,
   z:.004*double*strength
  };
  return {pose,translation,phase,
   diagnostics:{yaw,roll,pitch,lateralMetres:translation.x,bobMetres:translation.y,
     spineCounterYaw:-.62*yaw}};
 }
 function applyTranslation(translation){
  if(!translation||!['x','y','z'].every(k=>Number.isFinite(translation[k])))
   throw new TypeError('Invalid pelvis translation');
  offset.set(clamp(translation.x,-.025,.025),clamp(translation.y,-.018,.018),
   clamp(translation.z,-.012,.012));
  pelvis.position.copy(origin).add(offset);
  root.updateMatrixWorld(true);
  return offset.clone();
 }
 function reset(){
  pelvis.position.copy(origin);
  offset.set(0,0,0);
  root.updateMatrixWorld(true);
 }
 function getOffset(){return pelvis.position.clone().sub(origin)}
 return{sample,applyTranslation,reset,getOffset,restPosition:origin.clone()};
}
