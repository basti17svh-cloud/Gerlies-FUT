/* V21.446 Vereinsmuseum (surprise night 2026-11-17): a small 3D museum of the
 * user's club. Every cup the club has won stands in the glass cabinet with its
 * plaque (cup and week), the newest title turns on the pedestal in the middle,
 * the record boards hang on the left wall (top scorer, most matches, biggest
 * win, record of all matches), the win milestones as medals on the right wall,
 * the club band with crest and name above the cabinet.
 * Pure presentation: it reads the data handed in by footera-museum.js and never
 * changes the club or the save. Live scene: the camera drifts slowly along the
 * room; drag to look around. */
import * as THREE from './vendor/three/three.module.min.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.mjs';
import {createTrophyMesh,TROPHY_TONES,trophyTone} from './3d-trophy-stage.mjs?v=21444';

export const MUSEUM_VERSION='21.446-museum';
export const CABINET_SLOTS=12;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hexOr=(v,fb)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fb;
function shade(hex,f){const c=new THREE.Color(hex);if(f<1)c.multiplyScalar(f);else c.lerp(new THREE.Color('#ffffff'),f-1);return'#'+c.getHexString()}

// Where the cups stand: 2 shelves of 6 in the cabinet, newest first (top left).
// Pure, used by the tests: slot i -> shelf and x.
export function cabinetSlot(i){
 const shelf=Math.floor(i/6),k=i%6;
 return{shelf,x:(k-2.5)*.62,y:shelf===0?1.62:.92,z:-2.62};
}
// The camera path: a slow drift between the left and the right wall, user drag adds yaw.
export function museumCamera(t,drag=0){
 const yaw=clamp(Math.sin(t*.11)*.3+drag,-.8,.8);
 const r=5.1-Math.abs(yaw)*.9,target=new THREE.Vector3(Math.sin(yaw)*-.6,1.38,-1.9);
 return{pos:new THREE.Vector3(Math.sin(yaw)*r*.8,1.78+Math.sin(t*.07)*.06,-1.9+Math.cos(yaw)*r),target};
}

