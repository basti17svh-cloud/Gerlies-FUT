import * as THREE from './vendor/three/three.module.min.js';

// Presentation-only choreography. It consumes a frozen event and never match RNG/state.
export const DURATION=8.6;
export const SHOT_TIME=3.15;
export const REVEAL_TIME=4.55;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const hash=n=>((Math.imul(n,1664525)+1013904223)>>>0)/4294967296;
export function ballPosition(type,time){
 if(time<1.55)return lerp([-8,.21,-11],[-6,.21,-16],time/1.55);
 if(time<2.68)return lerp([-6,.21,-16],[0,.21,-19.75],(time-1.55)/1.13);
 if(time<SHOT_TIME)return lerp([0,.21,-19.75],[.22,.22,-20.85],(time-2.68)/(SHOT_TIME-2.68));
 const start=[.22,.22,-20.85];
 const impact=type==='big_chance_saved'?[2,1.22,-30.8]:type==='shot_post'?[3.52,1.3,-31.84]:type==='big_chance_missed'?[4.85,1.25,-33]:[2.65,1.05,-33.2];
 const flight=clamp((time-SHOT_TIME)/1.2);
 if(flight<1){const p=lerp(start,impact,flight);p[1]+=Math.sin(flight*Math.PI)*.72;return p}
 if(type==='goal')return lerp(impact,[2.42,.22,-33.72],(time-4.35)/.62);
 if(type==='big_chance_saved'){const p=lerp(impact,[5.8,.22,-26.4],(time-4.35)/1.2);p[1]+=Math.sin(clamp((time-4.35)/1.2)*Math.PI)*.45;return p}
 if(type==='shot_post')return lerp(impact,[6.5,.22,-25.4],(time-4.35)/1.25);
 return lerp(impact,[7,.22,-39],(time-4.35)/1.25);
}
export function cameraIndex(event){let n=0;for(const c of `${event.id}:${event.minute}:${event.team}`)n=(n*31+c.charCodeAt(0))>>>0;return n%3}
const LABELS={goal:'TOR',big_chance_saved:'PARADE',big_chance_missed:'GROSSE CHANCE · VORBEI',shot_post:'PFOSTEN'};
function hex(value,fallback){return /^#[a-f0-9]{6}$/i.test(value)?value:fallback}
function kitColors(event){
 const home=hex(event.homeColor,'#9a183d');let away=hex(event.awayColor,'#f2f3f4');
 const h=new THREE.Color(home),a=new THREE.Color(away);
 if(Math.hypot(h.r-a.r,h.g-a.g,h.b-a.b)<.42)away=(h.r+h.g+h.b)>1.3?'#162c50':'#f2f0e9';
 return event.team==='away'?[away,home]:[home,away];
}
function skinTone(name='',offset=0){const tones=['#f1c7a5','#dca17d','#bd7b59','#8d5a3e','#6d422e'];let n=offset;for(const c of name)n=(n*33+c.charCodeAt(0))>>>0;return tones[n%tones.length]}
function makeScene(renderer,event,weak=false){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#071018');scene.fog=new THREE.FogExp2('#08111a',.017);
 const camera=new THREE.PerspectiveCamera(52,1,.1,170);
 const resources=new Set(),track=o=>(resources.add(o),o);
 try{
  const geometry=new Map(),materials=new Map();
  function geo(key,create){if(!geometry.has(key))geometry.set(key,track(create()));return geometry.get(key)}
  function mat(color,opts={}){const key=[color,opts.kind||'std',opts.roughness??.7,opts.metalness??0,opts.emissive||''].join(':');if(!materials.has(key)){
   let m;if(opts.kind==='basic')m=new THREE.MeshBasicMaterial({color,transparent:!!opts.transparent,opacity:opts.opacity??1,depthWrite:opts.depthWrite!==false});
   else m=new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.74,metalness:opts.metalness??0,emissive:opts.emissive||'#000000',emissiveIntensity:opts.emissiveIntensity??0});
   materials.set(key,track(m));
  }return materials.get(key)}
  function mesh(g,m,parent=scene){const o=new THREE.Mesh(g,m);parent.add(o);return o}
  function box(w,h,d,color,x=0,y=0,z=0,parent=scene,opts={}){const o=mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),mat(color,opts),parent);o.scale.set(w,h,d);o.position.set(x,y,z);return o}
  function cyl(r1,r2,h,color,parent=scene,opts={}){const key=`cyl:${r1}:${r2}`;const o=mesh(geo(key,()=>new THREE.CylinderGeometry(r1,r2,1,weak?8:12,1,false)),mat(color,opts),parent);o.scale.y=h;return o}
  function sphere(r,color,x=0,y=0,z=0,parent=scene,opts={}){const o=mesh(geo('sphere',()=>new THREE.SphereGeometry(1,weak?12:18,weak?8:12)),mat(color,opts),parent);o.scale.setScalar(r);o.position.set(x,y,z);return o}
  function line(points,color='#eef7ef',opacity=.78,parent=scene){const g=track(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))));const m=track(new THREE.LineBasicMaterial({color,transparent:true,opacity}));const o=new THREE.Line(g,m);parent.add(o);return o}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const tex=track(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;return tex}

  scene.add(new THREE.HemisphereLight('#dcecff','#13231a',2.6));
  const moon=new THREE.DirectionalLight('#eef5ff',3.25);moon.position.set(-16,28,8);scene.add(moon);
  const warm=new THREE.DirectionalLight('#fff0d7',1.45);warm.position.set(20,14,-36);scene.add(warm);
  const rim=new THREE.DirectionalLight('#95ffb2',.65);rim.position.set(-24,7,-28);scene.add(rim);

  const grass=canvasTexture(256,256,(ctx,w,h)=>{
   ctx.fillStyle='#176037';ctx.fillRect(0,0,w,h);
   for(let band=0;band<8;band++){ctx.fillStyle=band%2?'#1c6b3d':'#216f42';ctx.globalAlpha=.55;ctx.fillRect(0,band*h/8,w,h/8)}ctx.globalAlpha=1;
   for(let i=0;i<1600;i++){const x=hash(i*3)*w,y=hash(i*3+1)*h,l=1+hash(i*3+2)*3;ctx.strokeStyle=i%4?'#2e8050':'#0e4c2a';ctx.globalAlpha=.18+.18*hash(i+91);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1,y-l);ctx.stroke()}ctx.globalAlpha=1;
  });
  grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(7,10);grass.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy?.()||1);
  const pitchMat=track(new THREE.MeshStandardMaterial({map:grass,roughness:.98,metalness:0,color:'#ffffff'}));
  const pitch=mesh(track(new THREE.PlaneGeometry(52,82)),pitchMat);pitch.rotation.x=-Math.PI/2;pitch.position.set(0,-.015,1);

  const y=.025;
  line([[-24,y,-32],[24,y,-32],[24,y,34],[-24,y,34],[-24,y,-32]],'#e7f3e8',.72);
  line([[-20.16,y,-32],[-20.16,y,-15.5],[20.16,y,-15.5],[20.16,y,-32]],'#e7f3e8',.72);
  line([[-9.16,y,-32],[-9.16,y,-26.5],[9.16,y,-26.5],[9.16,y,-32]],'#e7f3e8',.72);
  line([[-24,y,1],[24,y,1]],'#e7f3e8',.62);
  const arc=[];for(let i=0;i<=32;i++){const a=.64+i*(Math.PI-1.28)/32;arc.push([Math.cos(a)*9.15,y,-21+Math.sin(a)*9.15])}line(arc,'#e7f3e8',.66);
  sphere(.085,'#eef6ed',0,.04,-21,scene,{kind:'basic'});

  // Goal and net are kept regulation-scaled so the shot outcomes still match the simulation event.
  const goal=new THREE.Group();scene.add(goal);
  box(.14,2.57,.14,'#f7faf8',-3.66,1.22,-32,goal,{roughness:.32});box(.14,2.57,.14,'#f7faf8',3.66,1.22,-32,goal,{roughness:.32});box(7.46,.14,.14,'#f7faf8',0,2.44,-32,goal,{roughness:.32});
  const net=[];const seg=(a,b)=>net.push(...a,...b);
  for(let x=-3.66;x<=3.67;x+=.305){seg([x,0,-34],[x,2.44,-34]);seg([x,2.44,-34],[x,2.44,-32])}
  for(let yy=0;yy<=2.45;yy+=.244){seg([-3.66,yy,-34],[3.66,yy,-34]);for(const x of [-3.66,3.66])seg([x,yy,-34],[x,yy,-32])}
  for(let z=-34;z<=-31.99;z+=.25){seg([-3.66,0,z],[3.66,0,z]);for(const x of [-3.66,3.66])seg([x,0,z],[x,2.44,z])}
  const ng=track(new THREE.BufferGeometry());ng.setAttribute('position',new THREE.Float32BufferAttribute(net,3));
  const nm=track(new THREE.LineBasicMaterial({color:'#e9eff5',transparent:true,opacity:.42}));const netMesh=new THREE.LineSegments(ng,nm);goal.add(netMesh);

  // Stadium bowl: steep dark terraces, roof beams, crowd points, banners and floodlights.
  for(let row=0;row<8;row++){
   box(72,.72,2.6,row%2?'#202733':'#17202b',0,1.1+row*.86,-39.5-row*2.35);
   box(3.1,.72,78,'#18212c',-29.5-row*1.45,1.1+row*.86,-1.5);box(3.1,.72,78,'#18212c',29.5+row*1.45,1.1+row*.86,-1.5);
  }
  for(const x of [-34,-22,-10,10,22,34]){const beam=box(.34,12,.34,'#313c48',x,12,-50);beam.rotation.z=(x<0?-.28:.28)}
  for(const z of [-51,-48])box(72,.32,.36,'#313c48',0,17,z);
  for(const x of [-33,33])for(const z of [-36,-4,26]){box(.26,18,.26,'#48525d',x,9,z);const panel=box(5.8,1.3,.32,'#f4fbff',x,17.2,z,scene,{kind:'basic'});panel.rotation.y=x<0?.32:-.32}

  const crowdPos=[],crowdCol=[],palette=['#7b1829','#a71e33','#e6e7e9','#262c35','#5d6670','#b22b3d'];
  const color=new THREE.Color();
  function crowdPoint(x,yy,z,i){crowdPos.push(x,yy,z);color.set(palette[i%palette.length]);crowdCol.push(color.r,color.g,color.b)}
  let ci=0;
  for(let row=0;row<8;row++)for(let col=0;col<92;col++)crowdPoint(-35+col*.77,1.65+row*.86,-39.5-row*2.35,ci++);
  for(const side of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<84;col++)crowdPoint(side*(28.2+row*1.45),1.65+row*.86,-35+col*.83,ci++);
  const cg=track(new THREE.BufferGeometry());cg.setAttribute('position',new THREE.Float32BufferAttribute(crowdPos,3));cg.setAttribute('color',new THREE.Float32BufferAttribute(crowdCol,3));
  const cm=track(new THREE.PointsMaterial({size:weak?.22:.27,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.96}));scene.add(new THREE.Points(cg,cm));

  const brandTex=canvasTexture(1024,128,(ctx,w,h)=>{ctx.fillStyle='#071119';ctx.fillRect(0,0,w,h);ctx.fillStyle='#5cff78';ctx.font='900 62px system-ui';ctx.fillText('F',34,88);ctx.fillStyle='#f7f8f8';ctx.font='800 45px system-ui';ctx.fillText('FOOTERA',112,84);ctx.fillStyle='#72ff87';ctx.fillRect(360,60,120,5);ctx.fillStyle='#d6dfdd';ctx.font='700 24px system-ui';ctx.fillText('BUILD YOUR ERA',520,78)});
  brandTex.wrapS=THREE.RepeatWrapping;brandTex.repeat.set(2.8,1);
  const adMat=track(new THREE.MeshBasicMaterial({map:brandTex}));
  const adGeo=geo('ad',()=>new THREE.PlaneGeometry(11,1.35));for(const x of [-18,-6,6,18]){const ad=mesh(adGeo,adMat);ad.position.set(x,.95,-36.1)}
  const sideAdGeo=geo('sideAd',()=>new THREE.PlaneGeometry(11,1.35));for(const side of [-1,1])for(const z of [-25,-12,1,14]){const ad=mesh(sideAdGeo,adMat);ad.position.set(side*25,.95,z);ad.rotation.y=side<0?Math.PI/2:-Math.PI/2}
  const screenTex=canvasTexture(768,300,(ctx,w,h)=>{ctx.fillStyle='#060e14';ctx.fillRect(0,0,w,h);ctx.fillStyle='#5cff78';ctx.font='900 140px system-ui';ctx.fillText('F',55,205);ctx.fillStyle='#f4f7f7';ctx.font='800 70px system-ui';ctx.fillText('FOOTERA',220,188)});
  const screenMat=track(new THREE.MeshBasicMaterial({map:screenTex}));const screen=mesh(track(new THREE.PlaneGeometry(12,4.8)),screenMat);screen.position.set(13,11.5,-49.4);

  function player(colorHex,shortsHex='#151b24',name='',keeper=false){
   const root=new THREE.Group();scene.add(root);const rig=new THREE.Group();root.add(rig);
   const skin=skinTone(name,keeper?3:0),hair=name&&name.charCodeAt(0)%3===0?'#211c19':'#100e0d';
   const torso=cyl(.29,.38,.7,colorHex,rig,{roughness:.62});torso.position.y=1.3;
   const chest=box(.66,.12,.4,colorHex,0,1.56,0,rig,{roughness:.62});chest.rotation.z=.01;
   const shorts=cyl(.34,.37,.3,shortsHex,rig,{roughness:.78});shorts.position.y=.82;
   const neck=cyl(.095,.095,.12,skin,rig,{roughness:.9});neck.position.y=1.7;
   const head=sphere(.205,skin,0,1.9,0,rig,{roughness:.88});head.scale.set(.94,1.08,.91);
   const hairCap=sphere(.21,hair,0,2.0,.012,rig,{roughness:.96});hairCap.scale.set(.95,.48,.92);
   sphere(.045,skin,0,1.89,-.185,rig,{roughness:.9});
   const arms=[],legs=[];
   for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.35,1.55,0);rig.add(arm);
    const upper=cyl(.075,.085,.3,colorHex,arm,{roughness:.7});upper.position.y=-.15;
    const fore=cyl(.062,.07,.27,skin,arm,{roughness:.9});fore.position.y=-.435;
    sphere(keeper?.09:.07,keeper?'#edf6ef':skin,0,-.61,0,arm,{roughness:.8});arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.16,.68,0);rig.add(leg);
    const thigh=cyl(.09,.105,.36,skinTone(name,side>0?1:2),leg,{roughness:.9});thigh.position.y=-.18;
    const sock=cyl(.072,.082,.3,colorHex,leg,{roughness:.82});sock.position.y=-.51;
    const boot=box(.17,.12,.38,'#0a0d12',0,-.67,-.09,leg,{roughness:.52});boot.rotation.x=-.05;legs.push(leg);
   }
   const shadowMat=track(new THREE.MeshBasicMaterial({color:'#020504',transparent:true,opacity:.34,depthWrite:false}));const shadow=mesh(geo('shadow',()=>new THREE.CircleGeometry(.6,20)),shadowMat,root);shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.scale.y=.58;
   return{root,rig,arms,legs,head};
  }
  const [attackColor,defendColor]=kitColors(event);
  const attacker=player(attackColor,'#141922',event.playerName),passer=player(attackColor,'#141922','team mate 1'),defender=player(defendColor,'#eceef1','defender 1'),defender2=player(defendColor,'#eceef1','defender 2'),keeper=player('#f07728','#ea6b1e','keeper',true);

  const ball=new THREE.Group();scene.add(ball);sphere(.205,'#f8f8f4',0,0,0,ball,{roughness:.54});
  for(const [x,yy,z] of [[0,.18,0],[0,-.18,0],[.18,0,0],[-.18,0,0],[0,0,.18],[0,0,-.18]])sphere(.052,'#20262e',x,yy,z,ball,{roughness:.7});

  const camVariant=cameraIndex(event),side=camVariant===1?-1:1;
  const startCam=camVariant===2?[1.5,2.35,-7.0]:[side*5.2,2.55,-8.2];
  const camPos=new THREE.Vector3(),camTarget=new THREE.Vector3(),tmp=new THREE.Vector3();
  function pose(p,x,z,time,amount=1){p.root.position.set(x,0,z);const step=Math.sin(time*10.5)*.62*amount;p.legs[0].rotation.x=step;p.legs[1].rotation.x=-step;p.arms[0].rotation.x=-step*.72;p.arms[1].rotation.x=step*.72;p.rig.rotation.x=-.05*amount;p.rig.position.y=Math.abs(Math.sin(time*10.5))*.045*amount}
  function update(time){
   const build=clamp(time/SHOT_TIME);pose(attacker,mix(-1.1,0,build),mix(-12,-20.12,build),time,time<SHOT_TIME?1:.08);
   pose(passer,mix(-8,-6,clamp(time/1.55)),mix(-10,-15.2,clamp(time/1.55)),time,time<1.6?.95:.06);
   pose(defender,mix(3.2,1.9,build),mix(-18.7,-22.6,build),time,.72);pose(defender2,mix(-5,-3.7,build),mix(-24,-25.5,build),time,.48);
   if(time>=2.75&&time<3.42){const kick=Math.sin(clamp((time-2.75)/.67)*Math.PI);attacker.legs[1].rotation.x=-kick*1.35;attacker.rig.rotation.x=-.16*kick}
   const dive=smooth((time-3.38)/.92);const keeperTarget=event.type==='big_chance_saved'?1.75:event.type==='shot_post'?1.45:1.1;
   keeper.root.position.set(mix(0,keeperTarget,dive),mix(0,.34,dive),-30.75);keeper.rig.rotation.z=-dive*1.18;keeper.arms[0].rotation.z=-dive*1.9;keeper.arms[1].rotation.z=-dive*.65;keeper.legs[0].rotation.z=dive*.25;keeper.legs[1].rotation.z=-dive*.3;
   const bp=ballPosition(event.type,time);ball.position.set(...bp);ball.rotation.x=time*10.5;ball.rotation.z=time*5.4;
   if(event.type==='goal'&&time>4.45){const cheer=smooth((time-4.45)/.72),runOn=clamp((time-4.7)/2.4);attacker.root.position.z=mix(-20.12,-23.5,runOn);attacker.arms[0].rotation.z=cheer*1.68;attacker.arms[1].rotation.z=-cheer*1.68;attacker.arms[0].rotation.x=-.55;attacker.arms[1].rotation.x=-.55;attacker.rig.position.y=Math.abs(Math.sin(time*7))*.08;netMesh.position.z=-Math.sin((time-4.45)*15)*.07*Math.max(0,1-(time-4.45)/1.4)}

   const follow=smooth(time/3.1);camPos.set(mix(startCam[0],side*4.2,follow),mix(startCam[1],2.42,follow),mix(startCam[2],-13.4,follow));
   camTarget.set(mix(-.2,.5,follow),mix(1.15,1.25,follow),mix(-21.5,-27.7,follow));
   if(time>3.15){const shot=smooth((time-3.15)/1.0);tmp.set(side*4.7,2.7,-14.2);camPos.lerp(tmp,shot);tmp.set(1.1,1.22,-31.2);camTarget.lerp(tmp,shot)}
   if(event.type==='goal'&&time>5.2){const celeb=smooth((time-5.2)/1.5);tmp.set(side*3.7,2.25,-15.6);camPos.lerp(tmp,celeb);tmp.set(attacker.root.position.x,1.35,attacker.root.position.z-3.8);camTarget.lerp(tmp,celeb)}
   camera.position.copy(camPos);camera.lookAt(camTarget);renderer.render(scene,camera);
  }
  function resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
  function dispose(){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear()}
  return{update,resize,dispose};
 }catch(error){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear();throw error}
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
  timer=setTimeout(()=>finish('fallback'),12000);
  try{
   const weak=(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
   renderer=new THREE.WebGLRenderer({canvas,antialias:!weak,alpha:false,powerPreference:'high-performance',failIfMajorPerformanceCaveat:true});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,weak?1:1.45));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
   world=makeScene(renderer,event,weak);
   const resize=()=>{const r=layer.getBoundingClientRect();world.resize(Math.max(1,r.width),Math.max(1,r.height))};resize();observer=new ResizeObserver(resize);observer.observe(layer);
   function frame(now){
    if(done)return;
    try{
     if(start===undefined)start=now;const elapsed=(now-start)/1000;
     if(last&&now-last>45)slowFrames++;last=now;frames++;
     if(frames===40&&slowFrames>14){renderer.setPixelRatio(1);resize()}
     world.update(elapsed);
     if(elapsed>=REVEAL_TIME&&!name.textContent){name.textContent=event.playerName;detail.textContent=`${LABELS[event.type]} · ${event.minute}'`}
     hud.classList.toggle('visible',elapsed>=REVEAL_TIME&&elapsed<8.15);
     if(elapsed>=DURATION){finish('played');return}raf=requestAnimationFrame(frame);
    }catch(_){finish('fallback')}
   }
   raf=requestAnimationFrame(frame);
  }catch(_){finish('fallback')}
 });
}
