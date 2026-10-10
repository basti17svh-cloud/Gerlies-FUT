/* Footera V21.59 – independent, fixed-timestep defender footwork.
 * Preview only: never moves the live match simulation's authoritative actors.
 * A single deterministic route is built once per scene. The defender observes
 * the ball carrier with a reaction delay, accelerates, then brakes under speed
 * and acceleration limits. Playback/seek read identical stored positions.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,w)=>a+(b-a)*clamp(w);
export const DEFENDER_TRACKING_VERSION='21.59-independent-reaction';
export const isTrackingAction=action=>action==='jockey'||action==='close_down';
export function createTrackingTimeline(action,sequence,attackerAt,duration=10.4){
 if(!isTrackingAction(action))return null;
 const lateral=action==='jockey',side=sequence.endsWith('_left')?-1:1;
 const step=1/50,count=Math.ceil(Math.max(0,duration)/step);
 const reaction=lateral?.55:.30,observationLag=lateral?.47:.30;
 const maxSpeed=lateral?3.9:6.2,maxAcceleration=lateral?5.0:8.0;
 const initial=attackerAt(0);
 let x=initial[0]-side*(lateral?3.6:8.4),z=initial[1]-(lateral?2.4:7.1),vx=0,vz=0;
 const positions=new Float64Array((count+1)*2),velocities=new Float64Array((count+1)*2);
 positions[0]=x;positions[1]=z;
 for(let n=1;n<=count;n++){
  const t=n*step;
  if(t>=reaction){
   const observed=attackerAt(Math.max(0,t-observationLag));
   // Lateral: defend the goal-side channel, not the exact ball-carrier path.
   // Close-down: approach the last observed position, braking to contain.
   const tx=observed[0]-side*(lateral?3.05:1.9);
   const tz=observed[1]-(lateral?2.25:1.43);
   const dx=tx-x,dz=tz-z,distance=Math.hypot(dx,dz);
   const desiredSpeed=Math.min(maxSpeed,distance*(lateral?1.65:2.55),Math.sqrt(2*maxAcceleration*distance)*.95);
   const wantedX=distance>.0001?dx/distance*desiredSpeed:0;
   const wantedZ=distance>.0001?dz/distance*desiredSpeed:0;
   const dvx=wantedX-vx,dvz=wantedZ-vz;
   const dvLength=Math.hypot(dvx,dvz),dvLimit=maxAcceleration*step,scale=dvLength>dvLimit?dvLimit/dvLength:1;
   vx+=dvx*scale;vz+=dvz*scale;
   // Integrate actual defender momentum, not attacker translation.
   x+=vx*step;z+=vz*step;
  }
  positions[n*2]=x;positions[n*2+1]=z;
  velocities[n*2]=vx;velocities[n*2+1]=vz;
 }
 function sample(time){
  const t=clamp(time,0,duration),fraction=clamp(t/step,0,count);
  const idx=Math.min(count-1,Math.floor(fraction)),alpha=fraction-idx;
  const offset=2*idx,next=2*(idx+1);
  const px=mix(positions[offset],positions[next],alpha);
  const pz=mix(positions[offset+1],positions[next+1],alpha);
  const rx=mix(velocities[offset],velocities[next],alpha);
  const rz=mix(velocities[offset+1],velocities[next+1],alpha);
  const current=attackerAt(t),gap=Math.hypot(px-current[0],pz-current[1]);
  const speed=Math.hypot(rx,rz);
  const phase=t<reaction?'observe':lateral?(speed>.65?'lateral-adjust':'hold-channel'):
   gap>3.0?'close-distance':speed>.55?'brake-and-contain':'contain';
  return {action,phase,position:[px,pz],velocity:[rx,rz],speed,
   closing:lateral?0:smooth((10.8-gap)/8),lateral,gap,reaction};
 }
 return Object.freeze({sample,step,action,reaction});
}
// Compatibility helper for isolated unit assertions; scenes MUST reuse the
// timeline above to avoid rebuilding it on every rendered frame.
export function sampleTrackingRoute(action,time,sequence,attackerAt){
 return createTrackingTimeline(action,sequence,attackerAt)?.sample(time)||null;
}
// Keep the distance-planted gait authoritative; do not add knee/hip cycles.
export function applyTrackingPose(p,action,time,speed,heading,targetHeading){
 if(!isTrackingAction(action))return null;
 const t=clamp(time,0,10.4);
 const jockey=action==='jockey';
 const contain=jockey?1:smooth((t-3.1)/.9);
 const difference=Math.atan2(Math.sin(targetHeading-heading),Math.cos(targetHeading-heading));
 const look=jockey?.43:mix(.08,.48,contain);
 // Running defenders follow travel direction; only a planted jockey turns far.
 const plant=1-smooth((speed-.10)/.52),face=clamp(difference*look*plant,-.42,.42);
 p.root.rotation.y=heading+face;
 const lean=jockey?-.055:-.10*(1-contain)-.045*contain;
 p.upper.rotation.x=mix(p.upper.rotation.x,lean,.75);
 p.upper.rotation.y=mix(p.upper.rotation.y,-face*.15,.70);
 p.upper.rotation.z=clamp(p.upper.rotation.z,-.095,.095);
 p.rig.rotation.x=0;
 p.rig.rotation.z=clamp(p.rig.rotation.z,-.06,.06);
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  p.knees[i].rotation.x=Math.min(p.knees[i].rotation.x,-.15*contain);
  p.legs[i].rotation.z=side*(jockey?.055:.027)*contain;
  p.ankles[i].rotation.z=-p.legs[i].rotation.z*.38;
  p.arms[i].rotation.z=side*(jockey?.24:.16);
  p.arms[i].rotation.x*=jockey?.52:1;
  p.elbows[i].rotation.x=mix(p.elbows[i].rotation.x,jockey?.78:.70,.35);
 }
 p.rig.position.y=clamp(p.rig.position.y,-.085,.027);
 return{phase:jockey?'lateral-adjust':contain>.72?'contain':'close-distance',
  upperLean:p.upper.rotation.x,heading:p.root.rotation.y,closing:!jockey};
}
