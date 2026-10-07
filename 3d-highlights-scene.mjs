import * as THREE from './vendor/three/three.module.min.js';

// Frozen presentation data only. No live match, result callbacks or simulation RNG.
export const DURATION=10.4;
export const SHOT_TIME=5.4;
export const IMPACT_TIME=6.65;
export const REVEAL_TIME=6.8;
export const PITCH=Object.freeze({width:68,length:105,goalWidth:7.32,goalHeight:2.44});
export const MIN_CAMERA_DISTANCE=43.4;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
// Private stateless visual noise, including textures/crowd. Never Math.random.
const hash=n=>{n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return ((n^(n>>>16))>>>0)/4294967296};
export const worldPosition=(p,direction=1)=>[p[0]*direction,p[1],p[2]*direction];
export function kickPose(time){
 const t=time-SHOT_TIME;
 if(t<-.5)return{hip:0,knee:0};
 if(t<-.22)return{hip:mix(0,-.8,(t+.5)/.28),knee:mix(0,-.8,(t+.5)/.28)};
 if(t<=0)return{hip:mix(-.8,.75,(t+.22)/.22),knee:mix(-.8,-.05,(t+.22)/.22)};
 if(t<.18)return{hip:mix(.75,1.08,t/.18),knee:-.05};
 return{hip:mix(1.08,0,(t-.18)/.45),knee:mix(-.05,0,(t-.18)/.45)};
}
export function shotFootPosition(time=SHOT_TIME){
 const {hip,knee}=kickPose(time);
 return [.105,.94-.43*Math.cos(hip)-.43*Math.cos(hip+knee)-.045,-37-.43*Math.sin(hip)-.43*Math.sin(hip+knee)-.24];
}
export const PLAY_SEQUENCES=Object.freeze(['central','one_two','through_ball','dribble','wing_left','wing_right','cutback_left','cutback_right']);
export function normalizeSequence(value){return PLAY_SEQUENCES.includes(String(value))?String(value):'central'}
const sequenceSide=sequence=>sequence.endsWith('_left')?-1:sequence.endsWith('_right')?1:1;
function movingBall(a,b,u,arc=0){const t=smooth(u),p=lerp(a,b,t);p[1]=mix(a[1],b[1],t)+arc*Math.sin(clamp(u)*Math.PI);return p}
function carriedBall(index,time,sequence,lead=.56){
 const [x,z]=runPosition(index,time,sequence),before=runPosition(index,Math.max(0,time-.1),sequence),after=runPosition(index,time+.1,sequence);
 const dx=after[0]-before[0],dz=after[1]-before[1],length=Math.max(.001,Math.hypot(dx,dz)),ux=dx/length,uz=dz/length;
 const cadence=7.4+Math.min(2.2,length*7),touch=Math.sin(time*cadence)*.11;
 return[x+ux*lead-uz*touch,.12+.035*Math.abs(Math.sin(time*cadence)),z+uz*lead+ux*touch];
}
export function ballPosition(type,time,sequence='central'){
 const contact=shotFootPosition(),seq=normalizeSequence(sequence);
 if(time<SHOT_TIME){
  if(seq==='wing_left'||seq==='wing_right'||seq==='cutback_left'||seq==='cutback_right'){
   const side=sequenceSide(seq),cutback=seq.startsWith('cutback');
   if(time<3.65)return carriedBall(1,time,seq,.56);
   const deliveryStart=carriedBall(1,3.65,seq,.56),deliveryEnd=[contact[0],cutback?.14:.35,contact[2]+.45];
   if(time<SHOT_TIME-.2)return movingBall(deliveryStart,deliveryEnd,(time-3.65)/(SHOT_TIME-.2-3.65),cutback?.08:2.15);
   return movingBall(deliveryEnd,contact,(time-(SHOT_TIME-.2))/.2,cutback?.02:.08)
  }
  if(seq==='one_two'){
   if(time<1.8)return movingBall([-12,.12,-22],[-2,.12,-29.6],time/1.8,.1);
   if(time<2.65)return movingBall([-2,.12,-29.6],[-8,.12,-32.6],(time-1.8)/.85,.08);
   if(time<4.65)return movingBall([-8,.12,-32.6],[-.4,.12,-36.25],(time-2.65)/2,.13);
   return movingBall([-.4,.12,-36.25],contact,(time-4.65)/(SHOT_TIME-4.65),.03)
  }
  if(seq==='through_ball'){
   if(time<2.35){const u=time/2.35,p=movingBall([-13,.12,-21.5],[-9,.12,-28.2],u,0);p[1]+=.025*Math.abs(Math.sin(u*4*Math.PI));return p}
   if(time<4.65)return movingBall([-9,.12,-28.2],[-.4,.12,-35.7],(time-2.35)/2.3,.18);
   return movingBall([-.4,.12,-35.7],contact,(time-4.65)/(SHOT_TIME-4.65),.025)
  }
  if(seq==='dribble'){
   const carryTime=Math.min(time,SHOT_TIME-.2),p=carriedBall(0,carryTime,seq,.58);
   if(time<SHOT_TIME-.2)return p;
   return movingBall(p,contact,(time-(SHOT_TIME-.2))/.2,.02)
  }
  // Central combination retained as one of several possible build-ups.
  if(time<2){const u=time/2;return movingBall([-13,.12,-21.6],[-10,.12,-28.6],u,0)}
  if(time<3.1)return movingBall([-10,.12,-28.6],[-1,.12,-32],(time-2)/1.1,.12);
  const carryTime=Math.min(time,SHOT_TIME-.24),carry=carriedBall(0,carryTime,seq,mix(.68,.56,clamp((carryTime-3.1)/(SHOT_TIME-3.1))));
  if(time<SHOT_TIME-.24)return carry;
  return movingBall(carry,contact,(time-(SHOT_TIME-.24))/.24,.02)
 }
 const impact=type==='big_chance_saved'?[2.52,1.14,-50.6]:type==='shot_post'?[3.52,1.25,-52.5]:type==='big_chance_missed'?[5.1,1.5,-53.4]:[2.65,1.08,-54.25];
 const t=clamp((time-SHOT_TIME)/(IMPACT_TIME-SHOT_TIME));
 if(t<1){const p=lerp(contact,impact,t);p[1]+=.65*Math.sin(t*Math.PI);return p}
 if(type==='goal'){const p=lerp(impact,[2.5,.12,-53.75],(time-IMPACT_TIME)/.85);p[1]+=.12*Math.abs(Math.sin((time-IMPACT_TIME)*7));return p}
 if(type==='big_chance_saved'){const u=clamp((time-IMPACT_TIME)/1.35),p=lerp(impact,[7,.12,-46],u);p[1]+=.5*Math.sin(u*Math.PI);return p}
 if(type==='shot_post')return lerp(impact,[8,.12,-45],(time-IMPACT_TIME)/1.35);
 return lerp(impact,[8,.12,-60],(time-IMPACT_TIME)/1.4);
}
// Every camera is on the SAME world touchline. Only its target follows the attack.
// There is no event-dependent camera side, orbit, result zoom or celebration cut.
export function cameraState(direction,time,aspect=1.3,type='goal',sequence='central'){
 const seq=normalizeSequence(sequence),bp=worldPosition(ballPosition(type,time,seq),direction),goal=worldPosition([0,.86,-51.25],direction);
 const portraitPad=Math.max(0,1.25-aspect)*8.5;
 let targetX=0,targetY=.82,targetZ=0,distance=50,fov=28,phase='build';
 const wide=seq.startsWith('wing_')||seq.startsWith('cutback_');
 if(wide){
  // Keep the live winger, moving ball and box in one continuous TV frame.
  // Timing matches the actual carry (to 3.65 s), delivery (to 5.20 s) and finish.
  const deliveryAt=3.65,finishAt=SHOT_TIME-.2;
  const carrierAt=sample=>{const p=runPosition(1,sample,seq);return worldPosition([p[0],.84,p[1]],direction)};
  const ballAt=sample=>worldPosition(ballPosition(type,sample,seq),direction);
  const buildTarget=sample=>{const c=carrierAt(sample),u=smooth(sample/deliveryAt),gw=.28+.08*u;return[mix(c[0],goal[0],gw),.80,mix(c[2],goal[2],.18+.08*u)]};
  const deliveryDesired=(sample,u)=>{const c=carrierAt(sample),b=ballAt(sample),mid=[mix(c[0],b[0],.48),.84,mix(c[2],b[2],.48)],gw=.10+.20*u;return[mix(mid[0],goal[0],gw),mix(.82,.90,u),mix(mid[2],goal[2],gw)]};
  const buildEnd=buildTarget(deliveryAt);
  if(time<deliveryAt){
   [targetX,targetY,targetZ]=buildTarget(time);distance=53.8+portraitPad;fov=30.4;phase='build';
  }else if(time<finishAt){
   const u=smooth((time-deliveryAt)/(finishAt-deliveryAt)),desired=deliveryDesired(time,u),anchored=lerp(buildEnd,desired,u);
   [targetX,targetY,targetZ]=anchored;distance=mix(53.8+portraitPad,50.5+portraitPad*.55,u);fov=mix(30.4,29.3,u);phase='delivery';
  }else{
   const deliveryEnd=deliveryDesired(finishAt,1),u=smooth((time-finishAt)/1.25),shooterLocal=runPosition(0,time,seq),shooter=worldPosition([shooterLocal[0],.88,shooterLocal[1]],direction),action=[mix(shooter[0],bp[0],.58),.92,mix(shooter[2],bp[2],.58)],desired=[mix(action[0],goal[0],.38),mix(.92,1.0,u),mix(action[2],goal[2],.38)],anchored=lerp(deliveryEnd,desired,u);
   [targetX,targetY,targetZ]=anchored;distance=mix(50.5+portraitPad*.55,MIN_CAMERA_DISTANCE+portraitPad*.30,u);fov=mix(29.3,26.2,u);phase='finish';
  }
 }else{
  const actorIndex=seq==='one_two'&&time<3.0?1:0,actorLocal=runPosition(actorIndex,time,seq),actor=worldPosition([actorLocal[0],.84,actorLocal[1]],direction);
  const push=smooth((time-.8)/4.55),ballWeight=seq==='through_ball'?.72:seq==='dribble'?.76:seq==='one_two'?.62:.68;
  targetX=mix(actor[0],bp[0],ballWeight);
  targetZ=mix(actor[2],bp[2],ballWeight);
  const goalWeight=mix(seq==='through_ball'?.10:.06,.38,push);
  targetX=mix(targetX,goal[0],goalWeight);targetZ=mix(targetZ,goal[2],goalWeight);
  const startDistance=seq==='through_ball'?52.2:seq==='one_two'?51.6:seq==='dribble'?50.6:51.2;
  distance=mix(startDistance+portraitPad,MIN_CAMERA_DISTANCE+portraitPad*.30,push);
  fov=mix(seq==='through_ball'?29.3:29.0,26.0,push);
  targetY=mix(.76,.98,push);phase=time<3.2?'build':time<5.05?'delivery':'finish';
 }
 // Permanent elevated touchline camera: framing changes, camera side never does.
 const sideline=55.0,height=32.8,trail=wide?(time<3.65?5.9:time<SHOT_TIME-.2?mix(5.9,5.1,smooth((time-3.65)/(SHOT_TIME-.2-3.65))):5.1):4.8,length=Math.hypot(sideline,height,trail),scale=distance/length;
 return{position:[sideline*scale,height*scale,targetZ+trail*direction*scale],target:[targetX,targetY,targetZ],fov,distance,phase};
}
const LABELS={goal:'TOR',big_chance_saved:'PARADE',big_chance_missed:'SCHUSS VORBEI',shot_post:'PFOSTEN'};
const hex=(value,fallback)=>/^#[a-f0-9]{6}$/i.test(value)?value:fallback;
export function kitColors(event){
 const validPattern=v=>['solid','stripes','hoops','diagonal','halves','sleeves','center','pinstripes','quarters','chevron','chestband','shoulders','sidepanels'].includes(String(v))?String(v):'solid';
 const home={shirt:hex(event.homeColor,'#971d42'),shirtSecondary:hex(event.homeSecondary,event.homeColor||'#971d42'),pattern:validPattern(event.homePattern),shorts:hex(event.homeShorts,'#f3f4ee'),socks:hex(event.homeSocks,'#971d42')};
 let away={shirt:hex(event.awayColor,'#f2f3f4'),shirtSecondary:hex(event.awaySecondary,event.awayColor||'#f2f3f4'),pattern:validPattern(event.awayPattern),shorts:hex(event.awayShorts,'#172b49'),socks:hex(event.awaySocks,'#f2f3f4')};
 const h=new THREE.Color(home.shirt),a=new THREE.Color(away.shirt);
 // Never repaint a saved opponent kit. Generated opponents without an identity
 // still receive a contrast fallback so the configured user kit remains exact.
 if(Math.hypot(h.r-a.r,h.g-a.g,h.b-a.b)<.5&&!event.awayKitConfigured)away=(h.r+h.g+h.b)>1.2?{shirt:'#153564',shirtSecondary:'#d7e7ff',pattern:'solid',shorts:'#153564',socks:'#153564'}:{shirt:'#f7f3db',shirtSecondary:'#263940',pattern:'solid',shorts:'#f7f3db',socks:'#f7f3db'};
 const keeper=['#f4b52b','#10bda7','#bc63e8'].find(c=>{const k=new THREE.Color(c);return [h,new THREE.Color(away.shirt)].every(t=>Math.hypot(k.r-t.r,k.g-t.g,k.b-t.b)>.55)})||'#42e2ee';
 return{home,away,keeper};
}
export function crowdReactionState(type,attackTeam,supporterTeam,time){
 const supporter=supporterTeam==='home'||supporterTeam==='away'?supporterTeam:'neutral',attacking=supporter===attackTeam;
 const suspense=smooth((time-(SHOT_TIME-.85))/.72)*(1-smooth((time-IMPACT_TIME)/.22));
 const after=smooth((time-IMPACT_TIME)/.38),fade=Math.max(.22,1-smooth((time-(DURATION-1.35))/1.1));
 let mood=0;
 if(supporter==='neutral')mood=type==='goal'?.34:type==='big_chance_saved'?.2:.12;
 else if(type==='goal')mood=attacking?1:-.55;
 else if(type==='big_chance_saved')mood=attacking?-.5:.78;
 else if(type==='shot_post')mood=attacking?-.68:.34;
 else mood=attacking?-.48:.28;
 return{suspense,mood:mood*after*fade};
}
function skinTone(name='',offset=0){const tones=['#ecc2a0','#dca17d','#bd7b59','#8d5a3e','#6d422e'];let n=offset;for(const c of name)n=(n*33+c.charCodeAt(0))>>>0;return tones[n%tones.length]}

