/* Footera V21.184 (hands V21.187): full-body CC0 motion capture on the imported footballers.
 * Real captured Quaternius gait cycles drive arms, shoulders, spine, neck and
 * hips with their own bone rotations (not the reduced angle deltas of V21.75).
 * Legs stay on the existing distance-based gait and foot IK, so boots stay
 * planted and every authored ball touch, shot and keeper save is unchanged.
 * Deterministic: the phase comes from travelled distance, idle from time.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {FOOTERA_UAL_POSE} from './3d-mocap-ual-data.mjs?v=21184';
export const UAL_POSE_LAYER_VERSION='21.184-ual-full';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const ease=(a,b,t)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const TAU=Math.PI*2;
const BONES=FOOTERA_UAL_POSE.bones,BONE_INDEX=new Map(BONES.map((b,i)=>[b,i]));
// Absolute captured rotation: the whole arm chain swings like the capture.
const ARMS=['clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r'];
// Only the captured swing around each clip's own average pose is added, so the
// procedural lean, turn and head aim at the ball stay intact: [bone, share].
const ADDITIVE=[['pelvis',.8],['spine_01',.8],['spine_02',.8],['spine_03',.8],['neck_01',.5],['Head',.35]];

function decode(base64){
 const binary=atob(base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const raw=new Int16Array(bytes.buffer),out=new Float32Array(raw.length/3*4);
 for(let i=0,j=0;i<raw.length;i+=3,j+=4){
  const x=raw[i]/32767,y=raw[i+1]/32767,z=raw[i+2]/32767;
  out[j]=x;out[j+1]=y;out[j+2]=z;out[j+3]=Math.sqrt(Math.max(0,1-x*x-y*y-z*z));
 }
 return out;
}
// Normalised per-bone average over the cycle (inverse stored).
function averagePose(quats,frames){
 const n=BONES.length,out=new Float32Array(n*4),q=new THREE.Quaternion();
 for(let b=0;b<n;b++){
  let x=0,y=0,z=0,w=0;
  for(let f=0;f<frames;f++){
   const i=(f*n+b)*4,sign=quats[i]*quats[b*4]+quats[i+1]*quats[b*4+1]+quats[i+2]*quats[b*4+2]+quats[i+3]*quats[b*4+3]<0?-1:1;
   x+=quats[i]*sign;y+=quats[i+1]*sign;z+=quats[i+2]*sign;w+=quats[i+3]*sign;
  }
  q.set(x,y,z,w).normalize().invert().toArray(out,b*4);
 }
 return out;
}
let decoded=null;
function clips(){
 if(decoded)return decoded;
 decoded={};
 for(const [name,clip] of Object.entries(FOOTERA_UAL_POSE.clips))
  decoded[name]={...clip,quats:decode(clip.bytes),mean:averagePose(decode(clip.bytes),clip.frames)};
 decoded.fingers=decode(FOOTERA_UAL_POSE.fingerPose);
 return decoded;
}
const qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
// Looping, slerped sample of one bone in one clip.
function sampleBone(clip,phase,bone,out){
 const x=(((phase%1)+1)%1)*clip.frames,f0=Math.floor(x)%clip.frames,f1=(f0+1)%clip.frames,u=x-Math.floor(x);
 const n=BONES.length*4;
 qa.fromArray(clip.quats,f0*n+bone*4);qb.fromArray(clip.quats,f1*n+bone*4);
 return out.slerpQuaternions(qa,qb,u);
}

// Shared shot/cut windows of the V21.75 layer: the authored strike owns the body.
export function ualPoseWeight(time=0,info={}){
 const t=clamp(time,0,10.4);
 const action=clamp(1-ease(4.62,4.94,t)+ease(6.02,6.37,t));
 const cutting=/^(?:inside|cut_inside|double_feint|near_post_cut)_/.test(info.sequence||'')
  ?1-.80*pulse(t,2.73,2.96,3.23,3.64):1;
 const ballControl=1-.45*clamp(info.control||0);
 // V21.297: fade the capture out over the take-off instead of cutting it.
 const airborne=info.grounded===false?1-ease(4.9,5.06,t):1;
 return action*cutting*ballControl*airborne;
}

export function createUalPoseLayer(bones){
 const data=clips();
 const targets=new Map(),centres=new Map();
 for(const name of BONES){targets.set(name,new THREE.Quaternion());centres.set(name,new THREE.Quaternion())}
 const fingerBones=FOOTERA_UAL_POSE.fingers.map(name=>bones.get(name));
 const fingerRest=FOOTERA_UAL_POSE.fingers.map(name=>new THREE.Quaternion().fromArray(FOOTERA_UAL_POSE.rest[name]));
 const fingerSide=FOOTERA_UAL_POSE.fingers.map(name=>name.endsWith('_r')?1:0),fingerPose=new THREE.Quaternion();
 // Joints the procedural rig never writes restart from their rest pose every
 // frame, so seeking or replaying gives exactly the same pose (no history).
 const unowned=['neck_01','clavicle_l','clavicle_r','hand_l','hand_r']
  .map(name=>[bones.get(name),bones.get(name)?.quaternion.clone()]).filter(([bone])=>bone);
 const second=new THREE.Quaternion(),delta=new THREE.Quaternion(),centre=new THREE.Quaternion();
 const state={clip:'Idle_Loop',phase:0,weight:0,source:'Quaternius UAL CC0'};
 // Relaxed, slightly closed hands instead of the flat bind-pose fingers.
 // open[side] (0..1) spreads that hand towards the flat palm, e.g. for wings
 // or arms pointing to the sky in a goal celebration.
 function shapeHands(open=null){
  for(let i=0;i<fingerBones.length;i++){
   const bone=fingerBones[i];if(!bone)continue;
   fingerPose.fromArray(data.fingers,i*4);
   const spread=open?clamp(open[fingerSide[i]])*.8:0;
   bone.quaternion.slerpQuaternions(fingerPose,fingerRest[i],spread);
  }
 }
 function apply(time=0,info={},keeperRole=false){
  for(const [bone,rest] of unowned)bone.quaternion.copy(rest);
  if(keeperRole||info.clipEnabled===false){state.weight=0;return state}
  const speed=clamp(info.speed||0),cycle=Number.isFinite(info.stride)?info.stride/TAU:0;
  let first='Idle_Loop',next='Idle_Loop',alpha=0;
  if(speed<.12){alpha=ease(.03,.12,speed);next='Walk_Loop'}
  else if(speed<.45){first='Walk_Loop';next='Jog_Fwd_Loop';alpha=ease(.18,.45,speed)}
  else if(speed<.8){first='Jog_Fwd_Loop';next='Sprint_Loop';alpha=ease(.55,.8,speed)}
  else{first=next='Sprint_Loop'}
  const phaseOf=name=>name==='Idle_Loop'?time/data.Idle_Loop.duration:cycle+data[name].leftForward;
  const weight=ualPoseWeight(time,info)*(.92-.12*ease(.8,1,speed));
  state.clip=alpha>=.5?next:first;state.phase=((phaseOf(state.clip)%1)+1)%1;state.weight=weight;
  if(weight<=.001)return state;
  for(const name of BONES){
   const bone=bones.get(name),target=targets.get(name);
   if(!bone||!target)continue;
   const index=BONE_INDEX.get(name);
   sampleBone(data[first],phaseOf(first),index,target);
   const middle=centres.get(name).fromArray(data[first].mean,index*4);
   if(alpha>0&&next!==first){
    target.slerp(sampleBone(data[next],phaseOf(next),index,second),alpha);
    middle.slerp(centre.fromArray(data[next].mean,index*4),alpha);
   }
  }
  // A celebrating scorer's arms belong to the authored celebration pose.
  const armWeight=weight*(1-clamp(info.celebrate||0));
  for(const name of ARMS){
   const bone=bones.get(name);if(bone)bone.quaternion.slerp(targets.get(name),armWeight);
  }
  for(const [name,share] of ADDITIVE){
   const bone=bones.get(name);if(!bone)continue;
   delta.copy(centres.get(name)).multiply(targets.get(name));
   second.identity().slerp(delta,weight*share);
   bone.quaternion.multiply(second);
  }
  return state;
 }
 // V21.296 (off with footera-3d-motion-capture=0): the captured legs too.
 // V21.297: proper rest-relative retarget. Each captured leg bone's rotation
 // away from the capture's rest pose (in the capture's pelvis space, carried
 // over by C) is applied to OUR rest pose, so the legs keep their real length
 // and knee bend instead of inheriting the capture skeleton's rest offsets.
 const CHAIN=[['thigh_l','pelvis'],['calf_l','thigh_l'],['foot_l','calf_l'],['thigh_r','pelvis'],['calf_r','thigh_r'],['foot_r','calf_r']];
 const pelvisBone=bones.get('pelvis');
 const restOf=name=>new THREE.Quaternion().fromArray(FOOTERA_UAL_POSE.rest[name]);
 const legReady=!!pelvisBone&&CHAIN.every(([b])=>bones.get(b)&&FOOTERA_UAL_POSE.rest[b])&&!!FOOTERA_UAL_POSE.rest.pelvis;
 const C=legReady?pelvisBone.quaternion.clone().multiply(restOf('pelvis').invert()):null,Cinv=C?.clone().invert();
 const oursRestW=new Map(),clipRestInvW=new Map();
 if(legReady){
  oursRestW.set('pelvis',pelvisBone.quaternion.clone());const clipW=new Map([['pelvis',restOf('pelvis')]]);
  for(const [b,parent] of CHAIN){
   oursRestW.set(b,oursRestW.get(parent).clone().multiply(bones.get(b).quaternion));
   clipW.set(b,clipW.get(parent).clone().multiply(restOf(b)));
  }
  for(const [b,q] of clipW)clipRestInvW.set(b,q.clone().invert());
 }
 const clipNowW=new Map(),legWorld=new Map(),legTarget=new THREE.Quaternion(),parentInv=new THREE.Quaternion();
 for(const b of ['pelvis',...CHAIN.map(([b])=>b)]){clipNowW.set(b,new THREE.Quaternion());legWorld.set(b,new THREE.Quaternion())}
 // perLeg (V21.297): how much of each leg [left,right] the capture may own.
 function applyLegs(w=1,perLeg=null){
  const share=clamp(state.weight*w);if(share<=.001||!legReady)return 0;
  clipNowW.get('pelvis').copy(targets.get('pelvis'));
  for(const [b,parent] of CHAIN)clipNowW.get(b).copy(clipNowW.get(parent)).multiply(targets.get(b));
  // Our pelvis stays procedural; each thigh is measured from the captured
  // pelvis (carried over by C), so the stride stays the capture's.
  for(const [b,parent] of CHAIN){
   const world=legWorld.get(b).copy(C).multiply(clipNowW.get(b)).multiply(clipRestInvW.get(b)).multiply(Cinv).multiply(oursRestW.get(b));
   const leg=perLeg?clamp(perLeg[b.endsWith('_r')?1:0]):1;if(leg<=.001)continue;
   parentInv.copy(parent==='pelvis'?pelvisBone.quaternion:legWorld.get(parent)).invert();
   bones.get(b).quaternion.slerp(legTarget.copy(parentInv).multiply(world),share*leg);
  }
  return share;
 }
 return{apply,applyLegs,shapeHands,state};
}
