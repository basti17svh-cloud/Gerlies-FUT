/* Footera V21.78: route-faithful athletic locomotion.
 * Visual-only athletic gait, planted turns and shot preparation. Root routes,
 * result, ball, goalkeeper and the canonical 5.4s strike stay authoritative.
 * Every actor reuses its preallocated output; no additional draw calls.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const tau=2*Math.PI;
const wave=u=>Math.sin(Math.PI*clamp(u))**2;
const cycle=x=>((x/tau)%1+1)%1;
export const FOOTERA_FOOTWORK_VERSION='21.78-athletic-stride';
export function sampleFootwork(time,speed,turn,acceleration,stride,out){
 const state=out||{feet:[{},{}]};
 if(!state.feet)state.feet=[{},{}];
 if(!state.feet[0])state.feet[0]={};
 if(!state.feet[1])state.feet[1]={};
 const t=clamp(time,0,10.4),v=clamp(speed),effort=smooth(v/.24),
   sprint=smooth((v-.50)/.37),brake=effort*clamp(-acceleration),burst=effort*clamp(acceleration),
   bank=effort*clamp(turn/.14,-1,1),
   // A gradual release before the pre-authored strike, then a gradual
   // re-entry after follow-through. At 5.4 exactly every offset is zero.
   release=1-smooth((t-4.62)/.28),resume=smooth((t-6.09)/.31),
   weight=clamp(release+resume)*effort,
   phase=Number.isFinite(stride)?stride:0,
   strideWave=Math.sin(phase),counter=Math.cos(phase);
 state.weight=weight;state.sprint=sprint*weight;
 state.brake=brake*weight;state.burst=burst*weight;
 state.bank=bank*weight;
 state.rigDrop=.013*state.brake+.005*state.sprint*(.5+.5*Math.cos(phase*2));
 state.torsoPitch=.065*state.brake-.072*state.burst-.052*state.sprint;
 state.torsoYaw=-.047*state.bank+.024*counter*state.sprint;
 state.torsoRoll=.070*state.bank+.014*strideWave*state.sprint;
 state.armDrive=(.151*state.sprint+.041*state.burst)*strideWave;
 state.armBrace=.070*state.brake+.045*Math.abs(state.bank);
 state.elbowDrive=.070*state.sprint;
 // Match the duty cycle and phase used by scene.runningLeg. Do not
 // modify the phase itself or invent a second, time-based stride.
 const duty=.60-.32*v;
 for(let i=0;i<2;i++){
  const foot=state.feet[i],p=cycle(phase+i*Math.PI),support=p<duty;
  const contact=support?wave(p/duty):0,swing=support?0:wave((p-duty)/(1-duty));
  const toeOff=support?smooth((p/duty-.53)/.20)*(1-smooth((p/duty-.88)/.12)):0;
  const load=contact*weight,swingLoad=swing*weight,side=i?1:-1;
  foot.support=support;foot.load=load;foot.swing=swingLoad;
  // Toe clears turf on recovery; heel extends at toe-off. Load/compression
  // is concentrated mid-stance, not at touchdown or takeoff.
  foot.anklePitch=(.112*swing-.077*toeOff-.018*contact*sprint)*weight;
  foot.ankleRoll=side*.043*load*Math.abs(bank);
  foot.ankleYaw=-.065*bank*load;
  foot.kneePitch=-.105*state.brake*contact-.088*state.burst*swing-.116*state.sprint*swing;
  foot.hipPitch=.088*state.burst*swing+.119*state.sprint*swing-.040*state.brake*contact;
  foot.hipRoll=side*.049*state.brake*contact-side*.065*bank*contact*weight;
 }
 return state;
}
export function applyFootwork(p,time,speed,turn,acceleration,stride,guard=1){
 // p.footworkState belongs to an existing actor; never allocate per frame.
 const state=sampleFootwork(time,speed,turn,acceleration,stride,p.footworkState);
 const w=clamp(guard);
 if(state.weight<=.0001||w<=.0001)return state;
 p.rig.position.y-=state.rigDrop*w;
 p.upper.rotation.x+=state.torsoPitch*w;
 p.upper.rotation.y+=state.torsoYaw*w;
 p.upper.rotation.z+=state.torsoRoll*w;
 // Counter-phase sprint pumping and tighter elbows add a readable full-body gait.
 for(let i=0;i<2;i++){
  const f=state.feet[i];
  p.legs[i].rotation.x+=f.hipPitch*w;
  p.legs[i].rotation.z+=f.hipRoll*w;
  p.knees[i].rotation.x+=f.kneePitch*w;
  p.ankles[i].rotation.x+=f.anklePitch*w;
  p.ankles[i].rotation.z+=f.ankleRoll*w;
  p.ankles[i].rotation.y+=f.ankleYaw*w;
  if(p.arms?.[i]&&p.elbows?.[i]){
   const side=i?1:-1;
   p.arms[i].rotation.x+=side*state.armDrive*w;
   p.arms[i].rotation.z+=side*state.armBrace*w;
   p.elbows[i].rotation.x+=state.elbowDrive*w;
  }
 }
 return state;
}

// Bracing before the authored shot, not during ball contact or follow-through.
// No root motion, keeper modification, new objects or result decisions.
export function applyShotApproach(p,time,finish='normal',sequence='central'){
 if(finish==='header'||finish==='volley'||finish==='bicycle')return 0;
 const t=clamp(time,0,10.4);
 const weight=smooth((t-4.20)/.27)*(1-smooth((t-4.68)/.22));
 if(weight<=.00001)return 0;
 const side=sequence.endsWith('_left')?-1:1;
 const controlled=finish==='finesse'?.70:finish==='low_driven'?.84:1;
 const w=weight*controlled;
 p.legs[0].rotation.x-=.090*w;p.knees[0].rotation.x-=.115*w;
 p.ankles[0].rotation.x+=.058*w;
 p.legs[1].rotation.x-=.145*w;p.knees[1].rotation.x-=.095*w;
 p.upper.rotation.x+=.082*w;p.upper.rotation.y-=side*.105*w;
 p.upper.rotation.z+=side*.061*w;
 p.arms[0].rotation.z-=.160*w;p.arms[1].rotation.z+=.160*w;
 return w;
}
