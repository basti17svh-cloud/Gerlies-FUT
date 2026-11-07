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
import {FOOTERA_MIXAMO} from './3d-mocap-mixamo-data.mjs?v=21362';
import {sampleGoalkeeperMotion} from './3d-goalkeeper-biomechanics.mjs?v=21114';
export const MIXAMO_KEEPER_LAYER_VERSION='21.362-mixamo-keeper-striker-tackle-run-receive';
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
export function keeperCaptureWeights(time,action='classic'){
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
 // Hand IK onto the authored gloves: full around the ball contact only.
 const hands=1-.75*smooth(time,5.55,5.9)*(1-smooth(time,6.2,6.4))-.75*smooth(time,7.05,7.5);
 return{dive,ready,legs,hands:clamp(hands)};
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
  const action=String(dive.action||'classic'),w=keeperCaptureWeights(time,action);
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
