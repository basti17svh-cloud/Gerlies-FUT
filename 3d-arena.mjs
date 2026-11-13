import {createSurroundings} from './3d-stadium.mjs?v=21407';
// Footera V21.382 "Flutlicht-Arena": the floodlit night stadium around the
// existing pitch and stands. Purely visual and fully deterministic (time in,
// picture out); it never touches simulation, camera or player motion.
//  - living turf: blade detail up close, mowing bands that flip with the view
//    direction like real grass, light pooling under the floodlights
//  - four soft floodlight shadows under every player (the night-match cross)
//  - upper tier, cantilever roof with a light ring, glow and a night sky
//  - camera flashes in the stands, a burst of them after a goal
//  - a broadcast colour grade inside the tone mapper (no extra render pass)
// Everything is a handful of static draw calls; the per-frame work is one
// small instance buffer for the shadows.

const GRADE_MARK='/*footera-arena-grade*/';
// Filmic curve first, then a little more contrast and colour, cool shadows
// and warm highlights: the look of a TV night match instead of flat daylight.
const GRADE_GLSL=`vec3 CustomToneMapping( vec3 color ) { ${GRADE_MARK}
	vec3 c = ACESFilmicToneMapping( color );
	float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	c = mix( vec3( l ), c, 1.06 );
	c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.32 );
	c *= mix( vec3( 0.955, 1.0, 1.06 ), vec3( 1.035, 1.0, 0.955 ), smoothstep( 0.12, 0.78, l ) );
	return clamp( c, 0.0, 1.0 );
}`;
export function installArenaGrade(THREE,renderer){
 const chunk=THREE.ShaderChunk.tonemapping_pars_fragment;
 if(!chunk.includes(GRADE_MARK)){
  const plain='vec3 CustomToneMapping( vec3 color ) { return color; }';
  if(!chunk.includes(plain))return false;
  // The custom mapper is declared before ACES in the stock chunk; move it last.
  THREE.ShaderChunk.tonemapping_pars_fragment=chunk.replace(plain,'')+'\n'+GRADE_GLSL;
 }
 renderer.toneMapping=THREE.CustomToneMapping;
 return true;
}

// Rounded-rectangle bowl around the lower stands: straight runs parallel to
// the pitch, quarter circles round the corner terraces (centres ±37, ±57.1).
// Dark club colours (e.g. #053300) would not glow: lift them towards white.
function glowColour(hex){const n=parseInt(String(hex).slice(1),16),[r,g,b]=[(n>>16)&255,(n>>8)&255,n&255].map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d)h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;
 const l0=(mx+mn)/2,s0=d?d/(1-Math.abs(2*l0-1)):0,l=Math.max(l0,.56),sat=d?Math.max(s0,.75):0,c=(1-Math.abs(2*l-1))*sat,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
 const [a,b2,c2]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return'#'+[a,b2,c2].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('')}
const CORNER_X=37,CORNER_Z=57.1,CORNER_STEPS=10;
export function arenaPerimeter(radius){
 const points=[];let length=0;
 const push=(x,z,nx,nz)=>{if(points.length){const p=points[points.length-1];length+=Math.hypot(x-p.x,z-p.z)}points.push({x,z,nx,nz,u:length})};
 const corners=[[1,1,0],[-1,1,Math.PI/2],[-1,-1,Math.PI],[1,-1,Math.PI*1.5]];
 for(const [sx,sz,start] of corners)for(let i=0;i<=CORNER_STEPS;i++){
  const a=start+i/CORNER_STEPS*Math.PI/2,nx=Math.cos(a),nz=Math.sin(a);
  push(sx*CORNER_X+nx*radius,sz*CORNER_Z+nz*radius,nx,nz);
 }
 push(points[0].x,points[0].z,points[0].nx,points[0].nz);
 return {points,length};
}
// A band lofted between two offsets of that perimeter. u runs round the bowl
// in metres / uScale, v from the inner (0) to the outer edge (1).
function loftBand(THREE,r0,y0,r1,y1,uScale){
 const a=arenaPerimeter(r0),b=arenaPerimeter(r1),n=a.points.length,position=[],uv=[],index=[];
 const mid=arenaPerimeter((r0+r1)/2);
 for(let i=0;i<n;i++){
  const p=a.points[i],q=b.points[i],u=mid.points[i].u/uScale;
  position.push(p.x,y0,p.z,q.x,y1,q.z);uv.push(u,0,u,1);
  if(i<n-1){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);
 return g;
}

function canvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}

