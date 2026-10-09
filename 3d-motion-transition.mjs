/* Footera Motion 2.3: route-faithful run -> control -> release transitions.
 * Visual biomechanics only; never changes a player path, ball, scoring,
 * clock, camera, simulation state, draw calls or keeper outcome.
 * Absolute-time signals are deterministic during seek/replay.
 */
import {styleAccent} from './3d-action-continuity.mjs?v=2144';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
export const MOTION_23_VERSION='2.3-control-transition';
export function sampleMotion23(time,speed,turn,stride,acceleration,sequence='central',role='support',styles=[]){
 const t=clamp(time,0,10.4),v=clamp(speed),moving=smooth(v/.26);
 const carrier=role==='carrier',provider=role==='provider';
 const dribble=carrier&&sequence==='dribble';
 const through=carrier&&(sequence==='through_ball'||sequence==='one_two');
 // Do not layer extra control cues on the already authored winger 2.2 sequence.
 const inverted=carrier&&/^(?:cut_inside|double_feint)_(?:left|right)$/.test(sequence);
 const fade=1-smooth((t-4.88)/.17);
 const receive=through?pulse(t,4.24,4.43,4.73,4.91)*fade:
  dribble?pulse(t,1.78,1.96,2.16,2.37):0;
 const slow=dribble?pulse(t,2.24,2.44,2.66,2.85):
  moving*clamp(-acceleration*1.55)*fade;
 const burst=dribble?pulse(t,2.87,3.07,3.48,3.81):
  through?pulse(t,4.68,4.79,5.03,5.16)*fade:
  moving*clamp(acceleration*1.55)*fade;
 const turnLoad=moving*clamp(Math.abs(turn)*4.0)*fade;
 const scale=inverted?0:carrier?1:provider?.67:.38;
 const firstTouch=styleAccent(styles,'first-touch','technical');
 const quick=styleAccent(styles,'quick-step','rapid');
 const cushion=receive*scale*(1+.18*firstTouch);
 const brake=slow*scale,launch=burst*scale*(1+.15*quick);
 const bank=turnLoad*scale*Math.sign(turn||0);
 const contact=clamp(cushion+brake+launch);
 const foot=Math.sin(Number.isFinite(stride)?stride:0)>=0?0:1;
 const phase=cushion>.30?'cushion-pass':brake>.30?'brake-to-control':
  launch>.30?'accelerate-away':Math.abs(bank)>.10?'cornering':'run';
 return{active:!inverted&&scale>0,t,role,phase,foot,cushion,brake,launch,bank,contact};
}
export function applyMotion23(p,time,speed,turn,stride,acceleration,sequence,role,styles=[]){
 const m=sampleMotion23(time,speed,turn,stride,acceleration,sequence,role,styles);
 if(m.contact<.001&&Math.abs(m.bank)<.001)return m;
 const support=p.gait?.[0]?.support?0:p.gait?.[1]?.support?1:m.foot;
 const free=1-support;
 p.upper.rotation.x+=.13*m.brake-.15*m.launch+.105*m.cushion;
 p.upper.rotation.y+=.13*m.bank+(support?1:-1)*.075*m.cushion;
 p.upper.rotation.z+=.12*m.bank+(support?1:-1)*.075*m.brake;
 p.rig.position.y-=.048*m.brake+.033*m.cushion;
 p.rig.rotation.y+=.09*m.bank;
 p.knees[support].rotation.x-=.18*m.brake+.16*m.cushion;
 p.legs[free].rotation.x+=.27*m.launch+.30*m.cushion;
 p.knees[free].rotation.x-=.22*m.launch+.12*m.cushion;
 p.ankles[free].rotation.x-=.11*m.launch;
 p.arms[support].rotation.x-=.23*m.brake-.15*m.launch;
 p.arms[free].rotation.x+=.22*m.brake-.19*m.launch;
 p.arms[0].rotation.z-=.14*m.cushion;
 p.arms[1].rotation.z+=.14*m.cushion;
 return m;
}