function canvasTexture(w,h,paint,owned){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(g)paint(g,w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;owned.push({texture:t});return t;
}
const FONT='"Arial Narrow","Roboto Condensed",Arial,sans-serif';
function fit(g,text,size,maxW,weight=900){let s=size;g.font=`${weight} ${s}px ${FONT}`;while(s>14&&g.measureText(text).width>maxW){s-=2;g.font=`${weight} ${s}px ${FONT}`}return s}
function bandTexture(kit,club,crestImg,owned){
 return canvasTexture(2048,384,(g,w,h)=>{
  const bg=g.createLinearGradient(0,0,w,0);const f=new THREE.Color(kit.shirt).getHSL({}).l>.5?.6:1;bg.addColorStop(0,shade(kit.shirt,.38*f));bg.addColorStop(.5,shade(kit.shirt,.6*f));bg.addColorStop(1,shade(kit.shirt,.38*f));
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.fillStyle='#d7b25a';g.fillRect(0,0,w,8);g.fillRect(0,h-8,w,8);
  g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#e9cf8a';fit(g,'VEREINSMUSEUM',54,w*.6,800);g.fillText('VEREINSMUSEUM',w/2,h*.27);
  g.fillStyle='#ffffff';const name=String(club||'FOOTERA').toUpperCase();fit(g,name,150,w*.66);g.fillText(name,w/2,h*.63);
  if(crestImg){const s=h*.72;g.drawImage(crestImg,w*.1-s/2,h/2-s/2,s,s);g.drawImage(crestImg,w*.9-s/2,h/2-s/2,s,s)}
 },owned);
}
function plaqueTexture(lines,owned,{dim=false}={}){
 return canvasTexture(512,160,(g,w,h)=>{
  const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,dim?'#2a2c31':'#d9b964');bg.addColorStop(1,dim?'#1b1d21':'#a07a2c');
  g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=dim?'#3a3d44':'#f3dc9a';g.lineWidth=6;g.strokeRect(6,6,w-12,h-12);
  g.textAlign='center';g.textBaseline='middle';g.fillStyle=dim?'#7d838d':'#2b1d06';
  fit(g,lines[0]||'',50,w*.86);g.fillText(lines[0]||'',w/2,h*.38);
  g.font=`700 34px ${FONT}`;fit(g,lines[1]||'',34,w*.86,700);g.fillText(lines[1]||'',w/2,h*.72);
 },owned);
}
function boardTexture(title,rows,kit,owned){
 return canvasTexture(640,800,(g,w,h)=>{
  g.fillStyle='#14161b';g.fillRect(0,0,w,h);
  g.strokeStyle='#c9a24f';g.lineWidth=10;g.strokeRect(10,10,w-20,h-20);
  g.fillStyle=hexOr(kit.shirt,'#971d42');g.fillRect(30,30,w-60,120);
  g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffffff';fit(g,title,64,w-100);g.fillText(title,w/2,90);
  rows.forEach((r,i)=>{
   const y=210+i*150;
   g.fillStyle='#c9a24f';g.font=`700 30px ${FONT}`;fit(g,r.label,30,w-80,700);g.fillText(r.label,w/2,y);
   g.fillStyle='#ffffff';fit(g,r.value,58,w-80);g.fillText(r.value,w/2,y+52);
   if(i<rows.length-1){g.fillStyle='rgba(201,162,79,.3)';g.fillRect(80,y+102,w-160,2)}
  });
 },owned);
}
function medalTexture(m,owned){
 return canvasTexture(256,256,(g,w,h)=>{
  g.clearRect(0,0,w,h);
  const c=w/2,r=w*.44;
  const grad=g.createRadialGradient(c-r*.3,c-r*.3,r*.1,c,c,r);
  if(m.reached){grad.addColorStop(0,m.tone==='gold'?'#fff1b8':m.tone==='silver'?'#ffffff':'#ffd3ae');grad.addColorStop(1,m.tone==='gold'?'#b8862a':m.tone==='silver'?'#8d97a3':'#8a4a22')}
  else{grad.addColorStop(0,'#3a3d44');grad.addColorStop(1,'#202227')}
  g.fillStyle=grad;g.beginPath();g.arc(c,c,r,0,Math.PI*2);g.fill();
  g.strokeStyle=m.reached?'rgba(255,255,255,.55)':'rgba(255,255,255,.12)';g.lineWidth=6;g.beginPath();g.arc(c,c,r*.82,0,Math.PI*2);g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.fillStyle=m.reached?'#2b1d06':'#6c727c';
  g.font=`900 ${m.wins>=100?78:92}px ${FONT}`;g.fillText(String(m.wins),c,c-12);
  g.font=`800 30px ${FONT}`;g.fillText('SIEGE',c,c+50);
 },owned);
}
function floorTexture(owned){
 return canvasTexture(1024,1024,(g,w,h)=>{
  g.fillStyle='#2b241f';g.fillRect(0,0,w,h);
  // herringbone parquet
  const pw=128,ph=32;let r=11;const rnd=()=>(r=(Math.imul(1664525,r)+1013904223)>>>0)/4294967296;
  for(let y=-ph;y<h+ph;y+=ph)for(let x=-pw;x<w+pw;x+=pw){const v=58+rnd()*26|0;g.fillStyle=`rgb(${v+18},${v},${v-12})`;g.fillRect(x+(y/ph%2)*pw/2,y,pw-3,ph-3)}
 },owned);
}

