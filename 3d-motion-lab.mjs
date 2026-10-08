/* Footera Motion Lab: opt-in, deterministic A/B pilot for two skinned players.
 * This is an alternative POSE CONTROLLER, not another additive motion layer.
 * No match RNG, ball paths, result, route, or camera are changed.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const blend=(a,b,w)=>a+(b-a)*clamp(w);
const rise=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
export const MOTION_LAB_VERSION='21.43-football-actions';
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
 if(role==='support'||role==='provider'){
  // Off-ball actors share the coherent stride controller without becoming extra
  // GPU skinning draws. Only the real passer prepares for a visible delivery.
  const wide=/^(?:wing|cutback|low_cross|early_cross|far_post|near_post|volley)_(?:left|right)$/.test(sequence);
  const delivery=role==='provider'&&wide?pulse(t,3.04,3.35,3.64,4.05):0;
  const receive=role==='provider'?pulse(t,.82,1.18,1.75,2.15):0;
  hips[1]-=.29*delivery; knees[0]-=.25*delivery;
  arms[0]-=.23*delivery;arms[1]+=.28*delivery;
  return{role,time:t,side,moving,phase:delivery>.35?'prepare-pass':receive>.35?'receive':v<.16?'settle':'run',
   hips,knees,ankles,arms,spread,
   lean:-.10*moving-.14*delivery-.055*burst+.09*brake,
   yaw:side*.14*delivery+clamp(turn*1.25,-.14,.14)+.045*counter*moving,
   bank:clamp(turn*1.4,-.18,.18)+side*.13*delivery,
   crouch:.035*delivery+.018*brake*moving,
   pelvisYaw:side*.08*delivery,enabled:1};
 }
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

/* V21.43: visual-only touches, interceptions and strike biomechanics. No
 * match state, outcome, player trajectory, camera or ball flight is authored.
 * All transitions sample the absolute highlight clock or the distance gait.
 */