// Root paths are independent of the result until the finish. Distances/time keep
// the carrying player, chasing line, support runs and ball in the same phase.
export const RUNS=Object.freeze([
 {role:'striker',team:'attack',from:[-2,-26],to:[0,-37]},
 {role:'passer',team:'attack',from:[-13,-20.9],to:[-10,-27.9]},
 {role:'runner-left',team:'attack',from:[-17,-31],to:[-11,-43]},
 {role:'runner-right',team:'attack',from:[13,-29],to:[9,-44]},
 {role:'far-wing',team:'attack',from:[26,-23],to:[23,-38]},
 {role:'overlap',team:'attack',from:[-26,-21],to:[-24,-34]},
 {role:'support',team:'attack',from:[4,-15],to:[3,-25]},
 {role:'cover',team:'attack',from:[17,-8],to:[15,-19]},
 {role:'centre-back',team:'defend',from:[2,-35],to:[1,-41]},
 {role:'left-back',team:'defend',from:[-14,-37],to:[-10,-45]},
 {role:'right-back',team:'defend',from:[12,-36],to:[8,-46]},
 {role:'cover-back',team:'defend',from:[-5,-40],to:[-3,-47]},
 {role:'midfield',team:'defend',from:[6,-26],to:[4,-34]},
 {role:'wide-midfield',team:'defend',from:[22,-27],to:[20,-38]},
 {role:'chaser',team:'defend',from:[-17,-25],to:[-14,-32]},
 {role:'second-line',team:'defend',from:[-7,-16],to:[-6,-27]}
]);
export function runPosition(index,time,sequence='central'){
 const r=RUNS[index],seq=normalizeSequence(sequence);
 if(index===0){
  if(seq==='dribble'){
   const u=clamp(time/SHOT_TIME),z=mix(-25.5,-37,u),x=u<.35?mix(-7,-3,smooth(u/.35)):u<.7?mix(-3,2.4,smooth((u-.35)/.35)):mix(2.4,0,smooth((u-.7)/.3));
   if(time<=SHOT_TIME)return[x,z];return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
  }
  if(seq.startsWith('wing_')||seq.startsWith('cutback_')){
   if(time<3.25)return lerp([1,-26],[1,-31.2],smooth(time/3.25));
   if(time<=SHOT_TIME)return lerp([1,-31.2],[0,-37],smooth((time-3.25)/(SHOT_TIME-3.25)));
   return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
  }
  if(seq==='one_two'){
   if(time<1.8)return lerp([-2,-26],[-2,-29.3],smooth(time/1.8));
   if(time<2.65)return lerp([-2,-29.3],[-1,-30.6],smooth((time-1.8)/.85));
   if(time<=SHOT_TIME)return lerp([-1,-30.6],[0,-37],smooth((time-2.65)/(SHOT_TIME-2.65)));
   return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
  }
  if(seq==='through_ball'){
   if(time<2.35)return lerp([-2,-25.5],[-1.8,-29],smooth(time/2.35));
   if(time<=SHOT_TIME)return lerp([-1.8,-29],[0,-37],smooth((time-2.35)/(SHOT_TIME-2.35)));
   return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
  }
  if(time<3.1)return lerp([-2,-26],[-1,-31.2],smooth(time/3.1));
  if(time<=SHOT_TIME){const u=clamp((time-3.1)/(SHOT_TIME-3.1)),t=u<.18?smooth(u/.18)*.18:u;return lerp([-1,-31.2],[0,-37],t)}
  return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
 }
 if(index===1){
  if(seq.startsWith('wing_')||seq.startsWith('cutback_')){
   const side=sequenceSide(seq),cutback=seq.startsWith('cutback'),wideStart=[side*23,-20.5],target=[side*(cutback?27:25.5),cutback?-48:-44.5];
   // The winger now runs predominantly forward along the touchline. This removes
   // the sideways skating caused by translating him from a central spawn.
   if(time<3.65)return lerp(wideStart,target,smooth(time/3.65));
   return lerp(target,[side*(cutback?26.2:24.8),target[1]-.8],smooth((time-3.65)/2.4))
  }
  if(seq==='one_two'){if(time<2.65)return lerp([-12,-22],[-8,-32.6],smooth(time/2.65));return lerp([-8,-32.6],[-5,-38],smooth((time-2.65)/3.7))}
  if(seq==='through_ball'){if(time<2.35)return lerp([-13,-21.5],[-9,-28.2],smooth(time/2.35));return lerp([-9,-28.2],[-7,-34],smooth((time-2.35)/4.2))}
  if(seq==='dribble')return lerp([-12,-23],[-8,-34],smooth(time/6.2));
  if(time<2)return lerp(r.from,r.to,smooth(time/2));return lerp(r.to,[-8,-35],smooth((time-2)/5.2))
 }
 const u=clamp(time/6.9),p=lerp(r.from,r.to,smooth(u)),bend=(hash(index*73+11)-.5)*(r.team==='attack'?1.45:1.05)*Math.sin(u*Math.PI);
 if(seq.startsWith('wing_')||seq.startsWith('cutback_')){const side=sequenceSide(seq);if(r.team==='attack'&&[2,3,4,5].includes(index))p[0]+=side*(index%2?.8:1.6)*Math.sin(u*Math.PI)}
 p[0]+=bend;p[1]+=Math.sin(u*Math.PI*2+hash(index+91)*Math.PI)*.2*Math.sin(u*Math.PI);
 return p;
}
export function keeperPose(type,time){
 const anticipation=smooth((time-SHOT_TIME-.18)/.22),dive=smooth((time-SHOT_TIME-.4)/.85),land=smooth((time-IMPACT_TIME-.12)/.85),recover=smooth((time-7.55)/1.45);
 const save=type==='big_chance_saved',rotation=(1.13*dive+land*.35)*(1-recover),peak=save?1.05:.8;
 // Takeoff, airborne extension, landing and recovery are separate phases. Contact
 // remains fixed by the authoritative event; recovery only improves presentation.
 return{x:mix(mix(.1,peak,dive),.35,recover),y:.5*Math.sin(dive*Math.PI/2)*(1-land),z:mix(-50.6,-50.2,recover),
  tilt:rotation, anticipation, dive, land, recover};
}
// Smooth oval loft, reused by every instance of a given anatomical part.
// UVs project onto front/back so every club pattern keeps its intended shape.
export function athleticGeometry(rings,segments=14){
 const vertices=[],uv=[],indices=[],min=rings[0][0],height=rings[rings.length-1][0]-min;
 for(let j=0;j<rings.length;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,[y,rx,rz]=rings[j];
  vertices.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push((Math.sin(a)+1)/2,(y-min)/height);
  if(j&&i){const b=j*(segments+1)+i;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function stanceHeight(hipA,kneeA,hipB,kneeB){
 const sole=(hip,knee)=>.94-.43*Math.cos(hip)-.483*Math.cos(hip+knee)+.06*Math.sin(hip+knee);
 return -Math.min(sole(hipA,kneeA),sole(hipB,kneeB));
}
export function makeScene(renderer,event,weak=false,high=false,mobileStandard=false){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#16262b');scene.fog=new THREE.Fog('#1b2d31',148,286);
 const camera=new THREE.PerspectiveCamera(28,1,.5,350);
 const resources=new Set(),track=o=>(resources.add(o),o);
 const direction=event.attackDirection===-1?-1:1,sequence=normalizeSequence(event.sequence);
 // All match-space objects, pitch markings and both goals share one transform.
 const field=new THREE.Group();field.rotation.y=direction===1?0:Math.PI;scene.add(field);
 try{
  const geometry=new Map(),materials=new Map(),staticBoxes=[];
  function geo(key,create){if(!geometry.has(key))geometry.set(key,track(create()));return geometry.get(key)}
  function mat(color,opts={}){const key=JSON.stringify([color,opts]);if(!materials.has(key))materials.set(key,track(opts.basic?new THREE.MeshBasicMaterial({color,...opts}):new THREE.MeshStandardMaterial({color,roughness:.85,...opts})));return materials.get(key)}
  function mesh(g,m,parent=field){const o=new THREE.Mesh(g,m);parent.add(o);return o}
  function box(w,h,d,color,x=0,y=0,z=0,parent=field){const o=mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),mat(color),parent);o.scale.set(w,h,d);o.position.set(x,y,z);staticBoxes.push(o);return o}
  function cylinder(top,bottom,height,color,x,y,z,parent=field){const key=`c:${top}:${bottom}`;const o=mesh(geo(key,()=>new THREE.CylinderGeometry(top,bottom,1,10)),mat(color),parent);o.scale.y=height;o.position.set(x,y,z);return o}
  function ellipsoid(w,h,d,color,x,y,z,parent=field){const o=mesh(geo('sphere',()=>new THREE.SphereGeometry(1,12,10)),mat(color),parent);o.scale.set(w,h,d);o.position.set(x,y,z);return o}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=track(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;return tex}
  // Small, deterministic cloth maps wrap a continuous athletic torso. Saved
  // colours/patterns remain the source; there are no floating pattern boxes.
  const shirtMaterials=new Map();
  function shirtMaterial(kit){
   const key=JSON.stringify(kit);if(shirtMaterials.has(key))return shirtMaterials.get(key);
   const map=canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,w,h);ctx.fillStyle=kit.shirtSecondary;
    const rect=(x,y,a,b)=>ctx.fillRect(x*w,y*h,a*w,b*h);
    switch(kit.pattern){
     case 'stripes':for(const x of [.19,.47,.75])rect(x,0,.08,1);break;
     case 'pinstripes':for(const x of [.16,.32,.48,.64,.8])rect(x,0,.022,1);break;
     case 'hoops':for(const y of [.18,.45,.72])rect(0,y,1,.09);break;
     case 'halves':rect(.5,0,.5,1);break;
     case 'quarters':rect(.5,0,.5,.5);rect(0,.5,.5,.5);break;
     case 'center':rect(.38,0,.24,1);break;
     case 'chestband':rect(0,.30,1,.19);break;
     case 'shoulders':rect(0,0,1,.20);break;
     case 'sidepanels':rect(0,0,.16,1);rect(.84,0,.16,1);break;
     case 'diagonal':ctx.beginPath();ctx.moveTo(0,h*.06);ctx.lineTo(w,h*.80);ctx.lineTo(w,h*.96);ctx.lineTo(0,h*.22);ctx.fill();break;
     case 'chevron':ctx.beginPath();ctx.moveTo(0,h*.19);ctx.lineTo(w*.5,h*.43);ctx.lineTo(w,h*.19);ctx.lineTo(w,h*.32);ctx.lineTo(w*.5,h*.56);ctx.lineTo(0,h*.32);ctx.fill();break;
    }
    const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#00000035');shade.addColorStop(.28,'#ffffff08');shade.addColorStop(.65,'#ffffff04');shade.addColorStop(1,'#00000035');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;for(let y=1;y<h;y+=3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    ctx.strokeStyle='#00000025';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,h);ctx.quadraticCurveTo(28,h*.72,12,h*.55);ctx.moveTo(w-18,h);ctx.quadraticCurveTo(w-30,h*.8,w-12,h*.62);ctx.stroke();
    ctx.strokeStyle=kit.shirtSecondary;ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(w*.5,0,w*.14,h*.095,0,0,Math.PI);ctx.stroke();
   });map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   const material=track(new THREE.MeshStandardMaterial({map,roughness:.92,metalness:0}));shirtMaterials.set(key,material);return material;
  }
  const hemi=new THREE.HemisphereLight('#dce9f7','#31422a',1.3);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff5df',2.75);sun.position.set(-35,65,10);sun.target.position.set(0,0,-28*direction);scene.add(sun,sun.target);sun.castShadow=!weak;
  sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:160});sun.shadow.bias=-.00018;sun.shadow.normalBias=.018;
  const fill=new THREE.DirectionalLight('#c6ddff',weak?.24:.48);fill.position.set(40,18,-50);scene.add(fill);

  // One 1024px map covers the playing surface: visible mowing, broad soil/grass
  // variation and fine blade noise survive mip filtering without extra planes.
  const grass=canvasTexture(1024,1024,(ctx,w,h)=>{
   const pixels=ctx.createImageData(w,h),data=pixels.data;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const wx=x/w*78-39,wz=(1-y/h)*119-59.5,inside=Math.abs(wx)<34&&Math.abs(wz)<52.5;
    const stripe=inside?(Math.floor((wz+52.5)/7.5)%2?5:-5):-9;
    const broad=Math.sin(x*.018+y*.011)*1.0+Math.sin(y*.053-x*.021)*1.1;
    const fibre=(hash(y*w+x)-.5)*10,tuft=(hash(Math.floor(x/5)+Math.floor(y/5)*211)-.5)*2.4;
    const wear=Math.exp(-((Math.abs(wz)-50.2)**2/6+wx*wx/22))*4;
    const n=stripe+broad+fibre+tuft-wear,i=(y*w+x)*4;
    data[i]=63+n*.67;data[i+1]=120+n;data[i+2]=38+n*.45;data[i+3]=255;
   }ctx.putImageData(pixels,0,0);
  });grass.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const pitch=mesh(track(new THREE.PlaneGeometry(78,119)),track(new THREE.MeshStandardMaterial({map:grass,roughness:1})));pitch.rotation.x=-Math.PI/2;pitch.position.y=-.025;pitch.receiveShadow=true;
  const contactTexture=canvasTexture(64,64,(ctx,w,h)=>{const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gradient.addColorStop(0,'rgba(5,12,4,.6)');gradient.addColorStop(.3,'rgba(5,12,4,.35)');gradient.addColorStop(1,'rgba(5,12,4,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h)});
  const contactMaterial=track(new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:weak?.80:.58,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  // Surface ribbons (12 cm) stay legible at broadcast distance, unlike 1-pixel GL lines.
  const markings=[];
  function line(points,width=.12){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),nx=-dz/l*width/2,nz=dx/l*width/2;const p=[a[0]+nx,.018,a[1]+nz,a[0]-nx,.018,a[1]-nz,b[0]+nx,.018,b[1]+nz,b[0]-nx,.018,b[1]-nz];markings.push(...p.slice(0,9),...p.slice(3,6),...p.slice(9,12),...p.slice(6,9))}}
  function arc(cx,cz,r,start=0,end=Math.PI*2){const pts=[];for(let i=0;i<=80;i++){const a=mix(start,end,i/80);pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}line(pts)}
  line([[-34,-52.5],[34,-52.5],[34,52.5],[-34,52.5],[-34,-52.5]]);line([[-34,0],[34,0]]);arc(0,0,9.15);arc(0,0,.12);
  for(const sign of [-1,1]){
   line([[-20.16,52.5*sign],[-20.16,36*sign],[20.16,36*sign],[20.16,52.5*sign]]);
   line([[-9.16,52.5*sign],[-9.16,47*sign],[9.16,47*sign],[9.16,52.5*sign]]);
   arc(0,41.5*sign,.14);const pts=[];for(let i=0;i<=40;i++){const a=.645+(Math.PI-1.29)*i/40;pts.push([Math.cos(a)*9.15,sign*(41.5-Math.sin(a)*9.15)])}line(pts);
   for(const x of [-34,34]){const cx=x<0?0:Math.PI/2;arc(x,52.5*sign,1,sign<0?cx:Math.PI+cx,sign<0?cx+Math.PI/2:Math.PI*1.5+cx);cylinder(.025,.025,1.65,'#f4e4c5',x,.82,52.5*sign);box(.4,.3,.03,'#c11d3f',x+.2,1.5,52.5*sign)}
  }
  const mg=track(new THREE.BufferGeometry());mg.setAttribute('position',new THREE.Float32BufferAttribute(markings,3));mg.computeVertexNormals();mesh(mg,track(new THREE.MeshBasicMaterial({color:'#eff1db',side:THREE.DoubleSide})));
  function goal(z,sign){
   const g=new THREE.Group();field.add(g);g.position.z=z;g.rotation.y=sign===-1?0:Math.PI;
   const posts=mat('#f7faf7');for(const x of [-3.66,3.66]){const p=mesh(geo('post',()=>new THREE.CylinderGeometry(.06,.06,2.5,12)),posts,g);p.position.set(x,1.22,0);p.castShadow=!weak}
   const bar=mesh(geo('bar',()=>new THREE.CylinderGeometry(.06,.06,7.44,12)),posts,g);bar.position.y=2.44;bar.rotation.z=Math.PI/2;bar.castShadow=!weak;
   const net=[],seg=(a,b)=>net.push(...a,...b);
   for(let x=-3.66;x<=3.67;x+=.244){seg([x,0,-1.9],[x,2.44,-1.9]);seg([x,2.44,-1.9],[x,2.44,0])}
   for(let y=0;y<=2.45;y+=.2033){seg([-3.66,y,-1.9],[3.66,y,-1.9]);for(const x of [-3.66,3.66])seg([x,y,-1.9],[x,y,0])}
   for(let z=-1.9;z<=.001;z+=.2375){for(const x of [-3.66,3.66])seg([x,0,z],[x,2.44,z]);seg([-3.66,2.44,z],[3.66,2.44,z])}
   // Ground frame, rear stanchions and tension stays make the net a volume.
   const frame=[];for(const x of [-3.66,3.66]){frame.push(x,.045,0,x,.045,-1.95,x,.045,-1.95,x,2.47,-1.95,x,2.47,-1.95,x,2.44,0)}
   frame.push(-3.66,.045,-1.95,3.66,.045,-1.95);
   const fg=track(new THREE.BufferGeometry());fg.setAttribute('position',new THREE.Float32BufferAttribute(frame,3));g.add(new THREE.LineSegments(fg,track(new THREE.LineBasicMaterial({color:'#e2e5db'}))));
   const ng=track(new THREE.BufferGeometry());ng.setAttribute('position',new THREE.Float32BufferAttribute(net,3));const base=new Float32Array(net);
   const nm=track(new THREE.LineBasicMaterial({color:'#edf0e7',transparent:true,opacity:weak?.46:.56,depthWrite:false}));g.add(new THREE.LineSegments(ng,nm));
   return{geometry:ng,base};
  }
  const net=goal(-52.5,-1);goal(52.5,1);

  // V21.18 — broadcast crowd/stadium pass. Humans stay instanced and deterministic;
  // darker tiering, irregular spacing and segmented flags add depth without extra per-fan draw calls.
  box(100,.1,143,'#172126',0,-.15,0,scene);
  const crowdKits=kitColors(event),crowd=[],crowdRows=weak?8:mobileStandard?10:high?12:12,sideCols=weak?94:mobileStandard?144:high?204:170,endCols=weak?64:mobileStandard?102:high?148:120;
  const sideSupporter=z=>z<-22?'home':z>22?'away':'neutral';
  for(const side of [-1,1]){
   for(let row=0;row<12;row++){
    box(2.0,.64,119,row%2?'#172126':'#202c31',side*(39.3+row*1.42),.52+row*.72,0,scene);
    box(79,.64,2.0,row%2?'#172126':'#202c31',0,.52+row*.72,side*(59.4+row*1.42),scene);
    if(row<crowdRows){
     for(let col=0;col<sideCols;col++){
      const z=-56+col*(112/Math.max(1,sideCols-1));
      if(col%28>1)crowd.push({x:side*(39.3+row*1.42),y:1.13+row*.72,z,team:sideSupporter(z),row,zone:'side'});
     }
     for(let col=0;col<endCols;col++)if(col%26>1)crowd.push({x:-37+col*(74/Math.max(1,endCols-1)),y:1.13+row*.72,z:side*(59.4+row*1.42),team:side<0?'home':'away',row,zone:'end'});
    }
   }
   box(5,.3,122,'#132025',side*57,10.2,0,scene);box(112,.3,7,'#132025',0,10.2,side*80,scene);
   box(6,.35,126,'#0f191d',side*59,12.15,0,scene);box(118,.35,8,'#0f191d',0,12.15,side*82,scene);
   box(.16,.72,116,'#738184',side*38.25,1.02,0,scene);box(76,.72,.16,'#738184',0,1.02,side*58.25,scene);
   for(let z=-56;z<=56;z+=14)box(.16,8.5,.16,'#748285',side*57,5,z,scene);
  }
  // Rounded corner terraces connect the existing stands instead of leaving
  // a black rectangular void. Geometry shares the static stadium batches.
  for(const sx of [-1,1])for(const sz of [-1,1])for(let row=0;row<12;row++){
   const radius=2.3+row*1.42,count=8;
   for(let col=0;col<count;col++){
    const angle=(col+.5)/count*Math.PI/2,x=sx*(37+Math.cos(angle)*radius),z=sz*(57.1+Math.sin(angle)*radius);
    const terrace=box(radius*Math.PI/(2*count)+.20,.64,2,row%2?'#172126':'#202c31',x,.52+row*.72,z,scene);terrace.rotation.y=-sx*sz*angle-Math.PI/2;
    if(row<crowdRows){const slots=weak?1:Math.max(1,Math.round(radius*.16));for(let n=0;n<slots;n++){
     const a=(col+(n+.5)/slots)/count*Math.PI/2;
     crowd.push({x:sx*(37+Math.cos(a)*radius),y:1.13+row*.72,z:sz*(57.1+Math.sin(a)*radius),team:sz<0?'home':'away',row,zone:'corner'});
    }}
   }
  }
  // Concrete aisles and a recessed concourse break up the dark tier bands.
  for(const side of [-1,1]){
   for(let row=0;row<12;row++){
    for(let col=0;col<sideCols;col+=28)box(1.5,.06,1.1,'#738184',side*(39.3+row*1.42),.88+row*.72,-56+(col+.5)*112/(sideCols-1),scene);
    for(let col=0;col<endCols;col+=26)box(1.1,.06,1.5,'#738184',-37+(col+.5)*74/(endCols-1),.88+row*.72,side*(59.4+row*1.42),scene);
   }
   box(2,.14,119,'#202c31',side*55.9,9.55,0,scene);box(79,.14,2,'#202c31',0,9.55,side*76.1,scene);
  }
  const animatedShare=weak?.22:mobileStandard?.44:high?.76:.62;
  const crowdSpecs=crowd.map((p,i)=>({...p,x:p.x+(p.zone==='end'?(hash(i*89+7)-.5)*.46:(hash(i*89+7)-.5)*.12),z:p.z+(p.zone==='side'?(hash(i*97+11)-.5)*.46:(hash(i*97+11)-.5)*.12),index:i,phase:hash(i*29+3)*Math.PI*2,loop:Math.floor(hash(i*31+9)*3),height:1.32+hash(i*37+5)*.24,width:.94+hash(i*41+7)*.28,depth:.96+hash(i*43+11)*.18,lift:hash(i*47+13)*.13,animated:hash(i*53+17)<animatedShare}));
  const crowdStaticSpecs=crowdSpecs.filter(x=>!x.animated),crowdDynamicSpecs=crowdSpecs.filter(x=>x.animated);
  const crowdDummy=new THREE.Object3D(),crowdColor=new THREE.Color(),neutralFanPalette=['#313a3d','#65717a','#ddd9cf','#8e6f58'],crowdPantsPalette=['#1c252b','#2c3842','#41484d','#32445d','#54473f'];
  function fanPalette(team){
   const kit=team==='home'?crowdKits.home:team==='away'?crowdKits.away:null;
   return kit?[kit.shirt,kit.shirt,kit.shirtSecondary,'#e4e1d8','#26343a','#52616a','#a39485','#d2c8b5','#343c49']:neutralFanPalette;
  }
  function crowdGroup(specs,dynamic){
   // Human TV silhouettes: broader torso, separate head, arms and legs. All parts remain instanced.
   const torso=new THREE.InstancedMesh(geo('crowd-torso-human',()=>athleticGeometry([[-.295,.19,.12],[.10,.24,.14],[.255,.22,.12],[.295,.075,.07]],6)),mat('#ffffff'),specs.length);
   const head=new THREE.InstancedMesh(geo('crowd-head-human',()=>{const g=new THREE.SphereGeometry(.123,7,6),p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const shade=p.getY(i)>.056?.18:1;c.push(shade,shade,shade)}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g}),mat('#ffffff',{vertexColors:true}),specs.length);
   const arms=new THREE.InstancedMesh(geo('crowd-arm-human',()=>new THREE.CylinderGeometry(.055,.047,.48,6)),mat('#ffffff'),specs.length*2);
   const legs=new THREE.InstancedMesh(geo('crowd-leg-human',()=>new THREE.CylinderGeometry(.064,.052,.50,6)),mat('#ffffff'),specs.length*2);
   for(const mesh of [torso,head,arms,legs]){mesh.instanceMatrix.setUsage(dynamic?THREE.DynamicDrawUsage:THREE.StaticDrawUsage);mesh.frustumCulled=false;scene.add(mesh);track(mesh)}
   return{torso,head,arms,legs,specs,dynamic};
  }
  const crowdStatic=crowdGroup(crowdStaticSpecs,false),crowdDynamic=crowdGroup(crowdDynamicSpecs,true);
  function writeCrowdFan(spec,i,group,time=0,paint=false){
   const reaction=group.dynamic?crowdReactionState(event.type,event.team,spec.team,time):{suspense:0,mood:0};
   const positive=Math.max(0,reaction.mood),negative=Math.max(0,-reaction.mood),wave=group.dynamic?Math.sin(time*(1.35+spec.loop*.41)+spec.phase):0;
   const cheerBeat=group.dynamic?Math.abs(Math.sin(time*(4.25+spec.loop*.55)+spec.phase)):0;
   const jump=cheerBeat*positive*.34,bob=wave*.045+jump+reaction.suspense*.055;
   const bodyY=spec.y-.25+.64*spec.height+bob,lean=wave*.055+negative*.09,yaw=Math.atan2(-spec.x,-spec.z),lx=Math.cos(yaw),lz=-Math.sin(yaw);
   crowdDummy.position.set(spec.x,bodyY,spec.z);crowdDummy.rotation.set(0,yaw,lean);crowdDummy.scale.set(spec.width,spec.height,spec.depth);crowdDummy.updateMatrix();group.torso.setMatrixAt(i,crowdDummy.matrix);
   crowdDummy.position.set(spec.x,bodyY+.33*spec.height,spec.z);crowdDummy.rotation.set(0,yaw,lean*.45);crowdDummy.scale.set(.95+.08*spec.width,.95+.06*spec.height,.95);crowdDummy.updateMatrix();group.head.setMatrixAt(i,crowdDummy.matrix);
   const despair=negative;
   const idleRaise=group.dynamic?(spec.loop===2 ? .30+.24*(wave+1) : spec.loop===1 ? .12+.15*(wave+1) : .03*Math.abs(wave)):0;
   const raise=clamp(reaction.suspense*.42+positive*1.05+despair*.62+idleRaise);
   const shoulderY=bodyY+.1*spec.height;
   for(const side of [-1,1]){
    const armIndex=i*2+(side>0?1:0);
    const spread=positive>.05 ? 1.18 : despair>.05 ? .38 : (spec.loop===1 ? .28 : .12);
    const armLift=mix(shoulderY-.12,shoulderY+.22,raise);
    crowdDummy.position.set(spec.x+side*.22*spec.width*lx,armLift,spec.z+side*.22*spec.width*lz);
    crowdDummy.rotation.set((spec.loop===2?side*wave*.18:0),yaw,side*mix(.06,spread,raise)+wave*.045);
    crowdDummy.scale.set(.92,spec.height*(.94+raise*.08),.92);crowdDummy.updateMatrix();group.arms.setMatrixAt(armIndex,crowdDummy.matrix);

    const legIndex=i*2+(side>0?1:0),stance=.035+hash(spec.index*71+(side>0?29:13))*.055;
    crowdDummy.position.set(spec.x+side*(.085+.018*spec.width)*lx,bodyY-.365*spec.height,spec.z+side*(.085+.018*spec.width)*lz+(hash(spec.index*73+legIndex)-.5)*.035);
    crowdDummy.rotation.set(0,yaw,side*stance+wave*.012);
    crowdDummy.scale.set(.9,spec.height*(.9+hash(spec.index*79+legIndex)*.08),.9);crowdDummy.updateMatrix();group.legs.setMatrixAt(legIndex,crowdDummy.matrix);
   }
   if(paint){
    const palette=fanPalette(spec.team),shirt=palette[Math.floor(hash(spec.index*59+23)*palette.length)],skin=skinTone('supporter',spec.index),pants=crowdPantsPalette[Math.floor(hash(spec.index*83+31)*crowdPantsPalette.length)];
    group.torso.setColorAt(i,crowdColor.set(shirt));group.head.setColorAt(i,crowdColor.set(skin));
    group.arms.setColorAt(i*2,crowdColor.set(skin));group.arms.setColorAt(i*2+1,crowdColor.set(skin));
    group.legs.setColorAt(i*2,crowdColor.set(pants));group.legs.setColorAt(i*2+1,crowdColor.set(pants));
   }
  }
  function initCrowdGroup(group){
   group.specs.forEach((spec,i)=>writeCrowdFan(spec,i,group,0,true));
   for(const mesh of [group.torso,group.head,group.arms,group.legs]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
  }
  initCrowdGroup(crowdStatic);initCrowdGroup(crowdDynamic);

  const flagCount=weak?6:mobileStandard?12:high?22:16,flagSegments=3,flagSpecs=Array.from({length:flagCount},(_,i)=>{
   const team=i<Math.ceil(flagCount*.62)?'home':'away',side=team==='home'?-1:1,row=i%4,scale=1.05+hash(i+331)*1.38;
   return{team,x:-30+(i%7)*10+hash(i+311)*2.6,y:2.05+row*.78,z:side*(59.9+row*1.42),phase:hash(i+317)*Math.PI*2,scale};
  });
  const flagPole=new THREE.InstancedMesh(geo('crowd-flag-pole',()=>new THREE.CylinderGeometry(.03,.03,1,6)),mat('#d5d9d5'),flagSpecs.length);
  const flagCloth=new THREE.InstancedMesh(geo('crowd-flag-cloth-segment',()=>new THREE.PlaneGeometry(.72,1.08,2,2)),mat('#ffffff',{side:THREE.DoubleSide}),flagSpecs.length*flagSegments);
  flagPole.frustumCulled=flagCloth.frustumCulled=false;flagCloth.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(flagPole,flagCloth);track(flagPole);track(flagCloth);
  function writeFlag(spec,i,time=0,paint=false){
   crowdDummy.position.set(spec.x,spec.y,spec.z);crowdDummy.rotation.set(0,0,0);crowdDummy.scale.set(1,1.75+spec.scale*.72,1);crowdDummy.updateMatrix();flagPole.setMatrixAt(i,crowdDummy.matrix);
   const reaction=crowdReactionState(event.type,event.team,spec.team,time),baseWave=time*(2.25+spec.scale*.42)+spec.phase,amp=.12+reaction.suspense*.13+Math.max(0,reaction.mood)*.34;
   for(let segment=0;segment<flagSegments;segment++){
    const index=i*flagSegments+segment,wave=Math.sin(baseWave+segment*.72),previous=Math.sin(baseWave+(segment-1)*.72),bend=(wave-previous)*amp;
    crowdDummy.position.set(spec.x+(.38+segment*.62)*spec.scale+wave*amp*(.18+.12*segment),spec.y+.56+.36*spec.scale+Math.abs(wave)*amp*.09,spec.z-(spec.team==='home'?-1:1)*(.03+segment*.012));
    crowdDummy.rotation.set(0,spec.team==='home'?0:Math.PI,wave*amp*.78+bend*.42);crowdDummy.scale.set(spec.scale,1+Math.abs(wave)*.07,spec.scale);crowdDummy.updateMatrix();flagCloth.setMatrixAt(index,crowdDummy.matrix);
    if(paint){const kit=spec.team==='home'?crowdKits.home:crowdKits.away,colour=i%3===0?(segment===1?kit.shirt:kit.shirtSecondary):kit.shirt;flagCloth.setColorAt(index,crowdColor.set(colour))}
   }
  }
  flagSpecs.forEach((spec,i)=>writeFlag(spec,i,0,true));flagPole.instanceMatrix.needsUpdate=true;flagCloth.instanceMatrix.needsUpdate=true;if(flagCloth.instanceColor)flagCloth.instanceColor.needsUpdate=true;

  function supporterBanner(kit,z){
   const tex=canvasTexture(512,96,(ctx,w,h)=>{ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,w,h);ctx.fillStyle=kit.shirtSecondary;ctx.fillRect(0,0,w*.14,h);ctx.fillRect(w*.86,0,w*.14,h);ctx.fillStyle='#ffffff';ctx.globalAlpha=.94;ctx.textAlign='center';ctx.font='italic 900 46px system-ui';ctx.fillText('FOOTERA',w/2,55);ctx.globalAlpha=.8;ctx.font='800 15px system-ui';ctx.fillText('BUILD YOUR ERA',w/2,78)});
   // Rail-level only: banners never sit across the supporter bodies.
   const banner=mesh(track(new THREE.PlaneGeometry(12,.72)),track(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})),scene);banner.position.set(0,.62,z);banner.rotation.y=z<0?0:Math.PI;return banner;
  }
  const supporterBanners=[supporterBanner(crowdKits.home,-58.15),supporterBanner(crowdKits.away,58.15)];
  let lastCrowdUpdate=-1;
  function updateCrowd(time,force=false){
   const cadence=weak?.18:mobileStandard?.11:.085;if(!force&&lastCrowdUpdate>=0&&time-lastCrowdUpdate<cadence)return;lastCrowdUpdate=time;
   crowdDynamic.specs.forEach((spec,i)=>writeCrowdFan(spec,i,crowdDynamic,time,false));
   for(const mesh of [crowdDynamic.torso,crowdDynamic.head,crowdDynamic.arms,crowdDynamic.legs])mesh.instanceMatrix.needsUpdate=true;
   flagSpecs.forEach((spec,i)=>writeFlag(spec,i,time,false));flagCloth.instanceMatrix.needsUpdate=true;
  }
  const brandTex=canvasTexture(1024,128,(ctx,w,h)=>{ctx.fillStyle='#182b30';ctx.fillRect(0,0,w,h);ctx.fillStyle='#70ed86';ctx.font='italic 900 74px system-ui';ctx.fillText('F',25,92);ctx.fillStyle='#f6f7ee';ctx.font='800 49px system-ui';ctx.fillText('FOOTERA',112,87);ctx.fillStyle='#82e792';ctx.font='700 31px system-ui';ctx.fillText('BUILD YOUR ERA',490,83)});
  const admat=track(new THREE.MeshBasicMaterial({map:brandTex})),adgeo=geo('ad',()=>new THREE.PlaneGeometry(13,1.15));
  for(const side of [-1,1]){
   for(let z=-45.5;z<=45.5;z+=13){const ad=mesh(adgeo,admat,scene);ad.position.set(side*37,.7,z);ad.rotation.y=-side*Math.PI/2;staticBoxes.push(ad)}
   for(let x=-26;x<=26;x+=13){const ad=mesh(adgeo,admat,scene);ad.position.set(x,.7,side*57);ad.rotation.y=side===-1?0:Math.PI;staticBoxes.push(ad)}
   for(const z of [-61,61]){box(.35,20,.35,'#7d8b8c',side*47,10,z,scene);const lights=box(5,1.1,.25,'#f1f4de',side*47,19.3,z,scene);lights.rotation.y=-side*.5}
  }
  // Player draw calls are batched below. Each bone retains its own articulation.
  const batches=new Map(),parts=[];
  function part(g,m,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1){const node=new THREE.Object3D();node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);const key=g.uuid+':'+m.uuid;if(!batches.has(key))batches.set(key,{g,m,nodes:[]});batches.get(key).nodes.push(node);parts.push(node);return node}
  function bodyPart(top,bottom,height,color,parent,x,y,z,sx=1,sz=1){return part(geo(`body:${top}:${bottom}`,()=>new THREE.CylinderGeometry(top,bottom,1,weak?8:high?14:12)),mat(color),parent,x,y,z,sx,height,sz)}
  function bodyPartMaterial(top,bottom,height,material,parent,x,y,z,sx=1,sz=1){return part(geo(`body:${top}:${bottom}`,()=>new THREE.CylinderGeometry(top,bottom,1,weak?8:high?14:12)),material,parent,x,y,z,sx,height,sz)}
  function rounded(w,h,d,color,parent,x,y,z){return part(geo('sphere',()=>new THREE.SphereGeometry(1,weak?10:high?18:16,weak?8:high?14:12)),mat(color),parent,x,y,z,w,h,d)}
  function roundedMaterial(w,h,d,material,parent,x,y,z){return part(geo('sphere',()=>new THREE.SphereGeometry(1,weak?10:high?18:16,weak?8:high?14:12)),material,parent,x,y,z,w,h,d)}
  // Oval cross-sections describe chest, waist, jaw and muscles with smooth
  // normals. Shared geometry is instanced, keeping the existing joint hierarchy.
  function anatomy(key,rings){return geo(key,()=>athleticGeometry(rings,weak?10:high?18:14))}
  function player(kit,name,keeper=false){
   const root=new THREE.Group(),rig=new THREE.Group();field.add(root);root.add(rig);
   const skin=skinTone(name),hair='#26201a',shirt=shirtMaterial(kit),sleeve=mat(['sleeves','shoulders'].includes(kit.pattern)?kit.shirtSecondary:kit.shirt,{roughness:.92});
   part(anatomy('athletic-shirt',[[1.00,.162,.103],[1.04,.171,.11],[1.12,.161,.105],[1.25,.181,.12],[1.38,.215,.134],[1.46,.237,.115],[1.50,.196,.096],[1.54,.069,.071]]),shirt,rig);
   part(anatomy('athletic-pelvis',[[.86,.142,.099],[.94,.173,.127],[1.015,.168,.107],[1.03,.161,.105]]),mat(kit.shorts,{roughness:.96}),rig);
   bodyPart(.058,.066,.112,skin,rig,0,1.576,0);
   part(anatomy('athletic-head',[[1.623,.045,.054],[1.648,.066,.076],[1.69,.092,.089],[1.75,.097,.095],[1.798,.079,.083],[1.823,.033,.045]]),mat(skin),rig,0,0,-.013);
   part(anatomy('athletic-hair',[[1.762,.097,.094],[1.799,.082,.087],[1.828,.044,.053],[1.835,.008,.01]]),mat(hair,{roughness:1}),rig,0,0,-.008);
   const arms=[],elbows=[],legs=[],knees=[],gloves=[],feet=[];
   for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.224,1.45,0);rig.add(arm);arms.push(arm);
    roundedMaterial(.075,.091,.085,sleeve,arm,0,-.035,0);
    bodyPartMaterial(.075,.062,.17,sleeve,arm,0,-.098,0);
    part(anatomy('athletic-upper-arm',[[-.325,.043,.045],[-.25,.053,.056],[-.17,.061,.058],[-.14,.060,.058]]),mat(skin),arm);
    const elbow=new THREE.Group();elbow.position.y=-.32;arm.add(elbow);elbows.push(elbow);
    part(anatomy('athletic-forearm',[[-.28,.029,.033],[-.22,.033,.04],[-.08,.049,.049],[0,.043,.045]]),mat(skin),elbow);
    gloves.push(rounded(keeper?.052:.033,.061,.031,keeper?'#f3f4e9':skin,elbow,0,-.31,-.006));
    const leg=new THREE.Group();leg.position.set(side*.108,.94,0);rig.add(leg);legs.push(leg);
    part(anatomy('athletic-shorts',[[-.19,.097,.092],[-.12,.103,.106],[.055,.098,.102]]),mat(kit.shorts,{roughness:.96}),leg);
    part(anatomy('athletic-thigh',[[-.435,.052,.06],[-.38,.061,.067],[-.25,.081,.081],[-.16,.085,.082]]),mat(skin),leg);
    const knee=new THREE.Group();knee.position.y=-.43;leg.add(knee);knees.push(knee);
    rounded(.052,.05,.057,skin,knee,0,-.004,0);
    part(anatomy('athletic-sock',[[-.39,.032,.039],[-.31,.035,.042],[-.17,.059,.064],[-.07,.056,.055],[-.045,.050,.050]]),mat(kit.socks,{roughness:1}),knee);
    feet.push(rounded(.060,.050,.143,'#172025',knee,0,-.43,-.06));
    feet.push(rounded(.059,.018,.145,'#0b1014',knee,0,-.465,-.06));
   }
   const shadow=part(geo('contact-plane',()=>new THREE.PlaneGeometry(1,1)),contactMaterial,root,0,.022,0,1.4,1.05,1);shadow.rotation.x=-Math.PI/2;
   return{root,rig,arms,elbows,legs,knees,gloves,feet,shadow};
  }
  const kits=kitColors(event),attackKit=event.team==='away'?kits.away:kits.home,defendKit=event.team==='away'?kits.home:kits.away;
  const players=RUNS.map((r,i)=>player(r.team==='attack'?attackKit:defendKit,i===0?event.playerName:'footballer '+i));
  const keeper=player({shirt:kits.keeper,shirtSecondary:kits.keeper,pattern:'solid',shorts:kits.keeper,socks:kits.keeper},event.keeperName||'goalkeeper',true);
  const ballMap=canvasTexture(128,64,(ctx,w,h)=>{ctx.fillStyle='#fafbf5';ctx.fillRect(0,0,w,h);for(let row=0;row<3;row++)for(let col=0;col<6;col++){const x=col*w/6+(row%2)*w/12,y=row*h/2;ctx.beginPath();for(let n=0;n<5;n++){const a=n*Math.PI*2/5;ctx.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5)}ctx.closePath();ctx.fillStyle='#25343b';ctx.fill();ctx.strokeStyle='#89918f';ctx.lineWidth=.5;ctx.stroke()}});
  const ball=mesh(geo('ball',()=>new THREE.SphereGeometry(1,weak?10:high?20:16,weak?8:high?16:12)),track(new THREE.MeshStandardMaterial({map:ballMap,color:'#ffffff',roughness:.6,metalness:0,emissive:'#1b1b16',emissiveIntensity:.08})));ball.scale.setScalar(.14);ball.position.set(0,.13,0);ball.castShadow=!weak;
  // A restrained ground cue keeps the real-size ball readable on a phone.
  const ballRing=mesh(geo('ball-ring',()=>new THREE.RingGeometry(.27,.38,24)),track(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false})));ballRing.rotation.x=-Math.PI/2;
  const ballShadow=mesh(geo('ball-shadow',()=>new THREE.CircleGeometry(.22,high?24:16)),track(new THREE.MeshBasicMaterial({color:'#071107',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide})));ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.019;
  for(const batch of batches.values()){batch.mesh=new THREE.InstancedMesh(batch.g,batch.m,batch.nodes.length);batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.mesh.castShadow=!weak&&!batch.m.transparent;batch.mesh.receiveShadow=!weak&&!batch.m.transparent;batch.mesh.frustumCulled=false;scene.add(batch.mesh);track(batch.mesh)}
  // Merge stadium structures by material into static instance batches as well.
  scene.updateMatrixWorld(true);
  const staticGroups=new Map();
  for(const o of staticBoxes){const key=o.material.uuid;if(!staticGroups.has(key))staticGroups.set(key,[]);staticGroups.get(key).push(o)}
  for(const nodes of staticGroups.values()){const batch=new THREE.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);nodes.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent()});scene.add(batch);track(batch)}
  function resetPose(p){p.rig.position.set(0,0,0);p.rig.rotation.set(0,0,0);for(let i=0;i<2;i++){p.arms[i].rotation.set(0,0,0);p.elbows[i].rotation.set(0,0,0);p.legs[i].rotation.set(0,0,0);p.knees[i].rotation.set(0,0,0)}}
  function strideAmplitude(speed){return (.25+.42*speed)*clamp(speed/.14)}
  function pose(p,x,z,time,speed,heading=0,turn=0,stride=time*9.6){
   resetPose(p);p.root.position.set(x,0,z);p.root.rotation.y=heading;
   const phase=stride,step=Math.sin(phase)*strideAmplitude(speed);
   p.legs[0].rotation.x=step;p.legs[1].rotation.x=-step;
   p.knees[0].rotation.x=-Math.max(0,-Math.sin(phase))*.98*speed;p.knees[1].rotation.x=-Math.max(0,Math.sin(phase))*.98*speed;
   p.arms[0].rotation.x=-step*.72;p.arms[1].rotation.x=step*.72;p.arms[0].rotation.z=.07+.045*speed;p.arms[1].rotation.z=-.07-.045*speed;for(const elbow of p.elbows)elbow.rotation.x=-.64;
   p.rig.rotation.x=-.11*speed;p.rig.rotation.y=clamp(turn*.78,-.13,.13);p.rig.rotation.z=Math.sin(phase)*.027*speed+clamp(turn,-.17,.17);p.rig.position.y=stanceHeight(step,p.knees[0].rotation.x,-step,p.knees[1].rotation.x);p.shadow.rotation.z=heading;
  }
  // Arc-length gait avoids sliding or a phase jump when the runner accelerates.
  // Tables are built once; playback only reads two floats per actor.
  const gaitSamples=160,gaitTables=RUNS.map((_,index)=>{const a=new Float32Array(gaitSamples+1),dt=DURATION/gaitSamples;let previous=runPosition(index,0,sequence);for(let j=1;j<=gaitSamples;j++){const next=runPosition(index,j*dt,sequence),distance=Math.hypot(next[0]-previous[0],next[1]-previous[1]),speed=clamp(distance/dt/6.5),strideLength=Math.max(.45,3.44*Math.sin(strideAmplitude(speed)));a[j]=a[j-1]+distance*Math.PI*2/strideLength;previous=next}return a});
  function gaitPhase(index,time){const at=clamp(time/DURATION)*gaitSamples,lo=Math.min(gaitSamples-1,Math.floor(at));return mix(gaitTables[index][lo],gaitTables[index][lo+1],at-lo)+index*2.399}
  const camTarget=new THREE.Vector3();let currentCameraPhase='build';
  // Aim an arm's local -Y axis at a field-space interception point.
  function aimArm(arm,point){
   arm.parent.updateWorldMatrix(true,false);
   const end=arm.parent.worldToLocal(new THREE.Vector3(...worldPosition(point,direction))),start=arm.position.clone();
   const delta=end.clone().sub(start),length=Math.min(.599,delta.length()),axis=delta.normalize();
   const bend=new THREE.Vector3(0,0,1).cross(axis).normalize();
   const joint=start.clone().addScaledVector(axis,length/2).addScaledVector(bend,Math.sqrt(.30*.30-(length/2)**2));
   arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),joint.clone().sub(start).normalize());
   const elbow=keeper.elbows[keeper.arms.indexOf(arm)];
   const lower=end.clone().sub(joint).normalize().applyQuaternion(arm.quaternion.clone().invert());
   elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),lower);
  }
  function update(time){
   players.forEach((p,i)=>{const [x,z]=runPosition(i,time,sequence),moving=time<(i===0?SHOT_TIME+1.05:i===1?7.2:6.9),prev=runPosition(i,Math.max(0,time-.12),sequence),next=runPosition(i,time+.12,sequence),farPrev=runPosition(i,Math.max(0,time-.28),sequence),farNext=runPosition(i,time+.28,sequence),vx=next[0]-prev[0],vz=next[1]-prev[1],speed=moving?clamp(Math.hypot(vx,vz)/1.56,.02,1):0,heading=moving?Math.atan2(-vx,-vz):p.root.rotation.y,early=Math.atan2(-(prev[0]-farPrev[0]),-(prev[1]-farPrev[1])),late=Math.atan2(-(farNext[0]-next[0]),-(farNext[1]-next[1])),turn=moving?Math.atan2(Math.sin(late-early),Math.cos(late-early))*.25:0;pose(p,x,z,time+i*.29,speed,heading,turn,gaitPhase(i,time))});
   const striker=players[0];
   if(time>=4.9){striker.root.rotation.y=0;const k=kickPose(time);striker.legs[1].rotation.x=k.hip;striker.knees[1].rotation.x=k.knee;striker.rig.rotation.set(0,0,0);striker.rig.position.y=0;striker.arms[0].rotation.z=.45;striker.arms[1].rotation.z=-.65}
   const passWindows=sequence.startsWith('wing_')||sequence.startsWith('cutback_')?[[3.42,3.82]]:sequence==='one_two'?[[1.55,1.9],[2.4,2.72]]:sequence==='through_ball'?[[2.08,2.42]]:sequence==='dribble'?[]:[[1.8,2.18]];
   for(const [from,to] of passWindows)if(time>=from&&time<=to){const passer=players[1],u=clamp((time-from)/(to-from)),wind=smooth(Math.min(1,u/.42)),follow=smooth(Math.max(0,(u-.42)/.58));passer.legs[1].rotation.x=mix(-.46,1.02,follow);passer.knees[1].rotation.x=mix(-.62,-.08,wind);passer.rig.rotation.x=-.08*(1-u);passer.rig.rotation.y=.10*Math.sin(u*Math.PI);passer.arms[0].rotation.z=.38;passer.arms[1].rotation.z=-.55}
   const kp=keeperPose(event.type,time);pose(keeper,kp.x,kp.z,time,.12,Math.PI);
   keeper.shadow.position.y=.022-kp.y;keeper.root.position.y=kp.y;keeper.root.rotation.y=Math.PI;keeper.rig.rotation.z=kp.tilt;
   keeper.rig.position.y=-.14*kp.anticipation*(1-kp.dive)+.13*kp.land;
   keeper.legs[0].rotation.x=-.22*(1-kp.dive);keeper.legs[1].rotation.x=-.22*(1-kp.dive);keeper.knees.forEach(k=>k.rotation.x=.4*(1-kp.dive));
   keeper.legs[0].rotation.z=.18+kp.dive*.32;keeper.legs[1].rotation.z=-.18-kp.dive*.15;
   keeper.arms[0].rotation.z=-.42;keeper.arms[1].rotation.z=.42;keeper.elbows.forEach(e=>e.rotation.x=-.3*(1-kp.dive));
   if(kp.dive>.05){keeper.elbows.forEach(e=>e.rotation.x=0);aimArm(keeper.arms[0],[2.52,1.14,-50.6]);aimArm(keeper.arms[1],[2.52,1.14,-50.6]);}
   const bp=ballPosition(event.type,time,sequence);ball.position.set(...bp);ball.rotation.x=time*9;ballRing.position.set(bp[0],.025,bp[2]);ballRing.visible=time<IMPACT_TIME+.12;ballRing.material.opacity=time<SHOT_TIME?.42:.24;
   const shadowScale=clamp(1-bp[1]/3,.42,1);ballShadow.position.set(bp[0],.019,bp[2]);ballShadow.scale.setScalar(shadowScale);ballShadow.material.opacity=.12+.18*shadowScale;
   if(time>SHOT_TIME){const chase=smooth((time-SHOT_TIME)/1.8);for(const i of [8,9,10,11,12,14,15])players[i].root.position.z-=chase*(.35+hash(i+200)*.8)}
   const reaction=smooth((time-IMPACT_TIME)/.72);
   if(event.type==='goal'&&time>REVEAL_TIME){const t=time-REVEAL_TIME;for(const i of [0,2,3]){const p=players[i];p.arms[0].rotation.z=1.75;p.arms[1].rotation.z=-1.75;p.root.position.z-=Math.min(3,t)*.6;p.rig.position.y=Math.abs(Math.sin(t*7))*.025}for(const i of [8,9,10,11]){const p=players[i];p.rig.rotation.x=.045*reaction;p.arms[0].rotation.z=-.18*reaction;p.arms[1].rotation.z=.18*reaction}}
   else if(reaction>.05){const lift=event.type==='big_chance_saved'?1.05:event.type==='shot_post'?.82:.58;striker.arms[0].rotation.z=mix(striker.arms[0].rotation.z,lift,reaction);striker.arms[1].rotation.z=mix(striker.arms[1].rotation.z,-lift,reaction);striker.rig.rotation.x=-.03*reaction}
   const positions=net.geometry.attributes.position;
   if(event.type==='goal'&&time>=IMPACT_TIME&&time<IMPACT_TIME+1.5){const t=time-IMPACT_TIME;for(let i=0;i<positions.count;i++){const x=net.base[i*3],y=net.base[i*3+1],z=net.base[i*3+2],influence=Math.exp(-((x-2.65)**2+(y-1.08)**2)*.8)*(z<-1?1:0);positions.array[i*3+2]=z-Math.sin(t*16)*Math.exp(-t*3)*.28*influence}positions.needsUpdate=true}
   updateCrowd(time);
   const cam=cameraState(direction,time,camera.aspect,event.type,sequence);currentCameraPhase=cam.phase;camera.position.set(...cam.position);camTarget.set(...cam.target);camera.fov=cam.fov;camera.updateProjectionMatrix();camera.lookAt(camTarget);camera.updateMatrixWorld();
   scene.updateMatrixWorld(true);
   for(const batch of batches.values()){batch.nodes.forEach((node,i)=>batch.mesh.setMatrixAt(i,node.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true}
   renderer.render(scene,camera);
  }
  function reduceQuality(soft=false){if(!soft)renderer.shadowMap.enabled=false;const staticCount=Math.floor(crowdStatic.specs.length*(soft?.82:.62)),dynamicCount=Math.floor(crowdDynamic.specs.length*(soft?.64:.46)),flags=Math.max(2,Math.floor(flagSpecs.length*(soft?.82:.6)));crowdStatic.torso.count=crowdStatic.head.count=staticCount;crowdStatic.arms.count=crowdStatic.legs.count=staticCount*2;crowdDynamic.torso.count=crowdDynamic.head.count=dynamicCount;crowdDynamic.arms.count=crowdDynamic.legs.count=dynamicCount*2;flagPole.count=flags;flagCloth.count=flags*flagSegments;if(!soft)supporterBanners.forEach(x=>x.visible=false);fill.intensity=soft?.48:.12}
  function resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
  function dispose(){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear()}
  function inspect(){
   const project=p=>p.clone().project(camera),visible=players.filter(p=>{const q=project(p.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0)));return Math.abs(q.x)<.98&&Math.abs(q.y)<.98&&q.z<1}).length;
   const ballWorld=ball.getWorldPosition(new THREE.Vector3()),goalWorld=new THREE.Vector3(...worldPosition([0,.4,-52.5],direction)),wingerWorld=players[1].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,0)),runnerWorld=players[2].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,0));
   const ballScreen=project(ballWorld),goalScreen=project(goalWorld),wingerScreen=project(wingerWorld),runnerScreen=project(runnerWorld),sampleMatrix=new THREE.Matrix4(),samplePosition=new THREE.Vector3(),flagPosition=new THREE.Vector3();
   if(crowdDynamic.specs.length){crowdDynamic.torso.getMatrixAt(0,sampleMatrix);samplePosition.setFromMatrixPosition(sampleMatrix)}
   if(flagCloth.count){flagCloth.getMatrixAt(0,sampleMatrix);flagPosition.setFromMatrixPosition(sampleMatrix)}
   const supportFootClearance=players.map(p=>Math.min(...p.feet.map(f=>{const m=f.matrixWorld.elements;return m[13]-Math.hypot(m[1],m[5],m[9])})));
   return{supportFootClearance,direction,sequence,cameraPhase:currentCameraPhase,camera:camera.position.toArray(),cameraTarget:camTarget.toArray(),cameraDistance:camera.position.distanceTo(camTarget),visibleFieldPlayers:visible,fieldPlayers:players.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:weak?'low':high?'high':'standard',crowdFans:crowdSpecs.length,crowdAnimated:crowdDynamic.specs.length,crowdFlags:flagSpecs.length,crowdSampleY:samplePosition.y,flagSample:flagPosition.toArray(),goalScreenX:goalScreen.x,shooterScreenX:project(players[0].root.getWorldPosition(new THREE.Vector3())).x,goalScreen:goalScreen.toArray(),ballScreen:ballScreen.toArray(),wingerScreen:wingerScreen.toArray(),runnerScreen:runnerScreen.toArray(),gloves:keeper.gloves.map(g=>g.getWorldPosition(new THREE.Vector3()).toArray()),ball:ballWorld.toArray()};
  }
  return{update,resize,dispose,inspect,reduceQuality};
 }catch(error){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear();throw error}
}
export function play(event,signal){
 return new Promise(resolve=>{
  const host=document.getElementById('matchLiveStage');
  if(!host||signal.aborted||document.hidden){resolve('skipped');return}
  let renderer,world,observer,raf,timer,done=false,start,last=0,slowFrames=0,frames=0,verySlowFrames=0,impactSent=false;
  const previousFocus=document.activeElement;
  const layer=document.createElement('div');layer.className='fh3d';layer.setAttribute('role','region');layer.setAttribute('aria-label','Footera 3D-Highlight');
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','3D-Fußballszene');layer.append(canvas);
  const top=document.createElement('div');top.className='fh3d-top';
  const brand=document.createElement('span');brand.className='fh3d-brand';brand.textContent='FOOTERA';const sub=document.createElement('small');sub.textContent=`LIVE · ${event.minute}'`;brand.append(sub);
  const skip=document.createElement('button');skip.type='button';skip.className='fh3d-skip';skip.textContent='Überspringen';top.append(brand,skip);layer.append(top);
  const hud=document.createElement('div');hud.className=`fh3d-hud fh3d-hud-${event.type}`;hud.setAttribute('aria-live','polite');
  const card=document.createElement('div');card.className='fh3d-player-card';if(event.type==='goal'&&event.playerCardHTML)card.innerHTML=event.playerCardHTML;
  const mark=document.createElement('span');mark.className='fh3d-mark';mark.textContent='F';mark.setAttribute('aria-hidden','true');
  const copy=document.createElement('div');copy.className='fh3d-copy';
  const headline=document.createElement('span');headline.className='fh3d-headline';
  const name=document.createElement('strong');name.className='fh3d-name';
  const detail=document.createElement('span');detail.className='fh3d-event';copy.append(headline,name,detail);
  const minute=document.createElement('b');minute.className='fh3d-minute';minute.textContent=`${event.minute}'`;
  const crest=document.createElement('div');crest.className='fh3d-team-crest';if(event.teamCrestHTML)crest.innerHTML=event.teamCrestHTML;
  const meta=document.createElement('div');meta.className='fh3d-goal-meta';meta.append(minute,crest);
  hud.append(card,mark,copy,meta);layer.append(hud);host.append(layer);
  function finish(result){
   if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timer);observer?.disconnect();signal.removeEventListener('abort',onAbort);canvas.removeEventListener('webglcontextlost',onLost);window.removeEventListener('keydown',onKey);
   try{world?.dispose();renderer?.dispose();renderer?.forceContextLoss()}catch(_){}
   const focused=layer.contains(document.activeElement);layer.remove();if(focused&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});resolve(result);
  }
  function onAbort(){finish('skipped')}
  function onLost(e){e.preventDefault();finish('fallback')}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();finish('skipped')}}
  skip.addEventListener('click',()=>finish('skipped'));signal.addEventListener('abort',onAbort,{once:true});canvas.addEventListener('webglcontextlost',onLost);window.addEventListener('keydown',onKey);
  timer=setTimeout(()=>finish('fallback'),16000);
  try{
   const memory=navigator.deviceMemory||8,cores=navigator.hardwareConcurrency||8,dpr=devicePixelRatio||1,mobile=innerWidth<=600||matchMedia?.('(pointer:coarse)')?.matches===true,weak=memory<=4||cores<=4,mobileStandard=mobile&&!weak,high=!mobile&&!weak&&memory>=8&&cores>=8&&dpr>=1.5;let quality=weak?'low':high?'high':'standard';
   renderer=new THREE.WebGLRenderer({canvas,antialias:!weak,alpha:false,powerPreference:weak?'low-power':'high-performance',failIfMajorPerformanceCaveat:true});
   renderer.setPixelRatio(Math.min(dpr,weak?1.15:mobileStandard?2:high?2.25:1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=!weak;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   world=makeScene(renderer,event,weak,high,mobileStandard);
   const resize=()=>{const r=canvas.getBoundingClientRect();world.resize(Math.max(1,r.width),Math.max(1,r.height))};resize();observer=new ResizeObserver(resize);observer.observe(layer);
   function frame(now){
    if(done)return;
    try{
     if(start===undefined)start=now;const elapsed=(now-start)/1000;
     if(last&&now-last>45)slowFrames++;if(last&&now-last>250)verySlowFrames++;last=now;frames++;
     if(frames>=24&&verySlowFrames/frames>.65){finish('fallback');return}
     if(frames===40&&slowFrames>14){quality='adaptive';renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobileStandard?1.55:1.35));world.reduceQuality(mobileStandard);resize()}
     world.update(elapsed);
     if(event.type==='goal'&&!impactSent&&elapsed>=IMPACT_TIME){impactSent=true;document.dispatchEvent(new CustomEvent('footera-highlight-impact',{detail:{id:event.id,type:event.type}}))}
     layer.dataset.period=String(event.period);layer.dataset.direction=String(event.attackDirection);layer.dataset.quality=quality;
     if(elapsed>=REVEAL_TIME&&!name.textContent){
      if(event.type==='goal'){headline.textContent='TOR';name.textContent=event.playerName;detail.textContent=event.teamName?`für ${event.teamName}`:'TOR'}
      else if(event.type==='big_chance_saved'){headline.textContent='PARADE';name.textContent=event.keeperName||'TORWART';detail.textContent=`Schuss von ${event.playerName}`}
      else if(event.type==='shot_post'){headline.textContent='PFOSTEN';name.textContent=event.playerName;detail.textContent='Ganz knapp'}
      else{headline.textContent='VORBEI';name.textContent=event.playerName;detail.textContent='Chance vergeben'}
     }
     hud.classList.toggle('visible',elapsed>=REVEAL_TIME&&elapsed<DURATION-.2);
     if(elapsed>=DURATION){finish('played');return}raf=requestAnimationFrame(frame);
    }catch(_){finish('fallback')}
   }
   raf=requestAnimationFrame(frame);
  }catch(_){finish('fallback')}
 });
}
