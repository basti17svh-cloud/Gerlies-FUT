/* Footera Motion 2.0 – ONE authored action: right winger cuts inside and
 * strikes a far-post finesse attempt. Lightweight analytic 2-bone support-leg
 * IK. No simulation, route, ball flight, match RNG or camera manipulation.
 * The exact 5.400s right-foot strike stays authoritative in the scene.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
const mix=(a,b,w)=>a+(b-a)*clamp(w);
export const MOTION_2_VERSION='2.0-plant-turn-finesse';
export const MOTION_2_SHOT=5.4;
export const MOTION_2_SEQUENCE='cut_inside_right';
export function sampleWinger2(time,sequence='cut_inside_right',finish='finesse'){
 const active=sequence===MOTION_2_SEQUENCE&&finish==='finesse';
 const t=clamp(time,0,10.4);
 const cue=active?pulse(t,2.54,2.87,2.95,3.15):0;
 const plant=active?pulse(t,2.87,3.02,3.20,3.41):0;
 const pin=active?pulse(t,2.98,3.045,3.15,3.24):0;
 const push=active?pulse(t,3.09,3.27,3.59,3.94):0;
 const gather=active?pulse(t,4.62,4.93,5.16,5.39):0;
 const shotPin=active?pulse(t,5.065,5.23,5.49,5.77):0;
 const finishFollow=active?pulse(t,5.405,5.55,5.94,6.27):0;
 const phase=!active?'inactive':finishFollow>.30?'follow-through':shotPin>.30?'shooting-plant':
  gather>.30?'wind-up':push>.30?'explode-inside':pin>.30?'outside-foot-lock':
  plant>.30?'brake-and-load':cue>.30?'anticipate':'run';
 return{active,t,cue,plant,pin,push,gather,shotPin,finishFollow,phase};
}
/* Solve a two-segment (0.43m + 0.43m) forward-plane leg from hip to ankle.
 * The anchor is a route-independent world-space target in field coordinates.
 * Supports a bent knee and a level boot. Root trajectory never moves.
 */
export function solveSupportLeg(rootX,rootZ,heading,rigY,anchorX,anchorZ){
 const dx=anchorX-rootX,dz=anchorZ-rootZ,cos=Math.cos(heading),sin=Math.sin(heading);
 const sideways=clamp(cos*dx-sin*dz,-.27,.27);
 const forward=clamp(sin*dx+cos*dz,-.36,.35);
 // The boot sole is ~4cm beneath the ankle pivot.
 const vertical=clamp(.073-(.94+rigY),-.82,-.57);
 const dist=clamp(Math.hypot(vertical,forward),.34,.822);
 const bend=2*Math.acos(clamp(dist/.86,0,1));
 const direction=Math.atan2(-forward,-vertical);
 const hip=clamp(direction+bend/2,-.83,1.16),knee=-bend;
 const ankle=clamp(-hip-knee,-1.0,1.0);
 return{hip,knee,ankle,sideways,forward,vertical,dist};
}
export function plantSupportLeg(p,index,anchor,weight){
 const w=clamp(weight);
 if(w<=.001)return null;
 const ik=solveSupportLeg(p.root.position.x,p.root.position.z,p.root.rotation.y,
  p.rig.position.y,anchor[0],anchor[1]);
 const foot=p.legs[index],knee=p.knees[index],ankle=p.ankles[index];
 foot.rotation.x=mix(foot.rotation.x,ik.hip,w);
 knee.rotation.x=mix(knee.rotation.x,ik.knee,w);
 ankle.rotation.x=mix(ankle.rotation.x,ik.ankle,w);
 // A controlled amount of lateral placement, not a root-world foot teleport.
 foot.rotation.z+=clamp((ik.sideways-(index?1:-1)*.108)*1.1,-.22,.22)*w;
 return ik;
}
export function applyWinger2(p,time,sequence,finish,cutAnchor,shotAnchor){
 const m=sampleWinger2(time,sequence,finish);
 if(!m.active)return m;
 // Three readable segments: shoulders drop and brake; outside leg loads;
 // pelvis unwinds while the free leg drives infield.
 const lean=-.17*m.cue-.29*m.plant+.18*m.push;
 p.upper.rotation.x-=.13*m.plant+.11*m.gather;
 p.upper.rotation.z+=lean-.13*m.gather+.18*m.finishFollow;
 p.upper.rotation.y-=.26*m.cue;
 p.upper.rotation.y+=.40*m.push+.25*m.gather-.29*m.finishFollow;
 p.rig.rotation.y-=.14*m.plant-.18*m.push;
 p.rig.position.y-=.065*m.plant+.032*m.gather;
 p.arms[0].rotation.x+=.42*m.plant-.32*m.push-.20*m.finishFollow;
 p.arms[1].rotation.x-=.33*m.plant+.26*m.push+.13*m.finishFollow;
 p.arms[0].rotation.z-=.18*m.cue+.19*m.gather;
 p.arms[1].rotation.z+=.19*m.cue+.22*m.gather;
 // Right boot braces for the right-wing change of direction.
 // Pin is deliberately short: the pre-existing runner's route may not slide.
 if(m.pin>.001)plantSupportLeg(p,1,cutAnchor,m.pin);
 if(m.push>.001){
  p.legs[0].rotation.x+=.40*m.push;
  p.knees[0].rotation.x-=.17*m.push;
  p.ankles[0].rotation.x-=.10*m.push;
 }
 // The left boot braces before the right instep curls across the ball.
 // Only the support leg is IK'd; shooting leg contact remains untouched.
 if(m.shotPin>.001)plantSupportLeg(p,0,shotAnchor,m.shotPin);
 if(m.finishFollow>.001){
  p.legs[1].rotation.x+=.25*m.finishFollow;
  p.ankles[1].rotation.z+=.20*m.finishFollow;
  p.arms[0].rotation.x-=.23*m.finishFollow;
 }
 return m;
}
export function sampleDefender2(time,distance,sequence='cut_inside_right'){
 const active=sequence===MOTION_2_SEQUENCE;
 const near=active?1-smooth((Math.max(0,distance)-3)/12):0;
 const t=clamp(time,0,10.4);
 const read=near*pulse(t,2.38,2.73,3.05,3.34);
 const wrongFoot=near*pulse(t,2.87,3.03,3.25,3.48);
 const recover=near*pulse(t,3.30,3.55,3.87,4.31);
 return{active,near,read,wrongFoot,recover,phase:wrongFoot>.30?'wrong-footed':recover>.30?'recover':'track'};
}
export function applyDefender2(p,time,distance,sequence){
 const m=sampleDefender2(time,distance,sequence);
 if(m.near<=.001)return m;
 p.upper.rotation.x+=.16*m.read+.08*m.wrongFoot;
 p.upper.rotation.y+=.22*m.read-.39*m.wrongFoot+.23*m.recover;
 p.upper.rotation.z-=.23*m.wrongFoot+.15*m.recover;
 p.rig.position.y-=.048*m.wrongFoot;
 p.legs[0].rotation.z-=.22*m.wrongFoot;
 p.knees[0].rotation.x-=.32*m.wrongFoot;
 p.legs[1].rotation.x+=.28*m.recover;
 p.knees[1].rotation.x-=.16*m.recover;
 p.arms[0].rotation.z-=.24*m.read+.12*m.wrongFoot;
 p.arms[1].rotation.z+=.23*m.read+.14*m.wrongFoot;
 return m;
}
