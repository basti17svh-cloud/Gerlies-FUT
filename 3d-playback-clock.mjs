// Presentation time advances only through visible frames, never through loading.
// Preserve the authored paths and the speed of the shot/aftermath; give the
// supply pass, reception and approach at least seven seconds on screen.
export function createHighlightPlayback(event,duration=10.4){
 const requested=Number(event.playSeconds);
 const seconds=Number.isFinite(requested)?Math.max(8,Math.min(20,requested)):duration;
 const actionTime=event.type==='ball_won'?4.4:5.4;
 const scale=duration/seconds;
 const buildupSeconds=Math.max(7,actionTime/scale);
 const totalSeconds=buildupSeconds+(duration-actionTime)/scale;
 let elapsed=0,last;
 return{
  totalSeconds,buildupSeconds,
  // Called after the first frame has actually rendered. Shader compilation and
  // scene construction must not consume the opening pass.
  presented(now){last=now},
  tick(now){
   if(last!==undefined)elapsed+=Math.max(0,Math.min(100,now-last))/1000;
   last=now;
   const time=elapsed<buildupSeconds?elapsed/buildupSeconds*actionTime:actionTime+(elapsed-buildupSeconds)*scale;
   return{time:Math.min(duration,time),done:elapsed>=totalSeconds};
  }
 };
}
