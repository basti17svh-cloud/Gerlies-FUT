/* Footera Motion Lab: opt-in, deterministic A/B pilot for two skinned players.
 * This is an alternative POSE CONTROLLER, not another additive motion layer.
 * No match RNG, ball paths, result, route, or camera are changed.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const blend=(a,b,w)=>a+(b-a)*clamp(w);
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
export const MOTION_LAB_VERSION='motion-lab-1';
export const MOTION_LAB_SHOT_TIME=5.4;

// All signals depend on the absolute highlight clock: a paused or scrubbed
// replay produces exactly the same pose as real-time playback.
export function sampleLabMotion(role,time,sequence='cut_inside_right',speed=.5,turn=0,stride=0,acceleration=0,ballDistance=99){
 const t=clamp(time,0,10.4),v=clamp(speed),moving=smooth(v/.2);
 const side=sequence.endsWith('_left')?-1:1;
 const inverted=/^(?:inside|cut_inside|double_feint|near_post_cut)_(?:left|right)$/.test(sequence);
 const tCut=sequence.startsWith('double_feint')?3.07:sequence.startsWith('near_post_cut')?3.32:sequence.startsWith('cut_inside')?3.13:3.38;
 const feint=inverted&&sequence.startsWith('double_feint')?pulse(t,1.8,2.12,2.45,2.73):0;
 const plant=inverted?pulse(t,tCut-.56,tCut-.20,tCut+.11,tCut+.40):0;
 const redirect=inverted?pulse(t,tCut-.15,tCut+.16,tCut+.48,tCut+.95):0;
 const chase=role==='defender'?pulse(t,2.58,3.0,4.28,5.08):0;
 const brace=role==='defender'?pulse(t,3.08,3.48,4.22,4.77)*smooth((15-clamp(ballDistance,0,99))/12):0;
 const strike=role==='attacker'?1-rise(t,4.72,4.96)+rise(t,6.05,6.34):1;
 const brake=clamp(-acceleration),burst=clamp(acceleration);
 const pace=blend(.47,1.04,smooth(v/.75));
 const cycle=Math.sin(stride),opposite=Math.sin(stride+Math.PI),counter=Math.cos(stride);
 // Support stays loaded and trailing leg lifts; arms counter-rotate naturally.
 const hips=[cycle*pace*moving,opposite*pace*moving];
 const knees=[-.10-moving*(.16+.53*Math.max(0,-cycle)),-.10-moving*(.16+.53*Math.max(0,-opposite))];
 const ankles=[-.045+moving*.17*Math.max(0,-cycle),-.045+moving*.17*Math.max(0,-opposite)];
 const arms=[-.63*cycle*moving+.10*counter*moving,.63*cycle*moving-.10*counter*moving];
 const spread=[-.17-.11*moving,.17+.11*moving];
 const outside=side>0?1:0,inside=1-outside;
 if(role==='attacker'){
  const load=plant*strike,push=redirect*strike,check=feint*strike;
  // Distinct readable phases: fake -> outside-foot braking -> hip-led cut -> push-off.
  hips[outside]=blend(hips[outside],-.32,.90*load);
  knees[outside]=blend(knees[outside],-.83,.95*load);
  ankles[outside]=blend(ankles[outside],.27,.90*load);
  hips[inside]+=push*.39;
  knees[inside]-=push*.20;
  arms[outside]-=side*(.47*load-.16*push);
  arms[inside]+=side*(.38*load+.22*push);
  return{role,time:t,side,moving,phase:check>.36?'feint':load>.40?'plant':push>.36?'accelerate':v<.16?'settle':'run',
   hips,knees,ankles,arms,spread,
   lean:-.095*moving-.21*load-.16*push+.08*brake,
   yaw:side*(-.32*load+.43*push+.21*check)+clamp(turn*1.4,-.12,.12),
   bank:side*(.37*load-.26*push-.31*check),
   crouch:.09*load+.045*brake*moving,
   pelvisYaw:side*(.13*check+.16*push),
   enabled:clamp(strike)};
 }
 // Defensive read -> balanced jockey -> low stance and lateral chase.
 const defend=chase,load=brace;
 hips[0]=blend(hips[0],-.26,load*.76);
 hips[1]=blend(hips[1],.20,load*.72);
 knees[0]=blend(knees[0],-.53,load);
 knees[1]=blend(knees[1],-.48,load);
 spread[0]-=.26*load;spread[1]+=.26*load;
 arms[0]+=.26*load;arms[1]-=.22*load;
 return{role,time:t,side,moving,phase:load>.35?'jockey':defend>.35?'track':v<.16?'set':'run',
  hips,knees,ankles,arms,spread,
  lean:-.07*moving-.21*load-.08*defend,
  yaw:-side*.21*load+clamp(turn*1.2,-.13,.13),
  bank:-side*.16*load,
  crouch:.135*load,
  pelvisYaw:side*.12*defend,
  enabled:1};
}
export function applyLabMotion(p,role,time,sequence,speed,turn,stride,acceleration,ballDistance){
 const m=sampleLabMotion(role,time,sequence,speed,turn,stride,acceleration,ballDistance);
 const w=m.enabled;
 if(w<=.001)return m;
 const set=(joint,axis,value)=>{joint.rotation[axis]=blend(joint.rotation[axis],value,w)};
 // Complete authored pose instead of piling on top of old gait + mocap.
 set(p.upper,'x',m.lean);set(p.upper,'y',m.yaw);set(p.upper,'z',m.bank);
 set(p.rig,'z',m.bank*.40);set(p.rig,'y',m.pelvisYaw);
 p.rig.position.y=blend(p.rig.position.y,-m.crouch+.018*Math.cos(stride*2)*m.moving,w);
 for(let i=0;i<2;i++){
  set(p.legs[i],'x',m.hips[i]);set(p.legs[i],'z',(i?1:-1)*(.038+.08*m.crouch));
  set(p.knees[i],'x',m.knees[i]);set(p.ankles[i],'x',m.ankles[i]);
  set(p.arms[i],'x',m.arms[i]);set(p.arms[i],'z',m.spread[i]);
  set(p.elbows[i],'x',.62+.22*m.moving);
 }
 return m;
}
