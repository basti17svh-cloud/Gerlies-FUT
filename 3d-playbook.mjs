/* Footera V21.86 — football playbook. Pure, deterministic visual choreography.
   All turnovers are AUTHORED by the match simulator, never by this module. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const interpolate=(a,b,u)=>a.map((v,i)=>mix(v,b[i],ease(u)));
const catalog=[
 // short passing, third-man runs, switches, wall passes
 ['triangle_left','combination',7,'normal','short',[6,3,1,3,0],'short'],
 ['triangle_right','combination',7,'normal','short',[7,3,2,3,0],'short'],
 ['tiki_short','combination',8,'normal','short',[6,7,3,0],'short'],
 ['tiki_quick','combination',7,'normal','short',[7,6,3,0],'short'],
 ['wall_pass_left','combination',7,'normal','short',[3,1,3,0],'short'],
 ['wall_pass_right','combination',7,'normal','short',[3,2,3,0],'short'],
 ['central_recycle','combination',6,'normal','short',[6,3,7,3,0],'medium'],
 ['midfield_switch','switch',5,'normal','loft',[6,3,7,2,0],'long'],
 ['first_touch_triangle','combination',7,'normal','short',[3,7,6,0],'medium'],
 ['third_man_run','combination',8,'normal','short',[6,3,1,0],'medium'],
 // timed through balls, gap penetration and direct goal-facing receiving touches
 ['split_defenders','through',8,'low_driven','through',[6,3,0],'short'],
 ['curved_striker_run','through',8,'normal','through',[7,3,0],'short'],
 ['left_halfspace_thread','through',7,'normal','through',[6,1,3,0],'medium'],
 ['right_halfspace_thread','through',7,'normal','through',[7,2,3,0],'medium'],
 ['deep_playmaker_lob','through',4,'normal','loft',[6,0],'medium'],
 // overlapping fullbacks, low crosses, aerial deliveries and switches of play
 ['overlap_left_low','overlap',7,'normal','driven',[6,1,4,0],'medium'],
 ['overlap_right_low','overlap',7,'normal','driven',[7,2,5,0],'medium'],
 ['overlap_left_high','overlap',6,'header','cross',[3,1,4,0],'medium'],
 ['overlap_right_high','overlap',6,'header','cross',[3,2,5,0],'medium'],
 ['early_low_delivery_left','lowcross',6,'low_driven','driven',[6,1,0],'short'],
 ['early_low_delivery_right','lowcross',6,'low_driven','driven',[7,2,0],'short'],
 ['switch_overlap_low','switch',5,'normal','loft',[6,3,2,5,0],'long'],
 ['switch_overlap_high','switch',5,'header','loft',[7,3,1,4,0],'long'],
 // close control into actual assisted finishes
 ['quick_burst_left','dribble',5,'normal','short',[6,1,0],'short'],
 ['quick_burst_right','dribble',5,'normal','short',[7,2,0],'short'],
 ['inside_link_left','dribble',5,'finesse','short',[6,1,3,0],'medium'],
 ['inside_link_right','dribble',5,'finesse','short',[7,2,3,0],'medium'],
 // angled cut-back to shooting zone, driven first time and near-post strike
 ['edge_cutback_finesse','cutback',5,'finesse','driven',[6,1,3,0],'medium'],
 ['first_time_power','distance',4,'power','short',[6,3,0],'short'],
 ['near_post_tap','nearpost',5,'low_driven','driven',[3,1,0],'short']
];
const tags=Object.freeze({
 combination:['tiki-taka','first-touch','incisive-pass'],
 switch:['long-ball-pass','flair'],
 through:['incisive-pass','through-ball'],
 overlap:['rapid','quick-step','whipped-pass'],
 lowcross:['pinged-pass','whipped-pass'],
 dribble:['technical','trickster','rapid'],
 cutback:['pinged-pass','finesse-shot'],
 distance:['power-shot','first-touch'],
 nearpost:['first-touch','low-driven-shot']
});
export const PLAYBOOK=Object.freeze(catalog.map(([id,family,weight,finish,delivery,order,length],index)=>
 Object.freeze({id,family,weight,finish,delivery,order:Object.freeze(order),length,
  seconds:length==='long'?17+(index%3):length==='medium'?13+(index%3):9+(index%3),
  tags:tags[family]||tags.combination})));
const plans=new Map(PLAYBOOK.map(p=>[p.id,p]));
export const getPlay=id=>plans.get(id)||null;
export const PLAYBOOK_IDS=Object.freeze(PLAYBOOK.map(p=>p.id));
export const DEFENSIVE_SCENES=Object.freeze([
 'defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery'
]);
const STARTS=[[-7,-28],[-23,-22],[23,-22],[-4,-21],[-27,-15],[27,-15],[-9,-16],[8,-17]];
const ENDS=[[0,-37],[-24,-39],[24,-39],[-1,-32],[-26,-42],[26,-42],[-6,-30],[6,-31]];
export function playPosition(index,time,plan){
 if(!plan||index<0||index>7)return null;
 const start=STARTS[index],end=ENDS[index],u=clamp(time/5.4);
 let p=interpolate(start,end,u);
 // The final attacker accelerates through the line while support keeps moving.
 if(index===0){p=interpolate(start,end,ease((time-.45)/4.95));p[0]+=(plan.family==='dribble'?(plan.id.includes('left')?-1.4:1.4):0)*Math.sin(Math.PI*u)}
 if(index===4||index===5){
  // On an overlap, fullbacks actually sprint past their wingers.
  if(plan.family==='overlap'||plan.id.startsWith('switch_overlap')){
   const run=ease((time-.6)/3.7);p[1]=mix(start[1],end[1]-2,run);
   p[0]+=(index===4?-1:1)*2.2*Math.sin(Math.PI*u);
  }else p[1]=mix(start[1],end[1]+7,ease(time/5.6));
 }
 // A receiver checks towards the ball before running beyond the passer.
 if(plan.order.includes(index)&&index!==0&&index!==4&&index!==5){
  p[0]+=(index%2?-1:1)*1.15*Math.sin(time*1.12);
  p[1]+=.85*Math.sin(time*1.7);
 }
 return p;
}
export function playTouches(plan){
 if(!plan)return [];
 const count=plan.order.length-1,slot=4.38/count;
 return Array.from({length:count},(_,i)=>Object.freeze({
  passer:plan.order[i],receiver:plan.order[i+1],
  release:.45+i*slot,arrival:.45+i*slot+slot*.80,
  arc:plan.delivery==='cross'&&i===count-1?2.3:
      plan.delivery==='loft'&&(i===count-1||plan.family==='switch')?2.1:
      plan.delivery==='driven'&&i===count-1?.10:
      plan.delivery==='through'&&i===count-1?.15:.06
 }));
}
function foot(index,time,plan){
 const p=playPosition(index,time,plan);
 if(!p)return[0,.14,-31];
 // Place the ball ahead of the receiver's moving boot.
 const future=playPosition(index,Math.min(5.4,time+.05),plan);
 const vx=future[0]-p[0],vz=future[1]-p[1],len=Math.hypot(vx,vz)||1;
 return[p[0]+vx/len*.45,.14,p[1]+vz/len*.45];
}
export function playCarrier(plan,time){
 if(!plan||time>=5.15)return -1;
 const touches=playTouches(plan);
 let owner=plan.order[0];
 for(const pass of touches){
  if(time>=pass.release&&time<pass.arrival)return -1;
  if(time>=pass.arrival)owner=pass.receiver;
 }
 return owner;
}
export function playBall(plan,time,shotContact){
 if(!plan)return null;
 const touches=playTouches(plan),t=clamp(time,0,5.4);
 if(t>=5.14){const pos=foot(0,5.14,plan),u=clamp((t-5.14)/.26);return interpolate(pos,shotContact,u)}
 for(const pass of touches){
  if(t>=pass.release&&t<pass.arrival){
   const start=foot(pass.passer,pass.release,plan),end=foot(pass.receiver,pass.arrival,plan);
   const u=clamp((t-pass.release)/(pass.arrival-pass.release));
   const p=interpolate(start,end,u);p[1]=.14+pass.arc*Math.sin(Math.PI*u);
   return p;
  }
 }
 return foot(playCarrier(plan,t),t,plan);
}
export function playPassWindows(plan){
 if(!plan)return[];
 return playTouches(plan).map(pass=>Object.freeze({
  actor:pass.passer,start:pass.release-.21,end:pass.release+.31
 }));
}
export function defensePosition(index,time,sequence){
 if(!DEFENSIVE_SCENES.includes(sequence))return null;
 const t=clamp(time,0,10.4),slide=sequence==='defense_slide_tackle';
 if(index===0){
  const a=interpolate([-13,-27],[-7.25,-34.35],t/4.4);
  if(t>4.4){a[0]-=1.1*ease((t-4.4)/2);a[1]+=2*ease((t-4.4)/2)}
  return a;
 }
 if(index===8){
  const intercept=slide?[-6.45,-34.45]:[-6.05,-34.35];
  if(t<=4.4)return interpolate([-3.2,-42],intercept,t/4.4);
  return interpolate(intercept,[1.6,-24.5],(t-4.4)/4.6);
 }
 return null;
}
export function defenseBall(time,sequence){
 if(!DEFENSIVE_SCENES.includes(sequence))return null;
 const t=clamp(time,0,10.4);
 const a=defensePosition(0,Math.min(t,4.15),sequence),d=defensePosition(8,4.4,sequence);
 if(t<4.03)return[a[0]+.27,.14,a[1]-.42];
 if(t<4.4){
  const u=ease((t-4.03)/.37);
  return interpolate([a[0]+.27,.14,a[1]-.42],[d[0]+.12,.14,d[1]-.3],u);
 }
 const owner=defensePosition(8,t,sequence),future=defensePosition(8,Math.min(10.4,t+.10),sequence);
 const dx=future[0]-owner[0],dz=future[1]-owner[1],len=Math.hypot(dx,dz)||1;
 return[owner[0]+dx/len*.43,.14,owner[1]+dz/len*.43];
}
