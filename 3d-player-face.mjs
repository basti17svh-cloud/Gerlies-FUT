/* Footera V21.191 close-up faces.
 * The CC0 base head is one smooth skin-coloured surface, which reads as a
 * mask in the goal-celebration close-up. This paints a small face texture
 * (Footera's own procedural art, no photos and no real likeness) with eye
 * sockets, nose, lips, cheek warmth, ears and an optional stubble or beard.
 * Only the scorer, the focused defender and the keeper get it, and only
 * outside LOW mode: one extra draw call each.
 *
 * Texture space: u wraps around the head (0.5 = straight ahead), v runs from
 * the jaw (FACE_NY_MIN) to the crown (FACE_NY_MAX) in Footera's normalised
 * player height. Features are placed in metres on the authored head.
 */
export const FACE_NY_MIN=.872,FACE_NY_MAX=1;
const W=512,H=256,DEPTH=.09,HEIGHT=1.8195,BASE=-.0095;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Lateral metres on the face front / model height in metres to canvas pixels.
const X=x=>(.5+Math.atan2(x,DEPTH)/(Math.PI*2))*W;
const Y=y=>(1-((y-BASE)/HEIGHT-FACE_NY_MIN)/(FACE_NY_MAX-FACE_NY_MIN))*H;
const PX=x=>Math.abs(X(x)-X(0)),PY=y=>Math.abs(Y(y)-Y(0));

export function faceUV(nx,ny,nz,cx=0,cz=0){
 return[.5+Math.atan2(nx-cx,nz-cz)/(Math.PI*2),clamp((ny-FACE_NY_MIN)/(FACE_NY_MAX-FACE_NY_MIN))];
}

