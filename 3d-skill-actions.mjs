// Absolute-time, result-neutral skill poses. No match state and no animation RNG.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const SKILL_LEVELS=Object.freeze({'body-feint':1,'stepover':2,'ball-roll':2,'drag-back':2,'roulette':3,'heel-to-heel':3,'croqueta':4,'berbatov':4,'elastico':5,'reverse-elastico':5});
export function skillScene(id){const m=/^skill_(.+)_(left|right)$/.exec(id||'');return m&&SKILL_LEVELS[m[1]]?{move:m[1],side:m[2]==='left'?-1:1,minStars:SKILL_LEVELS[m[1]]}:null}
export function sampleSkill(id,time){
 const scene=skillScene(id);if(!scene)return null;
 const start=1.65,end=3.35,u=clamp((time-start)/(end-start)),s=Math.sin(Math.PI*u),wave=Math.sin(2*Math.PI*u),side=scene.side;
 const weight=smooth(u/.16)*(1-smooth((u-.84)/.16));
 let yaw=0,lean=0,ballSide=0,ballForward=0,left=0,right=0,knee=.25*s,ankle=0;
 switch(scene.move){
  case 'body-feint':lean=.48*wave;left=.32*s;right=-.20*s;ballSide=.17*Math.sin(Math.PI*u)*Math.sin(Math.PI*u);break;
  case 'stepover':left=.68*Math.sin(2*Math.PI*u);right=.68*Math.sin(2*Math.PI*u+Math.PI)*s;ankle=.48*s;lean=-.22*wave;ballSide=.08*wave;break;
  case 'ball-roll':right=.30*s;left=-.15*s;ankle=-.55*s;ballSide=.46*s;ballForward=-.13*s;lean=-.20*s;break;
  case 'drag-back':right=-.55*s;left=.23*s;ballForward=-.50*s;ballSide=.22*smooth(u)*s;lean=.22*s;yaw=.55*s;break;
  case 'roulette':yaw=2*Math.PI*smooth(u);right=.72*s;left=-.50*s;knee=.65*s;ballSide=.30*wave;ballForward=-.38*s;lean=.12*s;break;
  case 'heel-to-heel':right=-.72*Math.sin(Math.PI*u);left=.62*Math.sin(2*Math.PI*u)*s;ballForward=.38*wave;ballSide=.06*s;lean=.27*wave;break;
  case 'croqueta':right=.50*wave;left=-.50*wave;ankle=.32*wave;ballSide=.53*Math.sin(Math.PI*u);ballForward=-.06*s;lean=-.34*wave;break;
  case 'berbatov':right=.63*s;left=-.36*s;yaw=1.25*s;ballSide=.47*s;ballForward=-.32*s;lean=.27*s;ankle=.35*s;break;
  case 'elastico':right=.60*s;left=-.18*s;ballSide=.56*Math.sin(2*Math.PI*u)*s;ballForward=.19*s;ankle=.80*wave*s;lean=-.34*wave;break;
  case 'reverse-elastico':right=.43*s;left=-.24*s;ballSide=-.56*Math.sin(2*Math.PI*u)*s;ballForward=-.18*s;ankle=-.80*wave*s;lean=.34*wave;break;
 }
 return{...scene,start,end,u,weight,yaw:yaw*side,lean:lean*side,ballSide:ballSide*side,ballForward,left,right,knee,ankle:ankle*side};
}
export function applySkillPose(actor,time,id){
 const p=sampleSkill(id,time);if(!actor||!p||p.weight<=0)return p;
 const w=p.weight;
 // A full roulette turn ends at 2π (same rest orientation), never a rewind.
 actor.rig.rotation.y+=p.yaw;
 actor.upper.rotation.z+=p.lean*w;actor.upper.rotation.x+=.10*Math.sin(Math.PI*p.u)*w;
 actor.legs[0].rotation.x+=p.left*w;actor.legs[1].rotation.x+=p.right*w;
 actor.legs[1].rotation.z+=p.ankle*.65*w;actor.ankles[1].rotation.z+=p.ankle*w;
 actor.knees[0].rotation.x-=p.knee*w;actor.knees[1].rotation.x-=p.knee*.7*w;
 actor.arms[0].rotation.z-=.28*w;actor.arms[1].rotation.z+=.28*w;
 return p;
}
// Mirror the authored right-boot action onto the left. Blend in/out smoothly.
export function applyFootedPose(actor,time,foot,start=4.65,end=6.35){
 if(foot!=='Left'||time<=start||time>=end)return 0;
 const w=smooth((time-start)/.23)*(1-smooth((time-(end-.25))/.25));
 for(const pair of [actor.legs,actor.knees,actor.ankles]){
  const a=pair[0].rotation,b=pair[1].rotation,ax=a.x,ay=a.y,az=a.z,bx=b.x,by=b.y,bz=b.z;
  a.set(ax+(bx-ax)*w,ay+(-by-ay)*w,az+(-bz-az)*w);
  b.set(bx+(ax-bx)*w,by+(-ay-by)*w,bz+(-az-bz)*w);
 }
 actor.upper.rotation.y*=1-2*w;actor.upper.rotation.z*=1-2*w;
 return w;
}
