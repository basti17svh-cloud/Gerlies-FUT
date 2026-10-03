/* Optional WebGL presentation. Never generates, awards or resolves pack items. */
(()=>{
'use strict';
let session=null,prepared=null;
const vertex=`attribute vec2 p; varying mediump vec2 uv; void main(){uv=p;gl_Position=vec4(p,0.,1.);}`;
const fragment=`precision mediump float;
varying mediump vec2 uv; uniform float aspect,time,door; uniform vec3 tone;
void main(){
 vec3 ro=vec3(0.,0.,min(time*.65,5.8));
 vec3 rd=normalize(vec3(uv.x*aspect,uv.y,1.4));
 float tx=2.6/max(abs(rd.x),.0001),ty=2.5/max(abs(rd.y),.0001),tz=(14.-ro.z)/rd.z;
 float t=min(min(tx,ty),tz);vec3 hit=ro+rd*t;
 vec3 c=vec3(.018,.024,.038);float glow=0.;
 if(tz<=tx&&tz<=ty){
  // The two metal doors slide apart, revealing the stadium beyond them.
  float gap=door*2.9;
  if(abs(hit.x)<gap){
   c=vec3(.035,.09,.075)+vec3(.28,.38,.36)*exp(-length(uv*vec2(1.,1.4))*2.);
   float grass=step(hit.y,-.8);c=mix(c,vec3(.03,.15,.08),grass);
   float lamps=exp(-abs(hit.y-1.45)*22.);c+=vec3(.8,.9,1.)*lamps;
  }else{
   float rib=step(.88,fract((abs(hit.x)-gap)*5.));c=vec3(.07,.085,.12)+rib*.04;
   glow=exp(-abs(abs(hit.x)-gap)*20.)+exp(-abs(hit.y-2.3)*24.);
  }
 }else{
  float dist=exp(-t*.055);
  if(ty<tx){
   c=vec3(.027,.035,.047)*dist;
   float strips=exp(-abs(abs(hit.x)-2.25)*28.);
   float seam=pow(max(0.,1.-abs(fract(hit.z*.5)-.5)*2.),30.);
   glow=strips*.85+seam*.1;
   if(hit.y<0.){c+=tone*strips*.08;float grid=step(.96,fract(hit.z*.6))+step(.985,fract(hit.x*2.));c+=vec3(.04)*grid*dist;}
  }else{
   c=vec3(.04,.045,.065)*dist;
   float stripe=exp(-abs(abs(hit.y)-1.9)*22.);
   float ring=exp(-abs(fract(hit.z/3.)-.5)*75.);
   glow=stripe*.65+ring*.7;
  }
  glow*=dist;
 }
 c+=tone*glow*(.8+.12*sin(time*2.));
 // Haze, light spilling from the opening, and a vignette.
 c+=tone*.035*exp(-length(uv)*2.);
 c+=vec3(.42,.48,.5)*door*exp(-length(uv)*4.);
 c*=max(.35,1.-length(uv)*.32);
 gl_FragColor=vec4(c,1.);
}`;
function status(host,mode,reason=''){host.dataset.renderer=mode;host.dataset.rendererReason=reason;}
function stop(){
 const s=session;if(!s)return;session=null;cancelAnimationFrame(s.frame);
 window.removeEventListener('resize',s.resize);document.removeEventListener('visibilitychange',s.visibility);
 s.canvas.removeEventListener('webglcontextlost',s.lost);s.gl.deleteBuffer(s.buffer);s.gl.deleteProgram(s.program);
 s.canvas.remove();s.host.classList.remove('webgl-active');
 const release=s.gl.getExtension('WEBGL_lose_context');if(release)release.loseContext();
}
function start(host,{special=false,founder=false,totw=false}={}){
 stop();status(host,'css','');
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){status(host,'css','Bewegungen sind im Gerät reduziert');return false;}
 let canvas,gl,program,buffer;
 try{
 canvas=document.createElement('canvas');canvas.className='pack-webgl';canvas.setAttribute('aria-hidden','true');
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'default'});
 if(!gl){status(host,'css','WebGL-Kontext nicht verfügbar');return false;}
 program=gl.createProgram();
 for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Shader: '+msg);}
  gl.attachShader(program,shader);gl.deleteShader(shader);
 }
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL-Programm konnte nicht verbunden werden');
 gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
 const aspect=gl.getUniformLocation(program,'aspect'),time=gl.getUniformLocation(program,'time'),door=gl.getUniformLocation(program,'door'),tone=gl.getUniformLocation(program,'tone');
 gl.uniform3fv(tone,special?[.15,.7,1.]:founder||totw?[1.,.65,.12]:[1.,.82,.36]);
 const s={canvas,gl,program,buffer,host,frame:0,elapsed:0,last:0,opening:0};
 s.resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,1.25),w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(aspect,w/h)};
 s.lost=e=>{e.preventDefault();status(host,'css','WebGL-Kontext verloren');stop()};
 const draw=now=>{
  if(session!==s)return;s.frame=requestAnimationFrame(draw);
  if(document.hidden){s.last=0;return}if(s.last&&now-s.last<32)return;
  if(s.last)s.elapsed+=Math.min(now-s.last,100);s.last=now;
  try{gl.uniform1f(time,s.elapsed/1000);gl.uniform1f(door,s.opening?Math.min(1,(s.elapsed-s.opening+1)/950):0);gl.drawArrays(gl.TRIANGLES,0,3)}catch(e){status(host,'css','Renderfehler');stop()}
 };
 s.visibility=()=>{s.last=0};session=s;host.prepend(canvas);host.classList.add('webgl-active');
 canvas.addEventListener('webglcontextlost',s.lost);window.addEventListener('resize',s.resize);document.addEventListener('visibilitychange',s.visibility);
 s.resize();s.frame=requestAnimationFrame(draw);status(host,'webgl');return true;
 }catch(e){if(session)stop();else{if(gl&&buffer)gl.deleteBuffer(buffer);if(gl&&program)gl.deleteProgram(program);canvas?.remove()}status(host,'css',String(e.message));return false}
}
function clearPrepared(){prepared?.holder.remove();prepared=null;}
function prepare(cards,cues){
 clearPrepared();const holder=document.createElement('div');holder.className='pack-preload';holder.setAttribute('aria-hidden','true');
 holder.innerHTML=cards.map(html=>`<div>${html}</div>`).join('')+Object.entries(cues).map(([kind,html])=>`<div data-cue="${kind}">${html}</div>`).join('');
 for(const img of holder.querySelectorAll('img')){img.loading='eager';img.fetchPriority='high';}
 document.body.appendChild(holder);
 const ready=Promise.all([...holder.querySelectorAll('img')].map(img=>new Promise(resolve=>{
  let done=false;const finish=()=>{if(done)return;done=true;img.removeEventListener('load',check);img.removeEventListener('error',check);resolve()};
  const check=()=>{if(img.complete&&img.naturalWidth){Promise.resolve(img.decode?.()).catch(()=>{}).then(finish)}};
  img.addEventListener('load',check);img.addEventListener('error',check);check();setTimeout(finish,2400);
 })));
 prepared={holder,ready,count:cards.length};return ready;
}
function card(index,target){if(!prepared||index>=prepared.count)return false;const node=prepared.holder.children[index];if(!node)return false;target.replaceChildren(...node.childNodes);return true;}
window.FooteraPack3D={start,stop,prepare,clearPrepared,card,ready:()=>prepared?.ready||Promise.resolve(),openDoor:()=>{if(session)session.opening=session.elapsed||1},cue:()=>{}};
})();
