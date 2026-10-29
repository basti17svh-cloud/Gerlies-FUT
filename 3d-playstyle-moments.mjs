import {getPlay,playTouches} from './3d-playbook.mjs?v=21303';
import {extendedKind,extendedPasses,extendedTiming} from './3d-extended-match.mjs?v=21303';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0};
// All times are absolute scene time; neither results nor simulator RNG are accessed.
export function signatureTimeline(event,sequence=event.sequence,legacyPass=null){
 const plan=getPlay(sequence),touches=plan?playTouches(plan):[],last=touches.at(-1),kind=extendedKind(sequence),timing=extendedTiming(sequence);
 const passes=kind?extendedPasses(sequence).map(([passer,receiver,release,arrival])=>({passer,receiver,release:release*5.4/timing.shot,arrival:arrival*5.4/timing.shot})):touches;
 const final=passes.at(-1)||last||{passer:event.creatorActor||1,receiver:0,release:legacyPass?.[0]??2.15,arrival:legacyPass?.[1]??2.6};
 const list=Array.isArray(event.signatures)&&event.signatures.length?event.signatures:event.signature?[event.signature]:[];
 const out=[];
 for(const m of list){
  let phase=m.phase||(m.who==='creator'?'pass':m.who==='defender'?'defense':m.who==='keeper'?'save':['technical','trickster','rapid','quick-step'].includes(m.id)?'carry':'finish');
  if(event.type==='ball_won'&&m.who!=='defender')continue;
  const actor=m.who==='keeper'?16:m.who==='buildKeeper'?17:m.who==='defender'?(event.defenderIndex??8):m.who==='creator'?final.passer:0;
  let start=4.8,end=5.95,owner=actor;
  if(phase==='receive'){start=final.arrival-.18;end=Math.min(final.arrival+.38,4.95)}
  else if(['carry','shield','burst'].includes(phase)){
   start=sequence?.startsWith('skill_')?1.65:Math.max(final.arrival+.08,1.4);end=sequence?.startsWith('skill_')?3.35:Math.min(4.75,start+1.55);
   if(!plan&&!kind){start=1.55;end=3.6}
   if(phase==='burst'&&sequence?.startsWith('skill_')){start=3.4;end=4.65}
  }
  else if(phase==='aerial'){start=4.4;end=5.3}
  else if(phase==='pass'){start=final.release-.25;end=Math.min(final.release+.52,5.2)}
  else if(phase==='restart'){const first=passes[0];if(!first)continue;owner=first.passer;start=first.release-.25;end=first.release+.55}
  else if(phase==='distribution'){const first=passes[0];if(kind!=='keeper_buildout'||!first)continue;start=first.release-.25;end=first.release+.45}
  else if(phase==='defense'){start=event.type==='ball_won'?3.65:m.id==='block'?5.1:3.7;end=event.type==='ball_won'?4.85:m.id==='block'?5.9:4.7}
  else if(phase==='save'){if(event.type!=='big_chance_saved')continue;start=6.05;end=7.1}
  if(end-start<.18)continue;
  const family=phase==='finish'&&m.id==='trivela'?'outside':phase==='receive'?'receive':phase==='shield'||m.id==='press-proven'?'shield':phase==='defense'?'defense':phase==='save'?'save':null;
  out.push(Object.freeze({...m,phase,actor:owner,badge:Object.freeze([Math.max(0,start),end]),variant:hash(String(event.id)+':'+m.id)%3,family,priority:phase==='finish'?5:phase==='receive'?4:3}));
 }
 return Object.freeze(out);
}
export function activeSignatureMoments(list,time){
 const owners=new Map();for(const m of list){if(momentWeight(m,time)<=0)continue;const old=owners.get(m.actor);if(!old||m.priority>old.priority)owners.set(m.actor,m)}return [...owners.values()];
}
export function momentWeight(moment,time){const [a,b]=moment.badge;return ease((time-a)/Math.min(.2,(b-a)/3))*(1-ease((time-(b-.2))/.2))}
// Fifteen contextual movement variants (3 reception, 3 shields, 6 defensive,
// 3 keeper braces); these layer on the existing authoritative action paths.
export function applyPlusMotion(actor,moment,time){
 const w=momentWeight(moment,time);if(!actor||w<=0||!moment.family)return 0;
 const v=moment.variant,side=v===1?-1:1;
 if(moment.family==='receive'){
  actor.ankles[1].rotation.z+=side*(.20+v*.06)*w;actor.knees[1].rotation.x-=(.12+v*.06)*w;
  actor.upper.rotation.y+=side*(v===1?.32:.14)*w;actor.upper.rotation.x+=(v===2?.14:.05)*w;
 }else if(moment.family==='shield'){
  actor.upper.rotation.y+=side*(.42+v*.12)*w;actor.upper.rotation.z+=side*.13*w;
  actor.arms[0].rotation.z-=(.40+v*.08)*w;actor.arms[1].rotation.z+=(.34+v*.10)*w;
  actor.knees[0].rotation.x-=(.12+v*.07)*w;actor.knees[1].rotation.x-=.15*w;
 }else if(moment.family==='defense'){
  const read=moment.id==='intercept'||moment.id==='anticipate';
  actor.upper.rotation.x-=(read?.12:.24)*w;actor.rig.rotation.z+=side*(.06+v*.025)*w;
  actor.legs[read?0:1].rotation.z+=side*(.10+v*.045)*w;actor.knees[1].rotation.x-=(.08+v*.05)*w;
  actor.arms[0].rotation.z-=.17*w;actor.arms[1].rotation.z+=.19*w;
 }else if(moment.family==='outside'){
  actor.ankles[1].rotation.z-=.38*w;actor.upper.rotation.y-=.16*w;actor.arms[0].rotation.z-=.12*w;
 }else if(moment.family==='save'){
  // Apply BEFORE glove IK: the real saved ball remains the hand target.
  actor.upper.rotation.z+=side*(.035+v*.018)*w;actor.knees[0].rotation.x-=(.05+v*.035)*w;
  actor.elbows[0].rotation.x+=.10*w;actor.elbows[1].rotation.x+=.08*w;
 }
 return w;
}
