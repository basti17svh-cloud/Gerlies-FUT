/* Footera V21.77: time-addressed support-foot and acceleration mechanics.
 * Visual-only small joint corrections. Root route, match result, ball/keeper IK,
 * canonical strike pose at 5.4s and all geometry remain fully authoritative.
 * This module does not allocate during frames when using preallocated out.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const tau=2*Math.PI;
const wave=u=>Math.sin(Math.PI*clamp(u))**2;
const cycle=x=>((x/tau)%1+1)%1;
export const FOOTERA_FOOTWORK_VERSION='21.77-support-to-swing';
export function sampleFootwork(time,speed,turn,acceleration,stride,out){
 const state=out||{feet:[{},{}]};
 if(!state.feet)state.feet=[{},{}];
 if(!state.feet[0])state.feet[0]={};
 if(!state.feet[1])state.feet[1]={};
 const t=clamp(time,0,10.4),v=clamp(speed),effort=smooth(v/.24),
   brake=effort*clamp(-acceleration),burst=effort*clamp(acceleration),
   bank=effort*clamp(turn/.14,-1,1),
   // A gradual release before the pre-authored strike, then a gradual
   // re-entry after follow-through. At 5.4 exactly every offset is zero.
   release=1-smooth((t-4.62)/.28),resume=smooth((t-6.09)/.31),
   weight=clamp(release+resume)*effort;
 state.weight=weight;state.brake=brake*weight;state.burst=burst*weight;
 state.bank=bank*weight;state.rigDrop=.012*state.brake;
 state.torsoPitch=.055*state.brake-.040*state.burst;
 // Match the duty cycle and phase used by scene.runningLeg. Do not
 // modify the phase itself or invent a second, time-based stride.
 const duty=.60-.32*v;
 const phase=Number.isFinite(stride)?stride:0;
 for(let i=0;i<2;i++){
  const foot=state.feet[i],p=cycle(phase+i*Math.PI),support=p<duty;
  const contact=support?wave(p/duty):0,swing=support?0:wave((p-duty)/(1-duty));
  const toeOff=support?smooth((p/duty-.53)/.20)*(1-smooth((p/duty-.88)/.12)):0;
  const load=contact*weight,swingLoad=swing*weight,side=i?1:-1;
  foot.support=support;foot.load=load;foot.swing=swingLoad;
  // Toe clears turf on recovery; heel extends at toe-off. Load/compression
  // is concentrated mid-stance, not at touchdown or takeoff.
  foot.anklePitch=(.090*swing-.053*toeOff)*weight;
  foot.ankleRoll=side*.035*load*Math.abs(bank);
  foot.ankleYaw=-.040*bank*load;
  foot.kneePitch=-.083*state.brake*contact-.065*state.burst*swing;
  foot.hipPitch=.055*state.burst*swing-.029*state.brake*contact;
  foot.hipRoll=side*.034*state.brake*contact-side*.033*bank*contact*weight;
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
 for(let i=0;i<2;i++){
  const f=state.feet[i];
  p.legs[i].rotation.x+=f.hipPitch*w;
  p.legs[i].rotation.z+=f.hipRoll*w;
  p.knees[i].rotation.x+=f.kneePitch*w;
  p.ankles[i].rotation.x+=f.anklePitch*w;
  p.ankles[i].rotation.z+=f.ankleRoll*w;
  p.ankles[i].rotation.y+=f.ankleYaw*w;
 }
 return state;
}
