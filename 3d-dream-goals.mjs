/*
 * Footera V21.445 — Traumtore: thirteen authored signature goals.
 * Basti (16.11.2026): "Die Tore sehen tatsächlich viele sehr identisch aus."
 * Every older play ends in the same strike: a straight 1.25 s shot from the
 * box edge. These scenes bring their own build-up, their own finishing
 * technique and their own ball flight (real bend, dip, knuckle wobble,
 * heel flick, overhead kick, diving header).
 * PRESENTATION ONLY. The simulator owns scorer, chance and outcome; the
 * same scene is shown for a goal, a save, the post or a miss.
 * Local frame as in 3d-playbook.mjs: -Z is the attacked goal (line -52.5),
 * x is lateral metres, the canonical contact is at 5.4 s.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;

// One authored scene per entry; `mirror` adds the same scene on the other wing.
// routes: actor -> [[t,x,z],...]; beats: pass [release,arrival] per order step;
// arcs: optional height per pass; flight: ball flight after contact.
//  flight.post: fixed far-post side (+1/-1, mirrored) or 0 = simulator placement
//  flight.goal: [|x|,y] of the goal impact, flight.bend: [cp1x,cp2x] lateral
//  control offsets (mirrored), flight.rise: [cp1y,cp2y], flight.wobble: [x,y]
//  rate: shot playback rate (1.5 = every older shot), contact: own contact
//  offset in the scorer's goal-facing frame [lateral,height,-37+forward].
const BASE=[
 {id:'dream_robben_cut_right',sims:['normal','finesse'],mirror:'dream_robben_cut_left',family:'dribble',finish:'finesse',delivery:'short',
  order:[6,7,0],length:'long',weight:9,kinds:['dribble','cutback'],foot:'Left',style:'curl',title:'Robben-Schlenzer',
  routes:{
   0:[[0,25,-21],[1,25.4,-24.2],[2.05,24.6,-28],[2.9,23.3,-32.4],[3.55,20.6,-35.1],[4.25,15.9,-35.9],[4.85,11.9,-35.4],[5.4,9,-34.9],[6.4,7.4,-36.1]],
   5:[[0,27,-14],[2,27,-21],[3.6,26.2,-30],[5.4,24.6,-36.5]],
   6:[[0,-5,-15],[.35,-4.8,-15.4],[1.6,-2.5,-19.5],[3.2,.5,-24.5],[5.4,2.5,-29]],
   7:[[0,9,-17],[1,10.6,-20.2],[1.3,10.9,-20.8],[2.6,11.6,-24],[4,10.4,-27.5],[5.4,7.5,-30]]},
  beats:[[.35,1],[1.3,2.05]],
  flight:{post:-1,goal:[3.02,1.92],bend:[-3.4,-2.7],rise:[1.05,1.0],rate:1.5}},
 {id:'dream_trivela_left',sims:['normal','finesse'],mirror:'dream_trivela_right',family:'combination',finish:'finesse',delivery:'short',
  order:[6,3,0],length:'medium',weight:8,kinds:['combination'],foot:'Right',style:'outside',title:'Außenrist-Schlenzer',
  routes:{
   0:[[0,-12,-22],[1.5,-12.6,-25.2],[3.9,-11.2,-30],[4.6,-10.4,-31.5],[5.4,-9.6,-32.6],[6.4,-8.6,-34]],
   3:[[0,-3,-21],[1.3,-4.2,-25.3],[2.9,-6.2,-28.4],[4,-4.8,-31.5],[5.4,-3.2,-35]],
   6:[[0,-9,-15],[.4,-9,-15.8],[2.4,-7.5,-20.5],[5.4,-5.5,-27]]},
  beats:[[.4,1.3],[2.9,3.9]],
  flight:{post:1,goal:[2.98,1.22],bend:[-2.3,-1.6],rise:[.75,.6],rate:1.5}},
 {id:'dream_rocket_dip',sims:['power','normal'],family:'distance',finish:'power',delivery:'short',
  order:[3,6,0],length:'medium',weight:9,kinds:['distance'],style:'dip',title:'Distanzhammer',
  routes:{
   0:[[0,-7,-14],[1.5,-6.1,-16.6],[3.3,-4.6,-19.6],[4.2,-3.8,-21.4],[4.85,-3.3,-22.6],[5.4,-3,-23.5],[6.4,-2.6,-25]],
   3:[[0,-2,-24],[.4,-1.8,-24.4],[1.4,-1.2,-26.8],[3.1,-1.6,-28.5],[5.4,1.2,-33.5]],
   6:[[0,-10,-12],[1.4,-9.6,-14.8],[3.1,-8.3,-17.8],[5.4,-7.2,-23.5]]},
  beats:[[.4,1.4],[3.1,4.2]],
  flight:{post:0,goal:[2.95,2.12],bend:[0,0],rise:[3.1,2.25],rate:1.5}},
 {id:'dream_knuckle_right',sims:['power','normal'],family:'distance',finish:'power',delivery:'short',
  order:[7,2,0],length:'medium',weight:8,kinds:['distance'],style:'knuckle',title:'Flatterball',
  routes:{
   0:[[0,7,-15],[1.6,6.5,-17.6],[3.4,5.6,-21],[4.3,5,-22.6],[4.9,4.8,-23.5],[5.4,4.6,-24.3],[6.4,4,-25.8]],
   2:[[0,22,-20],[1.3,19.2,-24],[3.2,15.4,-27],[5.4,14,-32]],
   7:[[0,8,-21],[.4,8.4,-21.4],[2,9,-25],[5.4,8,-30]]},
  beats:[[.4,1.3],[3.2,4.3]],
  flight:{post:0,goal:[1.78,1.42],bend:[.2,-.1],rise:[1.35,1.1],wobble:[.42,.2],rate:1.5}},
 {id:'dream_backheel_left',sims:['normal','low_driven'],mirror:'dream_backheel_right',family:'cutback',finish:'backheel',delivery:'driven',
  order:[3,1,0],length:'medium',weight:9,kinds:['cutback'],style:'backheel',title:'Hackentor',direct:true,
  routes:{
   0:[[0,3,-33],[2,2.8,-37.2],[3.6,2.3,-40.6],[4.6,.3,-44.6],[5.15,-1.15,-46.75],[5.4,-1.4,-47.15],[6.3,-1.8,-47.6]],
   1:[[0,-22,-24],[1.25,-21.5,-29],[2.4,-20.5,-36],[3.5,-18.7,-43],[4.45,-16.9,-48.3],[5.4,-15.8,-49.6]],
   3:[[0,-4,-22],[.4,-4.2,-22.5],[2.5,-3,-30],[5.4,2.6,-40.8]]},
  beats:[[.4,1.25],[4.45,5.4]],arcs:[.06,.09],
  contact:[.12,.13,-37.32],
  flight:{post:1,goal:[1.42,.3],bend:[.25,.15],rise:[.12,.06],rate:3.2}},
 {id:'dream_bicycle_right',sims:['header','volley'],mirror:'dream_bicycle_left',family:'cross',finish:'bicycle',delivery:'cross',
  order:[3,2,0],length:'medium',weight:5,kinds:['cross'],style:'bicycle',title:'Fallrückzieher',direct:true,
  routes:{
   0:[[0,-1,-30],[2,-.6,-35],[3.6,.7,-39.5],[4.6,1,-41.7],[5.4,.6,-42.6],[6.6,.5,-43.2]],
   2:[[0,23,-23],[1.4,22.5,-28],[2.6,22,-34],[3.85,21,-40.5],[5.4,20,-43]],
   3:[[0,3,-22],[.4,3.2,-22.4],[2.4,5,-28],[5.4,6.5,-36]]},
  beats:[[.4,1.4],[3.85,5.4]],arcs:[.06,3.1],
  flight:{post:0,goal:[2.32,1.38],bend:[0,0],rise:[.5,.3],rate:2}},
 {id:'dream_diving_header_right',sims:['header'],mirror:'dream_diving_header_left',family:'cross',finish:'header',delivery:'driven',
  order:[6,5,0],length:'medium',weight:7,kinds:['cross'],style:'dive',title:'Flugkopfball',direct:true,
  routes:{
   0:[[0,2,-31],[2,1.5,-36],[3.8,2.8,-41],[4.8,3.25,-44.2],[5.4,3,-45.6],[5.95,2.8,-46.9],[6.6,2.7,-47.25]],
   5:[[0,27,-15],[1.5,26.6,-21],[2.8,25.4,-31],[4.25,22.5,-41.8],[5.4,21,-44]],
   6:[[0,8,-16],[.4,8.2,-16.4],[2,9,-21],[5.4,9.5,-30]]},
  beats:[[.4,1.5],[4.25,5.4]],arcs:[.06,.42],
  contact:[0,.62,-37.78],
  flight:{post:0,goal:[2.42,.62],bend:[0,0],rise:[.05,0],rate:2.4}},
 {id:'dream_layoff_volley',sims:['power','normal','volley'],family:'distance',finish:'volley',delivery:'loft',
  order:[6,4,3,0],length:'long',weight:7,kinds:['distance'],style:'volley',title:'Ablage-Volley',direct:true,
  routes:{
   0:[[0,-4,-18],[1.6,-3.2,-21.5],[3.4,-2,-26],[4.6,-1.6,-28.6],[5.4,-1.5,-30],[6.4,-1.2,-31.6]],
   3:[[0,1,-26],[1.8,1.4,-36],[3.2,1,-41],[4,1.2,-41.6],[5.4,2,-42]],
   4:[[0,-26,-16],[.6,-26,-18],[1.3,-25.6,-24],[2,-25,-30],[5.4,-23,-36]],
   6:[[0,-10,-14],[.4,-10,-14.6],[2.4,-8,-19],[5.4,-6.5,-25]]},
  beats:[[.4,1.3],[2,3.2],[3.45,5.4]],arcs:[.06,2.7,1.75],
  flight:{post:0,goal:[2.88,2.04],bend:[0,0],rise:[.95,.55],rate:1.5}}
];
const mirrorPoint=([t,x,z])=>[t,-x,z];
function mirrored(def){
 const routes={};for(const [k,v] of Object.entries(def.routes))routes[k]=v.map(mirrorPoint);
 // Wide actors swap with the wing: 1<->2, 4<->5, 6<->7.
 const swap={1:2,2:1,4:5,5:4,6:7,7:6};
 const swapped={};for(const [k,v] of Object.entries(routes))swapped[swap[k]??k]=v;
 return{...def,id:def.mirror,mirror:undefined,order:def.order.map(a=>swap[a]??a),routes:swapped,
  foot:def.foot==='Left'?'Right':def.foot==='Right'?'Left':def.foot,
  contact:def.contact?[-def.contact[0],def.contact[1],def.contact[2]]:undefined,
  flight:{...def.flight,post:-def.flight.post,bend:def.flight.bend.map(x=>-x),wobble:def.flight.wobble?[-def.flight.wobble[0],def.flight.wobble[1]]:undefined}};
}
const DEFS=Object.freeze(BASE.flatMap(d=>d.mirror?[d,mirrored(d)]:[d]).map(d=>Object.freeze(d)));
const BY_ID=new Map(DEFS.map(d=>[d.id,d]));
export const DREAM_GOAL_IDS=Object.freeze(DEFS.map(d=>d.id));
export const DREAM_CATALOG=Object.freeze(DEFS.map(d=>Object.freeze([d.id,d.family,d.weight,d.finish,d.delivery,Object.freeze([...d.order]),d.length])));
export const DREAM_STORIES=Object.freeze(Object.fromEntries(DEFS.map(d=>[d.id,Object.freeze({routes:d.routes,beats:d.beats,arcs:d.arcs||null,direct:!!d.direct})])));
export const DREAM_RULES=Object.freeze(Object.fromEntries(DEFS.map(d=>[d.id,Object.freeze({kinds:d.kinds,sims:d.sims,foot:d.foot||'',style:d.style,title:d.title,finish:d.finish})])));
export const isDreamGoal=id=>BY_ID.has(String(id));
export const dreamGoal=id=>BY_ID.get(String(id))||null;
export const dreamFinish=id=>BY_ID.get(String(id))?.finish||null;
export const dreamStyle=id=>BY_ID.get(String(id))?.style||'';
// Playback rate of the 5.4-6.65 s shot window: a flick from four metres
// must not take as long as a shot from thirty.
export const dreamShotRate=id=>BY_ID.get(String(id))?.flight.rate||1.5;
export const dreamContact=id=>BY_ID.get(String(id))?.contact||null;
// The simulator's placement picks the side unless the technique has its own:
// a Robben curler always goes to the far post. Height/width are the scene's.
export function dreamImpact(id,type,sign,placement){
 const d=BY_ID.get(String(id));if(!d)return null;
 const f=d.flight,s=f.post||sign||1;
 if(type!=='goal')return{sign:s};
 if(placement?.style)return{sign:s};
 return{sign:s,point:[s*f.goal[0],f.goal[1],-54.25]};
}
// Cubic flight from the boot to the impact point. Control points sit at a
// third and two thirds of the straight line plus the scene's bend and rise.
export function dreamFlightPoint(id,contact,impact,s){
 const d=BY_ID.get(String(id));if(!d)return null;
 const f=d.flight,u=clamp(s),k=1-u;
 const line=w=>contact.map((v,i)=>v+(impact[i]-v)*w);
 // The bend only belongs to shots on target width; a wild miss keeps less.
 const reach=Math.abs(impact[0])>4.2?.55:1;
 const p1=line(1/3),p2=line(2/3);
 p1[0]+=f.bend[0]*reach;p2[0]+=f.bend[1]*reach;p1[1]+=f.rise[0];p2[1]+=f.rise[1];
 const out=[0,1,2].map(i=>k*k*k*contact[i]+3*k*k*u*p1[i]+3*k*u*u*p2[i]+u*u*u*impact[i]);
 if(f.wobble){
  // Knuckle ball: no spin, so the air shoves it sideways and up/down.
  const grow=smooth(u/.35);
  out[0]+=f.wobble[0]*grow*Math.sin(u*Math.PI*3.1)*(1-u*u*.6);
  out[1]+=f.wobble[1]*grow*Math.sin(u*Math.PI*4.3);
 }
 out[1]=Math.max(.11,out[1]);
 return out;
}
// Curve parameter at which the flight crosses the keeper's line (z).
export function dreamGateParam(id,contact,impact,lineZ){
 if(!(impact[2]<lineZ&&contact[2]>lineZ))return 1;
 let a=0,b=1;
 for(let i=0;i<32;i++){const m=(a+b)/2,p=dreamFlightPoint(id,contact,impact,m);if(p[2]>lineZ)a=m;else b=m}
 return(a+b)/2;
}
// Scorer's body over the finish for the techniques the shared kick has not got.
// Same contract as bicycleKickPose (3d-highlights-scene.mjs): pitch (backwards
// turn, rad; negative = forwards), lift and back (pelvis, m), legs [thigh,knee]
// per leg (1 = kicking), arms (spread). null = nothing to add.
export function dreamFinishPose(id,time){
 const style=dreamStyle(id);
 if(style==='dive'){
  // Flugkopfball: two strides of take-off, flat in the air at the contact,
  // lands on the chest, slides, pushes up and gets to his feet.
  const weight=smooth((time-4.95)/.16)*(1-smooth((time-6.75)/.3));
  if(weight<=0)return null;
  const launch=smooth((time-5.05)/.3),land=smooth((time-5.52)/.16),push=smooth((time-6.05)/.38),stand=smooth((time-6.38)/.42);
  const pitch=-(mix(.25*smooth((time-4.95)/.12)+1.2*launch,1.42,land)*(1-push*.55))*(1-stand);
  const lift=(mix(.18*Math.sin(Math.PI*clamp((time-5.05)/.5)),-.58,land)*(1-push)+push*-.3)*(1-stand);
  const legs=[[mix(-.15,-.35,launch),mix(-.4,-.25,launch)],[mix(.2,-.55,launch),mix(-.9,-.45,launch)]]
   .map(([thigh,knee])=>[mix(thigh,1.35,push)*(1-stand),mix(knee,-1.9,push)*(1-stand)]);
  return{weight,pitch,lift,back:0,legs,arms:mix(.35,1.25,land)*(1-push)*(1-stand)+.2};
 }
 if(style==='backheel'){
  // Hackentrick: the trailing leg swings back past the standing leg, the
  // heel meets the ball at 5.4 s, the foot follows up behind the body.
  const weight=smooth((time-5.02)/.16)*(1-smooth((time-5.85)/.25));
  if(weight<=0)return null;
  const load=smooth((time-5.04)/.2),flick=smooth((time-5.28)/.14),follow=smooth((time-5.42)/.24);
  const thigh=mix(mix(.05,.42,load),-.38,flick)*(1-.35*follow),knee=mix(mix(-.25,-.55,load),-1.05,flick)*(1-.25*follow);
  return{weight,pitch:-.08*load,lift:0,back:0,legs:[[-.08,-.3],[thigh,knee]],arms:.42*load};
 }
 return null;
}
// Faces the scorer for his technique: the heel flick turns his back to the
// goal (he runs at the ball), the others shoot facing the goal.
export const dreamFacesAway=id=>{const s=dreamStyle(id);return s==='backheel'||s==='bicycle'};
