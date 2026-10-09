/* Footera contact demonstration: physically staged tackles and blocked shots.
 * Motion Lab only. Live match events keep authoritative defender paths, scoring
 * and ball trajectories. Deterministic, no mutable state or draw calls.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const lerp=(a,b,w)=>a+(b-a)*clamp(w);
export const SLIDE_CONTACT=3.55,BLOCK_CONTACT=5.74;
export const isContactDemo=action=>action==='slide_attempt'||action==='block_attempt';
export function stagedDefenderPosition(action,time,sequence,ballAt,original){
 if(!isContactDemo(action))return original;
 const side=sequence.endsWith('_left')?-1:1;
 const slide=action==='slide_attempt',contact=slide?SLIDE_CONTACT:BLOCK_CONTACT;
 const b=ballAt(contact),contactPoint=[b[0]+side*(slide?.40:.32),b[2]+(slide?.36:.28)];
 const start=[contactPoint[0]+side*(slide?3.25:2.3),contactPoint[1]+(slide?2.35:2.65)];
 const arrival=smooth((time-(slide?2.45:4.35))/(slide?1.05:1.20));
 return[lerp(start[0],contactPoint[0],arrival),lerp(start[1],contactPoint[1],arrival)];
}
export function stagedBallPosition(action,time,sequence,ballAt){
 const original=ballAt(time);
 if(!isContactDemo(action))return original;
 const slide=action==='slide_attempt',contact=slide?SLIDE_CONTACT:BLOCK_CONTACT;
 if(time<contact)return original;
 const side=sequence.endsWith('_left')?-1:1,point=ballAt(contact);
 const u=smooth((time-contact)/(slide?1.05:1.3));
 const lateral=slide?4.4:6.6,behind=slide?-.9:2.8;
 return[point[0]-side*lateral*u,
  .14+(slide?.22:.56)*Math.sin(Math.PI*u),
  point[2]+behind*u];
}
export function contactStage(action,time){
 const slide=action==='slide_attempt';
 if(slide)return{kind:'slide',
  plant:pulse(time,2.80,3.03,3.20,3.38),
  flight:pulse(time,3.12,3.39,3.89,4.23),
  hold:pulse(time,3.26,3.49,3.93,4.30),
  recover:pulse(time,4.09,4.38,4.65,4.90)};
 if(action==='block_attempt')return{kind:'block',
  brace:pulse(time,4.87,5.15,5.49,5.68),
  extend:pulse(time,5.39,5.61,5.85,6.12),
  rebound:pulse(time,5.83,6.11,6.32,6.56)};
 return{kind:'none'};
}
export function applyContactStage(p,action,time,preview=false,near=1){
 const m=contactStage(action,time),w=preview?1:clamp(near);
 if(m.kind==='slide'){
  // One planted foot, a decisive take-off, extended leading leg, sliding torso,
  // then hand-braced recovery. Root only follows its already-defined path.
  const a=m.plant*w,f=m.flight*w,h=m.hold*w,r=m.recover*w;
  p.rig.position.y-=.10*a+.27*h;
  p.rig.rotation.x-=1.06*h;
  p.rig.rotation.z+=.08*f;
  p.upper.rotation.x-=.16*a+.18*h;
  p.upper.rotation.z+=.06*h;
  p.legs[0].rotation.x+=.33*a-.68*h;
  p.knees[0].rotation.x-=.56*a+.68*h;
  p.legs[1].rotation.x+=1.28*f+.36*h;
  p.knees[1].rotation.x+=.32*f;
  p.ankles[1].rotation.x-=.24*f;
  p.arms[0].rotation.z-=.48*f+.28*h;
  p.arms[1].rotation.z+=.48*f+.28*h;
  p.arms[0].rotation.x-=.38*h;
  p.arms[1].rotation.x-=.27*h;
  p.upper.rotation.x+=.27*r;
  p.knees[0].rotation.x-=.40*r;
  p.arms[0].rotation.x+=.28*r;
  return{...m,torsoTilt:-1.06*h,extension:1.28*f+.36*h};
 }
 if(m.kind==='block'){
  const a=m.brace*w,e=m.extend*w,r=m.rebound*w;
  p.rig.position.y-=.06*a;
  p.upper.rotation.x+=.23*a+.26*e;
  p.upper.rotation.y+=.09*a;
  p.upper.rotation.z-=.13*e;
  p.knees[0].rotation.x-=.28*a;
  p.knees[1].rotation.x-=.19*a;
  p.legs[1].rotation.x+=1.32*e;  // conspicuous high outstretched shin
  p.knees[1].rotation.x-=.21*e;
  p.ankles[1].rotation.x-=.22*e;
  p.legs[0].rotation.x-=.26*e;
  p.arms[0].rotation.z-=.34*a+.28*e;
  p.arms[1].rotation.z+=.34*a+.28*e;
  p.upper.rotation.x-=.24*r;
  p.knees[0].rotation.x-=.18*r;
  return{...m,torsoTilt:.26*e,extension:1.32*e};
 }
 return{...m,torsoTilt:0,extension:0};
}
