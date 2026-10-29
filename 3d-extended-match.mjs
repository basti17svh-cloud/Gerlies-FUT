import {EXTENDED_HIGHLIGHT_TYPES,createExtendedHighlightPlan,sampleExtendedHighlight} from './3d-playbook.mjs?v=21303';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)},mix=(a,b,u)=>a+(b-a)*u;
export const EXTENDED_SEQUENCES=[...EXTENDED_HIGHLIGHT_TYPES.map(k=>'extended_'+k),'extended_corner_right'];
const shots={keeper_buildout:20,turnover_counter:20,corner:10.5,free_kick:8,penalty:9,throw_in:12};
export const extendedKind=seq=>EXTENDED_SEQUENCES.includes(seq)?seq.slice(9).replace(/_right$/,''):null;
export function extendedTiming(seq){const kind=extendedKind(seq);return kind?{shot:shots[kind],duration:createExtendedHighlightPlan(kind).duration}:null}
export function extendedSeconds(seq,time){const t=extendedTiming(seq);if(!t)return time;if(time<=5.4)return time/5.4*t.shot;if(time<=6.65)return t.shot+time-5.4;return t.shot+1.25+(time-6.65)/3.75*(t.duration-t.shot-1.25)}
function route(keys,t){if(t<=keys[0][0])return keys[0].slice(1);for(let n=1;n<keys.length;n++)if(t<keys[n][0]){const a=keys[n-1],b=keys[n],u=smooth((t-a[0])/(b[0]-a[0]));return [mix(a[1],b[1],u),mix(a[2],b[2],u)]}return keys.at(-1).slice(1)}
const R={
 keeper_buildout:{16:[[0,0,45],[4,0,45],[9,1,43]],0:[[0,1,-7],[12,2,-16],[16,0,-24],[20,0,-37]],1:[[0,-17,32],[6,-16,28],[9,-14,20],[14,-10,8],[20,-13,-16]],6:[[0,-7,12],[9,-7,10],[12,-5,4],[17,-4,-16],[20,-4,-21]]},
 // Local -Z is the eventual shooting team's TARGET goal. Opponents build toward +Z;
 // after the duel the recovering team turns back toward -Z. Never flip the world.
 turnover_counter:{
  0:[[0,3,-8],[8,3,-10],[13,3,-20],[17,1,-29],[20,0,-37]],
  1:[[0,-17,-4],[9,-17,-8],[14,-15,-19],[17,-13,-27],[20,-13,-36]],
  2:[[0,14,-5],[8,12,-10],[13,8,-19],[17,7,-30],[20,5,-39]],
  3:[[0,-10,-9],[6,-7,-12],[10,-8,-16],[16,-5,-24],[20,-3,-30]],
  4:[[0,-22,-2],[9,-21,-10],[14,-19,-15],[20,-19,-33]],
  5:[[0,22,0],[9,20,-7],[15,20,-23],[20,17,-37]],
  6:[[0,-13,0],[4,-11,-4],[6.8,-5,-10],[7.95,-1.25,-12.35],[8.3,-1,-12.7],[13,-3,-19],[16,-4,-29],[20,-4,-31]],
  7:[[0,2,-15],[7,1,-17],[13,1,-22],[20,-2,-33]],
  8:[[0,-9,-26],[2.7,-8,-24],[4.5,-8,-21],[6,-5,-17],[7.95,-1,-12],[9.3,0,-13],[12,1,-14],[20,2,-17]],
  9:[[0,-22,-36],[2.7,-19,-32],[4.5,-16,-29],[7,-12,-24],[10,-10,-20],[20,-8,-23]],
  10:[[0,-8,-34],[5,-4,-28],[8,-2,-20],[13,-2,-22],[20,-3,-23]],
  11:[[0,12,-34],[6,9,-29],[10,8,-22],[20,9,-21]],
  12:[[0,-21,-22],[8,-19,-16],[14,-18,-22],[20,-17,-29]],
  13:[[0,19,-26],[7,17,-19],[13,16,-23],[20,13,-28]],
  14:[[0,-1,-37],[7,-1,-30],[13,-6,-24],[20,-7,-17]],
  15:[[0,25,-37],[7,21,-31],[13,23,-25],[20,19,-17]]
 },
 corner:{0:[[0,-2,-42],[4,-2,-42],[7,0,-43],[10.5,2,-46.5]],1:[[0,-33.8,-50.6],[3.6,-33.8,-50.6],[4.3,-33.65,-51.65],[10.5,-29,-46]],8:[[0,1,-44],[4,1,-44],[8,3,-45],[10.5,3.1,-46.3]]},
 free_kick:{0:[[0,0,-25],[5,0,-25],[7.2,0,-27],[8,0,-28.75]]},
 penalty:{0:[[0,0,-37.3],[6,0,-37.3],[8,0,-39.5],[9,-.105,-40.68988172767776]]},
 throw_in:{1:[[0,34.15,-20],[3.2,34.15,-20],[5,34.15,-20],[9,28,-27],[12,26,-34]],6:[[0,24,-23],[3,24,-23],[5,23,-25],[8,20,-28],[10,14,-32],[12,10,-35]],0:[[0,9,-28],[5,9,-28],[8,7,-31],[10,3,-35],[12,1,-39]]}
};

