// Footera V21.460 Stadion-Vorschau (Basti 2026-11-17): "Am besten wäre so eine
// Ansicht aus der Luft (wie beim Anfang vom Spiel) wo man sieht wie dann das
// gesamte Stadion aussieht. Aber nicht komplett weit weg."
// A live 3D aerial view of the user's stadium in Verein > Stadion. It builds
// the same stadium the match scenes build (createArena + fan wall + the lower
// bowl in the seat colours) around a plain pitch without players, and the
// camera circles slowly at a height where roof, stands and seats are still
// easy to tell apart. Drag turns it. Rebuilt whenever build or colours change.
import * as THREE from './vendor/three/three.module.min.js';
import {cleanStadium,stadiumLook,createFanWall} from './3d-stadium.mjs?v=21457';
import {createArena} from './3d-arena.mjs?v=21457';

export const STADIUM_PREVIEW_VERSION='21.457-stadium-preview';
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};

// Where the preview camera is: angle in radians round the ground. Close
// enough to see seats and roof, high enough to see the whole bowl.
export function previewCamera(angle){
 const radius=178,height=96;
 return{position:[Math.cos(angle)*radius,height,Math.sin(angle)*radius*1.12],target:[0,3,0],fov:40};
}

function pitchTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=800;const g=c.getContext('2d');
 for(let i=0;i<18;i++){g.fillStyle=i%2?'#2f8a42':'#2a7d3b';g.fillRect(0,i*800/18,512,800/18+1)}
 const sx=512/68,sz=800/105,X=x=>(x+34)*sx,Z=z=>(z+52.5)*sz;
 g.strokeStyle='#eef3ea';g.lineWidth=3;g.strokeRect(X(-34)+2,Z(-52.5)+2,68*sx-4,105*sz-4);
 g.beginPath();g.moveTo(X(-34),Z(0));g.lineTo(X(34),Z(0));g.stroke();
 g.beginPath();g.arc(X(0),Z(0),9.15*sx,0,Math.PI*2);g.stroke();
 for(const s of [-1,1]){const z0=s<0?Z(-52.5):Z(52.5-16.5),z1=s<0?Z(-52.5+5.5):Z(52.5-5.5);
  g.strokeRect(X(-20.16),s<0?Z(-52.5):Z(52.5-16.5),40.32*sx,16.5*sz);g.strokeRect(X(-9.16),s<0?Z(-52.5):Z(52.5-5.5),18.32*sx,5.5*sz);void z0;void z1}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

function build(renderer,stadium,kits){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#16262b');scene.fog=new THREE.Fog('#1b2d31',300,760);
 const resources=new Set(),track=o=>(o&&resources.add(o),o);
 scene.add(new THREE.HemisphereLight('#d6e6ff','#1a2a1e',1.15));
 const sun=new THREE.DirectionalLight('#fff4e0',1.35);sun.position.set(40,90,30);scene.add(sun);
 const look=stadiumLook(cleanStadium(stadium)),field=new THREE.Group();scene.add(field);
 // Surrounds and pitch.
 const around=new THREE.Mesh(track(new THREE.BoxGeometry(100,.1,143)),track(new THREE.MeshLambertMaterial({color:'#2a5a33'})));around.position.y=-.15;scene.add(around);
 const pg=track(new THREE.PlaneGeometry(68,105));pg.rotateX(-Math.PI/2);
 const pitch=new THREE.Mesh(pg,track(new THREE.MeshLambertMaterial({map:track(pitchTexture())})));pitch.position.y=-.08;field.add(pitch);
 const white=track(new THREE.MeshLambertMaterial({color:'#f2f4ef'}));
 for(const s of [-1,1]){const goal=new THREE.Group();for(const [w,h,d,x,y,z] of [[.14,2.44,.14,-3.66,1.22,0],[.14,2.44,.14,3.66,1.22,0],[7.46,.14,.14,0,2.44,0]]){const m=new THREE.Mesh(track(new THREE.BoxGeometry(w,h,d)),white);m.position.set(x,y,z);goal.add(m)}goal.position.z=s*52.5;scene.add(goal)}
 // Lower bowl exactly like the match scene: 12 steps per stand, rounded corners.
 const steps=[],add=(w,h,d,x,y,z,ry=0,colour)=>steps.push({w,h,d,x,y,z,ry,colour});
 for(const side of [-1,1])for(let row=0;row<12;row++){
  const colour=row%2?look.steps[0]:look.steps[1];
  add(2,.64,119,side*(39.3+row*1.42),.52+row*.72,0,0,colour);add(79,.64,2,0,.52+row*.72,side*(59.4+row*1.42),0,colour);
 }
 for(const sx of [-1,1])for(const sz of [-1,1])for(let row=0;row<12;row++){const radius=2.3+row*1.42;for(let col=0;col<8;col++){
  const a=(col+.5)/8*Math.PI/2;add(radius*Math.PI/16+.2,.64,2,sx*(37+Math.cos(a)*radius),.52+row*.72,sz*(57.1+Math.sin(a)*radius),-sx*sz*a-Math.PI/2,row%2?look.steps[0]:look.steps[1])}}
 for(const side of [-1,1]){add(5,.3,122,side*57,10.2,0,0,'#132025');add(112,.3,7,0,10.2,side*80,0,'#132025')}
 const bowl=new THREE.InstancedMesh(track(new THREE.BoxGeometry(1,1,1)),track(new THREE.MeshLambertMaterial({color:'#ffffff'})),steps.length);
 const dummy=new THREE.Object3D(),col=new THREE.Color();
 steps.forEach((s,i)=>{dummy.position.set(s.x,s.y,s.z);dummy.rotation.set(0,s.ry,0);dummy.scale.set(s.w,s.h,s.d);dummy.updateMatrix();bowl.setMatrixAt(i,dummy.matrix);bowl.setColorAt(i,col.set(s.colour))});
 scene.add(track(bowl));
 const host=kits?.home||{shirt:look.seatPrimary,shirtSecondary:look.seatSecondary},guest={shirt:'#e9ecf3',shirtSecondary:'#1d2430'};
 const wall=createFanWall(THREE,{scene,track,weak:false,hash,hostEnd:-1,host:host.shirt,hostSecondary:host.shirtSecondary,guest:guest.shirt,guestSecondary:guest.shirtSecondary,aisles:{side:[-42,-14,14,42],end:[-18,18]}});
 const arena=createArena(THREE,{scene,field,renderer,pitch,track,weak:false,high:true,kits:{home:host,away:guest},look,hostEnd:-1,hash});
 return{scene,arena,wall,look,dispose(){arena.dispose();for(const r of resources){if(r.isTexture||r.isMaterial||r.isBufferGeometry)r.dispose();else if(r.isInstancedMesh)r.dispose?.()}
  scene.traverse(o=>{o.geometry?.dispose?.();const m=o.material;if(m){(Array.isArray(m)?m:[m]).forEach(x=>{x.map?.dispose?.();x.dispose?.()})}})}};
}

