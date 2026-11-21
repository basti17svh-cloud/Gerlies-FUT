import {extendedTiming} from './3d-extended-match.mjs?v=21479';
import {isDreamGoal,dreamShotRate} from './3d-dream-goals.mjs?v=21455';
// Presentation time advances only through visible frames, never through loading.
// Preserve the authored paths and the speed of the shot/aftermath; give the
// supply pass, reception and approach at least seven seconds on screen.
// maxFrameMs caps one frame's advance so a hitch never skips the action;
// browser tests on a software renderer lift it to keep wall-clock pace.
export const SHOT_RATE=1.5;
// tail (V21.439): extra scene seconds after the normal end, e.g. the scorer's
// sprint to the corner flag before his celebration; played at the same pace.
// V21.496 (Basti: "nicht so halbherzig"): a shot flies at a real pace on
// screen. Before, the flight took 1.25 scene seconds at 1.5x whatever the
// distance and the scene's length, so a long build-up (scale ~.6) let a 15 m
// shot crawl at ~11 m/s. Now the rate is set from the shot distance and the
// scene's scale so the ball really travels at the finish's pace. It depends
// only on the scene and the finish, never on the outcome.
export const SHOT_PACE=Object.freeze({power:30,normal:26,low_driven:27,finesse:23,volley:26,header:15,bicycle:18,chip:13,backheel:15});
export function shotPaceRate(finish,distance,scale){
 const v=SHOT_PACE[finish]||SHOT_PACE.normal,d=Number(distance);
 if(!Number.isFinite(d)||d<=0||!(scale>0))return SHOT_RATE;
 return Math.max(SHOT_RATE,Math.min(5,1.25*v/(d*scale)));
}
export function createHighlightPlayback(event,duration=10.4,{maxFrameMs=100,tail=0,shotDistance=null}={}){
 // V21.226 walk-out / final whistle: plain real time, no shot segments.
 if(event.type==='ceremony'){
  // V21.444: the cup presentation runs longer (tail).
  duration+=Math.max(0,Number(tail)||0);
  let elapsed=0,last;
  return{totalSeconds:duration,buildupSeconds:duration,presented(now){last=now},
   tick(now){if(last!==undefined)elapsed+=Math.max(0,Math.min(maxFrameMs,now-last))/1000;last=now;return{time:Math.min(duration,elapsed),done:elapsed>=duration}}};
 }
 const extended=extendedTiming(event.sequence);
 const requested=Number(event.playSeconds);
 const seconds=Number.isFinite(requested)?Math.max(8,Math.min(20,requested)):duration;
 const actionTime=event.type==='ball_won'?4.4:5.4;
 const scale=duration/seconds;
 // V21.196: every shot flies 1.5x faster than scene time, the same for goals,
 // saves and misses, so its pace never gives the outcome away. Goals get their
 // TV slow motion only once the ball is past the keeper and in the net.
 // A PlayStyle+ finisher gets a TV slow motion into the strike, for every
 // outcome alike; the flight itself stays at the common shot pace.
 const signature=event.type!=='ball_won'&&!extended&&(event.signatures?.length?event.signatures.some(m=>m.phase==='finish'&&m.who==='scorer'):event.signature?.who==='scorer'&&!['technical','trickster','rapid','quick-step','first-touch','press-proven'].includes(event.signature?.id));
 // V21.445 Traumtore: a heel flick from four metres or a diving header flies
 // faster than a shot from thirty (same for every outcome of that scene).
 const shotRate=isDreamGoal(event.sequence)?dreamShotRate(event.sequence):shotDistance===null?SHOT_RATE:shotPaceRate(event.finish,shotDistance,scale);
 const segments=event.type==='ball_won'?[]:[...(signature?[{from:4.85,to:5.4,rate:.4}]:[]),{from:5.4,to:6.65,rate:shotRate}];
 // The build-up runs at its own pace until the first timed segment begins.
 const buildEnd=segments.length?Math.min(actionTime,segments[0].from):actionTime;
 const buildupSeconds=extended?extended.shot:Math.max(7,actionTime/scale)*buildEnd/actionTime;
 if(event.type==='goal'&&!extended)segments.push({from:6.72,to:7.32,rate:.4});
 const extra=segments.reduce((sum,x)=>sum+(x.to-x.from)/scale*(1/x.rate-1),0);
 const shotReal=1.25/SHOT_RATE;
 const extraTail=extended?0:Math.max(0,Number(tail)||0);
 const totalSeconds=(extended?extended.duration-1.25+shotReal:buildupSeconds+(duration-buildEnd)/scale+extra)+extraTail/scale;
 const after=u=>{
  // Real seconds since the action to scene time, through the timed segments.
  let t=buildEnd;
  for(const x of segments){
   const before=(x.from-t)/scale;if(u<=before)return t+u*scale;u-=before;t=x.from;
   const inside=(x.to-x.from)/(scale*x.rate);if(u<=inside)return t+u*scale*x.rate;u-=inside;t=x.to;
  }
  return t+u*scale;
 };
 let elapsed=0,last;
 return{
  totalSeconds,buildupSeconds,
  // Called after the first frame has actually rendered. Shader compilation and
  // scene construction must not consume the opening pass.
  presented(now){last=now},
  tick(now){
   if(last!==undefined)elapsed+=Math.max(0,Math.min(maxFrameMs,now-last))/1000;
   last=now;
   const time=extended?(elapsed<extended.shot?elapsed/extended.shot*5.4:elapsed<extended.shot+shotReal?5.4+(elapsed-extended.shot)*SHOT_RATE:6.65+(elapsed-extended.shot-shotReal)/(extended.duration-extended.shot-1.25)*3.75):elapsed<buildupSeconds?elapsed/buildupSeconds*buildEnd:after(elapsed-buildupSeconds);
   return{time:Math.min(duration+extraTail,time),done:elapsed>=totalSeconds};
  }
 };
}
