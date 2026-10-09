/* Footera V21.75: clip-based locomotion on the imported GLB.
 * The footage is already licensed CC0 Quaternius Universal Animation Library,
 * baked into Footera's 3d-mocap-data.mjs. NO Adobe Mixamo raw clip is shipped.
 * Root motion and lower-body/foot IK remain the existing match presentation.
 * Every pose is an absolute-time sample; no random, timers or new frame buffers.
 */
import {sampleMocap,FOOTERA_MOCAP_CHANNEL_COUNT} from './3d-mocap-runtime.mjs?v=2175';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const ease=(a,b,t)=>smooth((t-a)/(b-a));
const TAU=Math.PI*2;
export const GLB_CLIP_LAYER_VERSION='21.75-cc0';
const B={torso:0,leftArm:3,leftElbow:6,rightArm:9,rightElbow:12};
const CHANNELS=FOOTERA_MOCAP_CHANNEL_COUNT;
function finiteFrame(pose){for(let i=0;i<CHANNELS;i++)if(!Number.isFinite(pose[i]))return false;return true}
export function createGlbClipLayer(){
 const a=new Float32Array(CHANNELS),b=new Float32Array(CHANNELS),pose=new Float32Array(CHANNELS);
 const output={source:'Quaternius CC0',clip:'Idle_Loop',phase:0,weight:0,torsoPitch:0,torsoRoll:0,
  leftArmPitch:0,rightArmPitch:0,leftArmRoll:0,rightArmRoll:0,leftElbow:0,rightElbow:0};
 function sample(time=0,info={},enabled=true){
  const t=clamp(time,0,10.4),speed=clamp(info.speed||0),stride=Number.isFinite(info.stride)?info.stride:0;
  const phase=((stride/TAU)%1+1)%1;
  let first='Idle_Loop',second='Idle_Loop',alpha=0;
  if(speed<.22){first='Idle_Loop';second='Walk_Loop';alpha=ease(0,.22,speed)}
  else if(speed<.52){first='Walk_Loop';second='Jog_Fwd_Loop';alpha=ease(.22,.52,speed)}
  else if(speed<.82){first='Jog_Fwd_Loop';second='Sprint_Loop';alpha=ease(.52,.82,speed)}
  else{first='Sprint_Loop';second=first}
  const normalizedPhase=first==='Idle_Loop'&&second==='Idle_Loop'?0:phase;
  output.clip=alpha>=.5?second:first;output.phase=normalizedPhase;
  const shootingFade=1-ease(4.62,4.94,t);
  const resumed=ease(6.02,6.37,t);
  const action=clamp(shootingFade+resumed);
  const cutting=/^(?:inside|cut_inside|double_feint|near_post_cut)_/.test(info.sequence||'')
   ?1-.80*pulse(t,2.73,2.96,3.23,3.64):1;
  output.weight=enabled ? .45*ease(.07,.33,speed)*action*cutting : 0;
  // The phase is always calculated from travelled distance, not elapsed wall
  // time: on slow runs and at stops it cannot continue marching on the spot.
  if(output.weight<=.00001){
   output.torsoPitch=output.torsoRoll=output.leftArmPitch=output.rightArmPitch=
    output.leftArmRoll=output.rightArmRoll=output.leftElbow=output.rightElbow=0;
   return output;
  }
  sampleMocap(first,normalizedPhase,a);
  if(first!==second){sampleMocap(second,normalizedPhase,b);
   for(let i=0;i<CHANNELS;i++)pose[i]=a[i]+(b[i]-a[i])*alpha;
  }else pose.set(a);
  // Quaternius samples are player-space rotation deltas, not local GLB bone
  // Euler coordinates. The existing createPlayerSpaceRetarget applies these.
  const w=output.weight;
  if(!finiteFrame(pose))throw new Error('Invalid Footera CC0 locomotion pose');
  output.torsoPitch=clamp(-pose[B.torso],-.7,.7)*w*.30;
  output.torsoRoll=clamp(-pose[B.torso+2],-.7,.7)*w*.20;
  output.leftArmPitch=clamp(-pose[B.leftArm],-1.4,1.4)*w*.55;
  output.rightArmPitch=clamp(-pose[B.rightArm],-1.4,1.4)*w*.55;
  output.leftArmRoll=clamp(-pose[B.leftArm+2],-1.0,1.0)*w*.22;
  output.rightArmRoll=clamp(-pose[B.rightArm+2],-1.0,1.0)*w*.22;
  output.leftElbow=clamp(-pose[B.leftElbow],-1.1,1.1)*w*.15;
  output.rightElbow=clamp(-pose[B.rightElbow],-1.1,1.1)*w*.15;
  return output;
 }
 return sample;
}
