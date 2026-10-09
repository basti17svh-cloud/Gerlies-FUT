/* Footera Motion 2.4–2.6: defender footwork, duel response, recovery.
 * Presentation-only poses on existing athlete joints: no new geometry,
 * RNG, route offsets, possession, shots, keeper contact or score changes.
 * All poses derive from the absolute scene time, so scrubbing is stable.
 */
import {styleAccent} from './3d-action-continuity.mjs?v=2144';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
const nearWeight=d=>1-smooth((Math.max(0,Number.isFinite(d)?d:99)-2)/18);
export const DUEL_MOTION_VERSION='2.6-jockey-block-recover';
export const DUEL_STAGES=Object.freeze(['2.4-jockey','2.5-block','2.6-recovery']);
export function sampleDefensiveDuels(time,distance,action='jockey',sequence='central',styles=[]){
 const t=clamp(time,0,10.4),near=nearWeight(distance);
 const side=sequence.endsWith('_left')?-1:1;
 const feint=sequence.startsWith('double_feint');
 const approach=action==='close_down'?1.13:action==='lane_read'?.77:1;
 const slide=action==='slide_attempt',aerial=action==='aerial_challenge';
 const jockey=near*pulse(t,2.15,2.45,3.16,3.68)*(slide?.25:approach);
 const wrongRead=feint?near*pulse(t,1.84,2.07,2.37,2.77):0;
 const shuffle=near*pulse(t,2.83,3.08,3.54,3.94)*(slide?.24:1);
 const read=near*pulse(t,4.31,4.55,4.84,5.13)*(aerial?.40:1);
 const block=near*pulse(t,4.72,4.93,5.23,5.62)*
  (action==='block_attempt'?1:action==='jockey'?.28:action==='close_down'?.36:.10);
 const step=near*pulse(t,4.55,4.81,5.04,5.44)*
  (action==='close_down'?.90:action==='lane_read'?.60:action==='jockey'?.20:0);
 // Do not stack an early stumbling/recovery pose on top of the contact
 // block's extended leg. Settle the body only AFTER the blocking foot returns.
 const recovery=near*(action==='block_attempt'
  ?pulse(t,6.13,6.38,6.58,6.90)
  :pulse(t,5.65,5.91,6.29,6.68))*(slide?.38:1);
 const agility=1+.16*styleAccent(styles,'jockey','anticipate');
 const strength=1+.13*styleAccent(styles,'block','intercept');
 const phase=recovery>.20?'recover-footing':block>.22?'shot-block':step>.22?'close-down-step':
  read>.22?'read-shooter':shuffle>.20?'lateral-shuffle':jockey>.20?'low-jockey':
  wrongRead>.20?'wrong-read':'track';
 return{phase,near,side,jockey:jockey*agility,wrongRead:wrongRead*agility,shuffle:shuffle*agility,
  read:read*agility,block:block*strength,step:step*strength,recovery,slide,aerial};
}
export function applyDefensiveDuels(p,time,distance,action,sequence,styles=[]){
 const m=sampleDefensiveDuels(time,distance,action,sequence,styles);
 if(m.near<=.001)return m;
 // 2.4: knees lower into a balanced jockey, feet alternate in a short lateral step.
 const j=m.jockey,s=m.shuffle,f=m.wrongRead;
 if(j+s+f>.001){
  p.upper.rotation.x+=.13*j+.06*s;
  p.upper.rotation.y+=m.side*(.16*j-.19*f+.13*s);
  p.upper.rotation.z+=m.side*(.13*f-.16*s);
  p.rig.position.y-=.037*j+.014*f;
  p.knees[0].rotation.x-=.22*j+.12*s;
  p.knees[1].rotation.x-=.19*j+.18*s;
  p.legs[0].rotation.z-=m.side*.13*s;
  p.legs[1].rotation.z+=m.side*.15*s;
  p.legs[m.side>0?1:0].rotation.x+=.23*s;
  p.ankles[m.side>0?1:0].rotation.x-=.10*s;
  p.arms[0].rotation.z-=.18*j+.13*f;
  p.arms[1].rotation.z+=.18*j+.13*f;
 }
 // 2.5: brace first; a clearly different step and blocking leg only if the
 // existing match event already describes a block/press. Never touch the ball.
 const a=m.read,b=m.block,c=m.step;
 if(a+b+c>.001){
  p.upper.rotation.x+=.14*a+.24*b+.12*c;
  p.upper.rotation.y+=m.side*(-.12*a+.17*b-.14*c);
  p.upper.rotation.z+=m.side*(.06*c-.13*b);
  p.knees[0].rotation.x-=.14*a+.15*b;
  p.knees[1].rotation.x-=.11*a+.18*c;
  p.legs[1].rotation.x-=.34*b+.30*c;
  p.ankles[1].rotation.x+=.11*b;
  p.arms[0].rotation.z-=.19*a+.33*b;
  p.arms[1].rotation.z+=.16*a+.28*b;
  p.arms[0].rotation.x-=.26*c;
 }
 // 2.6: recover balance after contact has passed, while standing on the
 // original root route. No independent possession or new transition state.
 const r=m.recovery;
 if(r>.001){
  p.upper.rotation.x-=.14*r;
  p.upper.rotation.z-=m.side*.12*r;
  p.rig.rotation.y+=m.side*.11*r;
  p.knees[0].rotation.x-=.18*r;
  p.legs[1].rotation.x+=.24*r;
  p.knees[1].rotation.x-=.12*r;
  p.arms[0].rotation.x+=.26*r;
  p.arms[1].rotation.x-=.19*r;
 }
 return m;
}
export function sampleFinishBalance(time,finish='normal'){
 const grounded=!['header','volley','bicycle'].includes(finish);
 const t=clamp(time,0,10.4),load=grounded?pulse(t,5.90,6.12,6.39,6.75):0;
 const phase=load>.2?'recover-after-shot':'none';
 return{phase,load};
}
export function applyFinishBalance(p,time,finish){
 const m=sampleFinishBalance(time,finish),r=m.load;
 if(r>.001){
  p.upper.rotation.x+=.095*r;
  p.upper.rotation.z+=.045*r;
  p.knees[0].rotation.x-=.17*r;
  p.legs[1].rotation.x-=.17*r;
  p.ankles[1].rotation.x+=.09*r;
  p.arms[0].rotation.x-=.14*r;
  p.arms[1].rotation.x+=.18*r;
 }
 return m;
}
