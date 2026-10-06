import * as THREE from './vendor/three/three.module.min.js';

// Coordinates in metres. This choreography consumes a fixed event, never RNG or match state.
export const DURATION=8;
export const SHOT_TIME=3.1;
export const REVEAL_TIME=4.5;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],clamp(t)));
export function ballPosition(type,time){
 if(time<1.6)return lerp([-8,.2,-11],[-6,.2,-16],time/1.6);
 if(time<2.65)return lerp([-6,.2,-16],[0,.2,-19.8],(time-1.6)/1.05);
 if(time<SHOT_TIME)return lerp([0,.2,-19.8],[.25,.2,-20.8],(time-2.65)/.45);
 const start=[.25,.2,-20.8];
 const impact=type==='big_chance_saved'?[2,1.2,-30.8]:type==='shot_post'?[3.52,1.3,-31.84]:type==='big_chance_missed'?[4.85,1.25,-33]:[2.65,1.05,-33.2];
 const flight=clamp((time-SHOT_TIME)/1.25);
 if(flight<1){const p=lerp(start,impact,flight);p[1]+=Math.sin(flight*Math.PI)*.75;return p}
 if(type==='goal')return lerp(impact,[2.4,.2,-33.65],(time-4.35)/.6);
 if(type==='big_chance_saved'){const p=lerp(impact,[5.8,.2,-26.5],(time-4.35)/1.2);p[1]+=Math.sin(clamp((time-4.35)/1.2)*Math.PI)*.5;return p}
 if(type==='shot_post')return lerp(impact,[6.5,.2,-25.5],(time-4.35)/1.25);
 return lerp(impact,[7,.2,-40],(time-4.35)/1.25);
}
export function cameraIndex(event){let n=0;for(const c of `${event.id}:${event.minute}:${event.team}`)n=(n*31+c.charCodeAt(0))>>>0;return n%3}
const LABELS={goal:'TOR',big_chance_saved:'PARADE',big_chance_missed:'GROSSE CHANCE · VORBEI',shot_post:'PFOSTEN'};
function hex(value,fallback){return /^#[a-f0-9]{6}$/i.test(value)?value:fallback}
function kitColors(event){
 const home=hex(event.homeColor,'#961e43');let away=hex(event.awayColor,'#e9ecf3');
 const h=new THREE.Color(home),a=new THREE.Color(away);
 if(Math.hypot(h.r-a.r,h.g-a.g,h.b-a.b)<.42)away=(h.r+h.g+h.b)>1.3?'#163974':'#f4f0e8';
 return event.team==='away'?[away,home]:[home,away];
}
function makeScene(renderer,event){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#121622');scene.fog=new THREE.Fog('#121622',45,105);
 const camera=new THREE.PerspectiveCamera(52,1,.1,160);
 const resources=new Set(),track=o=>(resources.add(o),o);
 try{
 const geometry=new Map(),materials=new Map();
 function geo(key,create){if(!geometry.has(key))geometry.set(key,track(create()));return geometry.get(key)}
 function mat(color,unlit=false){const key=color+':'+unlit;if(!materials.has(key))materials.set(key,track(unlit?new THREE.MeshBasicMaterial({color}):new THREE.MeshLambertMaterial({color})));return materials.get(key)}
 function mesh(g,m,parent=scene){const o=new THREE.Mesh(g,m);parent.add(o);return o}
 function box(w,h,d,color,x=0,y=0,z=0,parent=scene){const o=mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),mat(color),parent);o.scale.set(w,h,d);o.position.set(x,y,z);return o}
 function sphere(r,color,x,y,z,parent=scene){const o=mesh(geo('sphere',()=>new THREE.SphereGeometry(1,12,8)),mat(color),parent);o.scale.setScalar(r);o.position.set(x,y,z);return o}
 function line(points,color='#d7e4d3',parent=scene){const g=track(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))));const m=track(new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));const o=new THREE.Line(g,m);parent.add(o);return o}
 scene.add(new THREE.HemisphereLight('#dce8ff','#344031',2.2));const key=new THREE.DirectionalLight('#fff2da',2.5);key.position.set(-15,28,-12);scene.add(key);
 const fill=new THREE.DirectionalLight('#adc5ff',1.1);fill.position.set(20,15,-35);scene.add(fill);
 box(56,.15,84,'#163924',0,-.12,-4);
 for(let i=0;i<12;i++)box(48,.025,5.5,i%2?'#285538':'#245033',0,-.025,-29.25+i*5.5);
 const y=.015;
 line([[-24,y,-32],[24,y,-32],[24,y,34],[-24,y,34],[-24,y,-32]]);
 line([[-20.16,y,-32],[-20.16,y,-15.5],[20.16,y,-15.5],[20.16,y,-32]]);
 line([[-9.16,y,-32],[-9.16,y,-26.5],[9.16,y,-26.5],[9.16,y,-32]]);
 line([[-24,y,1],[24,y,1]]);
 const arc=[];for(let i=0;i<=32;i++){const a=.64+i*(Math.PI-1.28)/32;arc.push([Math.cos(a)*9.15,y,-21+Math.sin(a)*9.15])}line(arc);
 const circle=[];for(let i=0;i<=48;i++){const a=i*Math.PI/24;circle.push([Math.cos(a)*9.15,y,1+Math.sin(a)*9.15])}line(circle);
 sphere(.09,'#f0efe4',0,.035,-21);
 const goal=new THREE.Group();scene.add(goal);
 box(.13,2.57,.13,'#faf7ee',-3.66,1.22,-32,goal);box(.13,2.57,.13,'#faf7ee',3.66,1.22,-32,goal);box(7.45,.13,.13,'#faf7ee',0,2.44,-32,goal);
 // Net drawn as one line-segment buffer, not hundreds of meshes.
 const net=[];const segment=(a,b)=>net.push(...a,...b);
 for(let x=-3.66;x<=3.67;x+=.305){segment([x,0,-34],[x,2.44,-34]);segment([x,2.44,-34],[x,2.44,-32])}
 for(let yy=0;yy<=2.45;yy+=.244){segment([-3.66,yy,-34],[3.66,yy,-34]);for(const x of [-3.66,3.66])segment([x,yy,-34],[x,yy,-32])}
 for(let z=-34;z<=-31.99;z+=.25)for(const x of [-3.66,3.66])segment([x,0,z],[x,2.44,z]);
 const ng=track(new THREE.BufferGeometry());ng.setAttribute('position',new THREE.Float32BufferAttribute(net,3));
 const nm=track(new THREE.LineBasicMaterial({color:'#c7d2dd',transparent:true,opacity:.38}));const netMesh=new THREE.LineSegments(ng,nm);goal.add(netMesh);
 // Terraced stadium, restrained red light strips and instanced crowd.
 for(let row=0;row<6;row++){
  box(66,.6,2.4,row%2?'#262332':'#302a38',0,1+row*.9,-40-row*2);
  box(3,.6,78,'#262532',-29-row*2,1+row*.9,-2);box(3,.6,78,'#262532',29+row*2,1+row*.9,-2);
 }
 box(65,.12,.2,'#a32a4b',0,5.9,-50);box(.2,.12,77,'#a32a4b',-39,5.9,-2);box(.2,.12,77,'#a32a4b',39,5.9,-2);
 const crowd=new THREE.InstancedMesh(geo('crowd',()=>new THREE.BoxGeometry(.36,.65,.3)),mat('#82747c'),420);const matrix=new THREE.Matrix4();
 for(let i=0;i<420;i++){const row=Math.floor(i/70),col=i%70;matrix.makeTranslation(-30+col*.87,1.8+row*.9,-40-row*2);crowd.setMatrixAt(i,matrix);crowd.setColorAt(i,new THREE.Color(i%7===0?'#a03550':i%3===0?'#adb1bc':'#444351'))}scene.add(crowd);resources.add(crowd);
 // A tiny generated branding texture (no network textures).
 const label=document.createElement('canvas');label.width=512;label.height=64;const ctx=label.getContext('2d');
 ctx.fillStyle='#4b1628';ctx.fillRect(0,0,512,64);ctx.font='bold 35px sans-serif';ctx.fillStyle='#f9eef1';ctx.textAlign='center';ctx.fillText('FOOTERA   •   BUILD YOUR ERA',256,45);
 const texture=track(new THREE.CanvasTexture(label));texture.colorSpace=THREE.SRGBColorSpace;
 const boardMat=track(new THREE.MeshBasicMaterial({map:texture}));
 for(const x of [-18,-7,7,18]){const board=mesh(geo('board',()=>new THREE.PlaneGeometry(10,1.25)),boardMat);board.position.set(x,.9,-37)}
 for(const x of [-25,25]){box(.24,17,.24,'#626777',x,8.5,-36);const light=mesh(geo('light',()=>new THREE.BoxGeometry(5,1.1,.3)),mat('#edf2ff',true));light.position.set(x,17,-36)}
 function player(color,shorts='#20212c',keeper=false){
  const group=new THREE.Group();scene.add(group);const body=new THREE.Group();group.add(body);
  box(.63,.77,.34,color,0,1.16,0,body);box(.57,.3,.36,shorts,0,.67,0,body);
  sphere(.23,'#bd8968',0,1.8,0,body);sphere(.23,'#332821',0,1.89,-.035,body).scale.set(.235,.14,.23);
  const arms=[],legs=[];
  for(const sign of [-1,1]){
   const arm=new THREE.Group();arm.position.set(sign*.4,1.48,0);body.add(arm);box(.18,.5,.2,color,0,-.2,0,arm);sphere(keeper?.14:.1,keeper?'#faf3cf':'#bd8968',0,-.49,0,arm);arms.push(arm);
   const leg=new THREE.Group();leg.position.set(sign*.17,.65,0);body.add(leg);box(.2,.53,.22,'#dddde6',0,-.25,0,leg);box(.23,.14,.4,'#191b24',0,-.55,-.08,leg);legs.push(leg);
  }
  // Cheap ground contact shadow, no shadow maps.
  const shadowMat=track(new THREE.MeshBasicMaterial({color:'#07100a',transparent:true,opacity:.28,depthWrite:false}));const shadow=mesh(geo('shadow',()=>new THREE.CircleGeometry(.62,16)),shadowMat,group);shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;shadow.scale.y=.65;
  return{group,body,arms,legs};
 }
 const [attackColor,defendColor]=kitColors(event);
 const attacker=player(attackColor),passer=player(attackColor),defender=player(defendColor),defender2=player(defendColor),keeper=player('#f6aa3d','#30303a',true);
 const ball=new THREE.Group();scene.add(ball);sphere(.19,'#f8f4e9',0,0,0,ball);
 for(const [x,yy,z] of [[0,.17,0],[0,-.17,0],[.17,0,0],[-.17,0,0],[0,0,.17],[0,0,-.17]])sphere(.068,'#20242e',x,yy,z,ball);
 const cameras=[[11,9,-3],[17,8,-21],[-3,6,-2]],origin=cameras[cameraIndex(event)];
 const target=new THREE.Vector3(0,1,-25),normal=new THREE.Vector3(),look=new THREE.Vector3();
 function pose(p,x,z,time,run=1){p.group.position.set(x,0,z);p.legs[0].rotation.x=Math.sin(time*10)*.65*run;p.legs[1].rotation.x=-p.legs[0].rotation.x;p.arms[0].rotation.x=-p.legs[0].rotation.x*.7;p.arms[1].rotation.x=p.legs[0].rotation.x*.7;p.body.position.y=Math.abs(Math.sin(time*10))*.06*run}
 function update(time){
  const run=clamp(time/3.1);pose(attacker,mix(-1,0,run),mix(-12,-20.1,run),time,time<3.1?1:.12);
  pose(passer,mix(-8,-6,clamp(time/1.6)),mix(-10,-15.2,clamp(time/1.6)),time,time<1.6?1:.1);
  pose(defender,mix(3,1.8,run),mix(-19,-22.3,run),time,.7);pose(defender2,mix(-5,-3.8,run),mix(-24,-25.5,run),time,.5);
  if(time>=2.85&&time<3.4)attacker.legs[1].rotation.x=-Math.sin((time-2.85)/.55*Math.PI)*1.1;
  const dive=smooth((time-3.45)/.9);keeper.group.position.set(mix(0,event.type==='big_chance_saved'?1.25:1,dive),0,-30.8);
  keeper.body.rotation.z=-dive*1.23;keeper.body.position.y=dive*.3;keeper.arms[0].rotation.z=-dive*1.8;keeper.arms[1].rotation.z=-dive*.4;
  const pos=ballPosition(event.type,time);ball.position.set(...pos);ball.rotation.x=time*9;ball.rotation.z=time*4;
  if(event.type==='goal'&&time>4.6){const cheer=smooth((time-4.6)/.6);attacker.arms[0].rotation.z=cheer*2.6;attacker.arms[1].rotation.z=-cheer*2.6;attacker.body.position.y=Math.abs(Math.sin(time*5))*.15*cheer;netMesh.position.z=-Math.sin((time-4.6)*16)*.04*Math.max(0,1-(time-4.6))}
  normal.set(origin[0]*mix(1,.93,clamp(time/8)),origin[1],origin[2]-time*.13);look.copy(target);
  if(event.type==='goal'&&time>5.5){const blend=smooth((time-5.5)/1.6);normal.lerp(new THREE.Vector3(5,3.6,-13.5),blend);look.lerp(new THREE.Vector3(0,1,-20),blend)}
  camera.position.copy(normal);camera.lookAt(look);renderer.render(scene,camera);
 }
 function resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
 function dispose(){for(const resource of resources)resource.dispose();scene.clear()}
 return{update,resize,dispose};
 }catch(error){for(const resource of resources)resource.dispose();scene.clear();throw error}
}
export function play(event,signal){
 return new Promise(resolve=>{
  const host=document.getElementById('matchLiveStage');
  if(!host||signal.aborted||document.hidden){resolve('skipped');return}
  let renderer,world,observer,raf,timer,done=false,start,last=0,slowFrames=0,frames=0;
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
  timer=setTimeout(()=>finish('fallback'),11000);
  try{
   const weak=(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
   renderer=new THREE.WebGLRenderer({canvas,antialias:!weak,alpha:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:true});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,weak?1:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
   world=makeScene(renderer,event);
   const resize=()=>{const r=layer.getBoundingClientRect();world.resize(Math.max(1,r.width),Math.max(1,r.height))};resize();observer=new ResizeObserver(resize);observer.observe(layer);
   function frame(now){
    if(done)return;
    try{
     if(start===undefined)start=now;const elapsed=(now-start)/1000;
     if(last&&now-last>42)slowFrames++;last=now;frames++;
     if(frames===35&&slowFrames>12){renderer.setPixelRatio(1);resize()}
     world.update(elapsed);
     if(elapsed>=REVEAL_TIME&&!name.textContent){name.textContent=event.playerName;detail.textContent=`${LABELS[event.type]} · ${event.minute}'`}
     hud.classList.toggle('visible',elapsed>=REVEAL_TIME&&elapsed<7.5);
     if(elapsed>=DURATION){finish('played');return}raf=requestAnimationFrame(frame);
    }catch(_){finish('fallback')}
   }
   raf=requestAnimationFrame(frame);
  }catch(_){finish('fallback')}
 });
}
