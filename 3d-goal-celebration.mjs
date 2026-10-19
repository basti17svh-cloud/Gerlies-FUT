/* Footera V21.185 goal celebrations.
 * After the ball is in the net the scorer peels away towards the broadcast
 * camera and performs one of several authored celebrations. Everything is a
 * pure function of the seconds since the celebration began, so seeking,
 * replays and screenshots are deterministic. Only the scorer's procedural
 * driver joints are written; the imported GLB follows them through the
 * existing retarget and foot IK.
 */
export const CELEBRATION_VERSION='21.185-celebrations';
export const CELEBRATIONS=Object.freeze(['airplane','jump_spin','knee_slide','badge','fist_pump']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,u)=>a+(b-a)*u;
const pulse=(s,a,b,c,d)=>smooth((s-a)/(b-a))*(1-smooth((s-c)/(d-c)));

export function pickCelebration(event={}){
 if(CELEBRATIONS.includes(event.celebration))return event.celebration;
 const key=`${event.id??''}|${event.playerName??''}|${event.minute??''}`;
 let hash=2166136261;
 for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}
 return CELEBRATIONS[hash%CELEBRATIONS.length];
}

// Metres travelled along the run-away line, s seconds after the start.
// Every route keeps a little drift so the scorer never snaps to a stand pose.
export function celebrationDistance(kind,s){
 s=Math.max(0,s);
 const ease=(t,d,len)=>{const u=clamp(t/d);return len*(1-(1-u)*(1-u))};
 if(kind==='airplane')return ease(s,3.6,9.5);
 if(kind==='jump_spin')return ease(s,1.55,6.2);
 // Sprint, then a decelerating slide on the knees.
 if(kind==='knee_slide')return s<1?4.6*s:4.6+ease(s-1,1.1,3.2);
 if(kind==='badge')return ease(s,1.8,6.4);
 return ease(s,1.5,5.6);
}

const target={rig:[0,0,0],upper:[0,0,0],arms:[[0,0,0],[0,0,0]],elbows:[0,0],
 legs:[[0,0,0],[0,0,0]],knees:[0,0],ankles:[0,0],drop:0};
function reset(){
 target.rig[0]=target.rig[1]=target.rig[2]=0;target.upper[0]=target.upper[1]=target.upper[2]=0;
 for(let i=0;i<2;i++){target.arms[i][0]=target.arms[i][1]=target.arms[i][2]=0;target.elbows[i]=.2;
  target.legs[i][0]=target.legs[i][1]=target.legs[i][2]=0;target.knees[i]=0;target.ankles[i]=0}
 target.drop=0;
}
// Arm angles are player space: x>0 raises forwards, z<0 (left) / z>0 (right)
// raises sideways. Elbow x>0 flexes the forearm.
function arms(left,right,elbowL,elbowR){
 target.arms[0][0]=left[0];target.arms[0][1]=left[1]||0;target.arms[0][2]=-left[2];
 target.arms[1][0]=right[0];target.arms[1][1]=right[1]||0;target.arms[1][2]=right[2];
 target.elbows[0]=elbowL;target.elbows[1]=elbowR;
}

/* Writes the celebration on the scorer's driver joints after the normal gait
 * pose. Returns how much the arms/body are authored (mocap arms fade out by
 * this amount) and how far the imported model's root drops (kneel) or lifts
 * (jump), in metres. */