/* Authored restarts, not a j-based grid. Each player has a real support,
 * covering, marking or rebound lane; goalkeepers/takers stay in R routes. */
const RESTART_FORMATIONS={
 penalty:{
  attack:[null,[-12.8,-33.8],[10.9,-33.2],[-3.9,-30.3],[5.4,-31],[-20.4,-33.4],[20,-34.3],[-8.6,-31.5]],
  defend:[[-10.9,-31.9],[12.5,-32],[-.7,-30.8],[7.4,-30],[-18.3,-32.5],[18.4,-31.9],[-6.4,-32.7],[15.1,-34]],
  targets:{attack:[null,[-9,-42.8],[7,-43.5],[-1,-39.6],[3,-40.2],[-17.2,-35.5],[15,-37.5],[-4,-38]],
   defend:[[-8.9,-41],[9,-40.6],[0,-38.2],[4,-38],[-18,-36.6],[17,-37],[-5.8,-37.3],[12,-39.2]]}
 },
 free_kick:{
  attack:[null,[-13.3,-36.1],[10.5,-37.1],[-22,-31.5],[20,-32.5],[-7.2,-28],[6.6,-27.4],[-2.8,-33.7]],
  defend:[[-.84,-39],[-.28,-39],[.28,-39],[.84,-39],[-12,-42],[11,-43],[-21.2,-37.5],[18.3,-42]],
  targets:{attack:[null,[-9.7,-45.2],[7.2,-46.7],[-17.5,-36.9],[16.4,-38.5],[-5.1,-34.5],[6,-35],[-1.9,-41.7]],
   defend:[[-3.8,-42.1],[-.6,-40.7],[1.5,-42.4],[3.4,-41.5],[-10.2,-44.7],[9.6,-45.5],[-19,-39.7],[15.8,-43.5]]}
 },
 corner:{
  attack:[null,null,[-7.8,-41.5],[8,-41.4],[-16,-36.5],[15,-38.5],[.8,-35.2],[-11.2,-44.2]],
  defend:[null,[-4.6,-43.5],[10,-44],[-14,-42.3],[16.5,-43.2],[.2,-40],[-8.5,-48.5],[7.8,-48.9]],
  targets:{attack:[null,null,[-4.8,-49],[6,-50.5],[-12.5,-46],[11,-46],[-1.5,-41.2],[-8,-48]],
   defend:[null,[-5.4,-48.1],[6.8,-49],[-12,-46.5],[12,-46],[.8,-46],[-6.5,-50],[5.5,-50.8]]}
 },
 throw_in:{
  attack:[null,null,[27,-18],[22,-24],[16,-15],[31,-26],null,[17,-30]],
  defend:[[29,-23],[20.5,-25.7],[25.4,-17],[13,-19],[30,-31],[12,-28],[22,-36],[5,-32]],
  targets:{attack:[null,null,[25,-25],[19,-28],[17,-19],[28,-30],null,[15,-33]],
   defend:[[26.5,-27],[19,-28.5],[22,-22],[12,-23],[27,-34],[10.5,-31],[18.5,-39],[5.5,-34]]}
 }
};
const RESTART_RELEASE={penalty:9,free_kick:8,corner:4.3,throw_in:3.2};
function restartPosition(index,seconds,kind){
 const shape=RESTART_FORMATIONS[kind],attack=index<8,j=attack?index:index-8;
 const start=(attack?shape?.attack:shape?.defend)?.[j];
 if(!start)return null;
 const end=(attack?shape.targets.attack:shape.targets.defend)[j]||start;
 const release=RESTART_RELEASE[kind],wall=kind==='free_kick'&&!attack&&j<4;
 // Micro-positioning before delivery stays behind the penalty line and arc.
 const drift=wall?0:kind==='penalty'?.075:.18;
 const idle=drift*Math.sin(seconds*(.62+(index%4)*.09)+index*.83)
   *smooth(seconds/1.8)*(1-smooth((seconds-release+.38)/.42));
 // Individual reaction timing prevents synchronized sprints into the box.
 const delay=kind==='penalty'?(index%4)*.13:(index%3)*.16+(index%4)*.12;
 const travel=kind==='penalty'?2.2:kind==='free_kick'?2.5:kind==='corner'?4.4:4.6;
 const run=smooth((seconds-release-delay)/travel);
 const lateral=(wall?0:(j%3-1)*.65)*Math.sin(Math.PI*run);
 return[mix(start[0],end[0],run)+lateral+idle,
  mix(start[1],end[1],run)+idle*.32];
}

