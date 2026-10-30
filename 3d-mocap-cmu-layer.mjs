/* Footera: real captured football kicks (CMU mocap, free for commercial use)
 * on the imported footballer. The striker's whole body follows a real kick
 * around the 5.4 s contact: run-up lean, plant, hip turn, arm counterbalance,
 * strike and follow-through. The authored root, ball and contact stay the
 * game's: the caller pins the boots back on the authored ankle targets.
 * Deterministic: a pure function of time, finish and shooting foot.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {FOOTERA_CMU_KICKS} from './3d-mocap-cmu-data.mjs?v=21322';
export const CMU_KICK_LAYER_VERSION='21.322-cmu-kick';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const CONTACT=5.4;
const BONES=FOOTERA_CMU_KICKS.bones;
const mirrorName=n=>n.endsWith('_l')?n.slice(0,-1)+'r':n.endsWith('_r')?n.slice(0,-1)+'l':n;
const LEGS=new Set(['thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']);
// Child bone that gives each of OUR bones its direction (mirrors the baker's map).
const CHILD={pelvis:'spine_01',spine_01:'spine_02',spine_02:'spine_03',spine_03:'neck_01',neck_01:'Head',Head:null,
 clavicle_l:'upperarm_l',upperarm_l:'lowerarm_l',lowerarm_l:'hand_l',hand_l:'middle_01_l',
 clavicle_r:'upperarm_r',upperarm_r:'lowerarm_r',lowerarm_r:'hand_r',hand_r:'middle_01_r',
 thigh_l:'calf_l',calf_l:'foot_l',foot_l:'ball_l',thigh_r:'calf_r',calf_r:'foot_r',foot_r:'ball_r'};

let decoded=null;
function clips(){
 if(decoded)return decoded;
 decoded={};
 for(const [name,clip] of Object.entries(FOOTERA_CMU_KICKS.clips)){
  const binary=atob(clip.bytes),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const raw=new Int16Array(bytes.buffer),quats=new Float32Array(raw.length/3*4);
  for(let i=0,j=0;i<raw.length;i+=3,j+=4){
   const x=raw[i]/32767,y=raw[i+1]/32767,z=raw[i+2]/32767;
   quats[j]=x;quats[j+1]=y;quats[j+2]=z;quats[j+3]=Math.sqrt(Math.max(0,1-x*x-y*y-z*z));
  }
  decoded[name]={...clip,quats};
 }
 return decoded;
}
export function cmuKickClip(finish='normal'){
 return finish==='power'?'power':finish==='low_driven'?'low_driven':finish==='finesse'||finish==='pass'?'finesse':'normal';
}
// Whole-body share of the capture around the contact; legs join later,
// once the authored run-up is over, so the approach strides never skate.
// A pass is the short version of the same kick around its own contact.
export function cmuKickWeight(time,finish='normal',contact=CONTACT){
 if(['header','volley','bicycle'].includes(finish))return{body:0,legs:0};
 const t=clamp(time,0,10.4)-contact;
 if(finish==='pass'){
  const out=1-smooth((t-.22)/.26);
  return{body:.85*smooth((t+.46)/.24)*out,legs:.85*smooth((t+.3)/.14)*out};
 }
 const out=1-smooth((t-.62)/.36);
 return{body:smooth((t+.88)/.34)*out,legs:smooth((t+.54)/.16)*out};
}

export function createCmuKickLayer(bones,playerRoot){
 const data=clips();
 const ready=BONES.every(b=>bones.get(b))&&!!playerRoot;
 const state={clip:'none',weight:0,source:'CMU mocap'};
 if(!ready)return{apply:()=>state,state};
 // Our rest pose in player space, measured once before any animation.
 playerRoot.updateMatrixWorld(true);
 const rootInv=playerRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const restModel=new Map(),align=[new Map(),new Map()];let face=null,faceInv=null;
 const p=new THREE.Vector3(),c=new THREE.Vector3(),dir=new THREE.Vector3(),cap=new THREE.Vector3();
 for(const name of BONES){
  const bone=bones.get(name);
  if(!face){
   // The capture faces +Z; turn it onto the model's own forward (heel to toe).
   const heel=bones.get('foot_r').getWorldPosition(new THREE.Vector3()),toe=(bones.get('ball_r')||bones.get('foot_r')).getWorldPosition(new THREE.Vector3());
   const fwd=toe.sub(heel).applyQuaternion(rootInv);fwd.y=0;if(fwd.lengthSq()<1e-6)fwd.set(0,0,1);
   face=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),fwd.normalize());faceInv=face.clone().invert();
  }
  restModel.set(name,rootInv.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
  const child=CHILD[name]&&bones.get(CHILD[name]);
  if(child){bone.getWorldPosition(p);child.getWorldPosition(c);dir.copy(c).sub(p).applyQuaternion(rootInv).normalize()}
  else dir.set(0,1,0).applyQuaternion(restModel.get(name)).normalize();
  // A turns our rest bone onto the capture's rest bone (T-pose vs our pose).
  for(let m=0;m<2;m++){
   const source=m?mirrorName(name):name,r=FOOTERA_CMU_KICKS.restDirs[BONES.indexOf(source)];
   cap.set(m?-r[0]:r[0],r[1],r[2]).applyQuaternion(face).normalize();
   align[m].set(name,new THREE.Quaternion().setFromUnitVectors(dir,cap));
  }
 }
 const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),delta=new THREE.Quaternion(),
  target=new THREE.Quaternion(),rootQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 let contact=CONTACT;
 function sample(clip,time,index,mirror,out){
  const x=clamp((time-contact)*clip.rate+clip.contact*clip.rate,0,clip.frames-1),f0=Math.floor(x),f1=Math.min(clip.frames-1,f0+1),u=x-f0,n=BONES.length*4;
  qa.fromArray(clip.quats,f0*n+index*4);qb.fromArray(clip.quats,f1*n+index*4);
  out.slerpQuaternions(qa,qb,u);
  if(mirror){out.y=-out.y;out.z=-out.z}
  return out.premultiply(face).multiply(faceInv);
 }
 // info: {finish ('pass' for a pass), foot:'Left'|'Right', contact s}. Returns the weights.
 function apply(time=0,info={}){
  contact=Number.isFinite(info.contact)?info.contact:CONTACT;
  const w=cmuKickWeight(time,info.finish,contact);
  state.weight=w.body;
  if(w.body<=.001){state.clip='none';return w}
  const name=cmuKickClip(info.finish),clip=data[name],mirror=info.foot==='Left'?1:0;
  state.clip=name;
  playerRoot.updateMatrixWorld(true);playerRoot.getWorldQuaternion(rootQ);
  // Parents first (BONES is in hierarchy order), each bone from its parent's
  // freshly written world rotation.
  for(const bone of BONES){
   const node=bones.get(bone),weight=LEGS.has(bone)?w.legs:w.body;
   if(weight<=.001)continue;
   const source=mirror?mirrorName(bone):bone;
   sample(clip,time,BONES.indexOf(source),mirror,delta);
   target.copy(rootQ).multiply(delta).multiply(align[mirror].get(bone)).multiply(restModel.get(bone));
   node.parent.getWorldQuaternion(parentQ).invert();
   node.quaternion.slerp(parentQ.multiply(target),weight);
   node.updateMatrixWorld(true);
  }
  return w;
 }
 return{apply,state};
}
