/* Footera Motion 2.0: deterministic CC0 humanoid retargeting.
 * Generated keyframes are compact world-space anatomical angular deltas.
 * The simulation remains authoritative. Only two rigged pilot actors run this.
 * No dynamic fetch, no external runtime, no animation state allocations.
 */
import {FOOTERA_MOCAP_BONES,FOOTERA_MOCAP_CLIPS,FOOTERA_MOCAP_SCALE} from './3d-mocap-data.mjs?v=2139';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const mix=(a,b,u)=>a+(b-a)*clamp(u);
export const FOOTERA_MOCAP_VERSION='21.39-mocap-crossfade';
export const FOOTERA_MOCAP_CHANNEL_COUNT=FOOTERA_MOCAP_BONES.length*3;
const decoded={};
// Reusable scratch pose; no allocations occur at frame time.
const transitionFrame=new Float32Array(FOOTERA_MOCAP_CHANNEL_COUNT);
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
// Crossfade captured poses instead of snapping at clip boundaries.
function sampleCrossfade(a,phaseA,b,phaseB,alpha,out){
 const u=clamp(alpha);
 if(u>=1){sampleMocap(b,phaseB,out);return}
 sampleMocap(a,phaseA,out);
 if(u<=0||a===b)return;
 sampleMocap(b,phaseB,transitionFrame);
 for(let i=0;i<FOOTERA_MOCAP_CHANNEL_COUNT;i++)
  out[i]=mix(out[i],transitionFrame[i],u);
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
 // Preserve the existing speed bands while smoothly blending source skeletons.
 let first='Walk_Loop',second='',clipBlend=0;
 if(s>=.70)first='Sprint_Loop';
 else if(s>=.56){first='Jog_Fwd_Loop';second='Sprint_Loop';clipBlend=smooth((s-.56)/.14)}
 else if(s>=.34)first='Jog_Fwd_Loop';
 else if(s>=.20){first='Walk_Loop';second='Jog_Fwd_Loop';clipBlend=smooth((s-.20)/.14)}
 if(second)sampleCrossfade(first,phase,second,phase,clipBlend,p.mocapFrame);
 else sampleMocap(first,phase,p.mocapFrame);
 const clip=second&&clipBlend>=.5?second:first;
 const strikeClear=1-smooth((time-4.71)/.27);
 const resumed=smooth((time-6.08)/.31);
 const blend=.85*effort*Math.max(strikeClear,resumed);
 applyRun(p,p.mocapFrame,blend);
 return{clip,blend};
}
export function applyKeeperMocap(p,time){
 if(time<5.22||time>=8.7)return{clip:'idle',blend:0};
 const startPhase=clamp((time-5.22)/.69);
 const flightPhase=clamp((time-5.91)/.88);
 const landPhase=clamp((time-6.79)/1.16);
 const idlePhase=clamp((time-7.95)/.75);
 const startWeight=.45*smooth((time-5.22)/.20);
 const flightWeight=.46,landWeight=.48;
 const idleWeight=.35*(1-smooth((time-7.95)/.75));
 let first,second='',firstPhase,secondPhase=0,fade=0,weight;
 // Transition windows straddle takeoff, turf contact and recovery.
 if(time<5.79){first='Jump_Start';firstPhase=startPhase;weight=startWeight}
 else if(time<6.03){
  first='Jump_Start';firstPhase=startPhase;second='Jump_Loop';secondPhase=flightPhase;
  fade=smooth((time-5.79)/.24);weight=mix(startWeight,flightWeight,fade);
 }else if(time<6.67){first='Jump_Loop';firstPhase=flightPhase;weight=flightWeight}
 else if(time<6.91){
  first='Jump_Loop';firstPhase=flightPhase;second='Jump_Land';secondPhase=landPhase;
  fade=smooth((time-6.67)/.24);weight=mix(flightWeight,landWeight,fade);
 }else if(time<7.83){first='Jump_Land';firstPhase=landPhase;weight=landWeight}
 else if(time<8.07){
  first='Jump_Land';firstPhase=landPhase;second='Idle_Loop';secondPhase=idlePhase;
  fade=smooth((time-7.83)/.24);weight=mix(landWeight,idleWeight,fade);
 }else{first='Idle_Loop';firstPhase=idlePhase;weight=idleWeight}
 if(second)sampleCrossfade(first,firstPhase,second,secondPhase,fade,p.mocapFrame);
 else sampleMocap(first,firstPhase,p.mocapFrame);
 const f=p.mocapFrame;
 for(let i=0;i<2;i++){
  const h=i?C.rightHip:C.leftHip,k=i?C.rightKnee:C.leftKnee,foot=i?C.rightFoot:C.leftFoot;
  joint(p.legs[i],f,h,h,weight);
  joint(p.knees[i],f,k,k,weight*.74);
  joint(p.ankles[i],f,foot,foot,weight*.50);
 }
 p.upper.rotation.x+=-f[C.torso]*weight*.35;
 p.upper.rotation.z+=-f[C.torso+2]*weight*.2;
 return{clip:second&&fade>=.5?second:first,blend:weight};
}
