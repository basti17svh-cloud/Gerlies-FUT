/**
 * Footera Player Evolution Step 7 - stationary-foot-derived preview root.
 *
 * Works only with the REAL Mixamo directional quaternions from Step 6.
 * A foot's local captured trajectory is sampled while it is the lowest
 * grounded candidate. Its world footprint is held through a phase; when
 * support changes, the new footprint is made at the current world location,
 * guaranteeing ROOT continuity without elongating the knee.
 *
 * Deliberately experimental:
 * - This is a flat-floor, root-relative path, NOT the game's movement system.
 * - The source has no reliable contact flags; support is inferred from
 *   captured shoe height with hysteresis and minimum hold.
 * - We limit implausible root speeds instead of hiding missing animation.
 * - It does not solve ankle roll, horizontal momentum or ball-gameplay cuts.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {FOOTERA_DIRECTION_MOVES} from './3d-player-evolution-transitions.mjs';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const HZ=90,END=3,MAX_ROOT_SPEED=7.5,MIN_HOLD=.12,SWITCH_HEIGHT=.018;
function foot(state,side){
 const data=state?.feet?.[side];
 if(!Array.isArray(data)||data.length!==3||!data.every(Number.isFinite))
  throw new Error('Missing captured Mixamo FK foot sample: '+side);
 return new THREE.Vector3(...data);
}
function lateral(v){return new THREE.Vector3(v.x,0,v.z)}
function chooseInitial(a,b){return a.y<=b.y?'l':'r'}
export function createFooteraDirectionalContact(transitions,{
 hz=HZ,maxRootSpeed=MAX_ROOT_SPEED,minHold=MIN_HOLD,switchHeight=SWITCH_HEIGHT
}={}){
 if(typeof transitions?.sampleSequence!=='function')
  throw new TypeError('Missing captured directional timeline');
 if(!Number.isInteger(hz)||hz<30||hz>240||
  !Number.isFinite(maxRootSpeed)||maxRootSpeed<=1||maxRootSpeed>14||
  !Number.isFinite(minHold)||minHold<.05||minHold>.4||
  !Number.isFinite(switchHeight)||switchHeight<.001||switchHeight>.10)
  throw new RangeError('Invalid directional contact track settings');
 const cache=new Map();
 function build(direction){
  if(!FOOTERA_DIRECTION_MOVES.includes(direction))
   throw new RangeError('Unsupported direction');
  const count=END*hz,rows=[],worldFootprint={l:null,r:null};
  let support=null,lastSwitch=0,root=new THREE.Vector3();
  const counters={switches:0,frames:count+1,speedLimited:0,
   maxRootSpeed:0,maxSupportDrift:0,maxStepMetres:0,
   maxFootHeightDelta:0};
  for(let i=0;i<=count;i++){
   const time=i/hz,sample=transitions.sampleSequence({time,direction}),
    left=foot(sample,'l'),right=foot(sample,'r');
   if(support===null){
    support=chooseInitial(left,right);
    worldFootprint[support]=lateral(support==='l'?left:right);
   }
   const current=support==='l'?left:right,otherSide=support==='l'?'r':'l',
    other=otherSide==='l'?left:right;
   if(i&&time-lastSwitch>=minHold&&other.y<current.y-switchHeight){
    support=otherSide;lastSwitch=time;counters.switches++;
    // Existing root plus captured shoe position is the new footprint,
    // not a jump or a fabricated foot trajectory.
    worldFootprint[support]=root.clone().add(lateral(other));
   }
   const local=support==='l'?left:right;
   const wanted=worldFootprint[support].clone().sub(lateral(local));
   const jump=wanted.distanceTo(root),stepLimit=maxRootSpeed/hz;
   let speedLimited=false;
   if(i&&jump>stepLimit){
    root.addScaledVector(wanted.sub(root),stepLimit/jump);
    counters.speedLimited++;speedLimited=true;
   }else root.copy(wanted);
   const deviation=worldFootprint[support].distanceTo(root.clone().add(lateral(local)));
   const effectiveSpeed=i?root.distanceTo(rows[i-1].offset)*hz:0;
   counters.maxRootSpeed=Math.max(counters.maxRootSpeed,effectiveSpeed);
   counters.maxStepMetres=Math.max(counters.maxStepMetres,i?
    root.distanceTo(rows[i-1].offset):0);
   counters.maxSupportDrift=Math.max(counters.maxSupportDrift,deviation);
   counters.maxFootHeightDelta=Math.max(counters.maxFootHeightDelta,
    Math.abs(left.y-right.y));
   rows.push({time,offset:root.clone(),support,
    footprint:worldFootprint[support].clone(),
    drift:deviation,speedLimited,
    feet:{l:left.toArray(),r:right.toArray()}});
  }
  return{direction,hz,rows,stats:counters,
   source:'Footera real Mixamo FK-shoe contact-derived root (no procedural leg animation)'};
 }
 function track(direction){
  if(!cache.has(direction))cache.set(direction,build(direction));
  return cache.get(direction);
 }
 function sample({time=0,direction='strafeLeft',enabled=true}={}){
  if(!Number.isFinite(time)||time<0||time>END)
   throw new RangeError('Contact preview accepts 0..3 seconds');
  if(!FOOTERA_DIRECTION_MOVES.includes(direction))
   throw new RangeError('Unknown directional clip');
  const data=track(direction),at=time*hz,
   i=Math.min(data.rows.length-1,Math.floor(at)),
   j=Math.min(data.rows.length-1,i+1),alpha=at-i;
  const a=data.rows[i],b=data.rows[j];
  // Interpolate root only. Do not synthesize a new humanoid animation.
  const translation=enabled?a.offset.clone().lerp(b.offset,alpha):new THREE.Vector3();
  const from=transitions.sampleSequence({time,direction});
  const localFoot=foot(from,a.support);
  const currentFoot=translation.clone().add(lateral(localFoot));
  const plantedError=currentFoot.distanceTo(a.footprint);
  return{time,direction,rootTravel:translation,
   supportSide:a.support,estimatedFootprint:a.footprint.clone(),
   footprintSlip:enabled?plantedError:null,
   activeFootHeight:localFoot.y,
   speedLimited:a.speedLimited,limits:data.stats,
   contactSource:from.source,contactInferred:true,
   actualCollisionIK:false,liveMatchRoot:false};
 }
 function getReport(direction){return {...track(direction).stats,source:track(direction).source,
  direction,rateHz:hz,groundContactSource:'captured shoe height heuristic',
  qualityCaveat:'Only a deterministic flat-floor root track; physical contact and live game not validated'};}
 return{sample,track,getReport,directions:FOOTERA_DIRECTION_MOVES,
  sampleRateHz:hz,maxRootSpeed};
}
