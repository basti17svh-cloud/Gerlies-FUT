import {extendedTiming} from './3d-extended-match.mjs?v=21160';
// Presentation time advances only through visible frames, never through loading.
// Preserve the authored paths and the speed of the shot/aftermath; give the
// supply pass, reception and approach at least seven seconds on screen.
// maxFrameMs caps one frame's advance so a hitch never skips the action;
// browser tests on a software renderer lift it to keep wall-clock pace.
export function createHighlightPlayback(event,duration=10.4,{maxFrameMs=100}={}){
 const extended=extendedTiming(event.sequence);
 const requested=Number(event.playSeconds);
 const seconds=Number.isFinite(requested)?Math.max(8,Math.min(20,requested)):duration;
 const actionTime=event.type==='ball_won'?4.4:5.4;
 const scale=duration/seconds;
 const buildupSeconds=extended?extended.shot:Math.max(7,actionTime/scale);
 // Goals get a TV slow motion as the ball hits the net: 0.6 s of scene time
 // around the impact plays at 40% speed. The shot itself stays at full pace.
 const slow=event.type==='goal'&&!extended?{from:6.65-.22,to:6.65+.38,rate:.4}:null;
 const slowExtra=slow?(slow.to-slow.from)/scale*(1/slow.rate-1):0;
 const totalSeconds=extended?extended.duration:buildupSeconds+(duration-actionTime)/scale+slowExtra;
 const after=u=>{
  // Real seconds since the shot to scene time, through the slow-motion window.
  if(!slow)return actionTime+u*scale;
  const a=(slow.from-actionTime)/scale,b=a+(slow.to-slow.from)/(scale*slow.rate);
  return u<a?actionTime+u*scale:u<b?slow.from+(u-a)*scale*slow.rate:slow.to+(u-b)*scale;
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
   const time=extended?(elapsed<extended.shot?elapsed/extended.shot*5.4:elapsed<extended.shot+1.25?5.4+elapsed-extended.shot:6.65+(elapsed-extended.shot-1.25)/(extended.duration-extended.shot-1.25)*3.75):elapsed<buildupSeconds?elapsed/buildupSeconds*actionTime:after(elapsed-buildupSeconds);
   return{time:Math.min(duration,time),done:elapsed>=totalSeconds};
  }
 };
}
