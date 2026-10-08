/* Footera V21.38 pilot – independently authored football biomechanics.
 * No external mocap/animation assets, runtime loading, random draws or allocations.
 * These additive poses affect the EXISTING striker and goalkeeper skeletons only.
 * Saved match results, ball trajectories and verified goalkeeper contact are immutable.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const phase=(t,a,b)=>smooth((t-a)/(b-a));
export const FOOTBALL_ANIMATION_VERSION='21.38-pilot';
export const MOTION_PHASES=Object.freeze({plant:[4.92,5.30],contact:5.4,follow:[5.43,5.98],keeperLoad:[5.46,5.88],keeperFlight:[5.89,6.77],keeperLand:[6.78,7.58],keeperRecover:[7.58,9.15]});
export function runningMechanics(speed,turn,acceleration,control,cycle){
 const effort=smooth(clamp(speed)/.17),push=clamp(acceleration,-1,1),bank=clamp(turn*1.65,-.21,.21);
 const stop=Math.max(0,-push)*effort,burst=Math.max(0,push)*effort;
 return{effort,bank,stop,burst,drive:Math.sin(cycle),counter:Math.cos(cycle),
  lean:effort*(-.025-.085*burst+.13*stop),crouch:effort*(.014+.055*stop),
  control:smooth(control),plant:smooth(Math.abs(turn)/.14)*effort};
}
// Add a small, readable upper-body kinetic chain while respecting the existing
// distance-phased, foot-planted runningLeg IK solution.
export function animateAthleticRun(p,speed,turn,cycle,acceleration=0,control=0){
 const m=runningMechanics(speed,turn,acceleration,control,cycle);
 if(m.effort<.001)return m;
 p.upper.rotation.x+=m.lean+.025*m.control;
 p.upper.rotation.y+=m.counter*.092*m.effort-m.bank*.18;
 p.upper.rotation.z+=m.bank*.58+Math.sin(cycle+.36)*.045*m.effort;
 p.rig.rotation.y-=m.counter*.035*m.effort;
 p.rig.position.y-=m.crouch;
 for(let i=0;i<2;i++){
  const side=i?1:-1,g=p.gait[i],stance=g.support?1:0;
  // Support ankle remains near neutral; airborne foot dorsiflexes for clearance.
  const swing=1-stance;
  p.ankles[i].rotation.x+=swing*.12*m.effort-stance*.025*m.stop;
  p.ankles[i].rotation.z+=side*(m.plant*.06*stance+m.bank*.12);
  p.legs[i].rotation.z+=side*(.034*stance+.065*m.plant*stance);
  p.knees[i].rotation.x-=swing*.12*m.burst;
  p.arms[i].rotation.x+=side*m.counter*.12*m.effort*(1-.55*m.control);
  p.arms[i].rotation.z+=side*(.075*m.burst+.10*m.stop+.035*m.plant);
  p.elbows[i].rotation.x+=.10*m.burst+.16*m.control;
 }
 return m;
}
// Separate backswing, stable support foot, strike/contact and follow-through.
// Exactly at 5.400 s the kicking hip/knee stay at the established shot-contact
// pose so that the simulation-authoritative ball leaves the boot without a jump.
export function strikeMechanics(time,finish='normal'){
 const backswing=phase(time,4.91,5.13)*(1-phase(time,5.22,5.39));
 const follow=phase(time,5.411,5.53)*(1-phase(time,5.75,6.05));
 const recover=phase(time,5.72,6.12);
 const power=finish==='power'?1.4:finish==='low_driven'?.88:1;
 const curl=finish==='finesse'?1:0;
 const air=finish==='volley'||finish==='bicycle'?1:0;
 const header=finish==='header'?1:0;
 return{backswing,follow,recover,power,curl,air,header,contact:Math.abs(time-MOTION_PHASES.contact)<.001};
}
export function animateFootballFinish(p,time,finish='normal',sequence='central'){
 const m=strikeMechanics(time,finish);
 const side=sequence.includes('left')?-1:1;
 const a=m.backswing,b=m.follow,lock=1-m.header;
 p.legs[1].rotation.x+=lock*(-.43*m.power*a+.28*m.power*b);
 p.knees[1].rotation.x+=lock*(-.27*a+.17*b);
 p.ankles[1].rotation.x+=lock*(-.19*a+.12*b);
 p.ankles[1].rotation.z+=side*m.curl*(.27*a+.31*b);
 p.legs[0].rotation.x-=.12*a;
 p.knees[0].rotation.x-=.20*a;
 p.ankles[0].rotation.x+=.10*a;
 p.upper.rotation.x+=(-.18*m.power*a+.16*b)*(1-.7*m.header);
 p.upper.rotation.y+=side*(.10*a+m.curl*(.31*a+.34*b)-.07*b);
 p.upper.rotation.z+=side*(.11*a-.07*b+m.curl*.11*b);
 p.arms[0].rotation.x+=.27*a-.24*b;p.arms[1].rotation.x-=.33*a-.18*b;
 p.arms[0].rotation.z-=.23*a+.16*b;p.arms[1].rotation.z+=.24*a+.12*b;
 p.elbows[0].rotation.x+=.16*a;p.elbows[1].rotation.x+=.19*a;
 // Headers and volleys keep the legacy ball contact position but gain
 // preparation/recovery: this never creates a second independent flight path.
 if(m.header){p.upper.rotation.x-=.22*a;p.arms[0].rotation.z-=.34*a;p.arms[1].rotation.z+=.34*a}
 if(m.air){p.legs[0].rotation.x-=.20*a;p.knees[0].rotation.x-=.19*a;p.upper.rotation.z+=side*.08*b}
 return m;
}
// Four distinct physical phases for a diving keeper. The separate glove IK runs
// AFTER this, targeting the original interception point: never move the ball.
export function keeperDiveMechanics(time,action='classic',save=true){
 const load=phase(time,5.45,5.82)*(1-phase(time,5.90,6.25));
 const flight=phase(time,5.85,6.28)*(1-phase(time,6.78,7.30));
 const landing=phase(time,6.78,7.07)*(1-phase(time,7.62,8.25));
 const rise=phase(time,7.65,8.75);
 const spread=action==='rush_spread'?1.35:action==='low_reflex'?.65:1;
 const high=action==='high_reach'||action==='fingertip'?1.22:1;
 return{load,flight,landing,rise,spread,high,save};
}
export function animateGoalkeeperDive(p,time,action='classic',save=true){
 const m=keeperDiveMechanics(time,action,save);
 const {load,flight,landing,rise}=m;
 // Leg compression -> opposing leg extension -> tucked impact -> one-knee rise.
 p.legs[0].rotation.x+=-.25*load+.38*flight+.33*landing-.15*rise;
 p.legs[1].rotation.x+=-.25*load-.34*flight+.19*landing-.12*rise;
 p.knees[0].rotation.x+=-.38*load+.28*flight-.63*landing+.12*rise;
 p.knees[1].rotation.x+=-.38*load-.21*flight-.44*landing+.11*rise;
 p.ankles[0].rotation.x+=.11*load-.13*flight+.16*landing;
 p.ankles[1].rotation.x+=.11*load+.16*flight+.13*landing;
 p.legs[0].rotation.z+=.20*m.spread*flight;
 p.legs[1].rotation.z-=.23*m.spread*flight;
 p.upper.rotation.x+=-.13*load+.12*flight+.31*landing-.15*rise;
 p.upper.rotation.z+=.07*flight+.10*landing;
 p.arms[0].rotation.z-=.15*m.high*load+.19*flight;
 p.arms[1].rotation.z+=.15*m.high*load+.19*flight;
 p.elbows[0].rotation.x+=.19*load;p.elbows[1].rotation.x+=.19*load;
 return m;
}