// data: {club, kit:{shirt,shirtSecondary}, crestHTML?, crestImg?, trophies:[{tone,title,sub}], hero:{tone,title,sub}|null,
//        boards:[{title,rows:[{label,value}]}], medals:[{wins,reached,tone}]}
export function createMuseum(canvas,data={},opts={}){
 const owned=[];
 const kit={shirt:hexOr(data.kit?.shirt,'#971d42'),shirtSecondary:hexOr(data.kit?.shirtSecondary,'#f3f4ee')};
 const dim=new THREE.Color(kit.shirt).getHSL({}).l>.5?.55:1;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});
 const ratio=Math.min(opts.pixelRatio||globalThis.devicePixelRatio||1,1.6);
 renderer.setPixelRatio(ratio);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#0d0e11');scene.fog=new THREE.Fog('#0d0e11',9,16);
 const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;pmrem.dispose();
 scene.environment=env;owned.push({texture:env});
 const camera=new THREE.PerspectiveCamera(48,1,.1,40);
 const track=x=>{owned.push(x.isMaterial?{material:x}:x.isBufferGeometry?{geometry:x}:{texture:x});return x};
 const mat=(color,o={})=>track(new THREE.MeshStandardMaterial({color,roughness:.7,metalness:0,...o}));
 const add=(geo,m,parent=scene)=>{const mesh=new THREE.Mesh(track(geo),m);parent.add(mesh);return mesh};

 /* room */
 const W=8,D=7,H=3.4,BACK=-3;
 const floorTex=floorTexture(owned);floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(3,3);
 add(new THREE.PlaneGeometry(W,D),mat('#ffffff',{map:floorTex,roughness:.34,metalness:.05})).rotation.x=-Math.PI/2;
 const wallM=mat('#1f2228',{roughness:.9});
 const back=add(new THREE.PlaneGeometry(W,H),wallM);back.position.set(0,H/2,BACK);
 for(const s of [-1,1]){const side=add(new THREE.PlaneGeometry(D,H),wallM);side.position.set(s*W/2,H/2,BACK+D/2);side.rotation.y=-s*Math.PI/2}
 const ceil=add(new THREE.PlaneGeometry(W,D),mat('#2a2c31',{roughness:1}));ceil.position.set(0,H,BACK+D/2);ceil.rotation.x=Math.PI/2;
 // wainscot in the club colour
 const wain=mat(shade(kit.shirt,.45*dim),{roughness:.55});
 const wb=add(new THREE.BoxGeometry(W,.9,.04),wain);wb.position.set(0,.45,BACK+.02);
 for(const s of [-1,1]){const ws=add(new THREE.BoxGeometry(.04,.9,D),wain);ws.position.set(s*(W/2-.02),.45,BACK+D/2)}
 // the club band above the cabinet
 const band=add(new THREE.PlaneGeometry(5.6,1.05),mat('#ffffff',{map:bandTexture(kit,data.club,data.crestImg,owned),roughness:.6}));band.position.set(0,2.72,BACK+.03);

 /* glass cabinet with two shelves */
 const wood=mat('#3a2a1e',{roughness:.45});
 const cab=new THREE.Group();scene.add(cab);
 add(new THREE.BoxGeometry(4.1,.5,.7),wood,cab).position.set(0,.25,-2.62);
 add(new THREE.BoxGeometry(4.1,.06,.7),wood,cab).position.set(0,2.24,-2.62);
 const backPanel=add(new THREE.PlaneGeometry(4,1.72),mat(shade(kit.shirt,.32*dim),{roughness:.5}),cab);backPanel.position.set(0,1.37,-2.95);
 for(const y of [.88,1.58]){add(new THREE.BoxGeometry(4,.035,.62),mat('#d9dde3',{roughness:.05,metalness:.2,transparent:true,opacity:.55}),cab).position.set(0,y,-2.62)}
 for(const x of [-2.02,2.02]){add(new THREE.BoxGeometry(.06,1.75,.7),wood,cab).position.set(x,1.37,-2.62)}
 const glass=add(new THREE.PlaneGeometry(4,1.72),track(new THREE.MeshPhysicalMaterial({color:'#e8f1ff',roughness:.04,metalness:0,transparent:true,opacity:.1,envMapIntensity:1.2})),cab);glass.position.set(0,1.37,-2.27);
 // cabinet strip lights
 for(const y of [1.52,2.18]){const strip=add(new THREE.BoxGeometry(3.9,.02,.02),track(new THREE.MeshBasicMaterial({color:'#fff4d6'})),cab);strip.position.set(0,y,-2.33)}

 const trophies=(data.trophies||[]).slice(0,CABINET_SLOTS);
 const spin=[];
 for(let i=0;i<CABINET_SLOTS;i++){
  const s=cabinetSlot(i),t=trophies[i];
  if(t){
   const cup=createTrophyMesh(trophyTone(t.tone),track,env);cup.scale.setScalar(.74);cup.position.set(s.x,s.y,s.z);cup.rotation.y=(i%3-1)*.25;scene.add(cup);
   const pl=add(new THREE.PlaneGeometry(.5,.156),mat('#ffffff',{map:plaqueTexture([t.title,t.sub],owned),roughness:.4,metalness:.3}));pl.position.set(s.x,s.y-.075,s.z+.3);pl.rotation.x=-.25;
  }else{
   const pl=add(new THREE.PlaneGeometry(.42,.13),mat('#ffffff',{map:plaqueTexture(['?','Noch frei'],owned,{dim:true}),roughness:.7}));pl.position.set(s.x,s.y-.075,s.z+.3);pl.rotation.x=-.25;
  }
 }

 /* the hero pedestal in the middle: the newest title turns slowly */
 const ped=add(new THREE.CylinderGeometry(.4,.48,.8,40),mat('#15171c',{roughness:.3,metalness:.25}));ped.position.set(0,.4,-.55);
 const ring=add(new THREE.TorusGeometry(.44,.012,8,48),mat('#c9a24f',{roughness:.3,metalness:1}));ring.rotation.x=Math.PI/2;ring.position.set(0,.8,-.55);
 let hero=null;
 if(data.hero){hero=createTrophyMesh(trophyTone(data.hero.tone),track,env);hero.scale.setScalar(1);hero.position.set(0,.8,-.55);scene.add(hero);spin.push(hero)}
 const heroPlaque=add(new THREE.PlaneGeometry(.66,.206),mat('#ffffff',{map:plaqueTexture(data.hero?[data.hero.title,data.hero.sub]:['Dein erster Pokal','kommt hierhin'],owned,{dim:!data.hero}),roughness:.4,metalness:.3}));
 heroPlaque.position.set(0,.5,-.1);heroPlaque.rotation.x=-.08;
 // velvet ropes around the pedestal
 const brass=mat('#c9a24f',{roughness:.25,metalness:1});
 const posts=[[-.9,.15],[.9,.15],[-.9,-1.25],[.9,-1.25]];
 for(const [x,z] of posts){const p=add(new THREE.CylinderGeometry(.03,.04,.9,12),brass);p.position.set(x,.45,z);const k=add(new THREE.SphereGeometry(.055,14,10),brass);k.position.set(x,.92,z)}
 const rope=mat('#7a1020',{roughness:.8});
 for(const [a,b] of [[0,1],[0,2],[1,3]]){
  const pa=new THREE.Vector3(posts[a][0],.86,posts[a][1]),pb=new THREE.Vector3(posts[b][0],.86,posts[b][1]),mid=pa.clone().lerp(pb,.5);mid.y=.66;
  add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pa,mid,pb),24,.018,8,false),rope);
 }

 /* left wall: record boards; right wall: milestone medals */
 const boards=(data.boards||[]).slice(0,2);
 const boardAt=[{x:-3.02,z:BACK+.04,ry:0},{x:-W/2+.04,z:-1.2,ry:Math.PI/2}];
 boards.forEach((b,i)=>{
  const at=boardAt[i],frame=add(new THREE.BoxGeometry(1.3,1.62,.05),mat('#c9a24f',{roughness:.3,metalness:.9}));
  frame.position.set(at.x,1.62,at.z);frame.rotation.y=at.ry;
  const board=add(new THREE.PlaneGeometry(1.2,1.5),mat('#ffffff',{map:boardTexture(b.title,b.rows,kit,owned),roughness:.6}));
  board.position.set(at.x+(at.ry?.035:0),1.62,at.z+(at.ry?0:.035));board.rotation.y=at.ry;
 });
 // the milestone medals: back wall right of the cabinet, two columns, three rows
 const medals=(data.medals||[]).slice(0,6);
 const MX=3.02,MZ=BACK+.03;
 const medalPanel=add(new THREE.PlaneGeometry(1.3,1.95),mat(shade(kit.shirt,.3*dim),{roughness:.6}));medalPanel.position.set(MX,1.55,MZ);
 const ribbonM=mat(kit.shirt,{roughness:.8}),ribbonM2=mat(kit.shirtSecondary,{roughness:.8}),dark=mat('#2a2c31');
 medals.forEach((m,i)=>{
  const x=MX+(i%2?.3:-.3),y=2.05-Math.floor(i/2)*.56;
  const disc=add(new THREE.CylinderGeometry(.17,.17,.03,40),[mat('#c9a24f',{roughness:.3,metalness:.9}),mat('#ffffff',{map:medalTexture(m,owned),roughness:m.reached?.3:.7,metalness:m.reached?.6:.1}),dark]);
  disc.rotation.set(Math.PI/2,Math.PI/2,0);disc.position.set(x,y,MZ+.05);
  const r1=add(new THREE.PlaneGeometry(.09,.22),m.reached?ribbonM:dark);r1.position.set(x-.035,y+.2,MZ+.02);r1.rotation.z=-.25;
  const r2=add(new THREE.PlaneGeometry(.09,.22),m.reached?ribbonM2:dark);r2.position.set(x+.035,y+.2,MZ+.021);r2.rotation.z=.25;
 });
 const medalTitle=add(new THREE.PlaneGeometry(1.3,.22),mat('#ffffff',{map:canvasTexture(640,110,(g,w,h)=>{g.fillStyle='#14161b';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9cf8a';fit(g,'MEILENSTEINE',70,w*.9,800);g.fillText('MEILENSTEINE',w/2,h/2)},owned)}));
 medalTitle.position.set(MX,2.64,MZ+.02);

 /* light: dim room, warm spots on the cabinet and the pedestal */
 scene.add(new THREE.HemisphereLight('#cfd6e6','#1a1410',.32));
 const spot=(x,y,z,tx,ty,tz,i,angle=.45)=>{const s=new THREE.SpotLight('#fff1d6',i,0,angle,.55,1.6);s.position.set(x,y,z);s.target.position.set(tx,ty,tz);scene.add(s,s.target);return s};
 spot(0,3.3,.3,0,.95,-.55,26,.38);
 spot(-1.3,3.3,-1.4,-1.1,1.3,-2.62,14,.6);spot(1.3,3.3,-1.4,1.1,1.3,-2.62,14,.6);
 spot(-3,3.3,-1.2,-3.02,1.6,BACK,12,.5);spot(3,3.3,-1.2,3.02,1.6,BACK,12,.5);spot(-2,3.2,-1.2,-W/2,1.6,-1.2,8,.6);
 for(const x of [-1.4,0,1.4]){const p=new THREE.PointLight('#fff2da',1.2,2.2,2);p.position.set(x,1.98,-2.55);scene.add(p)}
 // dust in the spotlight
 const dustGeo=track(new THREE.BufferGeometry()),pts=[];let r=5;const rnd=()=>(r=(Math.imul(1664525,r)+1013904223)>>>0)/4294967296;
 for(let i=0;i<220;i++)pts.push((rnd()-.5)*1.6,.9+rnd()*2.3,-.55+(rnd()-.5)*1.6);
 dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
 const dust=new THREE.Points(dustGeo,track(new THREE.PointsMaterial({color:'#fff3d0',size:.012,transparent:true,opacity:.55,depthWrite:false})));scene.add(dust);

 let drag=0,dragVel=0,size=[0,0],raf=0,last=0,time=opts.startTime||0,disposed=false;
 function resize(){
  const w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;
  if(w===size[0]&&h===size[1])return;size=[w,h];
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1.1?62:50;camera.updateProjectionMatrix();
 }
 function frame(t){
  resize();
  for(const s of spin)s.rotation.y=t*.45;
  dust.rotation.y=t*.02;dust.position.y=Math.sin(t*.3)*.04;
  drag+=dragVel;dragVel*=.9;drag*=.995;
  const c=museumCamera(t,drag);camera.position.copy(c.pos);camera.lookAt(c.target);
  renderer.render(scene,camera);
 }
 function loop(now){if(disposed)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;time+=dt;frame(time);raf=requestAnimationFrame(loop)}
 // drag to look around
 let down=null;
 const onDown=e=>{down={x:e.clientX,d:drag}};
 const onMove=e=>{if(!down)return;drag=clamp(down.d-(e.clientX-down.x)/(canvas.clientWidth||300)*1.6,-.9,.9);dragVel=0};
 const onUp=()=>{down=null};
 canvas.addEventListener('pointerdown',onDown);addEventListener('pointermove',onMove);addEventListener('pointerup',onUp);addEventListener('pointercancel',onUp);
 return{
  start(){if(!raf&&!disposed)raf=requestAnimationFrame(loop)},
  stop(){cancelAnimationFrame(raf);raf=0;last=0},
  renderAt(t){time=t;frame(t)},
  snapshot(type='image/jpeg',q=.9){frame(time);return canvas.toDataURL(type,q)},
  scene,camera,
  dispose(){
   disposed=true;cancelAnimationFrame(raf);
   canvas.removeEventListener('pointerdown',onDown);removeEventListener('pointermove',onMove);removeEventListener('pointerup',onUp);removeEventListener('pointercancel',onUp);
   scene.traverse(o=>{if(o.isMesh||o.isPoints){o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m?.map?.dispose?.();m?.dispose?.()}}});
   for(const o of owned){o.texture?.dispose?.();o.geometry?.dispose?.();o.material?.dispose?.();o.dispose?.()}
   renderer.dispose();try{renderer.forceContextLoss()}catch(_){}
  }
 };
}
void TROPHY_TONES;

// The club crest from the crest editor's HTML as an image (same recipe as the match scenes).
export function loadMuseumCrest(html=''){
 const raw=String(html).match(/<svg class="club-crest-art"[\s\S]*?<\/svg><\/span>/)?.[0]?.replace(/<\/span>$/,'');
 if(!raw||typeof Image==='undefined')return Promise.resolve(null);
 const vars={};for(const [,k,v] of String(html).matchAll(/--crest-([a-z]+):(#[0-9a-f]{6})/gi))vars[k]=v;
 const svg=raw.replace(/var\(--crest-([a-z]+)\)/g,(m,k)=>vars[k]||'#ffffff');
 return Promise.race([new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}),new Promise(r=>setTimeout(()=>r(null),1500))]);
}
