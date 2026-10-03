/* Footera's optional, dependency-free WebGL tunnel. Pack ownership stays in index.html. */
(()=>{
'use strict';
let session=null;
const vertex=`attribute vec3 p; uniform float aspect; uniform float camera; void main(){float z=p.z-camera;gl_Position=vec4(p.x/aspect,p.y,(z-0.2)*1.01,z);}`;
const fragment=`precision mediump float; uniform vec3 color; uniform float alpha; void main(){gl_FragColor=vec4(color,alpha);}`;
function stop(){
 const s=session;if(!s)return;session=null;
 cancelAnimationFrame(s.frame);window.removeEventListener('resize',s.resize);
 document.removeEventListener('visibilitychange',s.visibility);
 s.canvas.removeEventListener('webglcontextlost',s.lost);
 s.gl.deleteBuffer(s.buffer);s.gl.deleteProgram(s.program);
 s.canvas.remove();s.host.classList.remove('webgl-active');
 const release=s.gl.getExtension('WEBGL_lose_context');if(release)release.loseContext();
}
function start(host,{special=false,founder=false}={}){
 stop();if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
 let canvas,gl,program,buffer;
 try{
 canvas=document.createElement('canvas');canvas.className='pack-webgl';canvas.setAttribute('aria-hidden','true');
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,powerPreference:'low-power'});if(!gl)return false;
 program=gl.createProgram();
 for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
 const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Tunnel shader');
 gl.attachShader(program,shader);gl.deleteShader(shader);
 }
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Tunnel program');
 gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 // A real perspective scene: tunnel walls, floor and fourteen luminous portal frames.
 const faces=[],lights=[];
 const quad=(a,b,c,d)=>faces.push(...a,...b,...c,...a,...c,...d);
 quad([-2,-2,1],[2,-2,1],[2,-2,48],[-2,-2,48]);
 quad([-2,-2,1],[-2,-2,48],[-2,2,48],[-2,2,1]);
 quad([2,-2,1],[2,2,1],[2,2,48],[2,-2,48]);
 quad([-2,2,1],[-2,2,48],[2,2,48],[2,2,1]);
 for(let i=0;i<14;i++){
 const z=3+i*3, x=1.96,y=1.96;
 lights.push(-x,-y,z,x,-y,z,x,-y,z,x,y,z,x,y,z,-x,y,z,-x,y,z,-x,-y,z);
 }
 const data=new Float32Array([...faces,...lights]);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,0,0);
 const aspect=gl.getUniformLocation(program,'aspect'),camera=gl.getUniformLocation(program,'camera'),color=gl.getUniformLocation(program,'color'),alpha=gl.getUniformLocation(program,'alpha');
 gl.enable(gl.DEPTH_TEST);gl.clearColor(.005,.009,.016,1);
 const s={canvas,gl,program,buffer,host,frame:0,start:performance.now(),last:0,stage:0};
 const tone=founder?[1,.75,.18]:special?[.25,.85,1]:[.68,1,.28];
 s.resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(host.clientWidth*dpr));canvas.height=Math.max(1,Math.round(host.clientHeight*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(aspect,canvas.width/canvas.height)};
 s.lost=e=>{e.preventDefault();stop()};
 const draw=now=>{
 if(session!==s)return;
 s.frame=requestAnimationFrame(draw);if(document.hidden||now-s.last<32)return;s.last=now;
 try{
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniform1f(camera,((now-s.start)*.0018)%3);gl.uniform1f(alpha,1);
 gl.uniform3f(color,.025,.04,.065);gl.drawArrays(gl.TRIANGLES,0,faces.length/3);
 const pulse=.72+.28*Math.sin(now*.002+s.stage);
 gl.uniform3f(color,tone[0]*pulse,tone[1]*pulse,tone[2]*pulse);
 gl.drawArrays(gl.LINES,faces.length/3,lights.length/3);
 }catch(_){stop()}
 };
 s.visibility=()=>{s.last=0};session=s;host.prepend(canvas);host.classList.add('webgl-active');
 canvas.addEventListener('webglcontextlost',s.lost);window.addEventListener('resize',s.resize);document.addEventListener('visibilitychange',s.visibility);
 s.resize();s.frame=requestAnimationFrame(draw);return true;
 }catch(_){if(session)stop();else{if(gl&&buffer)gl.deleteBuffer(buffer);if(gl&&program)gl.deleteProgram(program);canvas?.remove()}return false}
}
window.FooteraPack3D={start,stop,cue:()=>{if(session)session.stage++}};
})();
