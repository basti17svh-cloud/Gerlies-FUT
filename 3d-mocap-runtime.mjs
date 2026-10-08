/* Footera Motion 2.0: deterministic CC0 humanoid retargeting.
 * Generated keyframes are compact world-space anatomical angular deltas.
 * The simulation remains authoritative. Only two rigged pilot actors run this.
 * No dynamic fetch, no external runtime, no animation state allocations.
 */
import {FOOTERA_MOCAP_BONES,FOOTERA_MOCAP_CLIPS,FOOTERA_MOCAP_SCALE} from './3d-mocap-data.mjs?v=2139';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const mix=(a,b,u)=>a+(b-a)*clamp(u);
export const FOOTERA_MOCAP_VERSION='21.38-mocap-pilot';
export const FOOTERA_MOCAP_CHANNEL_COUNT=FOOTERA_MOCAP_BONES.length*3;
const decoded={};
function clipBytes(name){
 if(decoded[name])return decoded[name];
 const entry=FOOTERA_MOCAP_CLIPS[name];
 if(!entry)throw new Error('Unknown Footera motion: '+name);
 const binary=atob(entry.bytes);
 const values=new Int8Array(binary.length);
 for(let i=0;i<binary.length;i++)values[i]=(binary.charCodeAt(i)<<24)>>24;
 decoded[name]=values;
 return values;
}
export function sampleMocap(name,phase,out){
 const clip=FOOTERA_MOCAP_CLIPS[name];
 if(!clip)throw new Error('Unknown Footera motion: '+name);
 const dst=out||new Float32Array(FOOTERA_MOCAP_CHANNEL_COUNT);
 if(dst.length<FOOTERA_MOCAP_CHANNEL_COUNT)throw new Error('Motion pose channel buffer too short');
 const x=clamp(phase)*(clip.frames-1),a=Math.floor(x),b=Math.min(clip.frames-1,a+1),u=x-a;
 const src=clipBytes(name),len=FOOTERA_MOCAP_CHANNEL_COUNT;
 for(let i=0;i<len;i++)dst[i]=mix(src[a*len+i],src[b*len+i],u)/FOOTERA_MOCAP_SCALE;
 return dst;
}
const C=Object.freeze({torso:0,leftArm:3,leftElbow:6,rightArm:9,rightElbow:12,leftHip:15,leftKnee:18,leftFoot:21,rightHip:24,rightKnee:27,rightFoot:30});
function joint(a,b,i,j,weight,face=true){
 const x=face?-b[j]:b[j];
 a.rotation.x=mix(a.rotation.x,x,weight);
 a.rotation.y=mix(a.rotation.y,b[j+1],weight*.45);
 a.rotation.z=mix(a.rotation.z,face?-b[j+2]:b[j+2],weight*.5);
}
function applyRun(p,frame,blend){
 if(blend<=0)return;
 p.upper.rotation.x=mix(p.upper.rotation.x,-frame[C.torso],blend*.28);
 p.upper.rotation.y+=frame[C.torso+1]*blend*.30;
 p.upper.rotation.z+=-frame[C.torso+2]*blend*.22;
 for(let i=0;i<2;i++){
  const hip=i?C.rightHip:C.leftHip,knee=i?C.rightKnee:C.leftKnee,foot=i?C.rightFoot:C.leftFoot;
  joint(p.legs[i],frame,hip,hip,blend);
  joint(p.knees[i],frame,knee,knee,blend*.88);
  joint(p.ankles[i],frame,foot,foot,blend*.53);
  // Original footballer's arm rest is down, Quaternius source is T-pose.
  // Keep the existing base shoulder spread while adding real swing dynamics.
  const arm=i?C.rightArm:C.leftArm,elbow=i?C.rightElbow:C.leftElbow;
  p.arms[i].rotation.x+=-frame[arm]*blend*.22;
  p.arms[i].rotation.z+=-frame[arm+2]*blend*.20;
  p.elbows[i].rotation.x+=-frame[elbow]*blend*.12;
 }
}
export function applyRunningMocap(p,time,speed,stride){
 const s=clamp(speed),effort=smooth(s/.26);
 const phase=((stride/(Math.PI*2)%1)+1)%1;
 const clip=s>.62?'Sprint_Loop':s>.26?'Jog_Fwd_Loop':'Walk_Loop';
 sampleMocap(clip,phase,p.mocapFrame);
 // Do not retarget into the precisely aligned foot contact at 5.400 s.
 const strikeClear=1-smooth((time-4.71)/.27);
 const resumed=smooth((time-6.08)/.31);
 const blend=.85*effort*Math.max(strikeClear,resumed);
 applyRun(p,p.mocapFrame,blend);
 return{clip,blend};
}
export function applyKeeperMocap(p,time){
 let name,phase,weight=0;
 if(time<5.22||time>8.7)return{clip:'idle',blend:0};
 if(time<5.91){name='Jump_Start';phase=clamp((time-5.22)/.69);weight=smooth((time-5.22)/.20)*.45}
 else if(time<6.79){name='Jump_Loop';phase=clamp((time-5.91)/.88);weight=.46}
 else if(time<7.95){name='Jump_Land';phase=clamp((time-6.79)/1.16);weight=.48}
 else{name='Idle_Loop';phase=clamp((time-7.95)/.75);weight=(1-smooth((time-7.95)/.75))*.35}
 sampleMocap(name,phase,p.mocapFrame);
 const f=p.mocapFrame;
 for(let i=0;i<2;i++){
  const h=i?C.rightHip:C.leftHip,k=i?C.rightKnee:C.leftKnee,foot=i?C.rightFoot:C.leftFoot;
  joint(p.legs[i],f,h,h,weight);
  joint(p.knees[i],f,k,k,weight*.74);
  joint(p.ankles[i],f,foot,foot,weight*.50);
 }
 p.upper.rotation.x+=-f[C.torso]*weight*.35;
 p.upper.rotation.z+=-f[C.torso+2]*weight*.2;
 return{clip:name,blend:weight};
}