// 4 floodlight banks in the roof corners (field-local metres).
export const FLOODLIGHTS=[[46,31,66],[-46,31,66],[-46,31,-66],[46,31,-66]];
// Where one bank throws the shadow of a 1.8 m player standing at (x,z).
export function floodlightShadow(light,x,z,height=1.8){
 const dx=x-light[0],dz=z-light[2],d=Math.hypot(dx,dz)||1,length=Math.min(4.2,height*d/Math.max(1,light[1]-height));
 return {dirX:dx/d,dirZ:dz/d,length};
}
// How many spectators hold a phone or camera up: a few all the time, nearly
// everyone in the seconds after a goal.
export function arenaFlashLevel(time,goalAt=null){
 if(!Number.isFinite(goalAt)||time<goalAt)return .16;
 const s=time-goalAt;
 return .16+.84*Math.min(1,s/.25)*Math.max(0,1-Math.max(0,s-1.6)/3.2);
}

const TURF_VERTEX_PARS=`varying vec3 vArenaWorld;`;
const TURF_VERTEX=`vArenaWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`;
const TURF_FRAGMENT_PARS=`varying vec3 vArenaWorld;uniform sampler2D uArenaBlades;uniform float uArenaMow;`;
// Runs right after the base map: blades, mowing and light pooling all scale
// the albedo, so shadows and weather tints keep working unchanged.
const TURF_FRAGMENT=`{
	vec2 w=vArenaWorld.xz;
	float inside=step(abs(w.x),34.0)*step(abs(w.y),52.5);
	// Blade detail: two scales so neither close-ups nor the TV view tile.
	float blades=texture2D(uArenaBlades,w*0.55).g*0.62+texture2D(uArenaBlades,w*0.071+vec2(0.37,0.11)).g*0.38;
	diffuseColor.rgb*=(0.48+1.04*blades)*mix(vec3(0.94,1.0,0.90),vec3(1.10,1.02,0.86),blades);
	// Mowing: 5.83 m bands mown across the pitch and a cross cut along it.
	// Grass leans with the mower, so a band is light seen one way and dark
	// the other: the pattern follows the camera like on real turf.
	float band=step(0.5,fract((w.y+52.5)/11.6667));
	float cross=step(0.5,fract((w.x+34.0)/11.3333));
	vec2 view=normalize(cameraPosition.xz-w+vec2(0.0001));
	float mow=((band*2.0-1.0)*(0.03+0.10*view.x)+(cross*2.0-1.0)*0.06*view.y)*inside*uArenaMow;
	diffuseColor.rgb*=1.0+mow;
	// Floodlight pooling: brightest in the middle third, falling off to the
	// corners and the track behind the lines.
	vec2 e=abs(w)/vec2(39.0,59.5);
	float pool=1.0-0.20*smoothstep(0.35,1.05,length(e*e));
	diffuseColor.rgb*=pool*vec3(0.86,0.80,1.04);
}`;