export const FOOTBALL_ACTION_VERSION='21.43-physical-football';
export function footballTouchSample(stride,weight=1,sequence='central'){
 const wave=Math.sin(Number.isFinite(stride)?stride:0),foot=wave>=0?0:1;
 const beat=Math.pow(Math.abs(wave),8),contact=beat*clamp(weight);
 const cut=/^(inside|cut_inside|double_feint|near_post_cut)_(left|right)$/.test(sequence);
 return{foot,beat,contact,cut,inside:sequence.endsWith('_left')?-1:1};
}
export function applyFootballControl(p,stride,weight,sequence='central'){
 const m=footballTouchSample(stride,weight,sequence);
 if(weight<.001)return m;
 const active=m.contact,other=1-m.foot,side=m.foot?1:-1;
 // Grounded supporting knee, opening inside boot, then recover.
 p.ankles[m.foot].rotation.y+=side*.28*active;
 p.ankles[m.foot].rotation.x-=.22*active;
 p.legs[m.foot].rotation.x+=.17*active;
 p.knees[other].rotation.x-=.16*active;
 p.upper.rotation.y-=side*.07*active;
 p.arms[other].rotation.x+=side*.12*active;
 if(m.cut){p.ankles[m.foot].rotation.z+=m.inside*.14*active;p.upper.rotation.z+=m.inside*.065*active}
 return m;
}
export function footballStrikeSample(time,finish='normal',sequence='central'){
 const t=Number.isFinite(time)?time:0;
 return{load:pulse(t,4.73,4.96,5.11,5.36),
  plant:pulse(t,4.86,5.08,5.24,5.395),
  follow:pulse(t,5.405,5.53,5.76,6.07),
  side:sequence.endsWith('_left')?-1:1,
  power:finish==='power',curl:finish==='finesse',
  low:finish==='low_driven',chip:finish==='chip'};
}
export function applyFootballStrike(p,time,finish='normal',sequence='central'){
 const m=footballStrikeSample(time,finish,sequence);
 if(['header','volley','bicycle'].includes(finish))return m;
 const strength=m.power?1.33:m.low?.78:m.curl?.94:1;
 const curl=m.curl?1:0,low=m.low?1:0,chip=m.chip?1:0;
 // These additives are EXACTLY ZERO at the original 5.400s boot impact:
 // existing canonical shot IK and ball release retain full authority.
 p.legs[1].rotation.x-=.39*strength*m.load;
 p.knees[1].rotation.x-=.26*m.load;
 p.ankles[1].rotation.x-=.15*m.load;
 p.legs[0].rotation.x-=.13*m.plant;
 p.knees[0].rotation.x-=.26*m.plant;
 p.ankles[0].rotation.x+=.11*m.plant;
 p.upper.rotation.x-=.22*strength*m.load;
 p.upper.rotation.y+=m.side*(.13*m.load+curl*.28*m.load);
 p.upper.rotation.z+=m.side*(curl*.19*m.plant-.10*m.follow);
 p.legs[1].rotation.x+=(.33*strength-.12*low+.21*chip)*m.follow;
 p.knees[1].rotation.x+=.18*m.follow;
 p.ankles[1].rotation.z+=m.side*(.31*curl*m.follow+.07*m.plant);
 p.upper.rotation.x+=(low?.15:-.04)*m.follow;
 p.arms[0].rotation.x+=.27*m.load-.20*m.follow;
 p.arms[1].rotation.x-=.31*m.load+.15*m.follow;
 p.arms[0].rotation.z-=.23*m.load;p.arms[1].rotation.z+=.25*m.load;
 return m;
}
export function footballReceptionSample(index,time,sequence='central',distance=99){
 let at=-10;
 if(index===0){
  if(sequence==='one_two'||sequence==='through_ball')at=4.66;
  else if(['central','halfspace_left','halfspace_right','finesse_halfspace'].includes(sequence))at=3.15;
  else if(/^(wing|cutback|early_cross|low_cross)_/.test(sequence))at=5.10;
 }else if(index===1){
  if(sequence==='diagonal_switch')at=2.5;
  else if(/^(wing|cutback)_/.test(sequence))at=.96;
 }
 return{absorb:pulse(time,at-.23,at-.04,at+.12,at+.44)*(1-smooth((Math.max(0,distance)-2.45)/1.5)),at};
}
export function applyFootballReception(p,index,time,sequence,distance){
 const m=footballReceptionSample(index,time,sequence,distance),a=m.absorb;
 if(a>.001){
  p.legs[0].rotation.x-=.19*a;p.knees[0].rotation.x-=.24*a;
  p.ankles[0].rotation.x+=.20*a;p.upper.rotation.x+=.11*a;
  p.arms[0].rotation.z-=.17*a;p.arms[1].rotation.z+=.17*a;
 }
 return m;
}
export function footballDefenderSample(time,distance,action='jockey',sequence='central'){
 const near=1-smooth((Math.max(0,distance)-3.1)/5.4);
 return{near,brace:near*pulse(time,2.06,2.62,4.72,5.43),
  brake:near*pulse(time,2.85,3.32,3.92,4.46),
  shot:near*pulse(time,4.74,5.00,5.55,6.08),
  feint:sequence.startsWith('double_feint')?near*pulse(time,1.80,2.12,2.45,2.80):0,
  press:action==='close_down',block:action==='block_attempt'};
}
export function applyFootballDefender(p,time,distance,action,sequence){
 const m=footballDefenderSample(time,distance,action,sequence);
 const a=m.brace,b=m.brake;
 if(a<.001&&b<.001&&m.feint<.001&&m.shot<.001)return m;
 // Do not rotate the actor root: route-facing and forward travel stay intact.
 p.upper.rotation.x+=.15*a+.12*b-.09*m.shot;
 p.upper.rotation.y+=m.feint*.26-m.shot*.11;
 p.legs[0].rotation.z-=.13*a;p.legs[1].rotation.z+=.13*a;
 p.knees[0].rotation.x-=.24*a+.10*b;
 p.knees[1].rotation.x-=.18*a+.14*b;
 p.ankles[0].rotation.x+=.09*b;
 p.arms[0].rotation.z-=.18*a+.21*m.shot;
 p.arms[1].rotation.z+=.17*a+.20*m.shot;
 if(m.press){p.upper.rotation.x-=.13*a;p.legs[1].rotation.x-=.19*b}
 if(m.block){p.legs[0].rotation.x-=.18*m.shot;p.arms[0].rotation.z-=.15*m.shot}
 return m;
}