// mountStadiumPreview(host) -> {show(stadium,kits), stop(), dispose()}.
// Draws only while the host is on screen and the page visible (battery).
export function mountStadiumPreview(host){
 const canvas=document.createElement('canvas');canvas.className='stadium-preview-canvas';host.prepend(canvas);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const camera=new THREE.PerspectiveCamera(40,1,1,900);
 let current=null,raf=0,last=0,clock=0,drag=0,dragging=null,visible=true,startedAt=0;
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver(e=>{visible=e.some(x=>x.isIntersecting);if(visible)loop()}):null;io?.observe(host);
 const size=()=>{const w=host.clientWidth||320,h=host.clientHeight||200;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}};
 function frame(dt){
  if(!current)return;size();
  clock+=dt;const c=previewCamera(.75+clock*.09+drag);
  camera.position.set(...c.position);camera.fov=c.fov;camera.updateProjectionMatrix();camera.lookAt(...c.target);
  current.arena.update(clock,camera);renderer.render(current.scene,camera);
 }
 function loop(){
  if(raf)return;
  const tick=t=>{raf=0;if(!host.isConnected||!visible||document.hidden||!host.offsetParent){last=0;return}
   const dt=last?Math.min(.1,(t-last)/1000):0;
   // ~30 pictures per second is plenty for a slow fly-round.
   if(!last||t-last>=31){frame(dt);last=t}raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
 }
 canvas.addEventListener('pointerdown',e=>{dragging={x:e.clientX,drag};canvas.setPointerCapture?.(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(dragging)drag=dragging.drag+(e.clientX-dragging.x)*.008});
 const end=()=>{dragging=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loop()});
 return{
  canvas,
  show(stadium,kits){const next=build(renderer,stadium,kits);current?.dispose();current=next;startedAt=clock;frame(0);loop();return next.arena.info},
  // Test hook: one picture at a fixed angle.
  still(angle,zoom=1){if(!current)return null;size();const c=previewCamera(angle);camera.position.set(...c.position.map((v,i)=>c.target[i]+(v-c.target[i])*zoom));camera.fov=c.fov;camera.updateProjectionMatrix();camera.lookAt(...c.target);current.arena.update(0,camera);renderer.render(current.scene,camera);return canvas.toDataURL('image/jpeg',.9)},
  get info(){return current?.arena.info||null},
  get since(){return clock-startedAt},
  dispose(){cancelAnimationFrame(raf);raf=0;io?.disconnect();current?.dispose();current=null;renderer.dispose();canvas.remove()}
 };
}