export function extendedPosition(index,time,seq){
 const kind=extendedKind(seq);if(!kind)return null;const t=extendedSeconds(seq,time);
 if(R[kind][index]){const point=route(R[kind][index],t);if(seq.endsWith('_right'))point[0]*=-1;return point;}
 const staged=restartPosition(index,t,kind);
 if(staged){if(seq.endsWith('_right'))staged[0]*=-1;return staged;}
 const attack=index<8,j=attack?index:index-8;
 const progress=smooth(t/shots[kind]),initial=kind==='keeper_buildout'?24:0;
 return[(j-3)*6+(attack?0:2),mix(initial+(attack?10:0)-(j%3)*6,(attack?-23:-38)-(j%3)*3,progress)];
}
export function extendedContact(seq,base){const p=extendedPosition(0,5.4,seq);return p?[p[0]+base[0],['penalty','free_kick'].includes(extendedKind(seq))?.14:base[1],p[1]+base[2]+37]:null}
const foot=(i,t,seq)=>{const p=extendedPosition(i,t/extendedTiming(seq).shot*5.4,seq);return[p[0]+.1,i===16?1.08:.14,p[1]+(extendedKind(seq)==='turnover_counter'&&i>=8&&i<16?.45:-.45)]};
// Physical seconds, exact receiver endpoints; the final pass meets the actual finishing contact.
export function extendedPasses(seq){const k=extendedKind(seq);return({keeper_buildout:[[16,1,4,6,.65],[1,6,9,12,.25],[6,0,17,19,.3]],turnover_counter:[[9,8,2.7,4.5,.18],[6,1,13,15,.25],[1,0,17,19,.25]],corner:[[1,0,4.3,10.5,4.2]],throw_in:[[1,6,3.2,5,2.1],[6,0,9,11,.25]],free_kick:[],penalty:[]})[k]||[]}
export function extendedControl(time,seq){const k=extendedKind(seq),t=extendedSeconds(seq,time);if(!k||time>=5.15||['penalty','free_kick','corner','throw_in'].includes(k)&&t<(k==='throw_in'?5:99))return{index:-1,weight:0};
 // The counter has explicit possession states; completed opponent passes must
 // never overwrite the later defender's recovery or return to an old carrier.
 if(k==='turnover_counter'){
  const owner=t<2.7?9:t<4.5?-1:t<7.95?8:t<8.3?-1:t<13?6:t<15?-1:t<17?1:t<19?-1:0;
  return{index:owner,weight:owner<0?0:.85};
 }
 let owner=k==='keeper_buildout'?16:6;for(const [a,b,start,end]of extendedPasses(seq)){if(t>=start&&t<end)return{index:-1,weight:0};if(t>=end)owner=b}return{index:owner,weight:.85}}
