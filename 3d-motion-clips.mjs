/* Footera V21.36. Authored lightweight motion keyframes for the shared
 * procedural rig. They are NOT motion-capture files; every clip is authored
 * in rotation space and blended over the distance-phased planted-foot gait.
 * Stateless sampling preserves deterministic snapshots and the mobile tiers. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const CHANNELS=Object.freeze(['pitch','yaw','roll','arm','spread','reach','bounce','kick','knee','ankle']);
const key=(t,pitch=0,yaw=0,roll=0,arm=0,spread=0,reach=0,bounce=0,kick=0,knee=0,ankle=0)=>
 Object.freeze({t,pitch,yaw,roll,arm,spread,reach,bounce,kick,knee,ankle});
const loops={
 jog:[
 key(0,-.025,0,-.025,.015,.01,1,0),
 key(.25,-.04,.034,0,.045,.025,1,.012),
 key(.5,-.02,0,.025,-.012,.01,1,0),
 key(.75,-.04,-.034,0,-.045,.025,1,.012),
 key(1,-.025,0,-.025,.015,.01,1,0)],
 sprint:[
 key(0,-.12,-.025,-.052,.13,.09,1.09,.02),
 key(.25,-.18,.055,0,.20,.10,1.17,.03),
 key(.5,-.12,.025,.052,-.13,.09,1.09,.02),
 key(.75,-.18,-.055,0,-.20,.10,1.17,.03),
 key(1,-.12,-.025,-.052,.13,.09,1.09,.02)],
 dribble:[
 key(0,-.11,.08,-.02,.04,-.065,.81,.004),
 key(.25,-.14,.04,.015,-.045,-.08,.88,.01),
 key(.5,-.12,-.05,.035,.035,-.065,.81,.005),
 key(.75,-.14,-.03,-.015,-.04,-.08,.88,.01),
 key(1,-.11,.08,-.02,.04,-.065,.81,.004)],
 cut:[
 key(0,0,0,0,0,0,1,0),
 key(.25,-.04,.085,.085,.06,.02,.90,.024),
 key(.5,-.07,.12,.12,.10,.035,.83,.03),
 key(.75,-.04,.085,.085,.06,.02,.90,.024),
 key(1,0,0,0,0,0,1,0)]
};
const actions={
 normal:[
 key(0),key(.22,-.035,0,0,.06),key(.44,-.13,0,0,.20,.12,1,0,.06,-.03,-.02),
 key(.62,-.12,0,0,.13,.05,1,0,.09,-.03,-.01),key(1)],
 finesse:[
 key(0),key(.24,-.05,-.035,.015,.04),key(.44,-.13,.20,-.14,.21,.14,1,0,-.10,.055,.16),
 key(.64,-.10,.25,-.18,.18,.08,1,0,.07,-.06,.23),key(1)],
 power:[
 key(0),key(.22,-.14,-.02,.02,.12,.08,1,0,-.12,.04,-.02),
 key(.44,-.28,0,.07,.32,.23,1,0,.16,-.07,-.09),
 key(.68,-.30,0,.08,.20,.12,1,0,.22,-.12,-.12),key(1)],
 low_driven:[
 key(0),key(.24,.04,0,0,.07),key(.44,.15,0,.035,.14,.07,1,0,-.09,.13,-.04),
 key(.7,.11,0,.045,.14,.04,1,0,.06,.09,-.03),key(1)],
 header:[
 key(0),key(.24,-.10,0,0,.12),key(.44,.19,0,.035,.27,.24,1,.075),
 key(.65,.23,0,.02,.19,.14,1,.025),key(1)],
 volley:[
 key(0),key(.22,-.08,0,0,.12),key(.44,-.27,-.04,.05,.22,.14,1,.07,.13,-.06,-.06),
 key(.66,-.18,-.06,.045,.17,.10,1,.025,.14,-.1,-.08),key(1)],
 bicycle:[
 key(0),key(.24,-.16,0,0,.18),key(.44,-.20,0,.03,.21,.18,1,.06),
 key(.68,-.1,0,0,.11,.12,1,.05),key(1)],
 keeper_save:[
 key(0),key(.19,-.09,0,0,.08,.06),key(.43,-.20,.06,.15,.28,.27,1,.08),
 key(.67,-.14,.03,.12,.23,.18,1,.04),key(1)],
 keeper_beaten:[
 key(0),key(.19,-.08,0,0,.06),key(.43,-.10,.02,.12,.17,.19,1,.055),
 key(.67,-.08,.01,.10,.10,.12,1,.03),key(1)]
};
const all={...loops,...actions};
export const MOTION_CLIPS=Object.freeze(Object.fromEntries(Object.entries(all).map(([name,keys])=>
 [name,Object.freeze({loop:name in loops,keys:Object.freeze(keys)})])));
export const MOTION_CHANNELS=CHANNELS;
export function sampleMotionClip(name,phase,out={}){
 const clip=MOTION_CLIPS[name]||MOTION_CLIPS.jog;
 const t=clip.loop?((Number.isFinite(phase)?phase:0)%1+1)%1:clamp(phase);
 const keys=clip.keys;
 let i=1;while(i<keys.length-1&&t>keys[i].t)i++;
 const a=keys[i-1],b=keys[i],u=smooth((t-a.t)/(b.t-a.t));
 for(const field of CHANNELS)out[field]=a[field]+(b[field]-a[field])*u;
 return out;
}
// Every actor has its own reusable scratch frames: no mixer objects, new meshes
// or animation allocations in a render frame.
export function blendLocomotionClips(speed,turn,stride,controlWeight=0,out={},scratch={}){
 const phase=stride/(Math.PI*2),turnSide=Math.sign(turn),fast=smooth((clamp(speed)-.17)/.73);
 const dribble=clamp(controlWeight),cut=smooth(Math.abs(turn)/.14);
 const jog=sampleMotionClip('jog',phase,scratch.jog||(scratch.jog={})),
  sprint=sampleMotionClip('sprint',phase,scratch.sprint||(scratch.sprint={})),
  control=sampleMotionClip('dribble',phase,scratch.dribble||(scratch.dribble={})),
  plant=sampleMotionClip('cut',phase,scratch.cut||(scratch.cut={}));
 for(const field of CHANNELS){
  let x=jog[field]+(sprint[field]-jog[field])*fast;
  x+=(control[field]-x)*dribble;
  const cutValue=field==='reach'?plant[field]-1:plant[field];
  x+=cutValue*cut*(field==='yaw'||field==='roll'?turnSide:1);
  out[field]=x;
 }
 out.mode=dribble>.4?'dribble':cut>.65?'cut':fast>.55?'sprint':'jog';
 return out;
}
export function motionClipBlend(time,start,end,fade=.12){
 return smooth((time-start)/fade)*(1-smooth((time-end+fade)/fade));
}