export function createArena(THREE,{scene,field,renderer,pitch=null,track=o=>o,weak=false,high=false,spooky=false,snow=false,kits=null,look=null,actors=()=>[],goalAt=null,hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}}={}){
 const group=new THREE.Group();group.name='FooteraArena';scene.add(group);
 const info={grade:false,turf:false,shadows:0,flashes:0,lamps:0};
 const tex=(w,h,draw,repeat=false)=>{const t=track(new THREE.CanvasTexture(canvas(w,h,draw)));t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t};
 info.grade=installArenaGrade(THREE,renderer);

 // ---- Turf -------------------------------------------------------------
 if(pitch?.material&&!pitch.material.userData.footeraArenaTurf){
  const size=weak?128:256;
  const blades=tex(size,size,(ctx,w,h)=>{
   ctx.fillStyle='rgb(96,96,96)';ctx.fillRect(0,0,w,h);
   // Opaque short strokes in every direction, light over dark like blades
   // catching the floodlight; drawn wrapped so the tile is seamless.
   const count=weak?2600:9000;
   for(let i=0;i<count;i++){
    const x=hash(i*3+1)*w,y=hash(i*3+2)*h,a=hash(i*7+5)*Math.PI*2,len=(2.2+hash(i*11+3)*4.4)*w/256,tone=Math.round(40+hash(i*13+9)**1.4*215);
    ctx.strokeStyle=`rgb(${tone},${tone},${tone})`;ctx.lineWidth=(.8+hash(i*17+1)*.8)*w/256;
    for(const ox of [-w,0,w])for(const oy of [-h,0,h]){
     if(x+ox<-8||x+ox>w+8||y+oy<-8||y+oy>h+8)continue;
     ctx.beginPath();ctx.moveTo(x+ox,y+oy);ctx.lineTo(x+ox+Math.cos(a)*len,y+oy+Math.sin(a)*len);ctx.stroke();
    }
   }
   // Normalise to a mean of one half so distant mip levels leave the turf's
   // overall brightness untouched.
   const img=ctx.getImageData(0,0,w,h),d=img.data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=d[i];
   const gain=127.5/(sum/(d.length/4));for(let i=0;i<d.length;i+=4){const v=Math.min(255,d[i]*gain);d[i]=d[i+1]=d[i+2]=v}
   ctx.putImageData(img,0,0);
  },true);
  blades.colorSpace=THREE.NoColorSpace;blades.anisotropy=Math.min(weak?2:8,renderer.capabilities.getMaxAnisotropy());
  const m=pitch.material,uniforms={uArenaBlades:{value:blades},uArenaMow:{value:snow?.35:1}};
  const previous=m.onBeforeCompile,key=m.customProgramCacheKey;
  m.onBeforeCompile=(shader,r)=>{
   previous?.call(m,shader,r);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+TURF_VERTEX_PARS).replace('#include <begin_vertex>','#include <begin_vertex>\n'+TURF_VERTEX);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+TURF_FRAGMENT_PARS).replace('#include <map_fragment>','#include <map_fragment>\n'+TURF_FRAGMENT);
  };
  const base=key?key.call(m):'';m.customProgramCacheKey=()=>base+'|footera-arena-turf';
  m.userData.footeraArenaTurf=uniforms;m.needsUpdate=true;info.turf=true;
 }

 // ---- Floodlight shadows -------------------------------------------------
 const shadowTexture=tex(64,128,(ctx,w,h)=>{
  // Dark at the boots (bottom), fading and widening towards the tip.
  const img=ctx.createImageData(w,h),d=img.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const v=1-y/(h-1),u=(x/(w-1)-.5)*2,width=.42+.5*v,side=Math.max(0,1-(u/width)**2),along=Math.min(1,v/.06)*(1-v)**1.35;
   const a=side*side*along,i=(y*w+x)*4;d[i]=4;d[i+1]=10;d[i+2]=6;d[i+3]=Math.round(255*Math.min(1,a));
  }
  ctx.putImageData(img,0,0);
 });
 const shadowGeometry=track(new THREE.PlaneGeometry(1,1));shadowGeometry.rotateX(-Math.PI/2);shadowGeometry.translate(0,0,.5);
 const shadowMaterial=track(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:weak?.28:.25,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,fog:false}));
 const SHADOW_CAPACITY=24*FLOODLIGHTS.length;
 const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,SHADOW_CAPACITY);
 shadows.name='FooteraArenaShadows';shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shadows.frustumCulled=false;shadows.renderOrder=2;shadows.count=0;field.add(shadows);track(shadows);
 const dummy=new THREE.Object3D();
 function updateShadows(){
  const list=actors()||[];let n=0;
  for(const root of list){
   if(!root||root.visible===false)continue;
   const x=root.position.x,z=root.position.z,lift=Math.max(0,root.position.y||0);
   for(const light of FLOODLIGHTS){
    if(n>=SHADOW_CAPACITY)break;
    const s=floodlightShadow(light,x,z);
    // An airborne player's shadow slides away from the boots along the ray.
    const slide=lift*s.length/1.8;
    dummy.position.set(x+s.dirX*slide,.022,z+s.dirZ*slide);dummy.rotation.set(0,Math.atan2(s.dirX,s.dirZ),0);
    dummy.scale.set(.8+.05*s.length,1,s.length+.25);dummy.updateMatrix();shadows.setMatrixAt(n++,dummy.matrix);
   }
  }
  shadows.count=n;shadows.instanceMatrix.needsUpdate=true;info.shadows=n;
 }

 // ---- Night sky ----------------------------------------------------------
 const horizon=new THREE.Color(scene.fog?.color||'#1b2d31'),zenith=new THREE.Color(scene.background?.isColor?scene.background:'#16262b');
 const skyUniforms={uHorizon:{value:horizon.clone().multiplyScalar(snow?1:1.55)},uZenith:{value:zenith.clone().multiply(new THREE.Color(spooky?'#6a4f8f':'#4c6a96')).multiplyScalar(snow?1.6:.9)},uGlow:{value:new THREE.Color(spooky?'#3a1f52':'#2f4656')}};
 const sky=new THREE.Mesh(track(new THREE.SphereGeometry(320,24,10,0,Math.PI*2,0,Math.PI*.56)),track(new THREE.ShaderMaterial({
  uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform vec3 uHorizon,uZenith,uGlow;varying vec3 vDir;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){vec3 d=normalize(vDir);float up=clamp(d.y,0.0,1.0);
 vec3 c=mix(uHorizon,uZenith,pow(up,0.42));
 c+=uGlow*pow(1.0-up,6.0)*0.55;
 vec2 cell=floor(d.xz/max(0.12,d.y+0.25)*46.0);float star=step(0.9965,h21(cell))*smoothstep(0.22,0.6,up);
 c+=vec3(0.55,0.6,0.7)*star*h21(cell+7.0);
 gl_FragColor=vec4(c,1.0);}`})));
 sky.name='FooteraArenaSky';sky.renderOrder=-10;sky.frustumCulled=false;group.add(sky);
 // The dome rides with the camera so the far plane never clips it.
 sky.onBeforeRender=(r,s,camera)=>{sky.position.set(camera.position.x,-6,camera.position.z);sky.updateMatrixWorld()};

 // ---- Upper tier, roof and light ring --------------------------------------
 const home=kits?.home?.shirt||'#37df78',away=kits?.away?.shirt||'#d85a6a';
 // V21.406 stadiums: build (upper tier, roof), seat colours, ring and ribbon.
 const upperTier=look?look.upper:{r0:21.2,y0:12.4,r1:34,y1:25.2},hasRoof=look?look.roof!==false:true;
 const seatRows=spooky?['#15101f','#15101f']:look?.tierSeat||['#16222a','#1b2931'];
 info.style=look?.style||'arena';info.upperTier=!!upperTier;info.roof=hasRoof;
 const TIER_REPEATS=6;
 const tierTexture=tex(weak?512:1024,weak?128:256,(ctx,w,h)=>{
  ctx.fillStyle=spooky?'#15101f':'#101a20';ctx.fillRect(0,0,w,h);
  const rows=22,cols=weak?84:168,rh=h/rows,cw=w/cols,neutral=['#c9ccd0','#8f98a3','#39424c','#b79a84','#5b6b7c','#d9d2c2','#2c3540','#a9b4bd'];
  for(let r=0;r<rows;r++){
   ctx.fillStyle=r%2?seatRows[0]:seatRows[1];ctx.fillRect(0,r*rh,w,rh*.9);
   for(let c=0;c<cols;c++){
    const k=r*977+c*131;if(hash(k)>.95||c%42<2)continue;
    const pick=hash(k+5);
    ctx.fillStyle=pick<.16?home:pick<.3?away:neutral[Math.floor(hash(k+9)*neutral.length)];
    ctx.globalAlpha=.5+.4*hash(k+3);
    ctx.fillRect(c*cw+cw*.2,r*rh+rh*.3,cw*.6,rh*.6);
    ctx.globalAlpha=.8;ctx.fillStyle=['#e8c3a0','#c99670','#8d5a3c','#f0d5ba'][Math.floor(hash(k+15)*4)];
    ctx.fillRect(c*cw+cw*.32,r*rh+rh*.04,cw*.36,rh*.3);
   }
  }
  ctx.globalAlpha=1;
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(0,0,0,.6)');shade.addColorStop(.5,'rgba(0,0,0,.15)');shade.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 },true);
 tierTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const perimeterLength=arenaPerimeter(27).length;
 const basic=(opts)=>track(new THREE.MeshBasicMaterial({side:THREE.DoubleSide,...opts}));
 const add=(geometry,material,name)=>{const o=new THREE.Mesh(track(geometry),material);o.name=name;o.frustumCulled=false;group.add(o);return o};
 // Upper tier: the canvas top is the highest row, in the roof's shade.
 const tier=upperTier?add(loftBand(THREE,upperTier.r0,upperTier.y0,upperTier.r1,upperTier.y1,perimeterLength/TIER_REPEATS),basic({map:tierTexture,color:spooky?'#b8a6d8':'#c4ccd2'}),'FooteraArenaUpperTier'):null;
 // V21.406/407: closed outer facade (seen in the stadium shot before kick-off):
 // fins, glowing bands in the seat colour and the stadium's name, and around
 // it plaza, ring road, street lights, fans on their way in, trees and parking.
 {const fr=upperTier?upperTier.r1+.02:19.4,fy=upperTier?upperTier.y1:10.6,accent=spooky?'#ff8a3c':glowColour(look?.seatPrimary||'#7fd6ff'),accent2=spooky?'#7a3cff':look?.seatSecondary||'#e9f6ff';
  const FACADE_REPEATS=6,label=String(look?.name||'FOOTERA ARENA').toUpperCase();
  const facadeTexture=tex(weak?1024:2048,128,(ctx,w,h)=>{
   ctx.fillStyle=spooky?'#120d1a':'#18242b';ctx.fillRect(0,0,w,h);
   // Glass and steel fins.
   for(let x=0;x<w;x+=24){ctx.fillStyle=(x/24)%2?'#22313a':'#1d2b33';ctx.fillRect(x+2,14,20,h-26)}
   // Two glowing bands and soft light along the fins in the club colours.
   ctx.shadowColor=accent;ctx.shadowBlur=14;ctx.fillStyle=accent;ctx.fillRect(0,6,w,5);ctx.fillRect(0,h-12,w,4);
   ctx.shadowBlur=0;ctx.globalAlpha=.55;for(let x=0;x<w;x+=48)ctx.fillRect(x+22,14,3,h-26);
   ctx.globalAlpha=.22;ctx.fillStyle=accent2;for(let x=24;x<w;x+=96)ctx.fillRect(x,14,22,h-26);ctx.globalAlpha=1;
   // The name, big and lit, twice per tile.
   let size=58;ctx.font=`italic 900 ${size}px Arial, sans-serif`;while(size>28&&ctx.measureText(label).width>w*.36){size-=2;ctx.font=`italic 900 ${size}px Arial, sans-serif`}
   ctx.textAlign='center';ctx.textBaseline='middle';
   for(const x of [w*.25,w*.75]){const tw=ctx.measureText(label).width;ctx.fillStyle='#071016e6';ctx.fillRect(x-tw/2-18,h/2-size*.62,tw+36,size*1.24);
    ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.fillStyle='#ffffff';ctx.fillText(label,x,h/2+2);ctx.shadowBlur=0}
  },true);
  facadeTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  // The band's u runs counter-clockwise: mirrored so the name reads from outside.
  facadeTexture.repeat.x=-1;
  add(loftBand(THREE,fr,0,fr,fy,arenaPerimeter(fr).length/FACADE_REPEATS),basic({map:facadeTexture,fog:false,toneMapped:false,color:'#d8dde0'}),'FooteraStadiumFacade');
  const ground=new THREE.Mesh(track(new THREE.PlaneGeometry(900,900)),track(new THREE.MeshBasicMaterial({color:spooky?'#07050c':'#0b1316'})));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.24;ground.name='FooteraStadiumGround';group.add(ground);
  info.surroundings=createSurroundings(THREE,{group,track,perimeter:arenaPerimeter,band:(r0,y0,r1,y1,u)=>loftBand(THREE,r0,y0,r1,y1,u),facadeRadius:fr,kits,look,weak,spooky,hash});}
 // Balcony front between the two tiers with a thin lit edge.
 // LED ribbon on the balcony front: the glowing band behind every close-up.
 const RIBBON_REPEATS=10;
 const ribbonTexture=tex(1024,64,(ctx,w,h)=>{
  const bg=ctx.createLinearGradient(0,0,w,0);
  if(spooky){bg.addColorStop(0,'#2a0f1c');bg.addColorStop(.5,'#4a1c08');bg.addColorStop(1,'#2a0f1c')}
  else{bg.addColorStop(0,'#071a2c');bg.addColorStop(.5,'#0d3a36');bg.addColorStop(1,'#071a2c')}
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=spooky?'#ff8a3c':'#69ff7f';for(let i=0;i<5;i++){ctx.beginPath();const x=24+i*26;ctx.moveTo(x,10);ctx.lineTo(x+16,h/2);ctx.lineTo(x,h-10);ctx.lineTo(x+9,h-10);ctx.lineTo(x+25,h/2);ctx.lineTo(x+9,10);ctx.fill()}
  ctx.fillStyle='#ffffff';ctx.font='900 44px Arial, sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.fillText('FOOTERA',w*.36,h/2+2);
  // V21.406: the stadium's own name on the balcony instead of the slogan.
  const second=look?.name?String(look.name).toUpperCase():'BUILD YOUR ERA';
  ctx.fillStyle=spooky?'#ffb060':look?.ribbon||'#bfff3f';let fs=30;ctx.font=`800 ${fs}px Arial, sans-serif`;while(fs>16&&ctx.measureText(second).width>w*.4){fs-=2;ctx.font=`800 ${fs}px Arial, sans-serif`}
  ctx.fillText(second,w*.73,h/2+2);
 },true);
 ribbonTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const ribbonMaterial=basic({map:ribbonTexture,fog:false,toneMapped:false});
 const ribbonGeometry=loftBand(THREE,21.15,10.5,21.15,12.5,perimeterLength/RIBBON_REPEATS);
 add(ribbonGeometry,ribbonMaterial,'FooteraArenaRibbon');
 // Back wall closes the bowl above the upper tier.
 const roofTexture=tex(256,64,(ctx,w,h)=>{
  ctx.fillStyle=spooky?'#181222':'#1a252c';ctx.fillRect(0,0,w,h);
  ctx.fillStyle=spooky?'#2a2038':'#2f3d46';for(let x=0;x<w;x+=128)ctx.fillRect(x,0,5,h);
  ctx.fillStyle=spooky?'#221a2e':'#25323a';for(let y=10;y<h;y+=18)ctx.fillRect(0,y,w,2);
  const lit=ctx.createLinearGradient(0,0,0,h);lit.addColorStop(0,'rgba(0,0,0,.3)');lit.addColorStop(.65,'rgba(190,215,235,.05)');lit.addColorStop(1,'rgba(190,215,235,.26)');
  ctx.fillStyle=lit;ctx.fillRect(0,0,w,h);
 },true);
 if(hasRoof)add(loftBand(THREE,15.5,29.2,36,33.6,8),basic({map:roofTexture}),'FooteraArenaRoof');
 // Light ring along the roof's inner edge: one continuous modern LED band.
 const ringColour=new THREE.Color(spooky?'#ffd9b0':look?.ring||'#f4f8ff');
 // Ring, the lit balcony edge and the dark back wall share one unlit draw call.
 const wallColour=new THREE.Color(spooky?'#0e0a16':'#0c1418');
 const trim=[[loftBand(THREE,21.1,12.5,21.1,12.72,1),new THREE.Color(spooky?'#ff8a3c':'#dfeaf2')]];
 if(hasRoof)trim.push([loftBand(THREE,15.4,28.35,15.5,29.2,1),ringColour]);
 if(upperTier)trim.push([loftBand(THREE,upperTier.r1,upperTier.y1,upperTier.r1+.5,hasRoof?34:upperTier.y1+1.6,1),wallColour]);
 // Open grounds (Traditionsstadion): four floodlight masts behind the corners.
 const masts=hasRoof?[]:FLOODLIGHTS.map(([x,y,z])=>[x*1.13,y+5,z*1.1]);
 for(const [x,y,z] of masts){
  const pole=new THREE.BoxGeometry(.9,y,.9);pole.translate(x,y/2,z);trim.push([pole,new THREE.Color('#2b363c')]);
  const head=new THREE.BoxGeometry(6.4,3.4,.5);head.rotateY(Math.atan2(x,z));head.translate(x,y+1,z);trim.push([head,new THREE.Color('#1b2328')]);
 }
 info.masts=masts.length;
 {const position=[],colour=[],index=[];let base=0;
  for(const [g,c] of trim){
   const p=g.attributes.position.array;for(let i=0;i<p.length;i+=3){position.push(p[i],p[i+1],p[i+2]);colour.push(c.r,c.g,c.b)}
   for(const i of g.index.array)index.push(i+base);base+=p.length/3;g.dispose();
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));g.setIndex(index);
  add(g,basic({vertexColors:true,fog:false,toneMapped:false}),'FooteraArenaTrim')}

 // Lamp glow: additive sprites every few metres along the ring, a denser,
 // brighter cluster in the four corners where the shadow-casting banks sit.
 const lampPositions=[],lampSizes=[];
 if(hasRoof){const ring=arenaPerimeter(15.3),step=weak?13:7.5;let next=0;
  for(let i=1;i<ring.points.length;i++){
   const a=ring.points[i-1],b=ring.points[i],span=b.u-a.u;
   while(next<=b.u){const t=span?(next-a.u)/span:0;lampPositions.push(a.x+(b.x-a.x)*t,28.6,a.z+(b.z-a.z)*t);lampSizes.push(1);next+=step}
  }
  for(const [x,y,z] of FLOODLIGHTS){lampPositions.push(x,y-1.6,z);lampSizes.push(2.6)}}
 // Mast heads: a 3x2 grid of lamps on each panel, facing the pitch.
 for(const [x,y,z] of masts){const a=Math.atan2(x,z),cx=Math.cos(a),sx=-Math.sin(a);
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){const o=(i-1)*2.1;lampPositions.push(x+cx*o-Math.sin(a)*.4,y+.2+j*1.6,z+sx*o-Math.cos(a)*.4);lampSizes.push(1.9)}}
 const lampGeometry=track(new THREE.BufferGeometry());
 lampGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lampPositions,3));lampGeometry.setAttribute('aSize',new THREE.Float32BufferAttribute(lampSizes,1));
 const lampUniforms={uColor:{value:ringColour.clone()},uScale:{value:1},uSize:{value:weak?7:9}};
 const lamps=new THREE.Points(lampGeometry,track(new THREE.ShaderMaterial({uniforms:lampUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,
  vertexShader:`attribute float aSize;uniform float uScale,uSize;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=min(160.0,uSize*aSize*uScale/max(1.0,-mv.z));}`,
  fragmentShader:`uniform vec3 uColor;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);if(r>1.0)discard;
 float core=smoothstep(0.22,0.0,r),halo=pow(1.0-r,2.6),streak=pow(max(0.0,1.0-abs(p.y)*9.0),2.0)*(1.0-abs(p.x));
 gl_FragColor=vec4(uColor*(core*1.1+halo*0.34+streak*0.22),1.0);}`})));
 lamps.name='FooteraArenaLamps';lamps.frustumCulled=false;lamps.renderOrder=24;group.add(lamps);info.lamps=lampSizes.length;

 // ---- Camera flashes -------------------------------------------------------
 const flashPositions=[],flashSeeds=[],flashCount=weak?70:high?260:190;
 for(let i=0;i<flashCount;i++){
  const row=Math.floor(hash(i*19+3)*11),upper=!!upperTier&&hash(i*23+7)<.32,t=hash(i*29+11);
  if(upper){
   const f0=.07+hash(i*31+1)*.86,rad=upperTier.r0+(upperTier.r1-upperTier.r0)*f0,ring=arenaPerimeter(rad),k=Math.min(ring.points.length-2,Math.floor(t*(ring.points.length-1))),a=ring.points[k],b=ring.points[k+1],f=hash(i*37+5);
   flashPositions.push(a.x+(b.x-a.x)*f,.5+upperTier.y0+(upperTier.y1-upperTier.y0)*f0,a.z+(b.z-a.z)*f);
  }
  else if(hash(i*41+13)<.6){const side=hash(i*43+17)<.5?-1:1;flashPositions.push(side*(39.3+row*1.42),1.75+row*.72,-54+t*108)}
  else{const side=hash(i*47+19)<.5?-1:1;flashPositions.push(-36+t*72,1.75+row*.72,side*(59.4+row*1.42))}
  flashSeeds.push(hash(i*53+23),hash(i*59+29));
 }
 const flashGeometry=track(new THREE.BufferGeometry());
 flashGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flashPositions,3));flashGeometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(flashSeeds,2));
 const flashUniforms={uTime:{value:0},uLevel:{value:.16},uScale:{value:1}};
 const flashes=new THREE.Points(flashGeometry,track(new THREE.ShaderMaterial({uniforms:flashUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,
  vertexShader:`attribute vec2 aSeed;uniform float uTime,uLevel,uScale;varying float vOn;
