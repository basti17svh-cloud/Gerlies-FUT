/* Footera Motion 2.2: first touch, mirrored cuts and controlled finesse setup.
 * Analytic 2-bone support IK plus independent visual defender reaction.
 * The match simulation, score, camera, route and canonical 5.4s right-foot
 * shot contact are never modified; no per-frame allocation of geometry.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
const mix=(a,b,w)=>a+(b-a)*clamp(w);
import {styleAccent} from './3d-action-continuity.mjs?v=2144';
export const MOTION_2_VERSION='2.2-touch-cut-shot-preparation';
export const MOTION_2_SHOT=5.4;
export const MOTION_2_SEQUENCE='cut_inside_right';
export const MOTION_2_SEQUENCES=Object.freeze(['cut_inside_right','cut_inside_left','double_feint_right','double_feint_left']);
export const isMotion2Sequence=(sequence,finish)=>finish==='finesse'&&MOTION_2_SEQUENCES.includes(sequence);
export function sampleWinger2(time,sequence='cut_inside_right',finish='finesse',styles=[]){
 const active=isMotion2Sequence(sequence,finish),side=sequence.endsWith('_left')?-1:1;
 const feint=sequence.startsWith('double_feint');
 const t=clamp(time,0,10.4);
 // A double feint visibly sells the *wrong* way before planting to cut.
 // All signals are absolute-time functions: pausing/scrubbing is deterministic.
 const touch=active?pulse(t,.82,1.02,1.22,1.42):0;
 const settle=active?pulse(t,1.23,1.42,1.62,1.82):0;
 const fake=active&&feint?pulse(t,1.80,2.10,2.39,2.72):0;
 const cue=active?pulse(t,2.54,2.87,2.95,3.15):0;
 const plant=active?pulse(t,2.87,3.02,3.20,3.41):0;
 const pin=active?pulse(t,2.98,3.045,3.15,3.24):0;
 const push=active?pulse(t,3.09,3.27,3.59,3.94):0;
 const aim=active?pulse(t,4.20,4.38,4.70,4.93):0;
 const gather=active?pulse(t,4.62,4.93,5.16,5.39):0;
 const shotPin=active?pulse(t,5.065,5.23,5.49,5.77):0;
 const finishFollow=active?pulse(t,5.405,5.55,5.94,6.27):0;
 const phase=!active?'inactive':finishFollow>.30?'follow-through':shotPin>.30?'shooting-plant':
  gather>.30?'wind-up':aim>.30?'spot-far-corner':push>.30?'explode-inside':pin>.30?'outside-foot-lock':
  plant>.30?'brake-and-load':cue>.30?'anticipate':fake>.30?'sell-feint':
  settle>.30?'settle-ball':touch>.30?'first-touch':'run';
 return{active,side,feint,t,touch,settle,fake,cue,plant,pin,push,aim,gather,shotPin,finishFollow,phase,
  technical:styleAccent(styles,'technical','first-touch'),trickster:styleAccent(styles,'trickster'),
  finesseStyle:styleAccent(styles,'finesse-shot'),
  outside:side>0?1:0,inside:side>0?0:1};
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
export function applyWinger2(p,time,sequence,finish,cutAnchor,shotAnchor,styles=[]){
 const m=sampleWinger2(time,sequence,finish,styles);
 if(!m.active)return m;
 // The supporting knee cushions the carried ball, then the pelvis settles.
 // These additions are gone before the planted cut or 5.4s kick contact.
 if(m.touch>.001||m.settle>.001){
  const control=m.touch*(1+.18*m.technical),stable=m.settle;
  p.upper.rotation.x+=.11*control-.075*stable;
  p.upper.rotation.y+=m.side*(-.13*control+.07*stable);
  p.upper.rotation.z+=m.side*(.12*control-.065*stable);
  p.rig.rotation.y-=m.side*.085*control;
  p.rig.position.y-=.037*control+.016*stable;
  p.knees[m.outside].rotation.x-=.22*control+.08*stable;
  p.legs[m.inside].rotation.x+=.39*control-.13*stable;
  p.ankles[m.inside].rotation.y+=m.side*(.30*control-.11*stable);
  p.arms[m.outside].rotation.x-=.20*control;
  p.arms[m.inside].rotation.x+=.22*control;
 }
 // A visual goal-side read: hips and shoulders align before the shot wind-up.
 if(m.aim>.001){
  const a=m.aim*(1+.12*m.finesseStyle);
  p.upper.rotation.x-=.13*a;
  p.upper.rotation.y+=m.side*.28*a;
  p.upper.rotation.z-=m.side*.09*a;
  p.rig.rotation.y+=m.side*.12*a;
  p.knees[0].rotation.x-=.10*a;
  p.arms[0].rotation.z-=.19*a;
  p.arms[1].rotation.z+=.16*a;
 }
 // Three readable segments: shoulders drop and brake; outside leg loads;
 // pelvis unwinds while the free leg drives infield.
 const lean=-.17*m.cue-.29*m.plant+.18*m.push;
 p.upper.rotation.x-=.13*m.plant+.11*m.gather;
 p.upper.rotation.z+=m.side*(lean-.13*m.gather+.18*m.finishFollow);
 p.upper.rotation.y+=m.side*(-.26*m.cue+.40*m.push+.25*m.gather-.29*m.finishFollow);
 p.rig.rotation.y+=m.side*(-.14*m.plant+.18*m.push);
 p.rig.position.y-=.065*m.plant+.032*m.gather;
 // The feint starts towards the sideline, then snaps back into the cut.
 // The planned sprint route does not change until its existing turn.
 if(m.fake>.001){
  const trick=m.fake*(1+.13*m.trickster);
  p.upper.rotation.y-=m.side*.41*trick;
  p.upper.rotation.z-=m.side*.29*trick;
  p.rig.rotation.y-=m.side*.18*trick;
  p.legs[m.inside].rotation.x-=.28*m.fake;
  p.knees[m.inside].rotation.x-=.19*m.fake;
  p.ankles[m.inside].rotation.y-=m.side*.23*m.fake;
  p.arms[m.inside].rotation.x+=.30*m.fake;
  p.arms[m.outside].rotation.x-=.28*m.fake;
 }
 p.arms[0].rotation.x+=.42*m.plant-.32*m.push-.20*m.finishFollow;
 p.arms[1].rotation.x-=.33*m.plant+.26*m.push+.13*m.finishFollow;
 p.arms[0].rotation.z-=m.side*(.18*m.cue+.19*m.gather);
 p.arms[1].rotation.z+=m.side*(.19*m.cue+.22*m.gather);
 // Outside boot is mirrored with the wing. Keep each plant window short.
 if(m.pin>.001)plantSupportLeg(p,m.outside,cutAnchor,m.pin);
 if(m.push>.001){
  p.legs[m.inside].rotation.x+=.40*m.push;
  p.knees[m.inside].rotation.x-=.17*m.push;
  p.ankles[m.inside].rotation.x-=.10*m.push;
 }
 // The left boot braces before the right instep curls across the ball.
 // Only the support leg is IK'd; shooting leg contact remains untouched.
 if(m.shotPin>.001)plantSupportLeg(p,0,shotAnchor,m.shotPin);
 if(m.finishFollow>.001){
  p.legs[1].rotation.x+=.25*m.finishFollow;
  p.ankles[1].rotation.z+=m.side*.20*m.finishFollow;
  p.arms[0].rotation.x-=.23*m.finishFollow;
 }
 return m;
}
export function sampleDefender2(time,distance,sequence='cut_inside_right'){
 const active=MOTION_2_SEQUENCES.includes(sequence);
 const side=sequence.endsWith('_left')?-1:1,feint=sequence.startsWith('double_feint');
 const near=active?1-smooth((Math.max(0,distance)-3)/12):0;
 const t=clamp(time,0,10.4);
 const fakeRead=feint?near*pulse(t,1.86,2.11,2.33,2.74):0;
 const read=near*pulse(t,2.38,2.73,3.05,3.34);
 const wrongFoot=near*pulse(t,2.87,3.03,3.25,3.48);
 const recover=near*pulse(t,3.30,3.55,3.87,4.31);
 return{active,side,near,fakeRead,read,wrongFoot,recover,phase:wrongFoot>.30?'wrong-footed':recover>.30?'recover':fakeRead>.30?'misread-feint':'track'};
}
export function applyDefender2(p,time,distance,sequence){
 const m=sampleDefender2(time,distance,sequence);
 if(m.near<=.001)return m;
 p.upper.rotation.x+=.16*m.read+.08*m.wrongFoot;
 p.upper.rotation.y+=m.side*(.22*m.read-.39*m.wrongFoot+.23*m.recover+.33*m.fakeRead);
 p.upper.rotation.z+=m.side*(-.23*m.wrongFoot+.15*m.recover+.19*m.fakeRead);
 p.rig.position.y-=.048*m.wrongFoot+.027*m.fakeRead;
 const outside=m.side>0?1:0,inside=1-outside;
 p.legs[outside].rotation.z-=m.side*.22*m.wrongFoot;
 p.knees[outside].rotation.x-=.32*m.wrongFoot+.18*m.fakeRead;
 p.legs[inside].rotation.x+=.28*m.recover;
 p.knees[inside].rotation.x-=.16*m.recover;
 p.arms[0].rotation.z-=.24*m.read+.12*m.wrongFoot+.11*m.fakeRead;
 p.arms[1].rotation.z+=.23*m.read+.14*m.wrongFoot+.12*m.fakeRead;
 return m;
}
