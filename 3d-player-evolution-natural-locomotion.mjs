/**
 * Footera Player Evolution 2.0 / Step 13 — speed-matched natural locomotion.
 * Experimental 60-bone LAB ONLY. Never writes joints, input Mixamo captures,
 * original GLB, game movement or authoritative match physics.
 *
 * Pose blends use original captured quaternions only. Foot plants remain the
 * responsibility of the world-space contact/IK solver (Step 12).
 * Player-root preview speed is integrated from measured capture stride
 * DIRECTIONS and bounded user-requested speed; no positional jumps at clip
 * changes. Each player gets an independent state machine.
 */
const CLIPS=Object.freeze(['walk','jog','run','sprint']);
const SOURCE_RATES=Object.freeze([1.05,1.4,1.7,2.1]);
const DEFAULT_SPEEDS=Object.freeze([1.25,2.65,4.55,6.75]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const finite=Number.isFinite;
const flat=v=>{
 if(v?.toArray){const a=v.toArray();return [a[0],a[2]]}
 if(Array.isArray(v)&&v.length>=3)return [v[0],v[2]];
 if(finite(v?.x)&&finite(v?.z))return [v.x,v.z];
 throw new TypeError('Invalid captured horizontal root displacement');
};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const norm=v=>Math.hypot(...v);
const normalized=v=>{const n=norm(v);return n>1e-8?[v[0]/n,v[1]/n]:[0,1]};
const scale=(a,n)=>[a[0]*n,a[1]*n];
const moveToward=(a,b,limit)=>a+clamp(b-a,-limit,limit);

export function createFooteraNaturalLocomotion(capture,{
  maxAcceleration=6.5,maxDeceleration=8,
  speedNodes=DEFAULT_SPEEDS,resetGap=.30
}={}){
 if(typeof capture?.sample!=='function'||typeof capture?.rootTravel!=='function')
  throw new TypeError('Natural locomotion needs genuine captured Mixamo sampling');
 if(![maxAcceleration,maxDeceleration,resetGap].every(finite)||
  maxAcceleration<=0||maxAcceleration>18||maxDeceleration<=0||maxDeceleration>25||
  resetGap<=0||resetGap>.75||
  !Array.isArray(speedNodes)||speedNodes.length!==4||
  !speedNodes.every((x,i)=>finite(x)&&x>.3&&x<=12&&(i===0||x>speedNodes[i-1]+.25)))
  throw new RangeError('Invalid locomotion speed or acceleration calibration');
 const calibration=CLIPS.map((name,i)=>{
  const a=flat(capture.rootTravel(name,0)),b=flat(capture.rootTravel(name,1));
  const stride=sub(b,a),length=norm(stride);
  if(!finite(length)||length<.025||length>3.5)
   throw new RangeError('Unphysical or missing captured '+name+' stride: '+length);
  return {name,sourceCadenceHz:SOURCE_RATES[i],strideMetres:length,
   capturedSpeedMps:length*SOURCE_RATES[i],targetSpeedMps:speedNodes[i],
   direction:normalized(stride)};
 });
 // Root heading agrees with the actual run capture; changing gait may only
 // blend secondary lateral deviation, not turn the player through 180°.
 const forward=calibration[2].direction;
 let previous=null;
 function reset(){previous=null}
 function choice(speed){
  let low=0;
  while(low<3&&speed>speedNodes[low+1])low++;
  const high=Math.min(low+1,3);
  const alpha=low===high?0:clamp((speed-speedNodes[low])/
   (speedNodes[high]-speedNodes[low]),0,1);
  return {low,high,alpha,clips:[CLIPS[low],CLIPS[high]],
   weights:low===high?{[CLIPS[low]]:1}:
    {[CLIPS[low]]:1-alpha,[CLIPS[high]]:alpha}};
 }
 function sample({time,targetSpeed=0}={}){
  if(!finite(time)||time<0||!finite(targetSpeed)||
   targetSpeed<0||targetSpeed>12)
   throw new RangeError('Invalid locomotion timeline or target speed');
  const rawDt=previous?time-previous.time:0;
  if(!previous||rawDt<0||rawDt>resetGap){
   previous={time,speed:0,cycles:0,travel:[0,0],acceleration:0};
  }else if(rawDt>0){
   const p=previous,rate=targetSpeed>=p.speed?maxAcceleration:maxDeceleration;
   const nextSpeed=moveToward(p.speed,targetSpeed,rate*rawDt);
   // Trapezoidal integrated displacement gives continuous root velocity
   // through walk-jog-run-sprint transitions and safe deceleration.
   const averageSpeed=(p.speed+nextSpeed)*.5;
   const blend=choice(Math.max(averageSpeed,speedNodes[0]));
   const calA=calibration[blend.low],calB=calibration[blend.high];
   const effectiveCadence=lerp(calA.sourceCadenceHz,calB.sourceCadenceHz,
    blend.alpha)*clamp(averageSpeed/Math.max(.25,
     lerp(speedNodes[blend.low],speedNodes[blend.high],blend.alpha)),.2,1.45);
   // Blend captured stride directions, keeping root displacement monotone.
   const dir=normalized(add(scale(calA.direction,1-blend.alpha),
    scale(calB.direction,blend.alpha)));
   const oriented=dir[0]*forward[0]+dir[1]*forward[1]>.30?dir:forward;
   const step=averageSpeed*rawDt;
   previous={time,speed:nextSpeed,cycles:p.cycles+effectiveCadence*rawDt,
    travel:add(p.travel,scale(oriented,step)),
    acceleration:(nextSpeed-p.speed)/rawDt};
  }
  const p=previous,which=choice(Math.max(p.speed,speedNodes[0]));
  const lo=CLIPS[which.low],hi=CLIPS[which.high];
  const base=capture.sample(lo,p.cycles);
  const next=which.high===which.low||which.alpha<1e-8?null:
   capture.sample(hi,p.cycles);
  if(!(base.pose instanceof Map)||(!next?false:!(next.pose instanceof Map)))
   throw new TypeError('Captured source poses must be maps of 60-bone quaternions');
  // Preserve the captured pelvis's genuine vertical motion as well as
  // every joint quaternion. Blending never writes into the source samples.
  const translation=Object.fromEntries(['x','y','z'].map(axis=>{
   const a=base.translation?.[axis]??0,b=next?.translation?.[axis]??a;
   if(!finite(a)||!finite(b))throw new TypeError('Invalid capture pelvis translation');
   return [axis,lerp(a,b,which.alpha)];
  }));
  const pose=new Map();
  for(const [name,q] of base.pose){
   if(!q||typeof q.clone!=='function'||typeof q.slerp!=='function')
    throw new TypeError('Invalid captured Mixamo quaternion: '+name);
   const blend=q.clone();
   if(next){
    const b=next.pose.get(name);
    if(!b)throw new TypeError('Missing joint in second captured clip: '+name);
    blend.slerp(b,which.alpha).normalize?.();
   }
   pose.set(name,blend);
  }
  return {pose,translation,clip:next?lo+'+'+hi:lo,frame:base.frame,
   phase:((p.cycles%1)+1)%1,cycles:p.cycles,
   speedMps:p.speed,targetSpeedMps:targetSpeed,
   accelerationMps2:p.acceleration,
   rootTravel:[p.travel[0],0,p.travel[1]],
   rootDisplacementMetres:Math.hypot(...p.travel),
   source:'Original captured Adobe Mixamo 60-bone quaternion crossfade',
   clipWeights:which.weights,
   sourceClips:next?[lo,hi]:[lo],
   captureFrames:next?[base.frame,next.frame]:[base.frame],
   sourceCadenceHz:lerp(SOURCE_RATES[which.low],
     SOURCE_RATES[which.high],which.alpha),
   measuredCalibration:calibration.map(({name,strideMetres,
    capturedSpeedMps,targetSpeedMps})=>
    ({name,strideMetres,capturedSpeedMps,targetSpeedMps})),
   footContactSource:'world-space planted foot IK; no invented Mixamo contact flags',
   liveMatchRoot:false};
 }
 return{sample,reset,calibration,clips:CLIPS,
  limits:{maxAcceleration,maxDeceleration,resetGap,speedNodes:[...speedNodes]}};
}