export function faceStyle(name=''){
 let h=2166136261;for(const ch of String(name)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
 return{seed:h,beard:['none','stubble','stubble','short','none','goatee'][h%6],lips:(h>>>4)%3,brow:(h>>>8)%3};
}

function rgb(color){return[color.r*255,color.g*255,color.b*255]}
function css([r,g,b],a=1){return`rgba(${r|0},${g|0},${b|0},${a})`}
function shade([r,g,b],k){return[r*k,g*k,b*k]}
function blob(ctx,x,y,rx,ry,color,alpha){
 const g=ctx.createRadialGradient(0,0,0,0,0,1);
 g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
 ctx.save();ctx.translate(x,y);ctx.scale(Math.max(.01,rx),Math.max(.01,ry));
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
}

// Paints into any Canvas 2D context; returns false without a usable canvas.
export function paintFooteraFace(ctx,skinColor,hairColor,style){
 const skin=rgb(skinColor),hair=rgb(hairColor),dark=shade(skin,.55),warm=[skin[0]*1.04+8,skin[1]*.86,skin[2]*.82];
 ctx.fillStyle=css(skin);ctx.fillRect(0,0,W,H);
 const cx=X(0),both=(fn)=>{fn(1);fn(-1)};
 // Fine skin grain, seeded per player so replays stay identical.
 let s=style.seed||1;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 for(let i=0;i<1800;i++){
  const x=rnd()*W,y=rnd()*H,k=.92+rnd()*.13;
  ctx.fillStyle=css(shade(skin,k),.35);ctx.fillRect(x,y,1.4,1.4);
 }
 // Under the jaw and the back of the neck sit in shadow.
 const jaw=ctx.createLinearGradient(0,Y(1.6),0,Y(1.575));
 jaw.addColorStop(0,css(dark,0));jaw.addColorStop(1,css(dark,.5));
 ctx.fillStyle=jaw;ctx.fillRect(0,Y(1.6),W,H-Y(1.6));
 // Cheek warmth, forehead and nose-bridge sheen.
 both(k=>blob(ctx,X(k*.04),Y(1.66),PX(.026),PY(.02),warm,.45));
 blob(ctx,cx,Y(1.745),PX(.045),PY(.018),shade(skin,1.12),.45);
 // Eye sockets with a lit brow ridge above them.
 both(k=>{
  blob(ctx,X(k*.032),Y(1.699),PX(.022),PY(.012),dark,.5);
  blob(ctx,X(k*.033),Y(1.722),PX(.022),PY(.006),shade(skin,1.14),.45);
  blob(ctx,X(k*.05),Y(1.712),PX(.012),PY(.016),dark,.25);
 });
 // Nose: bright bridge, darker sides, nostrils and the shadow beneath.
 blob(ctx,cx,Y(1.672),PX(.006),PY(.022),shade(skin,1.16),.6);
 both(k=>{
  blob(ctx,X(k*.012),Y(1.67),PX(.006),PY(.02),dark,.32);
  blob(ctx,X(k*.0075),Y(1.643),PX(.0045),PY(.0028),shade(skin,.38),.85);
 });
 blob(ctx,cx,Y(1.636),PX(.016),PY(.005),dark,.38);
 // Philtrum and lips.
 blob(ctx,cx,Y(1.629),PX(.004),PY(.007),dark,.28);
 const lip=[skin[0]*.82+20,skin[1]*.62,skin[2]*.62],width=[.021,.023,.019][style.lips%3];
 ctx.fillStyle=css(lip,.82);
 ctx.beginPath();ctx.moveTo(X(-width),Y(1.617));
 ctx.quadraticCurveTo(X(-width*.4),Y(1.625),cx,Y(1.622));
 ctx.quadraticCurveTo(X(width*.4),Y(1.625),X(width),Y(1.617));
 ctx.quadraticCurveTo(X(0),Y(1.6125),X(-width),Y(1.617));ctx.fill();
 ctx.fillStyle=css(shade(lip,1.08),.78);
 ctx.beginPath();ctx.moveTo(X(-width*.9),Y(1.6165));
 ctx.quadraticCurveTo(cx,Y(1.6045),X(width*.9),Y(1.6165));
 ctx.quadraticCurveTo(cx,Y(1.615),X(-width*.9),Y(1.6165));ctx.fill();
 ctx.strokeStyle=css(shade(lip,.45),.9);ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(X(-width),Y(1.6168));ctx.quadraticCurveTo(cx,Y(1.6155),X(width),Y(1.6168));ctx.stroke();
 blob(ctx,cx,Y(1.603),PX(.012),PY(.004),dark,.3);
 // Chin highlight and jawline.
 blob(ctx,cx,Y(1.592),PX(.014),PY(.008),shade(skin,1.1),.4);
 both(k=>blob(ctx,X(k*.06),Y(1.6),PX(.02),PY(.025),dark,.28));
 // Ears sit at the sides of the head: inner shadow and a rim.
 both(k=>{
  const ex=(.5+k*.25)*W;
  blob(ctx,ex,Y(1.69),W*.018,PY(.022),dark,.55);
  blob(ctx,ex,Y(1.69),W*.009,PY(.012),shade(skin,.42),.6);
 });
 // Facial hair, kept short and dark like the haircut.
 if(style.beard!=='none'){
  const density=style.beard==='stubble'?1400:style.beard==='short'?3200:1700,alpha=style.beard==='stubble'?.34:.6;
  for(let i=0;i<density;i++){
   const a=rnd()*Math.PI*2,r=Math.sqrt(rnd());
   let x,y;
   if(style.beard==='goatee'){x=Math.cos(a)*r*.02;y=1.6+Math.sin(a)*r*.022}
   else{x=Math.cos(a)*r*.07;y=1.592+Math.sin(a)*r*.04;
    if(y>1.65||(Math.abs(x)<.02&&y>1.636)||(Math.abs(x)<.023&&Math.abs(y-1.617)<.007))continue;
    if(Math.abs(x)>.035&&y>1.63+Math.abs(x)*.25)continue}
   ctx.fillStyle=css(hair,alpha*(.5+rnd()*.5));ctx.fillRect(X(x),Y(y),1.3,1.3);
  }
  // Moustache for the fuller styles.
  if(style.beard!=='stubble')blob(ctx,cx,Y(1.631),PX(.022),PY(.004),hair,style.beard==='short'?.55:.4);
 }
 paintHair(ctx,hair,rnd);
 return true;
}

// Hairline in metres for an angle around the head (0 = straight ahead): a
// rounded forehead line, slightly receding temples, sideburns and the nape.
export function hairlineAt(angle){
 const a=Math.abs(angle);
 if(a<.95)return 1.768-.075*a*a;
 if(a<1.45)return mix(1.705,1.684,smooth((a-.95)/.25))+.034*smooth((a-1.3)/.15);
 return mix(1.718,1.66,smooth((a-1.5)/.6));
}
const mix=(a,b,u)=>a+(b-a)*u;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
// Short cropped hair, blended per pixel with a soft edge and strand grain.
function paintHair(ctx,hair,rnd){
 const image=ctx.getImageData(0,0,W,H),d=image.data;
 const strands=new Float32Array(W);for(let x=0;x<W;x++)strands[x]=rnd();
 for(let py=0;py<H;py++){
  const y=BASE+HEIGHT*(FACE_NY_MIN+(1-(py+.5)/H)*(FACE_NY_MAX-FACE_NY_MIN));
  for(let px=0;px<W;px++){
   const angle=((px+.5)/W-.5)*Math.PI*2,edge=(y-hairlineAt(angle))/.006;
   if(edge<-1)continue;
   const cover=clamp((edge+1)/2)*(edge<1.5?.75+.25*strands[(px*7+py*3)%W]:1);
   const grain=.5+.24*strands[(px+py*13)%W],i=(py*W+px)*4;
   for(let k=0;k<3;k++)d[i+k]=d[i+k]*(1-cover)+hair[k]*grain*cover;
  }
 }
 ctx.putImageData(image,0,0);
}

export function createFooteraFaceTexture(THREE,skinColor,hairColor,name=''){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 paintFooteraFace(ctx,skinColor,hairColor,faceStyle(name));
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;
 texture.anisotropy=4;texture.name='FooteraFace';
 return texture;
}
