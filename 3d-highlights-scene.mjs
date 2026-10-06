import * as THREE from './vendor/three/three.module.min.js';

// Frozen presentation data only. No live match, result callbacks or simulation RNG.
export const DURATION=10.4;
export const SHOT_TIME=5.4;
export const IMPACT_TIME=6.65;
export const REVEAL_TIME=6.8;
export const PITCH=Object.freeze({width:68,length:105,goalWidth:7.32,goalHeight:2.44});
export const MIN_CAMERA_DISTANCE=66;
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
export function ballPosition(type,time){
 const contact=shotFootPosition();
 // The passer carries it out of midfield, releases to the forward, who takes two touches.
 if(time<2){const u=clamp(time/2),t=smooth(u);return lerp([-13,.12,-21.6],[-10,.12,-28.6],t)}
 if(time<3.1){const u=clamp((time-2)/1.1),t=smooth(u),p=lerp([-10,.12,-28.6],[-1,.12,-32],t);p[1]+=.12*Math.sin(u*Math.PI);return p}
 const carryPoint=t=>{
  const [sx,sz]=runPosition(0,t),u=clamp((t-3.1)/(SHOT_TIME-3.1));
  return[sx+mix(0,.08,u),.12+.045*Math.abs(Math.sin(u*4*Math.PI)),sz-mix(.8,.58,u)]
 };
 if(time<SHOT_TIME-.24)return carryPoint(time);
 if(time<SHOT_TIME)return lerp(carryPoint(SHOT_TIME-.24),contact,smooth((time-(SHOT_TIME-.24))/.24));
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
export function cameraState(direction,time,aspect=1.3,type='goal'){
 const phase=smooth(time/6.4),bp=worldPosition(ballPosition(type,time),direction);
 // Broadcast 3.0: permanently closer and lower. The camera pans with play but
 // does not zoom in for the shot, so the whole highlight keeps one TV scale.
 const baseZ=mix(-25,-40,phase)*direction,z=mix(baseZ,bp[2],.7),x=bp[0]*.28;
 const distance=Math.max(MIN_CAMERA_DISTANCE,68,66/Math.max(.96,aspect));
 const sideline=74,height=46,trail=7,length=Math.hypot(sideline,height,trail),scale=distance/length;
 return{position:[sideline*scale,height*scale,z+trail*scale],target:[x,.78,z],fov:32,distance};
}
const LABELS={goal:'TOR',big_chance_saved:'PARADE',big_chance_missed:'SCHUSS VORBEI',shot_post:'PFOSTEN'};
const hex=(value,fallback)=>/^#[a-f0-9]{6}$/i.test(value)?value:fallback;
export function kitColors(event){
 const validPattern=v=>['solid','stripes','hoops','diagonal','halves','sleeves'].includes(String(v))?String(v):'solid';
 const home={shirt:hex(event.homeColor,'#971d42'),shirtSecondary:hex(event.homeSecondary,event.homeColor||'#971d42'),pattern:validPattern(event.homePattern),shorts:hex(event.homeShorts,'#f3f4ee'),socks:hex(event.homeSocks,'#971d42')};
 let away={shirt:hex(event.awayColor,'#f2f3f4'),shirtSecondary:hex(event.awaySecondary,event.awayColor||'#f2f3f4'),pattern:validPattern(event.awayPattern),shorts:hex(event.awayShorts,'#172b49'),socks:hex(event.awaySocks,'#f2f3f4')};
 const h=new THREE.Color(home.shirt),a=new THREE.Color(away.shirt);
 // Never repaint a saved opponent kit. Generated opponents without an identity
 // still receive a contrast fallback so the configured user kit remains exact.
 if(Math.hypot(h.r-a.r,h.g-a.g,h.b-a.b)<.5&&!event.awayKitConfigured)away=(h.r+h.g+h.b)>1.2?{shirt:'#153564',shirtSecondary:'#d7e7ff',pattern:'solid',shorts:'#153564',socks:'#153564'}:{shirt:'#f7f3db',shirtSecondary:'#263940',pattern:'solid',shorts:'#f7f3db',socks:'#f7f3db'};
 const keeper=['#f4b52b','#10bda7','#bc63e8'].find(c=>{const k=new THREE.Color(c);return [h,new THREE.Color(away.shirt)].every(t=>Math.hypot(k.r-t.r,k.g-t.g,k.b-t.b)>.55)})||'#42e2ee';
 return{home,away,keeper};
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
export function runPosition(index,time){
 const r=RUNS[index];
 if(index===0){
  if(time<3.1)return lerp([-2,-26],[-1,-31.2],smooth(time/3.1));
  if(time<=SHOT_TIME){const u=clamp((time-3.1)/(SHOT_TIME-3.1)),t=u<.18?smooth(u/.18)*.18:u;return lerp([-1,-31.2],[0,-37],t)}
  return lerp([0,-37],[.35,-38.35],smooth((time-SHOT_TIME)/1.15))
 }
 if(index===1){if(time<2)return lerp(r.from,r.to,smooth(time/2));return lerp(r.to,[-8,-35],smooth((time-2)/5.2))}
 const u=clamp(time/6.9),p=lerp(r.from,r.to,smooth(u)),bend=(hash(index*73+11)-.5)*(r.team==='attack'?1.45:1.05)*Math.sin(u*Math.PI);
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
export function makeScene(renderer,event,weak=false,high=false){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b6c7cc');scene.fog=new THREE.Fog('#b6c7cc',160,290);
 const camera=new THREE.PerspectiveCamera(30,1,.5,350);
 const resources=new Set(),track=o=>(resources.add(o),o);
 const direction=event.attackDirection===-1?-1:1;
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
  const shirtMaterials=new Map();
  function shirtMaterial(kit){
   const key=[kit.shirt,kit.shirtSecondary,kit.pattern].join(':');if(shirtMaterials.has(key))return shirtMaterials.get(key);
   const tex=canvasTexture(128,128,(ctx,w,h)=>{
    ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,w,h);ctx.fillStyle=kit.shirtSecondary;
    if(kit.pattern==='stripes')for(let x=0;x<w;x+=32)ctx.fillRect(x,0,14,h);
    else if(kit.pattern==='hoops')for(let y=8;y<h;y+=32)ctx.fillRect(0,y,w,14);
    else if(kit.pattern==='diagonal'){ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-.55);ctx.fillRect(-18,-h,36,h*2);ctx.restore()}
    else if(kit.pattern==='halves')ctx.fillRect(w/2,0,w/2,h);
   });tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
   const material=track(new THREE.MeshStandardMaterial({map:tex,color:'#ffffff',roughness:.78}));shirtMaterials.set(key,material);return material
  }
  const hemi=new THREE.HemisphereLight('#e2efff','#657644',2.2);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff4d8',2.8);sun.position.set(-35,65,10);sun.target.position.set(0,0,-28*direction);scene.add(sun,sun.target);sun.castShadow=!weak;
  sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:160});sun.shadow.bias=-.00025;sun.shadow.normalBias=.02;
  const fill=new THREE.DirectionalLight('#d4e6ff',weak?0:.5);fill.position.set(40,15,-50);scene.add(fill);

  const grass=canvasTexture(512,512,(ctx,w,h)=>{
   ctx.fillStyle='#447a37';ctx.fillRect(0,0,w,h);
   const pixels=ctx.getImageData(0,0,w,h);for(let i=0;i<w*h;i++){const n=(hash(i)-.5)*25;pixels.data[i*4]=64+n;pixels.data[i*4+1]=112+n;pixels.data[i*4+2]=48+n*.7}ctx.putImageData(pixels,0,0);
  });grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(12,18);grass.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
  const pitch=mesh(track(new THREE.PlaneGeometry(78,119)),track(new THREE.MeshStandardMaterial({map:grass,roughness:1})));pitch.rotation.x=-Math.PI/2;pitch.position.y=-.025;pitch.receiveShadow=true;
  const mowing=mat('#b9d48e',{transparent:true,opacity:.085,depthWrite:false});
  for(let z=-52.5;z<52.5;z+=14){const stripe=mesh(geo('stripe',()=>new THREE.PlaneGeometry(68,7)),mowing);stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.002,z+3.5)}
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
   for(let z=-1.9;z<=0;z+=.2375)for(const x of [-3.66,3.66])seg([x,0,z],[x,2.44,z]);
   const ng=track(new THREE.BufferGeometry());ng.setAttribute('position',new THREE.Float32BufferAttribute(net,3));const base=new Float32Array(net);
   const nm=track(new THREE.LineBasicMaterial({color:'#edf0e7',transparent:true,opacity:.66}));g.add(new THREE.LineSegments(ng,nm));
   return{geometry:ng,base};
  }
  const net=goal(-52.5,-1);goal(52.5,1);

  // Static stadium stays in world coordinates. Crowd uses two instanced meshes,
  // independent of player quality; LOW reduces density, not body proportions.
  box(100,.1,143,'#777d77',0,-.15,0,scene);
  const crowd=[],crowdRows=weak?7:high?12:10,sideCols=weak?75:high?132:106,endCols=weak?48:high?88:70;
  for(const side of [-1,1]){
   for(let row=0;row<12;row++){
    box(2.2,.6,119,row%2?'#62717a':'#717c83',side*(40+row*1.5),.5+row*.65,0,scene);
    box(79,.6,2.2,row%2?'#62717a':'#717c83',0,.5+row*.65,side*(61+row*1.5),scene);
    if(row<crowdRows){for(let col=0;col<sideCols;col++){const z=-56+col*(112/Math.max(1,sideCols-1));if(col%24>1)crowd.push([side*(40+row*1.5),1.05+row*.65,z])}for(let col=0;col<endCols;col++)if(col%22>1)crowd.push([-37+col*(74/Math.max(1,endCols-1)),1.05+row*.65,side*(61+row*1.5)])}
   }
   box(5,.3,122,'#263940',side*57,10.2,0,scene);box(112,.3,7,'#263940',0,10.2,side*80,scene);
   box(6,.35,126,'#202d31',side*59,12.15,0,scene);box(118,.35,8,'#202d31',0,12.15,side*82,scene);
   for(let z=-56;z<=56;z+=14)box(.2,9,.2,'#c1c8c7',side*57,5,z,scene);
  }
  const crowdBody=new THREE.InstancedMesh(geo('crowd-body',()=>new THREE.CylinderGeometry(.16,.2,.48,5)),mat('#ffffff'),crowd.length),crowdHead=new THREE.InstancedMesh(geo('crowd-head',()=>new THREE.SphereGeometry(.105,5,4)),mat('#c5a183'),crowd.length);
  const dummy=new THREE.Object3D(),c=new THREE.Color(),palette=['#722638','#a0434c','#dedbd2','#223044','#63717b','#ab835c'];
  crowd.forEach((p,i)=>{dummy.position.set(p[0],p[1]+hash(i)*.14,p[2]);dummy.updateMatrix();crowdBody.setMatrixAt(i,dummy.matrix);crowdBody.setColorAt(i,c.set(palette[Math.floor(hash(i+12)*palette.length)]));dummy.position.y+=.35;dummy.updateMatrix();crowdHead.setMatrixAt(i,dummy.matrix)});scene.add(crowdBody,crowdHead);track(crowdBody);track(crowdHead);
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
  function player(kit,name,keeper=false){
   const root=new THREE.Group(),rig=new THREE.Group();field.add(root);root.add(rig);
   const skin=skinTone(name),hair='#26201a',shirt=shirtMaterial(kit),sleeve=kit.pattern==='sleeves'?mat(kit.shirtSecondary):shirt;
   // Athletic 1.82 m silhouette; saved shirt pattern is rendered on the torso.
   bodyPartMaterial(.22,.153,.48,shirt,rig,0,1.27,0,1,.6);roundedMaterial(.215,.09,.125,shirt,rig,0,1.455,0);
   bodyPart(.155,.185,.2,kit.shorts,rig,0,.98,0,1,.75);
   bodyPart(.058,.065,.095,skin,rig,0,1.555,0);
   rounded(.095,.118,.1,skin,rig,0,1.70,-.012);rounded(.097,.043,.102,hair,rig,0,1.785,.003);
   const arms=[],elbows=[],legs=[],knees=[],gloves=[];
   for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.215,1.45,0);rig.add(arm);arms.push(arm);
    bodyPartMaterial(.055,.05,.17,sleeve,arm,0,-.065,0);bodyPart(.048,.04,.16,skin,arm,0,-.225,0);
    const elbow=new THREE.Group();elbow.position.y=-.30;arm.add(elbow);elbows.push(elbow);
    bodyPart(.039,.029,.265,skin,elbow,0,-.132,0);
    gloves.push(rounded(keeper?.047:.033,.065,.029,keeper?'#f3f4e9':skin,elbow,0,-.30,0));
    const leg=new THREE.Group();leg.position.set(side*.105,.94,0);rig.add(leg);legs.push(leg);
    bodyPart(.086,.075,.23,kit.shorts,leg,0,-.055,0);bodyPart(.067,.047,.31,skin,leg,0,-.275,0);
    const knee=new THREE.Group();knee.position.y=-.43;leg.add(knee);knees.push(knee);
    bodyPart(.05,.036,.38,kit.socks,knee,0,-.22,0);
    rounded(.06,.055,.145,'#151b21',knee,0,-.445,-.055);
   }
   // Soft contact shadows in LOW; STANDARD adds directional shadow maps.
   const shadow=mesh(geo('shadow',()=>new THREE.CircleGeometry(.44,high?20:14)),mat('#10200f',{transparent:true,opacity:.24,depthWrite:false}),root);shadow.rotation.x=-Math.PI/2;shadow.position.y=.021;shadow.scale.y=.6;
   return{root,rig,arms,elbows,legs,knees,gloves,shadow};
  }
  const kits=kitColors(event),attackKit=event.team==='away'?kits.away:kits.home,defendKit=event.team==='away'?kits.home:kits.away;
  const players=RUNS.map((r,i)=>player(r.team==='attack'?attackKit:defendKit,i===0?event.playerName:'footballer '+i));
  const keeper=player({shirt:kits.keeper,shorts:kits.keeper,socks:kits.keeper},event.keeperName||'goalkeeper',true);
  const ball=mesh(geo('ball',()=>new THREE.SphereGeometry(1,weak?10:high?20:16,weak?8:high?16:12)),track(new THREE.MeshStandardMaterial({color:'#fffdf3',roughness:.38,metalness:0,emissive:'#1b1b16',emissiveIntensity:.08})));ball.scale.setScalar(.13);ball.position.set(0,.13,0);ball.castShadow=!weak;
  // Ground cue and physical shadow keep the ball readable without scaling it like an arcade marker.
  const ballRing=mesh(geo('ball-ring',()=>new THREE.RingGeometry(.25,.34,24)),track(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false})));ballRing.rotation.x=-Math.PI/2;
  const ballShadow=mesh(geo('ball-shadow',()=>new THREE.CircleGeometry(.22,high?24:16)),track(new THREE.MeshBasicMaterial({color:'#071107',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide})));ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.019;
  for(const batch of batches.values()){batch.mesh=new THREE.InstancedMesh(batch.g,batch.m,batch.nodes.length);batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.mesh.castShadow=!weak;batch.mesh.receiveShadow=!weak;batch.mesh.frustumCulled=false;scene.add(batch.mesh);track(batch.mesh)}
  // Merge stadium structures by material into static instance batches as well.
  scene.updateMatrixWorld(true);
  const staticGroups=new Map();
  for(const o of staticBoxes){const key=o.material.uuid;if(!staticGroups.has(key))staticGroups.set(key,[]);staticGroups.get(key).push(o)}
  for(const nodes of staticGroups.values()){const batch=new THREE.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);nodes.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent()});scene.add(batch);track(batch)}
  function resetPose(p){p.rig.position.set(0,0,0);p.rig.rotation.set(0,0,0);for(const b of [...p.arms,...p.elbows,...p.legs,...p.knees])b.rotation.set(0,0,0)}
  function pose(p,x,z,time,speed,heading=0){
   resetPose(p);p.root.position.set(x,0,z);p.root.rotation.y=heading;
   const cadence=7.2+speed*2.5,phase=time*cadence,step=Math.sin(phase)*.6*speed;
   p.legs[0].rotation.x=step;p.legs[1].rotation.x=-step;
   p.knees[0].rotation.x=-Math.max(0,-Math.sin(phase))*.9*speed;p.knees[1].rotation.x=-Math.max(0,Math.sin(phase))*.9*speed;
   p.arms[0].rotation.x=-step*.68;p.arms[1].rotation.x=step*.68;p.arms[0].rotation.z=.05+.035*speed;p.arms[1].rotation.z=-.05-.035*speed;for(const elbow of p.elbows)elbow.rotation.x=-.6;
   p.rig.rotation.x=-.05*speed;p.rig.rotation.z=Math.sin(phase)*.026*speed;p.rig.position.y=Math.abs(Math.sin(phase))*.028*speed;
  }
  const camTarget=new THREE.Vector3();
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
   players.forEach((p,i)=>{const [x,z]=runPosition(i,time),moving=time<(i===0?SHOT_TIME+1.05:i===1?7.2:6.9),prev=runPosition(i,Math.max(0,time-.04)),next=runPosition(i,time+.04),vx=next[0]-prev[0],vz=next[1]-prev[1],speed=moving?clamp(Math.hypot(vx,vz)/.18,.13,1):.06,heading=moving?Math.atan2(-vx,-vz):p.root.rotation.y;pose(p,x,z,time+i*.29,speed,heading)});
   const striker=players[0];
   if(time>=4.9){striker.root.rotation.y=0;const k=kickPose(time);striker.legs[1].rotation.x=k.hip;striker.knees[1].rotation.x=k.knee;striker.rig.rotation.set(0,0,0);striker.rig.position.y=0;striker.arms[0].rotation.z=.45;striker.arms[1].rotation.z=-.65}
   if(time>=1.8&&time<=2.18){const passer=players[1];passer.legs[1].rotation.x=Math.sin((time-1.8)/.38*Math.PI)*.85}
   const kp=keeperPose(event.type,time);pose(keeper,kp.x,kp.z,time,.12,Math.PI);
   keeper.root.position.y=kp.y;keeper.root.rotation.y=Math.PI;keeper.rig.rotation.z=kp.tilt;
   keeper.rig.position.y=-.14*kp.anticipation*(1-kp.dive)+.13*kp.land;
   keeper.legs[0].rotation.x=-.22*(1-kp.dive);keeper.legs[1].rotation.x=-.22*(1-kp.dive);keeper.knees.forEach(k=>k.rotation.x=.4*(1-kp.dive));
   keeper.legs[0].rotation.z=.18+kp.dive*.32;keeper.legs[1].rotation.z=-.18-kp.dive*.15;
   keeper.arms[0].rotation.z=-.42;keeper.arms[1].rotation.z=.42;keeper.elbows.forEach(e=>e.rotation.x=-.3*(1-kp.dive));
   if(kp.dive>.05){keeper.elbows.forEach(e=>e.rotation.x=0);aimArm(keeper.arms[0],[2.52,1.14,-50.6]);aimArm(keeper.arms[1],[2.52,1.14,-50.6]);}
   const bp=ballPosition(event.type,time);ball.position.set(...bp);ball.rotation.x=time*9;ballRing.position.set(bp[0],.025,bp[2]);ballRing.visible=time<IMPACT_TIME+.12;ballRing.material.opacity=time<SHOT_TIME?.42:.24;
   const shadowScale=clamp(1-bp[1]/3,.42,1);ballShadow.position.set(bp[0],.019,bp[2]);ballShadow.scale.setScalar(shadowScale);ballShadow.material.opacity=.12+.18*shadowScale;
   if(time>SHOT_TIME){const chase=smooth((time-SHOT_TIME)/1.8);for(const i of [8,9,10,11,12,14,15])players[i].root.position.z-=chase*(.35+hash(i+200)*.8)}
   const reaction=smooth((time-IMPACT_TIME)/.72);
   if(event.type==='goal'&&time>REVEAL_TIME){const t=time-REVEAL_TIME;for(const i of [0,2,3]){const p=players[i];p.arms[0].rotation.z=1.75;p.arms[1].rotation.z=-1.75;p.root.position.z-=Math.min(3,t)*.6;p.rig.position.y=Math.abs(Math.sin(t*7))*.025}for(const i of [8,9,10,11]){const p=players[i];p.rig.rotation.x=.045*reaction;p.arms[0].rotation.z=-.18*reaction;p.arms[1].rotation.z=.18*reaction}}
   else if(reaction>.05){const lift=event.type==='big_chance_saved'?1.05:event.type==='shot_post'?.82:.58;striker.arms[0].rotation.z=mix(striker.arms[0].rotation.z,lift,reaction);striker.arms[1].rotation.z=mix(striker.arms[1].rotation.z,-lift,reaction);striker.rig.rotation.x=-.03*reaction}
   const positions=net.geometry.attributes.position;
   if(event.type==='goal'&&time>=IMPACT_TIME&&time<IMPACT_TIME+1.5){const t=time-IMPACT_TIME;for(let i=0;i<positions.count;i++){const x=net.base[i*3],y=net.base[i*3+1],z=net.base[i*3+2],influence=Math.exp(-((x-2.65)**2+(y-1.08)**2)*.8)*(z<-1?1:0);positions.array[i*3+2]=z-Math.sin(t*16)*Math.exp(-t*3)*.28*influence}positions.needsUpdate=true}
   const cam=cameraState(direction,time,camera.aspect,event.type);camera.position.set(...cam.position);camTarget.set(...cam.target);camera.fov=cam.fov;camera.updateProjectionMatrix();camera.lookAt(camTarget);camera.updateMatrixWorld();
   scene.updateMatrixWorld(true);
   for(const batch of batches.values()){batch.nodes.forEach((node,i)=>batch.mesh.setMatrixAt(i,node.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true}
   renderer.render(scene,camera);
  }
  function reduceQuality(){renderer.shadowMap.enabled=false;crowdBody.count=Math.floor(crowd.length*.55);crowdHead.count=crowdBody.count;fill.intensity=0}
  function resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
  function dispose(){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear()}
  function inspect(){
   const project=p=>p.clone().project(camera),visible=players.filter(p=>{const q=project(p.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0)));return Math.abs(q.x)<.98&&Math.abs(q.y)<.98&&q.z<1}).length;
   return{direction,camera:camera.position.toArray(),cameraTarget:camTarget.toArray(),cameraDistance:camera.position.distanceTo(camTarget),visibleFieldPlayers:visible,fieldPlayers:players.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:weak?'low':high?'high':'standard',goalScreenX:project(new THREE.Vector3(...worldPosition([0,0,-52.5],direction))).x,shooterScreenX:project(players[0].root.getWorldPosition(new THREE.Vector3())).x,gloves:keeper.gloves.map(g=>g.getWorldPosition(new THREE.Vector3()).toArray()),ball:ball.getWorldPosition(new THREE.Vector3()).toArray()};
  }
  return{update,resize,dispose,inspect,reduceQuality};
 }catch(error){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear();throw error}
}
export function play(event,signal){
 return new Promise(resolve=>{
  const host=document.getElementById('matchLiveStage');
  if(!host||signal.aborted||document.hidden){resolve('skipped');return}
  let renderer,world,observer,raf,timer,done=false,start,last=0,slowFrames=0,frames=0,verySlowFrames=0;
  const previousFocus=document.activeElement;
  const layer=document.createElement('div');layer.className='fh3d';layer.setAttribute('role','region');layer.setAttribute('aria-label','Footera 3D-Highlight');
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','3D-Fußballszene');layer.append(canvas);
  const top=document.createElement('div');top.className='fh3d-top';
  const brand=document.createElement('span');brand.className='fh3d-brand';brand.textContent='FOOTERA';const sub=document.createElement('small');sub.textContent=`LIVE · ${event.minute}'`;brand.append(sub);
  const skip=document.createElement('button');skip.type='button';skip.className='fh3d-skip';skip.textContent='Überspringen';top.append(brand,skip);layer.append(top);
  const hud=document.createElement('div');hud.className='fh3d-hud';hud.setAttribute('aria-live','polite');
  const mark=document.createElement('span');mark.className='fh3d-mark';mark.textContent='F';mark.setAttribute('aria-hidden','true');
  const copy=document.createElement('div');copy.className='fh3d-copy';const name=document.createElement('strong');name.className='fh3d-name';const detail=document.createElement('span');detail.className='fh3d-event';copy.append(name,detail);hud.append(mark,copy);layer.append(hud);host.append(layer);
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
   const memory=navigator.deviceMemory||8,cores=navigator.hardwareConcurrency||8,dpr=devicePixelRatio||1,weak=memory<=4||cores<=4,high=!weak&&memory>=8&&cores>=8&&dpr>=1.5;let quality=weak?'low':high?'high':'standard';
   renderer=new THREE.WebGLRenderer({canvas,antialias:!weak,alpha:false,powerPreference:weak?'low-power':'high-performance',failIfMajorPerformanceCaveat:true});
   renderer.setPixelRatio(Math.min(dpr,weak?1.25:high?2.5:1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=!weak;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   world=makeScene(renderer,event,weak,high);
   const resize=()=>{const r=canvas.getBoundingClientRect();world.resize(Math.max(1,r.width),Math.max(1,r.height))};resize();observer=new ResizeObserver(resize);observer.observe(layer);
   function frame(now){
    if(done)return;
    try{
     if(start===undefined)start=now;const elapsed=(now-start)/1000;
     if(last&&now-last>45)slowFrames++;if(last&&now-last>250)verySlowFrames++;last=now;frames++;
     if(frames>=24&&verySlowFrames/frames>.65){finish('fallback');return}
     if(frames===40&&slowFrames>14){quality='adaptive';renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));world.reduceQuality();resize()}
     world.update(elapsed);
     layer.dataset.period=String(event.period);layer.dataset.direction=String(event.attackDirection);layer.dataset.quality=quality;
     if(elapsed>=REVEAL_TIME&&!name.textContent){name.textContent=event.playerName;const eventLabel=event.type==='big_chance_saved'?(event.keeperName?`PARIERT VON ${event.keeperName.toUpperCase()}`:'SCHUSS GEHALTEN'):LABELS[event.type];detail.textContent=`${eventLabel} · ${event.minute}'`}
     hud.classList.toggle('visible',elapsed>=REVEAL_TIME&&elapsed<DURATION-.2);
     if(elapsed>=DURATION){finish('played');return}raf=requestAnimationFrame(frame);
    }catch(_){finish('fallback')}
   }
   raf=requestAnimationFrame(frame);
  }catch(_){finish('fallback')}
 });
}
