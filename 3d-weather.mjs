// Footera V21.340 – Stadionwetter in den 3D-Szenen.
// Pure presentation, driven only by the scene clock: seeking, replays and
// screenshots show the same frame for the same time. Never Math.random.
// Snow: falling flakes, a white dusting with banks along the boards, an orange
// winter ball, powder kicked up by the ball and breath clouds. Rain: streaks,
// splashes on the turf, a wet darker pitch and spray behind the rolling ball.
export const WEATHER_VERSION='21340';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}

export function normalizeSceneWeather(value){
 if(!value||typeof value!=='object')return {kind:'clear',intensity:0,temperature:12};
 const kind=['rain','snow'].includes(value.kind)?value.kind:'clear';
 const intensity=kind==='clear'?0:clamp(Number(value.intensity)||.6,.35,1);
 const temperature=Number.isFinite(Number(value.temperature))?Number(value.temperature):kind==='snow'?-1:7;
 return {kind,intensity,temperature};
}

// Particle counts per quality tier, before intensity.
export function precipitationCount(kind,{weak=false,high=false}={},intensity=1){
 if(kind==='clear')return 0;
 const base=kind==='rain'?(weak?1400:high?5200:3600):(weak?1100:high?4200:3000);
 return Math.round(base*(.55+.45*clamp(intensity)));
}

const VERTEX=`
attribute float aSeed;
uniform float uTime,uSpeed,uSize,uScale,uKind,uSway,uMaxPx;
uniform vec3 uCenter,uBox;
uniform vec2 uWind;
varying float vAlpha,vPx,vSeed;
void main(){
 vec3 p=position*uBox;
 float speed=uSpeed*(.82+.36*aSeed);
 p.y-=uTime*speed;
 p.xz+=uWind*uTime*(.8+.4*aSeed);
 if(uKind>.5){p.x+=sin(uTime*1.3+aSeed*40.)*uSway;p.z+=cos(uTime*.9+aSeed*23.)*uSway*.8;}
 vec3 rel=mod(p-uCenter+uBox*.5,uBox)-uBox*.5;
 vec3 world=uCenter+rel;
 vec4 mv=modelViewMatrix*vec4(world,1.);
 gl_Position=projectionMatrix*mv;
 float d=max(-mv.z,.5);
 float px=uSize*(.75+.5*aSeed)*uScale/d;
 vPx=min(px,uMaxPx);
 gl_PointSize=max(vPx,1.);
 // Fade near the camera (giant streaks), below the turf and at the box edges.
 float edge=1.-smoothstep(.36,.5,max(abs(rel.x)/uBox.x,abs(rel.z)/uBox.z));
 vAlpha=smoothstep(.0,.6,world.y)*smoothstep(4.,9.,d)*edge*(px<1.?px:1.);
 vSeed=aSeed;
 // Invisible drops cost no fill rate at all.
 if(vAlpha<.01){gl_PointSize=0.;gl_Position=vec4(2.,2.,2.,1.);}
}`;
const FRAGMENT=`
uniform vec3 uColor;uniform float uOpacity,uKind;
varying float vAlpha,vPx,vSeed;
void main(){
 vec2 c=gl_PointCoord-.5;float a;
 if(uKind<.5){
  // A thin streak, brighter at the leading (lower) end.
  float w=abs(c.x)*vPx;
  a=(1.-smoothstep(.45,1.25,w))*smoothstep(.5,.3,abs(c.y))*(.35+.65*(c.y+.5));
 }else{
  float r=length(c);a=(1.-smoothstep(.18,.5,r))*(.7+.3*vSeed);
 }
 if(a*vAlpha<.01)discard;
 gl_FragColor=vec4(uColor,a*vAlpha*uOpacity);
}`;
const SPLASH_VERTEX=`
attribute float aSeed;
uniform float uTime,uScale,uRate;uniform vec3 uCenter;uniform vec2 uArea;
varying float vPhase,vAlpha;
void main(){
 float cycle=uTime*uRate*(.7+.6*aSeed)+aSeed*17.;
 float k=floor(cycle);vPhase=fract(cycle);
 // Each new cycle lands somewhere else, so the turf never shows a pattern.
 vec2 jitter=vec2(fract(sin(k*12.9898+aSeed*78.233)*43758.5453),fract(sin(k*39.346+aSeed*11.135)*24634.6345));
 vec2 xz=(fract(position.xz+jitter)-.5)*uArea+uCenter.xz;
 vec4 mv=modelViewMatrix*vec4(xz.x,.03,xz.y,1.);
 gl_Position=projectionMatrix*mv;
 float d=max(-mv.z,1.);
 gl_PointSize=clamp(.34*uScale/d,1.,64.);
 vAlpha=smoothstep(6.,14.,d);
}`;
const SPLASH_FRAGMENT=`
uniform vec3 uColor;uniform float uOpacity;varying float vPhase,vAlpha;
void main(){
 vec2 c=gl_PointCoord-.5;c.y*=2.2;float r=length(c);
 float ring=.08+.38*vPhase;float a=(1.-smoothstep(.0,.07,abs(r-ring)))*(1.-vPhase)*step(vPhase,.55)*1.8;
 if(a*vAlpha<.01)discard;
 gl_FragColor=vec4(uColor,a*vAlpha*uOpacity);
}`;
const PUFF_VERTEX=`
attribute float aAlpha;attribute float aSize;
uniform float uScale;
varying float vAlpha;
void main(){
 vec4 mv=modelViewMatrix*vec4(position,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(aSize*uScale/max(-mv.z,.5),0.,256.);
 vAlpha=aAlpha*smoothstep(2.5,5.,-mv.z);
}`;
const PUFF_FRAGMENT=`
uniform vec3 uColor;varying float vAlpha;
void main(){
 float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,r))*vAlpha;
 if(a<.01)discard;
 gl_FragColor=vec4(uColor,a);
}`;

