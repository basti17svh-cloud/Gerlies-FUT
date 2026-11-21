/**
 * Footera Player Evolution 2.0 / Step 9.
 * Preview-only CONTINUOUS vertical sole grounding over sampled real Mixamo.
 *
 * Step 8 solved each frame independently. At a support-foot switch its raw
 * ground-root correction may change abruptly even though the original feet
 * move smoothly. A physically bounded rate/acceleration controller now
 * changes only the whole preview ROOT Y; it never authors a new gait,
 * changes source Mixamo samples, stretches knee bones or touches live matches.
 *
 * This is an online temporal controller, NOT a collision/raycast solution.
 * Seeking backwards, seeking by >resetGap, changing motion/key or disabling
 * resets to the new measured target for deterministic QA stills.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createFooteraContactContinuity({
 maxOffset=.10,maxRate=.72,maxAcceleration=10,resetGap=.20
}={}){
 if(![maxOffset,maxRate,maxAcceleration,resetGap].every(Number.isFinite)||
  maxOffset<=0||maxOffset>.15||maxRate<=0||maxRate>2||
  maxAcceleration<=0||maxAcceleration>30||
  resetGap<=0||resetGap>.75)
  throw new RangeError('Invalid continuous-grounding constraints');
 let previous=null;
 function reset(){previous=null}
 function sample({time,key,target,enabled=true}={}){
  if(!Number.isFinite(time)||time<0||typeof key!=='string'||!key||
   !Number.isFinite(target)||typeof enabled!=='boolean')
   throw new RangeError('Invalid temporal sole-grounding sample');
  const desired=clamp(target,-maxOffset,maxOffset);
  if(!enabled){
   reset();
   return{offset:desired,target:desired,residual:0,velocity:0,
    limited:false,reset:true,enabled:false};
  }
  const dt=previous?time-previous.time:0;
  if(!previous||previous.key!==key||dt<0||dt>resetGap){
   previous={key,time,offset:desired,velocity:0};
   return{offset:desired,target:desired,residual:0,velocity:0,
    limited:false,reset:true,enabled:true};
  }
  if(dt<1e-7)
   return{offset:previous.offset,target:desired,
    residual:desired-previous.offset,velocity:previous.velocity,
    limited:Math.abs(desired-previous.offset)>1e-6,
    reset:false,enabled:true};
  // Velocity is limited by both the maximum translation speed and a
  // stopping-distance envelope. Acceleration is bounded per sample.
  // The target is always measured from the real skinned shoe, not predicted
  // using an invented animation or a sine bounce.
  const difference=desired-previous.offset;
  const safeSpeed=Math.sqrt(2*maxAcceleration*Math.abs(difference));
  const requestedSpeed=Math.sign(difference)*Math.min(maxRate,safeSpeed);
  let velocity=clamp(requestedSpeed,
   previous.velocity-maxAcceleration*dt,
   previous.velocity+maxAcceleration*dt);
  let change=velocity*dt;
  // Contact target can reverse at heel/toe exchange: don't overshoot it.
  // Never move away from the currently measured ground contact.
  if(Math.sign(change)!==Math.sign(difference))change=0;
  else if(Math.abs(change)>Math.abs(difference))change=difference;
  const offset=clamp(previous.offset+change,-maxOffset,maxOffset);
  velocity=change/dt;
  previous={key,time,offset,velocity};
  return{offset,target:desired,residual:desired-offset,velocity,
   limited:Math.abs(desired-offset)>1e-6,
   reset:false,enabled:true};
 }
 return{sample,reset,limits:{maxOffset,maxRate,maxAcceleration,resetGap}};
}
