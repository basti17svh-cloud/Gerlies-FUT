/* Footera V21.467: secondary motion. Hair and the loose shirt follow the body
 * a moment late: they trail against the run, bounce with each stride and
 * swing out in turns; the shirt hem flutters with pace. Vertex shader only
 * (after skinning), so bones, IK, contacts and the match stay untouched.
 * Per player: one damped spring driven by the head's world motion. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const SECONDARY_MOTION_VERSION='21.467-damped-hair-shirt';
// Spring of the hanging hair (ponytail / braid swing about 1.6 Hz).
const STIFF=95,DAMP=13,DRAG=.028,MAX=.11;

// Pure spring step (testable): s = offset, v = its velocity, a = the head's
// acceleration, vel = the head's velocity (world, m/s). Returns the offset.
export function stepSecondarySpring(state,acc,vel,dt){
 const steps=Math.max(1,Math.ceil(dt*120));
 const k=dt/steps;
 for(let step=0;step<steps;step++){
 for(let i=0;i<3;i++){
  // The hair is pushed opposite to the head's acceleration and pulled back
  // to a trailing rest position behind the motion (air drag).
  const rest=-vel[i]*DRAG,f=-STIFF*(state.s[i]-rest)-DAMP*state.v[i]-acc[i];
  state.v[i]+=f*k;state.s[i]+=state.v[i]*k;
 }
 }
 const n=Math.hypot(...state.s);
 if(n>MAX)for(let i=0;i<3;i++)state.s[i]*=MAX/n;
 return state.s;
}

const HAIR_CHUNK=`
#include <skinning_vertex>
{float fall=clamp((footeraSwayTop-position.y)/footeraSwaySpan,0.0,1.0);
 transformed+=footeraSway*(fall*fall*footeraSwayAmount);}`;
const SHIRT_CHUNK=`
#include <skinning_vertex>
{float hem=clamp((footeraHemTop-position.y)/footeraHemSpan,0.0,1.0);hem*=hem;
 float wave=sin(footeraFlutter.y*11.0-position.y*38.0+position.x*21.0)+.5*sin(footeraFlutter.y*17.0+position.z*31.0);
 transformed+=objectNormal*(wave*footeraFlutter.x*hem)+footeraSway*(.3*hem);}`;

// The broadcast look swaps in upgraded copies that carry the same userData,
// so patched materials are remembered by identity, not by a userData mark.
const patched=new WeakMap();
function patch(mesh,kind,uniforms){
 const material=mesh.material;
 if(!material||patched.get(material)===uniforms)return;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
 const base=key?key.call(material):'';
 material.onBeforeCompile=(shader,renderer)=>{
  previous?.call(material,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  const decl=kind==='hair'?'uniform vec3 footeraSway;uniform float footeraSwayTop,footeraSwaySpan,footeraSwayAmount;\n':
   'uniform vec3 footeraSway;uniform vec2 footeraFlutter;uniform float footeraHemTop,footeraHemSpan;\n';
  shader.vertexShader=decl+shader.vertexShader.replace('#include <skinning_vertex>',kind==='hair'?HAIR_CHUNK:SHIRT_CHUNK);
 };
 material.customProgramCacheKey=()=>base+'|footera-sway-'+kind;
 patched.set(material,uniforms);material.needsUpdate=true;
}

// meshes: the player's skinned meshes; head: the head bone.
export function createSecondaryMotion(THREE,meshes,head){
 const hair=meshes.find(m=>/^FooteraHair-/.test(m.name)),shirt=meshes.find(m=>m.name==='FooteraShirt');
 if(!head||(!hair&&!shirt))return{update(){},state:null};
 const sway={value:new THREE.Vector3()},flutter={value:new THREE.Vector2()};
 const span=geometry=>{geometry.computeBoundingBox();return geometry.boundingBox};
 let hairU=null,shirtU=null;
 if(hair){
  const b=span(hair.geometry),long=/ponytail|braid/i.test(hair.name);
  // Short cuts barely move; a ponytail or braid swings from the crown down.
  hairU={footeraSway:sway,footeraSwayTop:{value:b.max.y-.04},footeraSwaySpan:{value:Math.max(.08,b.max.y-b.min.y)},
   footeraSwayAmount:{value:long?1:/bob/i.test(hair.name)?.55:.18}};
 }
 if(shirt){
  const b=span(shirt.geometry);
  // The loose lower third of the shirt: from mid-belly to the hem.
  shirtU={footeraSway:sway,footeraFlutter:flutter,footeraHemTop:{value:b.min.y+(b.max.y-b.min.y)*.42},
   footeraHemSpan:{value:Math.max(.05,(b.max.y-b.min.y)*.42)}};
 }
 const state={s:[0,0,0],v:[0,0,0],last:null,lastVel:[0,0,0],time:null,phase:0};
 const p=new THREE.Vector3(),inv=new THREE.Matrix4(),m3=new THREE.Matrix3(),local=new THREE.Vector3();
 function update(time,speed=0){
  if(hair)patch(hair,'hair',hairU);if(shirt)patch(shirt,'shirt',shirtU);
  head.getWorldPosition(p);
  const dt=state.time==null?0:time-state.time;state.time=time;
  // Replays, jumps across an authored route and WebGL frame stalls must never
  // turn a new head location into a giant cloth/hair impulse. A running player
  // can travel ~8 m/s; only discontinuities above 12 m/s are treated as seeks.
  const moved=state.last?Math.hypot(...[0,1,2].map(i=>p.getComponent(i)-state.last[i])):0;
  if(!(dt>1/240&&dt<.2)||!state.last||moved>Math.max(.26,dt*12)){
   state.last=p.toArray();state.lastVel=[0,0,0];state.s=[0,0,0];state.v=[0,0,0];state.phase=0;
  }else{
   // Filter numerical jitter from the interpolated skeleton before deriving
   // acceleration. The blend stays time-based at 30, 60 and 120 fps.
   const alpha=1-Math.exp(-14*dt);
   const raw=[0,1,2].map(i=>clamp((p.getComponent(i)-state.last[i])/dt,-12,12));
   const vel=raw.map((v,i)=>state.lastVel[i]+(v-state.lastVel[i])*alpha);
   const acc=vel.map((v,i)=>clamp((v-state.lastVel[i])/dt,-35,35));
   stepSecondarySpring(state,acc,vel,dt);state.last=p.toArray();state.lastVel=vel;
   state.phase+=dt*(1+3*clamp(speed));
  }
  const target=hair||shirt;
  // World offset into the mesh's own (scaled) space.
  inv.copy(target.matrixWorld).invert();local.fromArray(state.s).applyMatrix3(m3.setFromMatrix4(inv));
  sway.value.copy(local);
  flutter.value.set(.0035*clamp(speed),state.phase);
 }
 return{update,state};
}
