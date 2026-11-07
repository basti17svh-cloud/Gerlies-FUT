/* Footera V21.353: real captured goalkeeping (Adobe Mixamo "Soccer Game
 * Pack", baked by tools/build-footera-mixamo.mjs) on the imported keeper.
 * Before the shot the keeper sways in a captured ready stance; for the save he
 * follows a real diving save: load, push-off, flight, landing on the side and
 * getting up. The game keeps the root path, the ball and the glove contact:
 * the capture is time-warped onto the authored dive keys and the gloves are
 * pulled onto the ball by the caller's hand IK around the contact.
 * Deterministic: a pure function of time and the dive.
 */
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs?v=21353';
import {FOOTERA_MIXAMO} from './3d-mocap-mixamo-data.mjs?v=21359';
import {sampleGoalkeeperMotion} from './3d-goalkeeper-biomechanics.mjs?v=21114';
export const MIXAMO_KEEPER_LAYER_VERSION='21.359-mixamo-keeper-striker';
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
