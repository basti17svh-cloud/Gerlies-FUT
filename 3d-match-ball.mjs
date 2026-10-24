/* FOOTERA ASTRAL PRO: original spherical compass artwork, not licensed ball art. */
export const MATCH_BALL_NAME='Footera Astral Pro';
export const MATCH_BALL_RADIUS=.14; // Keep existing contacts and match physics unchanged.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Fourteen independent six-ray emblems. Tangent-space artwork avoids the
// polar stretching of ordinary flat stars on a longitude/latitude texture.
const panels=Array.from({length:14},(_,i)=>{
 const y=1-2*(i+.5)/14,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));
 const n=[Math.cos(a)*r,y,Math.sin(a)*r];
 const t=[-n[2],0,n[0]],len=Math.hypot(...t);t[0]/=len;t[2]/=len;
 const b=[n[1]*t[2],n[2]*t[0]-n[0]*t[2],-n[1]*t[0]];
 return{n,t,b,rotation:i*.71};
});
export function ballSurfaceSample(nx,ny,nz){
 let index=0,first=-2,second=-2;
 for(let i=0;i<panels.length;i++){
  const n=panels[i].n,d=nx*n[0]+ny*n[1]+nz*n[2];
  if(d>first){second=first;first=d;index=i}else if(d>second)second=d;
 }
 const p=panels[index],x=nx*p.t[0]+ny*p.t[1]+nz*p.t[2],y=nx*p.b[0]+ny*p.b[1]+nz*p.b[2];
 const angle=Math.atan2(y,x)+p.rotation,r=Math.hypot(x,y);
 const turn=((angle/TAU)%1+1)%1,segment=Math.floor(turn*12),delta=Math.PI/6,t=(turn*12-segment)*delta;
 const ra=segment%2?.165:.39,rb=segment%2?.39:.165;
 const radius=ra*rb*Math.sin(delta)/(rb*Math.sin(delta-t)+ra*Math.sin(t));
 const edge=first-second,seam=1-clamp(edge/.008),inside=r<radius+.002;
 const pearl=Math.sin(nx*43+ny*21+nz*35)*.8;
 let color=[242+pearl,243+pearl,238+pearl],height=.64;
 if(inside){
  const depth=radius-r,foil=clamp((y+.30)/.6);
  // Cut-glass compass frames: a dark hairline, spectral foil and an ivory core.
  const pearlColor=color.slice(),spectral=segment%2?[38+80*foil,157-57*foil,175+42*foil]:[27+16*foil,55+36*foil,83+43*foil];
  const layers=[[0,[21,34,52]],[.012,[165,184,193]],[.022,spectral],[.075,[163,183,196]],[.085,[32,47,67]],[.115,pearlColor]];
  for(const [at,tone] of layers){let a=clamp((depth-at+.0015)/.003);a=a*a*(3-2*a);color=color.map((v,i)=>v+(tone[i]-v)*a)}
  height=depth<.115?.58:.64;
 }
 // Geodesic panel grooves and subtle, deterministic pebbled grip.
 if(seam>0){color=color.map(c=>c*(1-seam*.22));height-=seam*.31}
 const grip=Math.pow(Math.max(0,Math.sin(nx*383+ny*29)*Math.sin(ny*397+nz*37)*Math.sin(nz*419+nx*31)),4);
 height-=grip*.10;
 return{color:color.map(c=>Math.round(clamp(c,0,255))),height:Math.round(clamp(height)*255),panel:index};
}
const canvasCache=new Map();
function buildCanvases(size){
 const w=size,h=size/2,canvas=document.createElement('canvas'),bump=document.createElement('canvas');
 canvas.width=bump.width=w;canvas.height=bump.height=h;
 const ctx=canvas.getContext('2d'),bctx=bump.getContext('2d'),image=ctx.createImageData(w,h),relief=bctx.createImageData(w,h);
 for(let y=0;y<h;y++){
  const phi=y/(h-1)*Math.PI,sy=Math.cos(phi),sr=Math.sin(phi);
  for(let x=0;x<w;x++){
   const theta=x/(w-1)*TAU,s=ballSurfaceSample(-Math.cos(theta)*sr,sy,Math.sin(theta)*sr),i=(y*w+x)*4;
   image.data.set([...s.color,255],i);relief.data.set([s.height,s.height,s.height,255],i);
  }
 }
 ctx.putImageData(image,0,0);bctx.putImageData(relief,0,0);
 // A restrained original wordmark. No supplier or competition marks.
 ctx.save();ctx.translate(w*.25,h*.52);ctx.fillStyle='#243c4a';ctx.textAlign='center';
 ctx.font='800 '+Math.round(w*.022)+'px sans-serif';ctx.strokeStyle='#f3f4ef';ctx.lineWidth=Math.max(2,w*.002);ctx.strokeText('FOOTERA',0,0);ctx.fillText('FOOTERA',0,0);
 ctx.font='600 '+Math.round(w*.008)+'px sans-serif';ctx.fillText('ASTRAL PRO',0,w*.014);ctx.restore();
 return{canvas,bump};
}
export function createMatchBallSurface(THREE,{size=1024,anisotropy=4,track=x=>x}={}){
 if(!canvasCache.has(size))canvasCache.set(size,buildCanvases(size));
 const {canvas,bump}=canvasCache.get(size);
 const map=track(new THREE.CanvasTexture(canvas)),bumpMap=track(new THREE.CanvasTexture(bump));
 for(const texture of [map,bumpMap]){texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=anisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter}
 map.colorSpace=THREE.SRGBColorSpace;
 map.name=MATCH_BALL_NAME+' / colour';bumpMap.name=MATCH_BALL_NAME+' / panel relief';
 const material=track(new THREE.MeshStandardMaterial({map,bumpMap,bumpScale:.008,color:'#ffffff',roughness:.46,metalness:.055}));
 material.name=MATCH_BALL_NAME;
 return{material,map,bumpMap};
}
