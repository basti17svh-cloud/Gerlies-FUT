/* Footera V21.105 — goalkeeper-only biomechanics.
 * One coordinated controller owns ready stance, shuffle, load, takeoff,
 * asymmetric flight, landing and recovery. The event outcome/ball are read-only.
 * Stable time sampling: no simulation RNG, allocation per frame, or timers.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const ease=(t,a,b)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
const pulse=(t,a,b,c,d)=>ease(t,a,b)*(1-ease(t,c,d));
export const GOALKEEPER_MOTION_VERSION='21.105-biomechanical-keeper';
export const GOALKEEPER_ACTIONS=Object.freeze(['classic','fingertip','parry','low_reflex','rush_spread','high_reach','beaten']);
export function sampleGoalkeeperMotion(time,type='goal',action='classic',impactX=2.5,impactY=1.1){
 const t=clamp(time,0,10.4),save=type==='big_chance_saved',side=Math.sign(impactX)||1,
  kind=save&&GOALKEEPER_ACTIONS.includes(action)?action:'beaten',
  low=kind==='low_reflex',spread=kind==='rush_spread',
  high=kind==='high_reach'||kind==='fingertip',
  early=kind==='rush_spread'?.23:0,
  ready=ease(t,3.5,4.36),shuffle=pulse(t,4.48,4.79,5.02,5.30),
  plant=pulse(t,5.12-early,5.58-early,5.82-early,6.12-early),
  launch=ease(t,5.79-early,6.21-early),
  flight=pulse(t,5.84-early,6.22-early,6.63,7.06),
  contact=pulse(t,6.34,6.55,6.75,6.96),
  landing=pulse(t,6.65,7.06,7.65,8.18),
  grounded=ease(t,6.86,7.21)*(1-ease(t,8.04,8.95)),
  rise=ease(t,7.95,9.18),
  reaction=save?1:.76,
  altitude=(high?.09:low?-.06:.02)*flight;
 return{side,save,kind,ready,shuffle,plant,launch,flight,contact,landing,grounded,rise,
  impactX,impactY,altitude,reaction,low,spread,high};
}
// Rotations are expressed in the existing human rig axes, not a second mesh
// or a rigid whole-character flip. Pose the pelvis and each limb independently.
export function applyGoalkeeperMotion(p,time,base,type='goal',action='classic',impactX=2.5,impactY=1.1){
 const m=sampleGoalkeeperMotion(time,type,action,impactX,impactY),
  {side,save,kind,ready,shuffle,plant,flight,contact,landing,grounded,rise}=m;
 const lead=side>0?0:1,trail=1-lead,nearSign=lead===0?-1:1,
  high=m.high?1.25:1,low=m.low?1:0,spread=m.spread?1:0;
 // Center of mass: a visible small lateral set-step, explosive lateral
 // transfer in the air, turf absorption and a planted get-up. Ball never moves.
 const drift=side*(.16*shuffle+.19*flight+.055*landing*(1-rise));
 p.root.position.x+=drift;
 p.root.position.y=Math.max(0,base.y+.065*plant+m.altitude-.065*grounded);
 p.shadow.position.y=.022-p.root.position.y;
 p.rig.rotation.z=base.tilt*.73+side*(.08*shuffle+.09*plant+.11*flight-.085*grounded);
 p.rig.rotation.x=-.10*plant+(.09+.18*low)*flight+.23*grounded*(1-rise);
 p.rig.rotation.y=side*(.07*shuffle+.14*flight-.09*grounded);
 p.rig.position.y=-.025*ready-.105*plant*(1-flight)-.11*grounded+.055*rise;
 // Head/shoulders look into the flight, but counter-rotate against the hips.
 p.upper.rotation.x=-.13*ready-.11*plant+.19*flight+.25*grounded-.18*rise;
 p.upper.rotation.y=side*(.12*shuffle+.17*plant+.21*flight-.19*rise);
 p.upper.rotation.z=-side*(.08*plant+.19*flight)+side*.11*grounded;
 // Loaded outside leg drives the lateral push, inside leg trails. Both legs
 // tuck asymmetrically on impact so the body no longer resembles a hinged rod.
 for(let i=0;i<2;i++){
  const push=i===trail,leadLeg=i===lead;
  const load=plant*(push?-.49:-.37);
  p.legs[i].rotation.x=load+flight*(push?-.46:.43)+landing*(push?.25:.52)+grounded*(push?-.24:-.11);
  p.knees[i].rotation.x=-.20*ready-.78*plant*(push?1.18:.80)
   +flight*(push?-.20:.31)-.52*grounded*(push?1:.78)+.18*rise;
  p.ankles[i].rotation.x=.12*plant+flight*(push?-.28:.20)+.14*grounded-.08*rise;
  p.legs[i].rotation.z=(i===0?1:-1)*(.095*ready+.10*shuffle+.10*landing)
   +side*(push?-.22:.31)*flight*(1+.25*spread);
  p.knees[i].rotation.z=side*(push?.10:-.12)*flight;
 }
 // The glove-side arm leads the ball, the other shields the landing. Hands
 // remain separate; a narrow IK blend near a real save handles exact contact.
 const reach=(save?1:.68)*(1+.18*m.high);
 p.arms[lead].rotation.z=nearSign*(.38*ready+.25*plant+1.04*flight*reach+.24*landing-.28*rise);
 p.arms[trail].rotation.z=-nearSign*(.34*ready+.16*plant+.52*flight+.20*grounded-.25*rise);
 p.arms[lead].rotation.x=-.12*ready-.34*flight*high+.24*grounded;
 p.arms[trail].rotation.x=.09*ready+.15*flight-.30*grounded;
 p.arms[lead].rotation.y=side*(.08*plant+.18*flight);
 p.arms[trail].rotation.y=-side*.09*flight;
 p.elbows[lead].rotation.x=.37*ready+.21*plant-(m.high?.13:0)*flight-.24*contact+.28*grounded;
 p.elbows[trail].rotation.x=.42*ready+.16*flight+.48*landing-.16*rise;
 p.elbows[lead].rotation.z=side*.09*flight;
 p.elbows[trail].rotation.z=-side*.13*landing;
 if(kind==='low_reflex'){
  p.rig.rotation.x+=.21*flight;p.legs[lead].rotation.z+=side*.35*flight;
  p.arms[lead].rotation.x+=.25*flight;p.knees[trail].rotation.x-=.19*landing;
 }else if(kind==='rush_spread'){
  p.rig.rotation.x+=.17*flight;
  p.legs[lead].rotation.z+=side*.42*flight;p.legs[trail].rotation.z-=side*.42*flight;
  p.arms[trail].rotation.z-=nearSign*.28*flight;
 }else if(kind==='high_reach'){
  p.upper.rotation.x-=.17*flight;p.arms[lead].rotation.x-=.22*flight;
  p.legs[trail].rotation.x-=.15*flight;
 }else if(kind==='fingertip'){
  p.upper.rotation.y+=side*.12*flight;p.elbows[lead].rotation.x-=.20*contact;
 }else if(kind==='parry'){
  p.arms[lead].rotation.x-=.14*flight+.18*contact;p.elbows[trail].rotation.x+=.14*flight;
 }
 // A missed shot / conceded goal does not fake a successful catch.
 if(!save){p.arms[lead].rotation.z*=.84;p.elbows[lead].rotation.x+=.27*flight}
 return m;
}
