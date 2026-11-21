/**
 * Footera Player Evolution Step 11 – preview-only swing-foot clearance.
 * Captured Mixamo joint animation stays authoritative. This module identifies
 * when a non-support foot is actually travelling in world X/Z; it never
 * fabricates gait timing from a sine wave or acts on the planted support foot.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x)};
export function footeraGaitSwing(phase,side){
 if(!Number.isFinite(phase)||!['l','r'].includes(side))
  throw new RangeError('Invalid captured gait phase');
 const p=((phase+(side==='r'?.5:0))%1+1)%1;
 // Original left/right half-cycle timing; fades BEFORE the next touchdown.
 return ease(.50,.63,p)*(1-ease(.89,.995,p));
}
export function footeraSwingClearance({lowest,groundY=0,swing=0,peak=.036,maxLift=.105}={}){
 if(![lowest,groundY,swing,peak,maxLift].every(Number.isFinite)||
  swing<0||swing>1||peak<0||peak>.1||maxLift<=0||maxLift>.16)
  throw new RangeError('Invalid swing clearance request');
 const desired=groundY+.003+peak*swing;
 const deficit=Math.max(0,desired-lowest);
 return Math.min(maxLift,deficit)*swing;
}
export function createFooteraShoePhaseTracker({start=.22,full=.80,smoothing=.085,resetGap=.34}={}){
 if(![start,full,smoothing,resetGap].every(Number.isFinite)||
  start<0||full<=start||smoothing<=0||resetGap<=0)
  throw new RangeError('Invalid shoe phase tracker bounds');
 let previous=null;
 function reset(){previous=null}
 function sample({time,key,feet,supportSide}={}){
  if(!Number.isFinite(time)||time<0||!key||!['l','r'].includes(supportSide)||
   !['l','r'].every(s=>Array.isArray(feet?.[s])&&feet[s].length===3&&feet[s].every(Number.isFinite)))
   throw new RangeError('Invalid measured shoe motion');
  const dt=previous&&key===previous.key?time-previous.time:0;
  const consecutive=!!previous&&dt>1e-6&&dt<=resetGap&&previous.key===key;
  const result={l:{swing:0,speedXZ:0},r:{swing:0,speedXZ:0}};
  for(const side of ['l','r']){
   if(side===supportSide)continue; // Never modify the tracked planted shoe.
   const now=feet[side],old=previous?.feet?.[side];
   const speed=consecutive?Math.hypot(now[0]-old[0],now[2]-old[2])/dt:0;
   const requested=ease(start,full,speed);
   result[side].swing=consecutive?
    (previous.supportSide===side?0:previous.swing[side]+
     (requested-previous.swing[side])*clamp(dt/smoothing)) : 0;
   result[side].speedXZ=speed;
  }
  previous={time,key,feet:{l:[...feet.l],r:[...feet.r]},supportSide,
   swing:{l:result.l.swing,r:result.r.swing}};
  return result;
 }
 return{sample,reset,limits:{start,full,smoothing,resetGap}};
}