// Scene look per weather: background, fog and light multipliers.
export function weatherLook(kind,spooky=false){
 if(kind==='snow')return {background:spooky?'#141020':'#1f2830',fog:spooky?'#2a2438':'#8d9aa4',near:70,far:236,hemi:1.12,sun:.86,fill:1.15,exposure:1.04};
 if(kind==='rain')return {background:spooky?'#0a0710':'#0e1519',fog:spooky?'#1a1424':'#25323a',near:80,far:228,hemi:.8,sun:.82,fill:1.1,exposure:.98};
 return null;
}

export function createStadiumWeather(THREE,{scene,field,renderer,camera,weather,weak=false,high=false,track=o=>o,spooky=false,pitch=null,hemi=null,sun=null,fill=null,ballMaterial=null,ballAt=null,actors=()=>[]}){
 const w=normalizeSceneWeather(weather);
 const info={kind:w.kind,intensity:w.intensity,temperature:w.temperature,particles:0,splashes:0,breath:false,ballTint:'',snowCover:false};
 if(w.kind==='clear')return {info,update(){},reduce(){}};
 const snow=w.kind==='snow',look=weatherLook(w.kind,spooky);
 scene.background=new THREE.Color(look.background);
 scene.fog=new THREE.Fog(look.fog,look.near,look.far);
 if(hemi)hemi.intensity*=look.hemi;if(sun)sun.intensity*=look.sun;if(fill)fill.intensity*=look.fill;
 renderer.toneMappingExposure=(renderer.toneMappingExposure||1)*look.exposure;
 const uScale={value:800};
 const group=new THREE.Group();group.name='footera-weather';scene.add(group);
 // Falling rain or snow in a box that travels with the camera.
 const count=precipitationCount(w.kind,{weak,high},w.intensity);info.particles=count;
 const positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){positions[i*3]=hash(i*3+1);positions[i*3+1]=hash(i*3+2);positions[i*3+2]=hash(i*3+3);seeds[i]=hash(i*7+5)}
 const geo=track(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const box=snow?new THREE.Vector3(64,30,64):new THREE.Vector3(58,26,58);
 const uniforms={uTime:{value:0},uSpeed:{value:snow?1.25+.5*w.intensity:17+5*w.intensity},uSize:{value:snow?.13:.55},uScale,uKind:{value:snow?1:0},uSway:{value:snow?.55:0},
  uMaxPx:{value:snow?30:56},uCenter:{value:new THREE.Vector3()},uBox:{value:box},uWind:{value:new THREE.Vector2(snow?.6:1.4,snow?.25:.3)},
  uColor:{value:new THREE.Color(snow?'#ffffff':'#c9d8e8')},uOpacity:{value:snow?.92:.5+.18*w.intensity}};
 const mat=track(new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms,transparent:true,depthWrite:false}));
 const points=new THREE.Points(geo,mat);points.frustumCulled=false;points.renderOrder=20;group.add(points);
 // Rain: little crowns jumping off the turf in front of the camera.
 let splash=null;
 if(!snow){
  const n=weak?260:high?900:600;info.splashes=n;
  const sp=new Float32Array(n*3),ss=new Float32Array(n);for(let i=0;i<n;i++){sp[i*3]=hash(i*5+11);sp[i*3+2]=hash(i*5+12);ss[i]=hash(i*5+13)}
  const sg=track(new THREE.BufferGeometry());sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('aSeed',new THREE.BufferAttribute(ss,1));
  const su={uTime:{value:0},uScale,uRate:{value:2.2+1.6*w.intensity},uCenter:{value:new THREE.Vector3()},uArea:{value:new THREE.Vector2(44,44)},uColor:{value:new THREE.Color('#dce9f2')},uOpacity:{value:.55}};
  splash=new THREE.Points(sg,track(new THREE.ShaderMaterial({vertexShader:SPLASH_VERTEX,fragmentShader:SPLASH_FRAGMENT,uniforms:su,transparent:true,depthWrite:false})));
  splash.frustumCulled=false;splash.renderOrder=19;group.add(splash);splash.userData.uniforms=su;
 }
 // Ground: wet turf or a dusting of snow with banks along the boards.
 if(pitch?.material){
  const m=pitch.material;
  if(snow){m.color.multiply(new THREE.Color('#dfe8e4'))}
  else{m.color.multiply(new THREE.Color('#c8d3c4'));m.roughness=.5;m.metalness=.02;m.needsUpdate=true}
 }
 if(snow){
  info.snowCover=true;
  const size=weak?256:512;
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=Math.round(size*119/78);
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(canvas.width,canvas.height),d=img.data;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const wx=x/canvas.width*78-39,wz=y/canvas.height*119-59.5,inside=Math.abs(wx)<34.6&&Math.abs(wz)<53.1;
   const n=Math.sin(x*.09+y*.05)*.5+Math.sin(y*.13-x*.07)*.35+(hash(x*977+y*131)-.5)*.7;
   const patch=Math.sin(wx*.21+Math.sin(wz*.11)*2)*Math.cos(wz*.17-wx*.05);
   // Worn centre and goal mouths, heavier near the touchlines and corners.
   const wear=Math.exp(-(wx*wx)/160)*.3+Math.exp(-((Math.abs(wz)-51)**2/8+wx*wx/18))*.22;
   const toEdge=clamp(1-Math.min(34.6-Math.abs(wx),53.1-Math.abs(wz))/6);
   let a=inside?.72+.12*patch+.1*n-wear+.25*toEdge:.92+.06*n;
   const i=(y*canvas.width+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.round(clamp(a,.05,1)*255);
  }
  ctx.putImageData(img,0,0);
  const tex=track(new THREE.CanvasTexture(canvas));tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const cover=new THREE.Mesh(track(new THREE.PlaneGeometry(78,119)),track(new THREE.MeshStandardMaterial({color:'#f4f8fb',map:tex,transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})));
  cover.rotation.x=-Math.PI/2;cover.position.y=-.012;cover.receiveShadow=true;cover.renderOrder=1;cover.name='footera-snow-cover';group.add(cover);
  // Cleared snow piled up in front of the advertising boards.
  const pileGeo=track(new THREE.SphereGeometry(1,weak?8:12,weak?6:8));
  const spots=[];
  for(const side of [-1,1]){
   for(let z=-50;z<=50;z+=weak?3.2:2.1)spots.push([side*(35.6+hash(z*3+side)*.5),z+hash(z+side*7)*.8,1.5+hash(z*5)*.9,.32+hash(z*11+side)*.22]);
   for(let x=-31;x<=31;x+=weak?3.2:2.1)spots.push([x+hash(x*3+side*5)*.8,side*(55.2+hash(x*7)*.5),1.5+hash(x*9)*.9,.3+hash(x*13+side)*.2]);
  }
  const piles=new THREE.InstancedMesh(pileGeo,track(new THREE.MeshStandardMaterial({color:'#eef3f6',roughness:1})),spots.length);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3();
  spots.forEach(([x,z,l,h],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),hash(i*17)*3.1);s.set(l,h,l*.62);p.set(x,0,z);m4.compose(p,q,s);piles.setMatrixAt(i,m4)});
  piles.receiveShadow=true;piles.name='footera-snow-banks';group.add(piles);
  // The orange winter ball.
  if(ballMaterial?.color){ballMaterial.color.set('#ff8a2a');info.ballTint='#ff8a2a'}
 }
 // Powder or spray thrown up behind the ball while it travels along the turf.
 const SPRAY=weak?14:28;
 const sprayPos=new Float32Array(SPRAY*3),sprayAlpha=new Float32Array(SPRAY),spraySize=new Float32Array(SPRAY);
 const sprayGeo=track(new THREE.BufferGeometry());sprayGeo.setAttribute('position',new THREE.BufferAttribute(sprayPos,3));sprayGeo.setAttribute('aAlpha',new THREE.BufferAttribute(sprayAlpha,1));sprayGeo.setAttribute('aSize',new THREE.BufferAttribute(spraySize,1));
 const puffUniforms={uScale,uColor:{value:new THREE.Color(snow?'#ffffff':'#d5e3ec')}};
 const spray=new THREE.Points(sprayGeo,track(new THREE.ShaderMaterial({vertexShader:PUFF_VERTEX,fragmentShader:PUFF_FRAGMENT,uniforms:puffUniforms,transparent:true,depthWrite:false})));
 spray.frustumCulled=false;spray.renderOrder=21;(field||group).add(spray);
 // Breath clouds in the cold (snow or below 6 °C).
 const breathOn=snow||w.temperature<=5;info.breath=breathOn;
 const BREATH=breathOn?18:0;
 const breathPos=new Float32Array(Math.max(1,BREATH)*3),breathAlpha=new Float32Array(Math.max(1,BREATH)),breathSize=new Float32Array(Math.max(1,BREATH));
 const breathGeo=track(new THREE.BufferGeometry());breathGeo.setAttribute('position',new THREE.BufferAttribute(breathPos,3));breathGeo.setAttribute('aAlpha',new THREE.BufferAttribute(breathAlpha,1));breathGeo.setAttribute('aSize',new THREE.BufferAttribute(breathSize,1));
 const breath=new THREE.Points(breathGeo,track(new THREE.ShaderMaterial({vertexShader:PUFF_VERTEX,fragmentShader:PUFF_FRAGMENT,uniforms:{uScale,uColor:{value:new THREE.Color('#eef4f8')}},transparent:true,depthWrite:false})));
 breath.frustumCulled=false;breath.renderOrder=21;breath.visible=breathOn;group.add(breath);
 const forward=new THREE.Vector3(),at=new THREE.Vector3(),size=new THREE.Vector2();
 let lastTime=0;
 function updateSpray(time){
  sprayAlpha.fill(0);
  if(!ballAt)return;
  for(let k=0;k<SPRAY;k++){
   const age=(k+((time*30)%1))/30*(snow?1.4:1),t0=time-age;
   if(t0<0)continue;
   const a=ballAt(t0),b=ballAt(t0+.04);if(!a||!b)continue;
   const vx=(b[0]-a[0])/.04,vz=(b[2]-a[2])/.04,speed=Math.hypot(vx,vz);
   if(a[1]>.32||speed<5)continue;
   const s=hash(k*31+Math.floor(t0*30)),side=(s-.5)*2;
   const up=(snow?1.3:1.9)+s*1.2,spread=.45+.5*s;
   sprayPos[k*3]=a[0]-vx*.012+(-vz/speed)*side*spread*age*2.2;
   sprayPos[k*3+1]=.06+up*age-4.9*age*age;
   sprayPos[k*3+2]=a[2]-vz*.012+(vx/speed)*side*spread*age*2.2;
   if(sprayPos[k*3+1]<.02)continue;
   sprayAlpha[k]=(snow?.75:.5)*(1-smooth(age/(snow?1.1:.75)))*clamp((speed-5)/6);
   spraySize[k]=(snow?.22:.14)+age*(snow?.7:.35);
  }
 }
 function updateBreath(time){
  if(!breathOn)return;
  const list=actors().slice(0,BREATH);breathAlpha.fill(0);
  list.forEach((actor,i)=>{
   const root=actor?.root;if(!root)return;
   const cycle=1.55+hash(i*3)*.5,phase=(time+hash(i*7)*cycle)%cycle/cycle;
   if(phase>.55)return;
   const u=phase/.55;
   // Mouth: the GLB head bone when there is one, else head height over the root.
   // Facing: a glTF player model looks along its local +Z; the simple rig along -Z.
   if(actor.face)actor.face.getWorldDirection(forward);else{(actor.upper||root).getWorldDirection(forward);forward.negate()}
   forward.y=0;if(forward.lengthSq()<1e-6)forward.set(0,0,1);forward.normalize();
   let mouthY;
   if(actor.head){actor.head.getWorldPosition(at);mouthY=at.y-.02}else{root.getWorldPosition(at);mouthY=at.y+1.6}
   const reach=.14+.34*u;
   breathPos[i*3]=at.x+forward.x*reach;breathPos[i*3+1]=mouthY+.1*u;breathPos[i*3+2]=at.z+forward.z*reach;
   breathAlpha[i]=.42*Math.sin(Math.PI*u);breathSize[i]=.12+.38*u;
  });
 }
 function update(time){
  lastTime=time;
  renderer.getDrawingBufferSize(size);
  uScale.value=size.y/(2*Math.tan(camera.fov*Math.PI/360));
  camera.getWorldDirection(forward);
  const c=uniforms.uCenter.value;c.copy(camera.position).addScaledVector(forward,snow?20:18);c.y=box.y*.5-1.5;
  uniforms.uTime.value=time;
  if(splash){
   const su=splash.userData.uniforms;su.uTime.value=time;
   // The turf area in front of the camera: where its view ray meets the ground.
   const t=forward.y<-.05?-camera.position.y/forward.y:30;
   su.uCenter.value.set(camera.position.x+forward.x*Math.min(t,60),0,camera.position.z+forward.z*Math.min(t,60));
  }
  updateSpray(time);updateBreath(time);
  for(const g of [sprayGeo,breathGeo]){g.attributes.position.needsUpdate=true;g.attributes.aAlpha.needsUpdate=true;g.attributes.aSize.needsUpdate=true}
 }
 info.inspect=()=>({kind:w.kind,time:lastTime,center:uniforms.uCenter.value.toArray(),sprayVisible:Array.from(sprayAlpha).filter(a=>a>.01).length,breathVisible:Array.from(breathAlpha).filter(a=>a>.01).length});
 // Slow device: keep half of the particles (the scene calls this once).
 function reduce(){geo.setDrawRange(0,Math.floor(count*.5));splash?.geometry.setDrawRange(0,Math.floor(info.splashes*.5));info.reduced=true}
 return {info,update,reduce,group};
}
