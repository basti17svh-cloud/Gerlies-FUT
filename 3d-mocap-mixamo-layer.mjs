/* Footera V21.353: real captured goalkeeping (Adobe Mixamo "Soccer Game
 * Pack", baked by tools/build-footera-mixamo.mjs) on the imported keeper.
 * Before the shot the keeper sways in a captured ready stance; for the save he
 * follows a real diving save: load, push-off, flight, landing on the side and
 * getting up. The game keeps the root path, the ball and the glove contact:
 * the capture is time-warped onto the authored dive keys and the gloves are
 * pulled onto the ball by the caller's hand IK around the contact.
 * Deterministic: a pure function of time and the dive.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs?v=21353';
import {FOOTERA_MIXAMO} from './3d-mocap-mixamo-data.mjs?v=21369';
import {FOOTERA_CMU_RUN} from './3d-mocap-cmu-run-data.mjs?v=21366';
import {FOOTERA_MIXAMO_GAIT} from './3d-mocap-mixamo-gait-data.mjs?v=21433';
import {FOOTERA_MIXAMO_CELEBRATE} from './3d-mocap-mixamo-celebrate-data.mjs?v=21434';
import {sampleGoalkeeperMotion} from './3d-goalkeeper-biomechanics.mjs?v=21114';
export const MIXAMO_KEEPER_LAYER_VERSION='21.369-mixamo-keeper-striker-tackle-run-receive-kick-gait-throw';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=(t,a,b)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};

// Game time of each capture key (see 3d-goalkeeper-biomechanics.mjs):
// push-off, side landing, start of the get-up, standing again.
const GAME_KEYS={launch:5.95,land:6.95,rise:7.95,up:9.05};
// Piecewise linear time warp from game time to capture seconds.
export function keeperCaptureTime(time,keys,early=0){
 const g=[GAME_KEYS.launch-.72-early,GAME_KEYS.launch-early,GAME_KEYS.land,GAME_KEYS.rise,GAME_KEYS.up];
 const c=[Math.max(0,keys.launch-.72),keys.launch,keys.land,keys.rise,keys.up];
 if(time<=g[0])return c[0];
 for(let i=1;i<g.length;i++)if(time<=g[i])return c[i-1]+(c[i]-c[i-1])*(time-g[i-1])/(g[i]-g[i-1]);
 return c[c.length-1]+(time-g[g.length-1]);
}
export function keeperCaptureClip(action='classic'){
 return action==='high_reach'||action==='fingertip'?'keeper_dive_high':'keeper_dive';
}
// Weights of the ready sway and the dive over the play.
// V21.369: game time of the caught ball's throw-out. The capture's hold
// (ball at the chest) starts it, the release lands at KEEPER_THROW.release.
export const KEEPER_THROW=Object.freeze({start:9.1,release:9.85});
export function keeperThrowCaptureTime(time,keys){
 const {hold,release}=keys;
 if(time<=KEEPER_THROW.start)return hold;
 // The wind-up is quicker than the capture (the scene ends at 10.4 s).
 if(time<=KEEPER_THROW.release)return hold+(time-KEEPER_THROW.start)*(release-hold)/(KEEPER_THROW.release-KEEPER_THROW.start);
 return release+(time-KEEPER_THROW.release);
}
// V21.437: the capture owns the arms. Hand IK onto the authored gloves only
// where a glove really meets the ball (a save, around the contact) or holds
// it (a caught ball); a beaten keeper (type 'goal' …) keeps the captured arms
// all through his dive. Before V21.437 the IK pulled both arms onto the
// procedural guide for most of the dive: one arm hung to the turf and the
// elbow bent backwards on the landing.
export function keeperCaptureWeights(time,action='classic',type='big_chance_saved'){
 // The low spread block (rush_spread) has no matching capture: it keeps the
 // authored smother and only borrows the captured ready stance.
 if(action==='rush_spread'){
  const ready=.8*smooth(time,3.2,3.8)*(1-smooth(time,4.82,5.22));
  return{dive:0,ready,legs:0,hands:1};
 }
 const dive=smooth(time,5.05,5.45)*(1-smooth(time,9.05,9.6));
 const ready=.8*smooth(time,3.2,3.8)*(1-smooth(time,5.05,5.45));
 // Legs join for the push-off and leave again as the authored get-up plants them.
 const legs=smooth(time,5.6,5.92)*(1-smooth(time,8.1,8.7));
 const save=type==='big_chance_saved';
 // Authored arms only where no capture plays (before the ready stance).
 let hands=1-Math.max(dive,ready/.8);
 // A save: the gloves meet the ball around the contact (6.34-6.96).
 if(save)hands=Math.max(hands,smooth(time,6.2,6.4)*(1-smooth(time,6.98,7.3)));
 // V21.369: a caught ball (classic save) stays in both gloves until the
 // keeper is up again; then the captured overhand throw owns the arms.
 const throwOut=save&&action==='classic'?smooth(time,KEEPER_THROW.start,KEEPER_THROW.start+.3):0;
 if(save&&action==='classic')hands=Math.max(hands,smooth(time,6.25,6.5))*(1-throwOut);
 return{dive,ready,legs,hands:clamp(hands),throwOut};
}

export function createKeeperCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,mirror:0,hands:1,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig)return{apply:()=>state,state};
 const left=rig.left.clone();
 // dive: {type, action, impactX, impactY}. Returns the state (hands = IK weight).
 function apply(time=0,dive=null){
  state.clip='none';state.weight=0;state.hands=1;
  if(!dive)return state;
  const action=String(dive.action||'classic'),w=keeperCaptureWeights(time,action,dive.type||'big_chance_saved');
  state.hands=w.hands;
  if(w.ready>.001&&w.dive<.999){
   const clip=rig.clips.keeper_ready;
   rig.pose('keeper_ready',time*clip.rate,{body:w.ready*(1-w.dive),legs:0},0);
   state.clip='keeper_ready';state.weight=w.ready;
  }
  if(w.dive>.001){
   const m=sampleGoalkeeperMotion(time,dive.type,action,dive.impactX,dive.impactY);
   const name=keeperCaptureClip(m.kind),clip=rig.clips[name];
   // Dive towards the authored side: the capture's own side is its left
   // (+1) or right (-1); mirror when the game's side is the other one.
   const leftX=left.clone().applyQuaternion(playerRoot.quaternion).x;
   const towardsLeft=Math.sign(leftX)*m.side>0;
   const mirror=(clip.side>0)===towardsLeft?0:1;
   const t=keeperCaptureTime(time,clip.keys);
   rig.pose(name,t*clip.rate,{body:w.dive,legs:w.legs},mirror);
   state.clip=name;state.weight=w.dive;state.mirror=mirror;
  }
  if(w.throwOut>.001&&rig.clips.keeper_throw){
   const clip=rig.clips.keeper_throw;
   rig.pose('keeper_throw',keeperThrowCaptureTime(time,clip.keys)*clip.rate,{body:w.throwOut,legs:0},0);
   state.clip='keeper_throw';state.weight=w.throwOut;
  }
  return state;
 }
 return{apply,state};
}

// V21.359: captured header and overhead (scissor) kick for the scorer.
// Game time of the capture keys: the header meets the ball at the shot
// time (5.4 s); the overhead kick takes off, strikes at 5.4 s, lands on the
// back and is up again as bicycleKickPose (3d-highlights-scene.mjs) plans it.
const STRIKER_KEYS={
 header:{game:[4.95,5.4,6.25],capture:['load','contact','settle']},
 bicycle:{game:[4.8,5.4,5.78,6.25,6.8],capture:['takeoff','contact','land','rise','up']}
};
export function strikerCaptureTime(finish,time,keys){
 const spec=STRIKER_KEYS[finish];if(!spec)return 0;
 const g=spec.game,c=spec.capture.map(k=>keys[k]);
 if(time<=g[0])return Math.max(0,c[0]+(time-g[0]));
 for(let i=1;i<g.length;i++)if(time<=g[i])return c[i-1]+(c[i]-c[i-1])*(time-g[i-1])/(g[i]-g[i-1]);
 return c[c.length-1]+(time-g[g.length-1]);
}
// body: upper body share; legs: legs share (the header keeps the authored jump).
export function strikerCaptureWeights(finish,time){
 if(finish==='header'){const body=.9*smooth(time,4.7,5.0)*(1-smooth(time,5.95,6.35));return{body,legs:0,ground:0}}
 if(finish==='bicycle'){
  const w=smooth(time,4.72,4.92)*(1-smooth(time,6.68,6.92));
  return{body:w,legs:w,ground:w*smooth(time,5.6,5.85)*(1-smooth(time,6.45,6.8))};
 }
 return{body:0,legs:0,ground:0};
}
export function createStrikerCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,legs:0,ground:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig)return{apply:()=>state,state};
 // finish: 'header' | 'bicycle'; anything else leaves the pose alone.
 function apply(time=0,finish=''){
  const w=strikerCaptureWeights(finish,time);
  state.clip='none';state.weight=w.body;state.legs=w.legs;state.ground=w.ground;
  if(w.body<=.001&&w.legs<=.001)return state;
  const clip=rig.clips[finish];if(!clip)return state;
  rig.pose(finish,strikerCaptureTime(finish,time,clip.keys)*clip.rate,{body:w.body,legs:w.legs},0);
  state.clip=finish;
  return state;
 }
 return{apply,state};
}

// V21.360: captured slide tackle for the sliding defender. `contact` is the
// game time the leading boot reaches the ball; weight fades the capture with
// the defender's distance to the ball (live duels) or is 1 (staged tackles).
export function tackleCaptureTime(time,contact,keys){
 const g=[contact-.45,contact,contact+.55,contact+1.3],c=[keys.takeoff,keys.contact,keys.rise,keys.up];
 if(time<=g[0])return Math.max(0,c[0]+(time-g[0]));
 for(let i=1;i<g.length;i++)if(time<=g[i])return c[i-1]+(c[i]-c[i-1])*(time-g[i-1])/(g[i]-g[i-1]);
 return c[c.length-1]+(time-g[g.length-1]);
}
export function tackleCaptureWeights(time,contact){
 const w=smooth(time,contact-.75,contact-.45)*(1-smooth(time,contact+1.15,contact+1.5));
 return{body:w,legs:w,ground:w*smooth(time,contact-.2,contact)*(1-smooth(time,contact+.75,contact+1.2))};
}
export function createTackleCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,ground:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig)return{apply:()=>state,state};
 // tackle: {contact, weight}. Returns the state (ground = how much to lay on the turf).
 function apply(time=0,tackle=null){
  state.clip='none';state.weight=0;state.ground=0;
  if(!tackle||!Number.isFinite(tackle.contact))return state;
  const scale=clamp(tackle.weight??1),w=tackleCaptureWeights(time,tackle.contact);
  const body=w.body*scale;if(body<=.001)return state;
  const clip=rig.clips.slide_tackle;
  rig.pose('slide_tackle',tackleCaptureTime(time,tackle.contact,clip.keys)*clip.rate,{body,legs:body},0);
  state.clip='slide_tackle';state.weight=body;state.ground=w.ground*scale;
  return state;
 }
 return{apply,state};
}

// V21.361: captured backwards and sideways jogs for defenders who keep facing
// the ball. angle: travel direction in the model's frame (0 forward, +PI/2
// its left, +-PI backwards); phase 0..1 along the gait cycle.
const RUN_DIRS=[
 {at:Math.PI/2,clip:'strafe_left',mirror:0},{at:Math.PI*.75,clip:'jog_back_diag',mirror:1},
 {at:Math.PI,clip:'jog_back',mirror:0},{at:-Math.PI,clip:'jog_back',mirror:0},
 {at:-Math.PI*.75,clip:'jog_back_diag',mirror:0},{at:-Math.PI/2,clip:'strafe_right',mirror:0}
];
export function backpedalBlend(angle){
 const a=Math.atan2(Math.sin(angle),Math.cos(angle)),side=a>=0?1:-1,abs=Math.abs(a);
 // Forward-ish travel keeps the normal captured run.
 const share=smooth(abs,Math.PI*.3,Math.PI*.5);
 const dirs=side>0?RUN_DIRS.slice(0,3):RUN_DIRS.slice(3).reverse();
 // dirs ordered by |at| ascending: PI/2, 3PI/4, PI.
 const x=clamp(abs,Math.PI/2,Math.PI);
 const k=x<Math.PI*.75?0:1,u=(x-Math.abs(dirs[k].at))/(Math.PI/4);
 return{share,a:dirs[k],b:dirs[k+1],u:clamp(u)};
}
export function createRunCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig)return{apply:()=>state,state,ready:false};
 const local=new THREE.Vector3(),inv=new THREE.Quaternion(),fwd=new THREE.Vector3(0,0,1).applyQuaternion(rig.face);
 // travel: [vx, vz, weight] in world space; stride: gait phase in radians.
 function apply(travel=null,stride=0){
  state.clip='none';state.weight=0;
  if(!travel||!(travel[2]>.001))return state;
  playerRoot.updateMatrixWorld(true);playerRoot.getWorldQuaternion(inv).invert();
  local.set(travel[0],0,travel[1]).applyQuaternion(inv);local.y=0;
  if(local.lengthSq()<1e-10)return state;
  const angle=Math.atan2(local.dot(rig.left),local.dot(fwd)),blend=backpedalBlend(angle);
  const w=clamp(travel[2])*blend.share;if(w<=.001)return state;
  const phase=((stride/(Math.PI*2))%1+1)%1;
  const frameOf=name=>phase*(rig.clips[name].frames-1);
  rig.pose(blend.a.clip,frameOf(blend.a.clip),{body:w,legs:w},blend.a.mirror);
  if(blend.u>.001)rig.pose(blend.b.clip,frameOf(blend.b.clip),{body:w*blend.u,legs:w*blend.u},blend.b.mirror);
  state.clip=blend.u>.5?blend.b.clip:blend.a.clip;state.weight=w;
  return state;
 }
 return{apply,state,ready:true};
}

// V21.362: captured first touch. The receiver slows, looks down, lifts the
// inside of the boot to cushion the pass and sets the ball. `arrival` is the
// game time the pass reaches the boot; `end` is when the next action takes
// over. Unmirrored the capture cushions with the left boot (ball from the
// player's right); mirror 1 uses the right boot.
export function receiveCaptureTime(time,arrival,keys){
 const g=[arrival-.32,arrival,arrival+.4,arrival+.62],c=[keys.load,keys.contact,keys.settle,keys.up];
 if(time<=g[0])return Math.max(0,c[0]+(time-g[0]));
 for(let i=1;i<g.length;i++)if(time<=g[i])return c[i-1]+(c[i]-c[i-1])*(time-g[i-1])/(g[i]-g[i-1]);
 return c[c.length-1]+(time-g[g.length-1]);
}
export function receiveCaptureWeights(time,arrival,end=arrival+.42){
 const out=Math.max(arrival+.12,end);
 const w=smooth(time,arrival-.48,arrival-.22)*(1-smooth(time,out-.1,out+.16));
 return{body:.85*w,legs:w};
}
export function createReceiveCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,legs:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig||!rig.clips.receive)return{apply:()=>state,state};
 // receive: {arrival, end, mirror, weight, legs}. legs scales the boot lift
 // down for a receiver still running at speed (no sliding feet).
 function apply(time=0,receive=null){
  state.clip='none';state.weight=0;state.legs=0;
  if(!receive||!Number.isFinite(receive.arrival))return state;
  const scale=clamp(receive.weight??1),w=receiveCaptureWeights(time,receive.arrival,receive.end);
  const body=w.body*scale,legs=w.legs*scale*clamp(receive.legs??1);
  if(body<=.001)return state;
  const clip=rig.clips.receive;
  rig.pose('receive',Math.min(clip.frames-1,receiveCaptureTime(time,receive.arrival,clip.keys)*clip.rate),{body,legs},receive.mirror?1:0);
  state.clip='receive';state.weight=body;state.legs=legs;
  return state;
 }
 return{apply,state};
}

// V21.363: captured strikes. 'penalty' is the angled run-up and side-foot
// strike from the spot; 'normal' open-play shots use the strike out of a jog.
// Same contract as the CMU kick layer: {finish, foot, contact}; the caller
// pins the boots back on the authored plant and ball contact.
export const MIXAMO_KICK_CLIPS=Object.freeze({penalty:'penalty',normal:'strike_jog'});
// lead: physical seconds per game second before the contact (slow set-piece
// run-ups play in stretched game time); 1 in open play.
export function mixamoKickWeight(time,finish='normal',contact=5.4,lead=1){
 const t=time<contact?(time-contact)*lead:time-contact;
 if(finish==='penalty'){
  const out=1-smooth(t,.55,.9);
  return{body:smooth(t,-.95,-.6)*out,legs:smooth(t,-.6,-.42)*out};
 }
 if(finish==='normal'){
  const out=1-smooth(t,.5,.85);
  return{body:smooth(t,-.62,-.36)*out,legs:smooth(t,-.44,-.3)*out};
 }
 return{body:0,legs:0};
}
export function createMixamoKickLayer(bones,playerRoot){
 const state={clip:'none',weight:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 const handles=info=>!!(rig&&info&&MIXAMO_KICK_CLIPS[info.finish]&&rig.clips[MIXAMO_KICK_CLIPS[info.finish]]);
 function apply(time=0,info={}){
  state.clip='none';state.weight=0;
  if(!handles(info))return{body:0,legs:0};
  const contact=Number.isFinite(info.contact)?info.contact:5.4,lead=Number.isFinite(info.lead)?info.lead:1,w=mixamoKickWeight(time,info.finish,contact,lead);
  if(w.body<=.001)return w;
  const name=MIXAMO_KICK_CLIPS[info.finish],clip=rig.clips[name];
  const t=time<contact?(time-contact)*lead:time-contact,frame=Math.max(0,Math.min(clip.frames-1,(t+clip.keys.contact)*clip.rate));
  rig.pose(name,frame,w,info.foot==='Left'?1:0);
  state.clip=name;state.weight=w.body;
  return w;
 }
 return{apply,handles,state};
}

// V21.364: everyday football movement. A footballer's forward jog (Mixamo
// "jog forward") and the bent-knee ready stance ("offensive idle") replace the
// generic library gait in their speed bands. Head and neck stay on the
// procedural look at the ball. The body (with the hips) is posed before the
// foot IK, so the planted boots never slide; the captured legs then own each
// leg only while it swings (applyLegs).
// V21.433 (Basti: "Arme und Beine nicht mehr so steif"): the whole speed
// range is captured now (Mixamo Locomotion Pack, FOOTERA_MIXAMO_GAIT): a real
// walk between standing and jogging, a loose running stride with full arm
// swing and a sprint with a driving arm pump instead of the CMU run, and
// every player stands his own way (football stance, breathing, relaxed) and
// looks around now and then. All of it is a pure function of time, speed and
// stride, so seeking a replay gives the same pose.
const GAIT_SKIP=new Set(['neck_01','Head']);
const LEG_SKIP=[new Set(['neck_01','Head','thigh_r','calf_r','foot_r']),new Set(['neck_01','Head','thigh_l','calf_l','foot_l'])];
export function gaitCaptureWeights(speed=0){
 const s=clamp(speed);
 const idle=1-smooth(s,.025,.07);
 const walk=smooth(s,.025,.07)*(1-smooth(s,.12,.2));
 // The football jog only for the slow trot; from a steady run on the loose
 // captured running stride (most match running sits at .25-.5).
 const jog=smooth(s,.12,.2)*(1-smooth(s,.26,.38));
 const run=smooth(s,.26,.38)*(1-smooth(s,.72,.86));
 const sprint=smooth(s,.72,.86);
 return{idle,walk,jog,run,sprint};
}
// The stance a player rests in: a third each, from his name (seed 0..1).
export function gaitIdleClip(seed=0){
 const k=Math.floor(clamp(seed,0,.9999)*3);
 return['ready_idle','idle_breath','idle_stand'][k];
}
// How much a standing player is in his "look around" (every ~11 s, 3.5 s).
export function lookAroundWeight(time=0,seed=0){
 const period=11,u=((time+seed*period)%period+period)%period;
 return smooth(u,.2,1)*(1-smooth(u,3,3.7));
}
export function createGaitCaptureLayer(bones,playerRoot,seed=0){
 const state={clip:'none',weight:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig||!rig.clips.jog_fwd||!rig.clips.ready_idle)return{apply:()=>state,applyLegs:()=>0,state};
 const gaitRig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO_GAIT);
 // Without the gait capture the CMU run keeps the fast end as before.
 const runRig=gaitRig?null:createCaptureRetarget(bones,playerRoot,FOOTERA_CMU_RUN);
 const cyclePhase=(clip,stride)=>((stride/(Math.PI*2)+clip.keys.leftForward)%1+1)%1;
 const idleName=gaitRig?gaitIdleClip(seed):'ready_idle',idleRig=idleName==='ready_idle'?rig:gaitRig;
 // [rig, clip, weight key]: the looping strides by speed band.
 const strides=gaitRig?[[gaitRig,'walk','walk'],[rig,'jog_fwd','jog'],[gaitRig,'run','run'],[gaitRig,'sprint','sprint']]:
  [[rig,'jog_fwd','jog'],[runRig,'run','run'],[runRig,'run','sprint']];
 // Ping-pong through a stored stance so the loop never jumps.
 const pingPong=(clip,at)=>{const span=(clip.frames-1)/clip.rate,u=(at%(2*span)+2*span)%(2*span);return(u<span?u:2*span-u)*clip.rate};
 // share: how much of the body the everyday gait may own right now (0 during
 // shots, celebrations, tricks, airborne moments; see the prototype).
 function apply(time=0,speed=0,stride=0,share=1){
  state.clip='none';state.weight=0;
  const k=clamp(share);if(k<=.001)return state;
  const w=gaitCaptureWeights(speed);let top=0;
  for(const [r,name,key] of strides){
   const weight=w[key]*k;if(!r||weight<=.001)continue;
   const clip=r.clips[name];
   r.pose(name,cyclePhase(clip,stride)*(clip.frames-1),{body:weight,legs:0},0,GAIT_SKIP);
   if(w[key]>top){top=w[key];state.clip=name;state.weight=weight}
  }
  if(w.idle*k>.001){
   // Players do not sway in step: the distance each has run (stride) offsets
   // the stance, deterministically.
   const clip=idleRig.clips[idleName];
   idleRig.pose(idleName,pingPong(clip,time+.6*stride),{body:.8*w.idle*k,legs:0},0,GAIT_SKIP);
   if(w.idle>top){top=w.idle;state.clip=idleName;state.weight=w.idle*k}
   const look=gaitRig?lookAroundWeight(time,seed)*w.idle*k:0;
   if(look>.001){
    // Upper body only: the stance's legs and hips stay planted.
    const la=gaitRig.clips.look_around,u=((time+seed*11)%11+11)%11;
    gaitRig.pose('look_around',clamp(u*la.rate,0,la.frames-1),{body:.7*look,legs:0},0,LOOK_SKIP);
   }
  }
  return state;
 }
 // swing: [left, right] 0..1, how much each leg is in the air right now.
 // V21.437: a proper weighted blend of the speed bands (running average);
 // before, each band slerped on top of the last, so a share of the old leg
 // pose stayed in every band change.
 function applyLegs(speed=0,stride=0,share=1,swing=[0,0]){
  const g=gaitCaptureWeights(speed),k=clamp(share);
  let total=0;const acc=[1-k*clamp(swing[0]),1-k*clamp(swing[1])];
  for(const [r,name,key] of strides){
   const w=g[key]*k;
   if(!r||w<=.001)continue;total+=w;
   const clip=r.clips[name],frame=cyclePhase(clip,stride)*(clip.frames-1);
   for(let i=0;i<2;i++){
    const legs=w*clamp(swing[i]);if(legs<=.001)continue;
    acc[i]+=legs;
    r.pose(name,frame,{body:0,legs:legs/acc[i]},0,LEG_SKIP[i]);
   }
  }
  return total;
 }
 return{apply,applyLegs,state,fullGait:!!gaitRig};
}
const LOOK_SKIP=new Set(['pelvis','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']);

// V21.369: captured two-handed throw-in. Game seconds of the set piece
// (physical, not the stretched highlight clock): the ball is back behind the
// head at THROW_IN.back and leaves both hands at THROW_IN.release (3d-extended-match
// RESTART_RELEASE.throw_in). Feet stay on the authored spot (no step-in).
export const THROW_IN=Object.freeze({back:2.85,release:3.2});
export function throwInCaptureTime(t,keys){
 if(t<=THROW_IN.back)return keys.back;
 if(t<=THROW_IN.release)return keys.back+(t-THROW_IN.back)*(keys.release-keys.back)/(THROW_IN.release-THROW_IN.back);
 return keys.release+(t-THROW_IN.release);
}
export function throwInCaptureWeight(t){return smooth(t,.6,1.3)*(1-smooth(t,4.1,4.8))}
export function createThrowInCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig||!rig.clips.throw_in)return{apply:()=>state,state};
 // seconds: physical seconds of the throw-in set piece.
 function apply(seconds=0,weight=1){
  state.clip='none';state.weight=0;
  const w=throwInCaptureWeight(seconds)*clamp(weight);
  if(w<=.001)return state;
  const clip=rig.clips.throw_in;
  rig.pose('throw_in',Math.min(clip.frames-1,throwInCaptureTime(seconds,clip.keys)*clip.rate),{body:w,legs:0},0);
  state.clip='throw_in';state.weight=w;return state;
 }
 return{apply,state};
}

// V21.369: a tackled attacker trips over the sliding leg, lands, lies a
// moment and gets back up (Mixamo 'soccer trip' + 'standing up'). Game
// seconds after the tackle contact; the root path comes from the scene.
export const FALL=Object.freeze({down:.6,standStart:1.55,standUp:3.0,end:3.6});
export function fallCaptureWeights(t){
 const body=smooth(t,-.12,.05)*(1-smooth(t,FALL.standUp-.05,FALL.end));
 const stand=smooth(t,FALL.standStart-.2,FALL.standStart+.1);
 // Lying on the turf: from the landing until the hips are up again.
 const ground=smooth(t,FALL.down-.3,FALL.down)*(1-smooth(t,FALL.standStart+.5,FALL.standUp-.3));
 return{body,stand,ground};
}
export function createFallCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,ground:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO);
 if(!rig||!rig.clips.trip||!rig.clips.stand_up)return{apply:()=>state,state};
 // fall: {contact, weight, mirror}
 function apply(time=0,fall=null){
  state.clip='none';state.weight=0;state.ground=0;
  if(!fall||!Number.isFinite(fall.contact))return state;
  const t=time-fall.contact,w=fallCaptureWeights(t),k=clamp(fall.weight??1),body=w.body*k;
  if(body<=.001)return state;
  const mirror=fall.mirror?1:0,trip=rig.clips.trip,up=rig.clips.stand_up;
  const tripTime=trip.keys.hit+t*(trip.keys.down-trip.keys.hit)/FALL.down;
  rig.pose('trip',clamp(tripTime*trip.rate,0,trip.frames-1),{body,legs:body},mirror);
  if(w.stand>.001){
   const s=up.keys.lying+Math.max(0,t-FALL.standStart)*(up.keys.up-up.keys.lying)/(FALL.standUp-FALL.standStart);
   rig.pose('stand_up',clamp(s*up.rate,0,up.frames-1),{body:body*w.stand,legs:body*w.stand},mirror);
  }
  state.clip=w.stand>.5?'stand_up':'trip';state.weight=body;state.ground=w.ground*k;
  return state;
 }
 return{apply,state};
}

// V21.434: captured goal celebrations (Mixamo Fist Pump, Cheering, Rallying,
// Hip Hop and Samba Dancing, Excited, Waving). The scene picks the clip and
// the seconds (3d-goal-celebration.mjs celebrationCapture); the root path,
// kneel/jump height and the facing stay authored. Long holds play the capture
// back and forth, so a pose never jumps.
const HIPS=new Set(['pelvis','spine_01']);
export function createCelebrateCaptureLayer(bones,playerRoot){
 const state={clip:'none',weight:0,source:'Mixamo'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_MIXAMO_CELEBRATE);
 if(!rig)return{apply:()=>state,state,handles:()=>false};
 const handles=name=>!!rig.clips[name];
 // capture: {clip, seconds, body, legs}
 function apply(capture=null){
  state.clip='none';state.weight=0;
  if(!capture||!handles(capture.clip))return state;
  const body=clamp(capture.body);if(body<=.001)return state;
  const clip=rig.clips[capture.clip],span=(clip.frames-1)/clip.rate,t=Math.max(0,capture.seconds||0);
  const u=t%(2*span),at=u<span?u:2*span-u;
  // Without the legs (a teammate walking back) the hips stay with the walk,
  // so the capture never leans the whole body over the striding legs.
  const legs=clamp(capture.legs)*body;
  rig.pose(capture.clip,clamp(at*clip.rate,0,clip.frames-1),{body:legs>.001?body:body*.75,legs},0,legs>.001?null:HIPS);
  state.clip=capture.clip;state.weight=body;return state;
 }
 return{apply,state,handles};
}