export function applyCelebrationPose(p,kind,s,out={}){
 reset();
 let legs=0,lift=0;
 if(kind==='airplane'){
  // Wings out, banking left and right like a plane.
  const bank=Math.sin(s*2.6)*.24;
  arms([-.15,0,1.45],[-.15,0,1.45],.12,.12);
  target.rig[2]=bank;target.upper[2]=bank*.6;target.upper[0]=-.08;
 }else if(kind==='jump_spin'){
  const jump=pulse(s,1.45,1.62,1.95,2.12),air=clamp((s-1.5)/.5);
  lift=.52*Math.sin(Math.PI*clamp((s-1.5)/.5))*(s>1.5&&s<2?1:0);
  // Half turn in the air, then the trademark wide landing with arms down-out.
  target.rig[1]=Math.PI*smooth(air);
  const land=smooth((s-2)/.25);
  arms([mix(.4,-.35,land),0,mix(1.1,.75,land)],[mix(.4,-.35,land),0,mix(1.1,.75,land)],mix(.9,.1,land),mix(.9,.1,land));
  target.upper[0]=mix(.05,-.22,land);
  legs=Math.max(jump,land);
  target.legs[0][0]=mix(.35,0,land);target.legs[1][0]=mix(.35,0,land);
  target.knees[0]=target.knees[1]=mix(-.7,-.18,land);
  target.legs[0][2]=-.16*land;target.legs[1][2]=.16*land;
 }else if(kind==='knee_slide'){
  const kneel=smooth((s-.9)/.3);
  legs=kneel;target.drop=.47*kneel;
  target.legs[0][0]=target.legs[1][0]=.12;
  target.knees[0]=target.knees[1]=-1.55;target.ankles[0]=target.ankles[1]=.9;
  target.legs[0][2]=-.12;target.legs[1][2]=.12;
  target.upper[0]=-.32*kneel-.06*Math.sin(s*3)*kneel;
  // Fists to the sky, screaming at the stand.
  arms([.25,0,2.35],[.25,0,2.35],.65,.65);
 }else if(kind==='badge'){
  // Stop, tap the club badge twice, then point both arms to the sky.
  const stop=smooth((s-1.4)/.35),sky=smooth((s-2.35)/.35),tap=Math.sin(Math.max(0,s-1.6)*14)*.18*(1-sky);
  arms([mix(.2,2.85,sky),0,mix(.45,.35,sky)],[mix(mix(.2,.55,stop),2.9,sky),0,mix(mix(.4,.12,stop),.3,sky)],
   mix(.3,.15,sky),mix(mix(.3,2.3+tap,stop),.12,sky));
  target.upper[0]=mix(.1*stop,-.22,sky);target.upper[1]=-.18*stop*(1-sky);
 }else{
  // Fist pump: plant, crouch and pull the right fist down twice.
  const stop=smooth((s-1.2)/.3),pump=Math.max(pulse(s,1.45,1.6,1.75,1.95),pulse(s,2.15,2.3,2.45,2.7));
  legs=stop;target.drop=.07*stop;
  target.legs[0][0]=target.legs[1][0]=.28*stop;target.knees[0]=target.knees[1]=-.5*stop;target.ankles[0]=target.ankles[1]=.22*stop;
  target.legs[0][2]=-.14*stop;target.legs[1][2]=.14*stop;
  target.upper[0]=.22*stop+.08*pump;
  arms([.3,0,.55],[mix(.35,1.45,1-pump*.85),0,.35],.9,mix(1.2,2.1,pump));
 }
 const w=smooth(s/.35);
 for(let i=0;i<2;i++){
  const arm=p.arms[i].rotation;
  arm.x=mix(arm.x,target.arms[i][0],w);arm.y=mix(arm.y,target.arms[i][1],w);arm.z=mix(arm.z,target.arms[i][2],w);
  p.elbows[i].rotation.x=mix(p.elbows[i].rotation.x,target.elbows[i],w);
  if(legs>0){
   const leg=p.legs[i].rotation;
   leg.x=mix(leg.x,target.legs[i][0],legs);leg.z=mix(leg.z,target.legs[i][2],legs);
   p.knees[i].rotation.x=mix(p.knees[i].rotation.x,target.knees[i],legs);
   p.ankles[i].rotation.x=mix(p.ankles[i].rotation.x,target.ankles[i],legs);
  }
 }
 p.rig.rotation.y+=target.rig[1]*w;p.rig.rotation.z=mix(p.rig.rotation.z,target.rig[2],w);
 p.upper.rotation.x=mix(p.upper.rotation.x,target.upper[0],w);
 p.upper.rotation.y=mix(p.upper.rotation.y,target.upper[1],w);
 p.upper.rotation.z=mix(p.upper.rotation.z,target.upper[2],w);
 // Lower the hips onto the knees (or lift for the jump); feet follow via IK.
 p.rig.position.y=lift-target.drop;
 out.arms=w;out.rootY=lift-target.drop;out.kind=kind;
 return out;
}
