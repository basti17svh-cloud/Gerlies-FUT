/* Footera V21.44: visual-only ball-contact continuity, deliveries and PlayStyle accents.
 * Preserves V21.43 Motion Lab controller, player routes, goalkeeper contact
 * and all simulation-authoritative ball flights. Deterministic and allocation-light.
 */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
export const CONTINUITY_VERSION='21.44';
export function styleAccent(styles,...ids){
 let value=0;
 for(const s of Array.isArray(styles)?styles:[]){
  const id=typeof s==='string'?s:s?.id;
  if(ids.includes(id))value=Math.max(value,s?.plus?1.3:1);
 }
 return value;
}
export function touchContinuity(stride,weight=1,styles=[]){
 const t=Number.isFinite(stride)?stride:0,w=clamp(weight),wave=Math.sin(t);
 const foot=wave>=0?0:1,contact=Math.pow(Math.abs(wave),8)*w;
 // Opposing foot is planted while the striking foot advances. Ball impulse
 // starts after touch, smoothly reaches zero at the next foot handover.
 const push=Math.pow(Math.max(0,-Math.sin(2*t)),2)*w;
 const technique=styleAccent(styles,'technical','trickster','first-touch');
 const pace=styleAccent(styles,'rapid','quick-step');
 return{foot,contact,push,lead:(.071+.011*pace-.013*technique)*push};
}
export function applyTouchContinuity(p,stride,weight,styles=[]){
 const m=touchContinuity(stride,weight,styles);
 if(weight<=0)return m;
 p.ankles[m.foot].rotation.x-=.10*m.contact;
 p.legs[m.foot].rotation.x+=.14*m.push;
 p.knees[1-m.foot].rotation.x-=.12*m.push;
 p.upper.rotation.y+=(m.foot?1:-1)*.06*m.push;
 return m;
}
export function deliverySignature(progress,sequence='central',styles=[]){
 const u=clamp(progress),kind=/^(?:wing|early_cross|far_post|near_post|volley)_/.test(sequence)?'cross':
  /^(?:low_cross|cutback)_/.test(sequence)?'cutback':
  /^(?:through_ball|one_on_one|counter|chip_)/.test(sequence)?'through':
  sequence==='one_two'?'one-two':sequence==='diagonal_switch'?'switch':'ground';
 const power=styleAccent(styles,...(kind==='cross'?['whipped-pass','long-ball-pass']:
  kind==='through'?['incisive-pass','through-ball']:
  kind==='one-two'?['tiki-taka','first-touch']:
  kind==='switch'?['long-ball-pass','pinged-pass']:['pinged-pass','tiki-taka']));
 return{kind,power,brace:Math.sin(Math.PI*u),follow:smooth((u-.43)/.41),
  side:sequence.endsWith('_left')?-1:1};
}
export function applyDeliveryContinuity(p,progress,sequence,styles=[]){
 const m=deliverySignature(progress,sequence,styles),a=m.brace*(1+.13*m.power);
 p.knees[0].rotation.x-=.24*a;p.arms[0].rotation.x+=.19*a;p.arms[1].rotation.x-=.17*a;
 if(m.kind==='cross'||m.kind==='switch'){
  p.upper.rotation.x-=.15*a;p.upper.rotation.y+=m.side*.21*a;
  p.ankles[1].rotation.z+=m.side*.2*a;
 }else if(m.kind==='through'){
  p.upper.rotation.x+=.13*a;p.ankles[1].rotation.x-=.19*a;
  p.legs[1].rotation.x+=.17*m.follow;
 }else if(m.kind==='one-two'){
  p.upper.rotation.y-=m.side*.12*a;p.ankles[1].rotation.x+=.14*a;
 }else if(m.kind==='cutback'){
  p.upper.rotation.z+=m.side*.16*a;p.knees[1].rotation.x-=.14*a;
  p.ankles[1].rotation.y+=m.side*.19*a;
 }else p.upper.rotation.x+=.08*a;
 return m;
}
export function finishSignature(time,finish='normal',styles=[]){
 const t=Number.isFinite(time)?time:0;
 const load=smooth((t-4.73)/.22)*(1-smooth((t-5.12)/.27)),
  follow=smooth((t-5.405)/.16)*(1-smooth((t-5.80)/.32));
 const id=finish==='finesse'?'finesse-shot':finish==='power'?'power-shot':
  finish==='low_driven'?'low-driven-shot':finish==='chip'?'chip-shot':'';
 return{load,follow,accent:id?styleAccent(styles,id):0};
}
export function applyFinishContinuity(p,time,finish,styles=[]){
 const m=finishSignature(time,finish,styles);
 if(['header','volley','bicycle'].includes(finish))return m;
 const a=m.accent;
 p.upper.rotation.x-=.09*a*m.load;
 p.arms[0].rotation.z-=.13*a*m.load;p.arms[1].rotation.z+=.13*a*m.load;
 p.legs[1].rotation.x+=.14*a*m.follow;
 if(finish==='finesse')p.ankles[1].rotation.z+=.17*a*m.follow;
 if(finish==='low_driven')p.upper.rotation.x+=.13*a*m.follow;
 if(finish==='power')p.upper.rotation.x-=.14*a*m.follow;
 return m;
}
export function defenderSignature(time,distance,sequence,styles=[]){
 const near=1-smooth((Math.max(0,distance)-3)/5);
 return{feint:sequence.startsWith('double_feint')?
  smooth((time-1.84)/.28)*(1-smooth((time-2.47)/.32))*near:0,
  sight:smooth((time-4.7)/.28)*(1-smooth((time-5.43)/.68))*near,
  focus:styleAccent(styles,'anticipate','intercept','block','jockey')};
}
export function applyDefenderContinuity(p,time,distance,sequence,styles=[]){
 const m=defenderSignature(time,distance,sequence,styles),w=1+.18*m.focus;
 p.upper.rotation.y+=.18*m.feint*w;
 p.knees[0].rotation.x-=.14*m.feint*w;
 p.knees[1].rotation.x-=.12*m.feint*w;
 p.arms[0].rotation.z-=.17*m.sight*w;
 p.arms[1].rotation.z+=.17*m.sight*w;
 return m;
}