export function extendedBall(time,seq,contact){
 const k=extendedKind(seq),t=extendedSeconds(seq,time);if(time>=5.4)return contact.slice();
 if(k==='penalty'||k==='free_kick')return contact.slice();
 // Opponent combines in midfield; the first pass and receiving touch are
 // visible BEFORE our defender presses and wins a real duel.
 if(k==='turnover_counter'){
  if(t<2.7)return foot(9,t,seq);
  if(t>=4.5&&t<7.95)return foot(8,t,seq);
  if(t>=7.95&&t<8.3){
   const from=foot(8,7.95,seq),to=foot(6,8.3,seq),u=smooth((t-7.95)/.35);
   return from.map((v,i)=>mix(v,to[i],u));
  }
 }
 if(k==='corner'&&t<4.3)return foot(1,4.3,seq);
 if(k==='throw_in'&&t<3.2){const p=extendedPosition(1,time,seq);return[p[0]-.12,1.92+.12*smooth(t/3),p[1]]}
 for(const [a,b,start,end,arc]of extendedPasses(seq))if(t>=start&&t<end){const from=k==='throw_in'&&a===1?[34.03,2.04,-20]:foot(a,start,seq),to=end===shots[k]?contact:foot(b,end,seq),u=(t-start)/(end-start),p=from.map((v,i)=>mix(v,to[i],u));p[1]+=arc*Math.sin(Math.PI*u);return p}
 if(t>shots[k]-.55){const from=foot(0,shots[k]-.55,seq),u=smooth((t-shots[k]+.55)/.55);return from.map((v,i)=>mix(v,contact[i],u))}
 const c=extendedControl(time,seq);return foot(c.index<0?0:c.index,t,seq);
}
export function extendedPhase(seq,time,team='home',result='unresolved'){const kind=extendedKind(seq);if(!kind)return null;return sampleExtendedHighlight(createExtendedHighlightPlan(kind,{team:kind==='turnover_counter'?(team==='home'?'away':'home'):team,result}),extendedSeconds(seq,time))}
export function extendedCamera(seq,time,direction,aspect,ball){
 const kind=extendedKind(seq),portrait=aspect<1.12,t=extendedSeconds(seq,time);
 // Keep the ball and receiving player centered, not half a pitch ahead.
 const target=[ball[0]*.94,.86,ball[2]-1.35];
 if(kind==='turnover_counter'){
  // Follow actual passing partners so a receiver is visible BEFORE the ball
  // arrives. Release the pass-wide composition before the shot to fit the goal.
  for(const [passer,receiver,release,arrival] of extendedPasses(seq)){
   const fade=passer===1&&receiver===0?arrival-.8:arrival+.1;
   const weight=smooth((t-release+1.2)/.9)*(1-smooth((t-fade)/.65));
   if(weight<=0)continue;
   const p=extendedPosition(passer,time,seq),r=extendedPosition(receiver,time,seq);
   target[0]=mix(target[0],(p[0]+r[0])/2,.86*weight);
   target[2]=mix(target[2],(p[1]+r[1])/2,.86*weight);
  }
  // Keep the approach in shot; switch the focus toward the full goal only
  // during the finishing delivery, instead of zooming the players out.
  const finish=smooth((t-17.6)/2.2);
  target[0]=mix(target[0],0,finish*.5);
  target[2]=mix(target[2],-47,finish);
  // Once struck, keep the whole goal and the actual rebound/miss together.
  target[2]=mix(target[2],(ball[2]-51.25)/2,smooth((time-5.4)/1.25));
 }
 if(kind==='penalty'||kind==='free_kick'){target[0]=0;target[2]=kind==='penalty'?-44:-38}
 if(kind==='corner'){target[0]=mix(seq.endsWith('_right')?16:-16,0,smooth(extendedSeconds(seq,time)/10.5));target[2]=-44}
 if(kind==='throw_in'){target[0]=mix(19,0,smooth(extendedSeconds(seq,time)/12));target[2]=mix(-25,-43,smooth(time/5.4))}
 target[0]*=direction;target[2]*=direction;
 // Open-play counters use the ordinary elevated touchline rail and range
 // (V21.205: 34 m, the same as BROADCAST_CAMERA_DISTANCE in the scene).
 const distance=34;
 const rail=kind==='free_kick'?[39.3,29,50*direction]:[39.3,27,5.8*direction];
 const size=Math.hypot(...rail);
 const position=target.map((v,i)=>v+rail[i]*distance/size);
 // V21.205: at 34 m a narrow phone needs a slightly wider, still fixed lens
 // so the whole goal fits next to the ball (counter) or the taker (free kick).
 const wide=width=>2*Math.atan(width/aspect)*180/Math.PI;
 const fov=kind==='turnover_counter'?Math.max(portrait?42:32,wide(.384)):
  kind==='free_kick'?Math.max(portrait?38:35.5,wide(.355)):(portrait?29.4:28.6);
 return{position,target,fov,distance,phase:extendedPhase(seq,time)?.action||'build'};
}
// V21.195 set-piece TV angles, cut in directly (not through the stabilized
// 40 m rail): a camera behind the penalty taker for the run-up and strike,
// one behind the ball looking over the wall at a free kick, and one from
// behind the corner flag into the box for a corner.
export function extendedSetPieceCamera(seq,time,direction,aspect,ball=null){
 const kind=extendedKind(seq),portrait=aspect<1.12;
 const behind=kind==='penalty'&&time<7.7?{from:[1.3,2.45,-31.6],to:[0,1.0,-50.5],fov:portrait?28:25}:
  kind==='free_kick'&&time<7.3?{from:[-2,3.3,-18],to:[.3,1.2,-46],fov:portrait?31:28}:null;
 // V21.203 (Basti): corners stay in the normal TV camera, no corner-flag angle.
 if(!behind)return null;
 const f=v=>[v[0]*(behind.mirror?-1:1)*direction,v[1],v[2]*direction],position=f(behind.from),target=f(behind.to);
 return{position,target,fov:behind.fov,distance:Math.hypot(...position.map((v,i)=>v-target[i])),phase:extendedPhase(seq,time)?.action||'build',shot:'behind-taker'};
}
// Applied after generic locomotion, so a throw uses arms and a wall stays a wall.
export function poseExtendedActor(p,index,time,seq){
 const kind=extendedKind(seq),t=extendedSeconds(seq,time);if(!kind)return;
 if(kind==='throw_in'&&index===1&&t<=4.4){const u=smooth((t-3.2)/.6),w=1-smooth((t-3.5)/.9);for(let i=0;i<2;i++){p.arms[i].rotation.x=mix(2.8,1.6,u)*w;p.arms[i].rotation.z=(i?-1:1)*.22*w;p.elbows[i].rotation.x=.5*w}p.upper.rotation.x=mix(-.18,.25,u)*w;}
 // Individual waiting posture: players shift weight and scan for their marker.
 if(RESTART_FORMATIONS[kind]&&index<16){
  const stance=Math.sin(t*(.78+(index%4)*.09)+index*.87);
  const recovery=smooth((t-RESTART_RELEASE[kind])/.9);
  p.upper.rotation.y+=.065*stance*(1-recovery);
  p.upper.rotation.z+=(index%2?1:-1)*.035*(1-recovery);
  p.arms[0].rotation.z-=.10+.055*stance;
  p.arms[1].rotation.z+=.08+.06*Math.cos(t*.72+index);
  p.elbows[0].rotation.x=.16+.045*Math.cos(t+index);
  p.elbows[1].rotation.x=.14+.045*Math.sin(t*.75+index);
 }
 // Only the four wall players are aligned, with nonidentical jump timings.
 if(kind==='free_kick'&&index>=8&&index<=11){
  // Tuck hands in front of the hips/torso instead of holding both arms out.
  // Root heading PI faces the freekick taker at positive local Z.
  p.arms[0].rotation.x=-.10;p.arms[1].rotation.x=-.10;
  p.arms[0].rotation.z=-.08;p.arms[1].rotation.z=.08;
  p.elbows[0].rotation.x=-.28;p.elbows[1].rotation.x=-.28;
  const delay=(index-8)*.065;
  const jump=smooth((t-7.91-delay)/.14)*(1-smooth((t-8.19-delay)/.21));
  p.rig.position.y+=.23*jump;p.upper.rotation.x-=.08*jump;
 }
 for(const [passer,,release]of extendedPasses(seq))if(index===passer&&!(kind==='throw_in'&&index===1)&&index!==16){const u=clamp((t-release+.3)/.7),w=Math.sin(Math.PI*u);p.legs[1].rotation.x=mix(-.6,1,u)*w;p.knees[1].rotation.x=-.45*w;}
 if(kind==='turnover_counter'&&index===8&&t>7.9&&t<9.7){
  const w=Math.sin(Math.PI*(t-7.9)/1.8);
  p.legs[1].rotation.x=.42*w;p.upper.rotation.x=.18*w;
  p.arms[1].rotation.z+=.34*w;
 }
 if(kind==='turnover_counter'&&index===6&&t>7.65&&t<8.85){
  const w=Math.sin(Math.PI*clamp((t-7.65)/1.2));
  p.legs[1].rotation.x-=.40*w;p.upper.rotation.x-=.12*w;
 }
 if(kind==='corner'&&index===8){const w=Math.sin(Math.PI*clamp((t-9.8)/1.2));p.rig.position.y=.2*w;p.upper.rotation.x=.2*w;}
 if(index===16){const w=1-smooth((t-4)/.8);p.arms[0].rotation.x=.8*w;p.arms[1].rotation.x=.8*w;p.arms[0].rotation.z=.2*w;p.arms[1].rotation.z=-.2*w;p.elbows[0].rotation.x=.7*w;p.elbows[1].rotation.x=.7*w;}
}
