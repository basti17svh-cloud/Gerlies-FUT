/* Footera: real captured football kicks (CMU mocap, free for commercial use)
 * on the imported footballer. The striker's whole body follows a real kick
 * around the 5.4 s contact: run-up lean, plant, hip turn, arm counterbalance,
 * strike and follow-through. The authored root, ball and contact stay the
 * game's: the caller pins the boots back on the authored ankle targets.
 * Deterministic: a pure function of time, finish and shooting foot.
 */
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs?v=21353';
import {FOOTERA_CMU_KICKS} from './3d-mocap-cmu-data.mjs?v=21348';
export const CMU_KICK_LAYER_VERSION='21.353-cmu-kick';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const CONTACT=5.4;
export function cmuKickClip(finish='normal'){
 return finish==='power'?'power':finish==='low_driven'?'low_driven':finish==='finesse'||finish==='pass'?'finesse':'normal';
}
// Whole-body share of the capture around the contact; legs join later,
// once the authored run-up is over, so the approach strides never skate.
// A pass is the short version of the same kick around its own contact.
export function cmuKickWeight(time,finish='normal',contact=CONTACT){
 if(['header','volley','bicycle'].includes(finish))return{body:0,legs:0};
 const t=clamp(time,0,10.4)-contact;
 if(finish==='pass'){
  const out=1-smooth((t-.22)/.26);
  return{body:.85*smooth((t+.46)/.24)*out,legs:.85*smooth((t+.3)/.14)*out};
 }
 const out=1-smooth((t-.62)/.36);
 return{body:smooth((t+.88)/.34)*out,legs:smooth((t+.54)/.16)*out};
}

export function createCmuKickLayer(bones,playerRoot){
 const state={clip:'none',weight:0,source:'CMU mocap'};
 const rig=createCaptureRetarget(bones,playerRoot,FOOTERA_CMU_KICKS);
 if(!rig)return{apply:()=>state,state};
 // info: {finish ('pass' for a pass), foot:'Left'|'Right', contact s}. Returns the weights.
 function apply(time=0,info={}){
  const contact=Number.isFinite(info.contact)?info.contact:CONTACT;
  const w=cmuKickWeight(time,info.finish,contact);
  state.weight=w.body;
  if(w.body<=.001){state.clip='none';return w}
  const name=cmuKickClip(info.finish),clip=rig.clips[name];
  state.clip=name;
  rig.pose(name,(time-contact)*clip.rate+clip.contact*clip.rate,w,info.foot==='Left'?1:0);
  return w;
 }
 return{apply,state};
}
