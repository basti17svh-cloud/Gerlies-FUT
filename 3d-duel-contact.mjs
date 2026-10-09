/* Footera contact demonstration: physically staged tackles and blocked shots.
 * Motion Lab only. Live match events keep authoritative defender paths, scoring
 * and ball trajectories. Deterministic, no mutable state or draw calls.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const lerp=(a,b,w)=>a+(b-a)*clamp(w);
export const CONTACT_MOTION_VERSION='21.56-controlled-slide';
export const SLIDE_CONTACT=3.55,BLOCK_CONTACT=5.74;
export const isContactDemo=action=>action==='slide_attempt'||action==='block_attempt';
export function stagedDefenderPosition(action,time,sequence,ballAt,original){
 if(!isContactDemo(action))return original;
 const side=sequence.endsWith('_left')?-1:1;
 const slide=action==='slide_attempt',contact=slide?SLIDE_CONTACT:BLOCK_CONTACT;
 const b=ballAt(contact),contactPoint=[b[0]+side*(slide?.40:.32),b[2]+(slide?.36:.28)];
 const start=[contactPoint[0]+side*(slide?3.25:2.3),contactPoint[1]+(slide?2.35:2.65)];
 // Begin the slide run-up earlier and accelerate smoothly; the old compressed
 // 1.05-second lunge made the defender jerk forward just before falling.
 const arrival=smooth((time-(slide?2.05:4.35))/(slide?1.50:1.20));
 // A genuine slide does not stop moving as soon as the leading boot arrives.
 // Carry the defender across the tackle lane while the torso is on the grass.
 const glide=slide?smooth((time-SLIDE_CONTACT)/.72):0;
 return[lerp(start[0],contactPoint[0],arrival)-side*1.45*glide,
        lerp(start[1],contactPoint[1],arrival)-1.45*glide];
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
  approach:pulse(time,2.05,2.28,2.73,2.98),
  plant:pulse(time,2.78,3.02,3.19,3.40),
  flight:pulse(time,3.13,3.40,3.91,4.26),
  hold:pulse(time,3.26,3.49,3.94,4.33),
  recover:pulse(time,4.10,4.39,4.65,4.93)};
 if(action==='block_attempt')return{kind:'block',
  // Load the support leg, extend during contact, then settle naturally.
  brace:pulse(time,4.90,5.18,5.42,5.65),
  extend:pulse(time,5.40,5.61,5.85,6.14),
  rebound:pulse(time,5.98,6.19,6.43,6.72)};
 return{kind:'none'};
}
export function applyContactStage(p,action,time,preview=false,near=1){
 const m=contactStage(action,time),w=preview?1:clamp(near);
 if(m.kind==='slide'){
  // One planted foot, a decisive take-off, extended leading leg, sliding torso,
  // then hand-braced recovery. Root only follows its already-defined path.
  const a=m.plant*w,f=m.flight*w,h=m.hold*w,r=m.recover*w;
  if(preview){
   // One coherent movement for the demonstration's active tackler. Start
   // from the ordinary locomotion rig; do not pile feint, jockey and mocap
   // signals over the same knees and torso. The approach remains upright,
   // then the planted leg lowers the hips and the full slide follows.
   const blend=clamp(Math.max(a,f,h,r));
   const target=(joint,axis,value)=>{const base=Number(joint.rotation[axis])||0;
    joint.rotation[axis]=lerp(base,value,blend)};
   target(p.rig,'x',-1.32*h);
   target(p.rig,'z',.035*f);
   p.rig.position.y=lerp(p.rig.position.y,-.075*a-.17*h-.055*r,blend);
   target(p.upper,'x',-.095*a-.06*h+.10*r);
   target(p.upper,'y',0);
   target(p.upper,'z',.025*h);
   target(p.legs[0],'x',.25*a-.65*h-.14*r);
   target(p.knees[0],'x',-.55*a-.68*h-.42*r);
   target(p.ankles[0],'x',.10*a);
   target(p.legs[1],'x',1.79*f+.13*h-.11*r);
   target(p.knees[1],'x',-.12*a+.08*f-.24*r);
   target(p.ankles[1],'x',-.18*f);
   target(p.arms[0],'x',-.19*h+.16*r);
   target(p.arms[1],'x',-.16*h-.08*r);
   target(p.arms[0],'z',-.18*a-.32*f-.15*h-.08*r);
   target(p.arms[1],'z',.18*a+.32*f+.15*h+.08*r);
   return{...m,torsoTilt:-1.32*h,extension:1.79*f+.13*h};
  }
  p.rig.position.y-=.09*a+.17*h;
  p.rig.rotation.x-=1.32*h;
  p.rig.rotation.z+=.08*f;
  p.upper.rotation.x-=.11*a+.05*h;
  p.upper.rotation.z+=.06*h;
  p.legs[0].rotation.x+=.33*a-.68*h;
  p.knees[0].rotation.x-=.56*a+.68*h;
  p.legs[1].rotation.x+=1.94*f+.16*h;
  p.knees[1].rotation.x+=.11*f;
  p.ankles[1].rotation.x-=.24*f;
  p.arms[0].rotation.z-=.48*f+.28*h;
  p.arms[1].rotation.z+=.48*f+.28*h;
  p.arms[0].rotation.x-=.38*h;
  p.arms[1].rotation.x-=.27*h;
  p.upper.rotation.x+=.27*r;
  p.knees[0].rotation.x-=.40*r;
  p.arms[0].rotation.x+=.28*r;
  return{...m,torsoTilt:-1.32*h,extension:1.94*f+.16*h};
 }
 if(m.kind==='block'){
  const a=m.brace*w,e=m.extend*w,r=m.rebound*w;
  if(preview){
   // The Motion Lab used to stack the live defender's sprint, feint, brace,
   // duel and strike-block poses. An additive leg raise could not produce
   // a dependable upright player. Compose ONE pose for the sandbox shot block.
   // Each value is an absolute joint target, weighted only by this phase.
   const amount=clamp(Math.max(a,e,r));
   const pose=(joint,axis,target)=>{const previous=Number(joint.rotation[axis])||0;
    joint.rotation[axis]=lerp(previous,target,amount)};
   pose(p.rig,'x',0);pose(p.rig,'z',0);
   pose(p.upper,'x',.03*a+.025*e-.02*r);
   pose(p.upper,'y',.08*a);pose(p.upper,'z',.018*e);
   pose(p.legs[0],'x',-.10*a-.08*e);
   pose(p.knees[0],'x',-.36*a-.16*e);
   pose(p.ankles[0],'x',.12*a);
   // Low, lateral shin block instead of the former high stumbling kick.
   pose(p.legs[1],'x',.43*e);
   pose(p.legs[1],'z',.63*e);
   pose(p.knees[1],'x',-.18*a-.34*e);
   pose(p.ankles[1],'x',-.13*e);
   pose(p.arms[0],'x',-.10*e);pose(p.arms[1],'x',.07*e);
   pose(p.arms[0],'z',-.17*a-.075*e);
   pose(p.arms[1],'z',.17*a+.075*e);
   p.rig.position.y=lerp(p.rig.position.y,-.05*a-.014*e,amount);
   return{...m,torsoTilt:.025*e,extension:Math.hypot(.43,.63)*e};
  }
  // Previous additive pose kicked a leg excessively high while both arms
  // flared out, reading as an uncontrolled backwards stumble. Ground the
  // support leg and redirect the blocking shin across the shooting lane.
  p.rig.position.y-=.045*a+.018*e;
  p.upper.rotation.x+=.07*a+.055*e-.04*r;
  p.upper.rotation.y+=.06*a;
  p.upper.rotation.z+=.055*e-.03*r;
  p.knees[0].rotation.x-=.24*a+.09*e;
  p.knees[1].rotation.x-=.17*a+.12*e;
  p.legs[1].rotation.x+=1.04*e;
  p.legs[1].rotation.z=(p.legs[1].rotation.z||0)+.30*e;
  p.ankles[1].rotation.x-=.13*e;
  p.legs[0].rotation.x-=.15*e;
  p.arms[0].rotation.z-=.16*a+.15*e;
  p.arms[1].rotation.z+=.16*a+.15*e;
  p.arms[0].rotation.x-=.13*e;
  p.arms[1].rotation.x+=.09*e;
  p.knees[0].rotation.x-=.08*r;
  return{...m,torsoTilt:.055*e,extension:1.04*e};
 }
 return{...m,torsoTilt:0,extension:0};
}
