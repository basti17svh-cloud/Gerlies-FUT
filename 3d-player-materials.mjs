/* Footera V21.78 – deterministic, self-authored PBR surface detail.
 * Packed AO (R) + roughness (G), and a tangent-space normal map.
 * One tiny shared atlas per imported hero; LOW creates no texture maps.
 * No remote art, additional meshes, timers or gameplay state.
 */
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:0));
const byte=v=>Math.round(clamp(v)*255);
export const FOOTERA_PBR_VERSION='21.78-athletic-pbr';
export const FOOTERA_PBR_WIDTH=320;
export const FOOTERA_PBR_HEIGHT=64;
const TAU=Math.PI*2;
export function sampleFooteraSurface(slot,u,v){
 const s=Math.max(0,Math.min(4,Math.floor(slot)));
 const x=clamp(u),y=clamp(v),cloth=s===0||s===1||s===3||s===4;
 const knit=Math.sin(x*TAU*33)*Math.cos(y*TAU*25);
 const tangentX=cloth?.052*Math.sin(x*TAU*33):.013*Math.sin(x*TAU*6);
 const tangentY=cloth?.052*Math.cos(y*TAU*25):.013*Math.cos(y*TAU*5);
 const nz=Math.sqrt(Math.max(0,1-tangentX*tangentX-tangentY*tangentY));
 const base=[.89,.94,.76,.95,.87][s];
 const roughness=clamp(base+(cloth?.032:.015)*knit,.55,.995);
 // AO darkens real textile overlaps: hem/collar, short cuffs and sock folds.
 const edge=Math.max(0,1-y/.085),top=Math.max(0,1-(1-y)/.105);
 const centre=1-Math.min(1,Math.abs(x-.5)*5);
 const hem=(s===0||s===4)?.095*edge+.08*top:s===1?.12*edge+.09*top:s===3?.10*top:0;
 const occlusion=clamp(1-hem-.035*centre*(s===0||s===4?1:0),.73,1);
 return {normal:[tangentX,tangentY,nz],roughness,occlusion};
}
export function vertexFooteraOcclusion(nx,ny,nz,slot){
 const armpit=slot===0||slot===4 ? Math.max(0,1-Math.abs(Math.abs(nx)-.285)/.11)*Math.max(0,1-Math.abs(ny-.67)/.13):0;
 const collar=slot===0 ? Math.max(0,1-Math.abs(ny-.79)/.028)*.45:0;
 const inseam=slot===1?Math.max(0,1-Math.abs(nx)/.105)*Math.max(0,1-Math.abs(ny-.47)/.085):0;
 const sockFold=slot===3?Math.max(0,1-Math.abs(ny-.305)/.025):0;
 return clamp(1-.075*armpit-.045*collar-.080*inseam-.038*sockFold,.84,1);
}
export function createFooteraSurfaceMaps(THREE){
 const {FOOTERA_PBR_WIDTH:W,FOOTERA_PBR_HEIGHT:H}={FOOTERA_PBR_WIDTH,FOOTERA_PBR_HEIGHT};
 const packed=new Uint8Array(W*H*4),normals=new Uint8Array(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const slot=Math.min(4,Math.floor(x/64)),u=(x%64+.5)/64,v=(y+.5)/H;
  const s=sampleFooteraSurface(slot,u,v),i=(y*W+x)*4;
  packed[i]=byte(s.occlusion);packed[i+1]=byte(s.roughness);packed[i+2]=0;packed[i+3]=255;
  normals[i]=byte(.5+.5*s.normal[0]);normals[i+1]=byte(.5+.5*s.normal[1]);
  normals[i+2]=byte(.5+.5*s.normal[2]);normals[i+3]=255;
 }
 const make=data=>{
  const tex=new THREE.DataTexture(data,W,H,THREE.RGBAFormat);
  tex.colorSpace=THREE.NoColorSpace;
  tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.generateMipmaps=true;
  tex.needsUpdate=true;return tex;
 };
 const packedMap=make(packed),normalMap=make(normals);
 return {packedMap,normalMap,width:W,height:H,byteSize:W*H*8,
  dispose(){packedMap.dispose();normalMap.dispose()}};
}
