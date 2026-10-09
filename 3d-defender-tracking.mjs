/* Footera V21.58 – dedicated defensive tracking and closing routes.
 * Only motion-lab previews stage new routes. The live match simulation remains
 * authoritative and keeps every existing player position, ball and result.
 * One non-additive lower-body pose uses the foot-planted base gait.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,w)=>a+(b-a)*clamp(w);
export const DEFENDER_TRACKING_VERSION='21.58-distinct-defender-actions';
export const isTrackingAction=action=>action==='jockey'||action==='close_down';
export function sampleTrackingRoute(action,time,sequence,attackerAt){
 if(!isTrackingAction(action))return null;
 const t=clamp(time,0,10.4),side=sequence.endsWith('_left')?-1:1;
 const attacker=attackerAt(t);
 if(action==='jockey'){
  // Goal-side, lateral shadowing of the ball carrier. No rush at the ball.
  // The small sideways adjustments happen on a continuous, smooth route.
  const settle=smooth(t/3.4),gapX=3.40-.68*settle,gapZ=2.55-.35*settle;
  const adjust=.19*Math.sin(t*1.18)*smooth(t/.8)*(1-smooth((t-5.3)/.85));
  const x=attacker[0]-side*(gapX+adjust),z=attacker[1]-gapZ;
  return{action,phase:t<.9?'orient':t<4.85?'lateral-track':'hold-position',
   position:[x,z],closing:0,lateral:true,gap:Math.hypot(x-attacker[0],z-attacker[1])};
 }
 // Start visibly far ahead/inside, run AT the carrier, then brake before
 // reaching him. Retaining >=2m gap avoids player overlap/teleporting.
 const closing=smooth((t-.30)/3.2),gapX=mix(7.9,1.85,closing);
 const gapZ=mix(7.0,1.43,closing),x=attacker[0]-side*gapX,z=attacker[1]-gapZ;
 return{action,phase:closing<.12?'set-off':closing<.88?'close-distance':'contain',
  position:[x,z],closing,lateral:false,gap:Math.hypot(x-attacker[0],z-attacker[1])};
}
// Compose one coherent athletic upper-body stance. Never add another hip,
// knee or ankle cycle to the distance-planted locomotion controller.
export function applyTrackingPose(p,action,time,speed,heading,targetHeading){
 if(!isTrackingAction(action))return null;
 const t=clamp(time,0,10.4),s=clamp(speed);
 const jockey=action==='jockey';
 const contain=jockey?1:smooth((t-2.8)/.85);
 const difference=Math.atan2(Math.sin(targetHeading-heading),Math.cos(targetHeading-heading));
 const look=jockey?.52:mix(.06,.58,contain);
 const face=clamp(difference*look,-.72,.72);
 p.root.rotation.y=heading+face;
 const lean=jockey?-.055:-.105*(1-contain)-.05*contain;
 p.upper.rotation.x=mix(p.upper.rotation.x,lean,.75);
 p.upper.rotation.y=mix(p.upper.rotation.y,-face*.18,.70);
 p.upper.rotation.z=clamp(p.upper.rotation.z,-.10,.10);
 p.rig.rotation.x=0;
 p.rig.rotation.z=clamp(p.rig.rotation.z,-.06,.06);
 // Balanced bent knees at low pace; at full pace the IK already bends them.
 for(let i=0;i<2;i++){
  const side=i===0?-1:1;
  p.knees[i].rotation.x=Math.min(p.knees[i].rotation.x,-.15*contain);
  p.legs[i].rotation.z=side*(jockey?.055:.027)*contain;
  p.ankles[i].rotation.z=-p.legs[i].rotation.z*.38;
  p.arms[i].rotation.z=side*(jockey?.24:.16);
  p.arms[i].rotation.x*=jockey?.52:1;
  p.elbows[i].rotation.x=mix(p.elbows[i].rotation.x,jockey?.78:.70,.35);
 }
 // No extra bobbing/falling root shift; restrict pelvis height near grounded.
 p.rig.position.y=clamp(p.rig.position.y,-.085,.027);
 return{phase:jockey?'lateral-track':contain>.72?'contain':'close-distance',
  upperLean:p.upper.rotation.x,heading:p.root.rotation.y,closing:!jockey};
}