void main(){float cycle=fract(uTime*(0.55+aSeed.x*0.5)+aSeed.y*17.0);
 float on=step(aSeed.x,uLevel)*smoothstep(0.075,0.0,cycle);
 vOn=on;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;
 gl_PointSize=on>0.0?min(42.0,2.6*uScale/max(1.0,-mv.z)):0.0;}`,
  fragmentShader:`varying float vOn;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);if(r>1.0||vOn<=0.0)discard;
 float star=max(pow(max(0.0,1.0-abs(p.x)*7.0),2.0),pow(max(0.0,1.0-abs(p.y)*7.0),2.0))*(1.0-r);
 gl_FragColor=vec4(vec3(0.92,0.96,1.0)*vOn*(smoothstep(0.5,0.0,r)+star*0.8),1.0);}`})));
 flashes.name='FooteraArenaFlashes';flashes.frustumCulled=false;flashes.renderOrder=23;group.add(flashes);info.flashes=flashCount;

 const size=new THREE.Vector2();
 function update(time=0,camera=null){
  updateShadows();
  if(info.surroundings?.group)info.surroundings.group.visible=!!camera&&camera.position.y>28;
  ribbonTexture.offset.x=(time*.012)%1;
  flashUniforms.uTime.value=time;flashUniforms.uLevel.value=arenaFlashLevel(time,goalAt);
  if(camera){
   // Point sprites are sized in pixels: metres * (buffer height / 2 tan(fov/2)).
   renderer.getDrawingBufferSize(size);
   const scale=size.y/(2*Math.tan((camera.fov||28)*Math.PI/360));
   // Above the roof (stadium shot) the ring is close: smaller glows, no haze.
   lampUniforms.uScale.value=scale*Math.max(.3,Math.min(1,1-(camera.position.y-30)/45));flashUniforms.uScale.value=scale;
  }
 }
 return {group,info,update,tier,uniforms:{flash:flashUniforms,lamp:lampUniforms,sky:skyUniforms},
  dispose(){group.removeFromParent();shadows.removeFromParent()}};
}
