/* Footera: shared retarget for baked captures (CMU kicks, Mixamo football
 * moves). A capture stores, per frame and bone, its world rotation away from
 * its own T-pose; this turns that onto our rest pose: per bone, the rest
 * direction is aligned to the capture's, and the capture's forward (+Z) is
 * turned onto the model's own forward (heel to toe). Mirroring swaps left and
 * right for the other foot or side. Pure function of the frame: deterministic.
 */
import * as THREE from './vendor/three/three.module.min.js';

const mirrorName=n=>n.endsWith('_l')?n.slice(0,-1)+'r':n.endsWith('_r')?n.slice(0,-1)+'l':n;
export const CAPTURE_LEGS=new Set(['thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']);
// Child bone that gives each of OUR bones its direction.
const CHILD={pelvis:'spine_01',spine_01:'spine_02',spine_02:'spine_03',spine_03:'neck_01',neck_01:'Head',Head:null,
 clavicle_l:'upperarm_l',upperarm_l:'lowerarm_l',lowerarm_l:'hand_l',hand_l:'middle_01_l',
 clavicle_r:'upperarm_r',upperarm_r:'lowerarm_r',lowerarm_r:'hand_r',hand_r:'middle_01_r',
 thigh_l:'calf_l',calf_l:'foot_l',foot_l:'ball_l',thigh_r:'calf_r',calf_r:'foot_r',foot_r:'ball_r'};

const decodedCache=new WeakMap();
// Base64 int16 xyz (w >= 0) to Float32 quaternions, once per data set.
export function decodeCaptureClips(data){
 if(decodedCache.has(data))return decodedCache.get(data);
 const out={};
 for(const [name,clip] of Object.entries(data.clips)){
  const binary=atob(clip.bytes),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const raw=new Int16Array(bytes.buffer),quats=new Float32Array(raw.length/3*4);
  for(let i=0,j=0;i<raw.length;i+=3,j+=4){
   const x=raw[i]/32767,y=raw[i+1]/32767,z=raw[i+2]/32767;
   quats[j]=x;quats[j+1]=y;quats[j+2]=z;quats[j+3]=Math.sqrt(Math.max(0,1-x*x-y*y-z*z));
  }
  out[name]={...clip,quats};
 }
 decodedCache.set(data,out);
 return out;
}

// data: {bones, restDirs, clips}. Returns null when the rig lacks a bone.
export function createCaptureRetarget(bones,playerRoot,data){
 const BONES=data.bones;
 if(!playerRoot||!BONES.every(b=>bones.get(b)))return null;
 const clips=decodeCaptureClips(data);
 // Our rest pose in player space, measured once before any animation.
 playerRoot.updateMatrixWorld(true);
 const rootInv=playerRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const heel=bones.get('foot_r').getWorldPosition(new THREE.Vector3()),toe=(bones.get('ball_r')||bones.get('foot_r')).getWorldPosition(new THREE.Vector3());
 const fwd=toe.sub(heel).applyQuaternion(rootInv);fwd.y=0;if(fwd.lengthSq()<1e-6)fwd.set(0,0,1);
 // The capture faces +Z; turn it onto the model's own forward.
 const face=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),fwd.normalize()),faceInv=face.clone().invert();
 const restModel=new Map(),align=[new Map(),new Map()];
 const p=new THREE.Vector3(),c=new THREE.Vector3(),dir=new THREE.Vector3(),cap=new THREE.Vector3();
 for(const name of BONES){
  const bone=bones.get(name);
  restModel.set(name,rootInv.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
  const child=CHILD[name]&&bones.get(CHILD[name]);
  if(child){bone.getWorldPosition(p);child.getWorldPosition(c);dir.copy(c).sub(p).applyQuaternion(rootInv).normalize()}
  else dir.set(0,1,0).applyQuaternion(restModel.get(name)).normalize();
  // Turns our rest bone onto the capture's rest bone (T-pose vs our pose).
  for(let m=0;m<2;m++){
   const r=data.restDirs[BONES.indexOf(m?mirrorName(name):name)];
   cap.set(m?-r[0]:r[0],r[1],r[2]).applyQuaternion(face).normalize();
   align[m].set(name,new THREE.Quaternion().setFromUnitVectors(dir,cap));
  }
 }
 const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),delta=new THREE.Quaternion(),
  target=new THREE.Quaternion(),rootQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 function sample(clip,frame,index,mirror,out){
  const n=BONES.length*4;let x=frame;
  if(clip.loop){x%=clip.frames-1;if(x<0)x+=clip.frames-1}
  x=Math.max(0,Math.min(clip.frames-1,x));
  const f0=Math.floor(x),f1=Math.min(clip.frames-1,f0+1),u=x-f0;
  qa.fromArray(clip.quats,f0*n+index*4);qb.fromArray(clip.quats,f1*n+index*4);
  out.slerpQuaternions(qa,qb,u);
  if(mirror){out.y=-out.y;out.z=-out.z}
  return out.premultiply(face).multiply(faceInv);
 }
 // Poses the rig at a capture frame (fractional, at the clip's rate).
 // weight: {body, legs}; bones in `skip` keep their pose.
 function pose(name,frame,weight,mirror=0,skip=null){
  const clip=clips[name];if(!clip)return false;
  playerRoot.updateMatrixWorld(true);playerRoot.getWorldQuaternion(rootQ);
  // Parents first (BONES is in hierarchy order), each bone from its parent's
  // freshly written world rotation.
  for(const bone of BONES){
   const node=bones.get(bone),w=CAPTURE_LEGS.has(bone)?weight.legs:weight.body;
   if(w<=.001||skip?.has(bone))continue;
   sample(clip,frame,BONES.indexOf(mirror?mirrorName(bone):bone),mirror,delta);
   target.copy(rootQ).multiply(delta).multiply(align[mirror].get(bone)).multiply(restModel.get(bone));
   node.parent.getWorldQuaternion(parentQ).invert();
   node.quaternion.slerp(parentQ.multiply(target),Math.min(1,w));
   node.updateMatrixWorld(true);
  }
  return true;
 }
 // The model's own left in player space (capture +X after turning).
 const left=new THREE.Vector3(1,0,0).applyQuaternion(face);
 return{pose,clips,face,left};
}
