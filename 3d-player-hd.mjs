/* Footera HD heroes (preview, not live): the players the camera comes close
 * to (scorer, his marker and the keeper) get a second, richer surface pass on
 * the same CC0 MakeHuman mesh. Everything is generated here, no extra
 * download: skin pores and soft light bleeding through the skin, wet eyes,
 * hair with a strand highlight, and a kit with real folds and jersey knit in
 * its normal map. Field players far away keep the normal materials, so a
 * phone pays for three detailed players, not twenty-three.
 * Switch: localStorage footera-3d-player-hd = '1'.
 */
export function footeraHDWanted(){
 try{return globalThis.localStorage?.getItem('footera-3d-player-hd')==='1'}catch(_){return false}
}

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function rng(seed){let s=seed>>>0||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}

// Height field (0..1) to a tangent-space normal map, wrapping at the edges.
function heightToNormal(h,size,strength,wrap=true){
 const out=new Uint8Array(size*size*4);
 const at=(x,y)=>{if(wrap){x=(x+size)%size;y=(y+size)%size}else{x=clamp(x,0,size-1);y=clamp(y,0,size-1)}return h[y*size+x]};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength;
  const l=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  out[i]=Math.round((.5-.5*dx/l)*255);out[i+1]=Math.round((.5+.5*dy/l)*255);out[i+2]=Math.round((.5+.5/l)*255);out[i+3]=255;
 }
 return out;
}
function blur(h,size,r,wrap=true){
 // Two box passes, separable; enough to round off painted folds.
 const tmp=new Float32Array(h.length),out=new Float32Array(h.length);
 const idx=(v)=>wrap?(v+size)%size:clamp(v,0,size-1);
 for(let pass=0;pass<2;pass++){
  const src=pass?out.slice():h;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let s=0;for(let k=-r;k<=r;k++)s+=src[y*size+idx(x+k)];tmp[y*size+x]=s/(2*r+1)}
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let s=0;for(let k=-r;k<=r;k++)s+=tmp[idx(y+k)*size+x];out[y*size+x]=s/(2*r+1)}
 }
 return out;
}

let skinMaps=null,sharedFolds=null;
// Tileable skin micro detail: pores, fine creases and an uneven sheen.
export function footeraSkinDetail(THREE){
 if(skinMaps)return skinMaps;
 const S=256,h=new Float32Array(S*S),rough=new Uint8Array(S*S*4),r=rng(7);
 for(let i=0;i<S*S;i++)h[i]=.5+(r()-.5)*.08;
 // Pores: small dimples, a few larger ones.
 for(let n=0;n<1700;n++){
  const cx=r()*S,cy=r()*S,rad=.9+r()*r()*1.9,depth=.18+r()*.22;
  for(let y=Math.floor(cy-rad*2);y<=cy+rad*2;y++)for(let x=Math.floor(cx-rad*2);x<=cx+rad*2;x++){
   const d=Math.hypot(x-cx,y-cy)/rad;if(d>2)continue;h[((y+S)%S)*S+(x+S)%S]-=depth*Math.exp(-d*d*1.6);
  }
 }
 // Crease network: short faint lines at two angles, like the stratum corneum.
 for(let n=0;n<420;n++){
  let x=r()*S,y=r()*S;const a=(r()<.5?.6:-.9)+(r()-.5)*.5,len=6+r()*14;
  for(let t=0;t<len;t+=.5){x+=Math.cos(a)*.5;y+=Math.sin(a)*.5;h[((y|0)+S)%S*S+((x|0)+S)%S]-=.05}
 }
 const sm=blur(h,S,1);
 const normal=heightToNormal(sm,S,3.2);
 for(let i=0;i<S*S;i++){const g=clamp(.5+(sm[i]-.5)*.9,0,1);rough[i*4]=255;rough[i*4+1]=Math.round((.42+.22*(1-g))*255);rough[i*4+2]=0;rough[i*4+3]=255}
 const make=(data,name)=>{const t=new THREE.DataTexture(data,S,S,THREE.RGBAFormat);t.name=name;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t};
 skinMaps={normal:make(normal,'FooteraSkinPores'),rough:make(rough,'FooteraSkinRough')};
 return skinMaps;
}

// Light that enters the skin comes out a little further round the curve,
// warmer: wrap the diffuse term per colour channel (red travels furthest).
// Only diffuse is wrapped; the specular highlight stays physically placed.
function addSkinScatter(material,strength=1){
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace(
   'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
   `{vec3 w=vec3(.42,.2,.13)*${strength.toFixed(2)};float nl=dot(geometryNormal,directLight.direction);
    vec3 wrapped=clamp((vec3(nl)+w)/(1.0+w),0.0,1.0);
    reflectedLight.directDiffuse += wrapped * directLight.color * BRDF_Lambert( material.diffuseColor );}`);
 };
 material.customProgramCacheKey=()=>'footera-skin-scatter-'+strength;
}

// Fold relief for shirt and shorts in the kit canvas's own space (metres on
// the authored body, front left half, back right half; see footeraKitLayout).
export function footeraFabricNormal(THREE,layout,size=1024,seed=1){
 const h=new Float32Array(size*size).fill(.5),r=rng(seed*977+3);
 const {bands,metres}=layout;
 const toPx=(band,m,half,x,y)=>{const [across,top,bottom]=m,[v0,v1]=band;
  return[size*(half==='back'?.75:.25)+x*size*.25/across,size*v0+(top-y)*size*(v1-v0)/(top-bottom)]};
 // A soft ridge (or valley) along a segment, in metres.
 const fold=(band,m,half,x0,y0,x1,y1,width,amp)=>{
  const [ax,ay]=toPx(band,m,half,x0,y0),[bx,by]=toPx(band,m,half,x1,y1);
  const w=Math.max(1.5,width*size*.25/m[0]),len=Math.hypot(bx-ax,by-ay)||1;
  const minx=Math.max(0,Math.floor(Math.min(ax,bx)-w*2)),maxx=Math.min(size-1,Math.ceil(Math.max(ax,bx)+w*2));
  const miny=Math.max(0,Math.floor(Math.min(ay,by)-w*2)),maxy=Math.min(size-1,Math.ceil(Math.max(ay,by)+w*2));
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
   const t=clamp(((x-ax)*(bx-ax)+(y-ay)*(by-ay))/(len*len)),px=ax+(bx-ax)*t,py=ay+(by-ay)*t;
   const d=Math.hypot(x-px,y-py)/w;if(d>2)continue;
   // Folds fade out towards both ends.
   const taper=Math.sin(Math.PI*clamp(t*1.02));h[y*size+x]+=amp*taper*Math.exp(-d*d*1.4);
  }
 };
 const S=bands.shirt,MS=metres.shirt,P=bands.shorts,MP=metres.shorts;
 for(const half of ['front','back']){
  const s=half==='front'?1:.7;
  // Tension folds from each armpit down and in across the chest and belly.
  for(const side of [-1,1])for(let k=0;k<4;k++){
   const y0=1.36-k*.07-r()*.03,x0=side*(.2+r()*.03);
   fold(S,MS,half,x0,y0,side*(.04+r()*.05),y0-.16-r()*.1,.012+r()*.008,(.16+r()*.1)*s);
  }
  // Loose horizontal drape above the hem where the shirt bunches.
  for(let k=0;k<6;k++){const y=.93+k*.035+r()*.02,x=(r()-.5)*.24;
   fold(S,MS,half,x-.11-r()*.06,y+(r()-.5)*.02,x+.11+r()*.06,y+(r()-.5)*.02,.009+r()*.006,(.12+r()*.1)*(k%2?-1:1)*s)}
  // Sleeves: rings of compression folds near the elbow side and the shoulder seam.
  for(const side of [-1,1])for(let k=0;k<5;k++){
   const x=side*(.3+k*.045+r()*.02),y=1.32-k*.03;
   fold(S,MS,half,x-side*.015,y+.05,x+side*.02,y-.06,.007+r()*.005,(.14+r()*.08)*(k%2?-1:1));
  }
  // Collar seam relief and side seams.
  fold(S,MS,half,-.08,1.5,.08,1.5,.006,.25);
  for(const side of [-1,1])fold(S,MS,half,side*.205,1.38,side*.21,.88,.004,.18);
  // Shorts: crotch drape, waistband and a hem crease.
  for(const side of [-1,1])for(let k=0;k<3;k++)
   fold(P,MP,half,side*(.02+k*.02),MP[1]-.2-k*.03,side*(.17+k*.03),MP[2]+.03+r()*.05,.01+r()*.006,.16*(k%2?-1:1));
  fold(P,MP,half,-.32,MP[1]-.035,.32,MP[1]-.035,.012,.22);
  fold(P,MP,half,-.32,MP[2]+.012,.32,MP[2]+.012,.006,.12);
 }
 let sm=blur(h,size,2,false);
 // Jersey knit: a fine diamond mesh, smaller than a pixel row of the colour.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=y/size;if(v>bands.shorts[1])continue;
  sm[y*size+x]+=.004*Math.sin(x*1.9)*Math.sin(y*1.9);
 }
 const data=heightToNormal(sm,size,24,false);
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.name='FooteraKitFolds';t.flipY=false;
 t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;
 t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;
 return t;
}

// Cavity shading baked into vertex colours: eye sockets, nostrils, the lip
// line, ears and the folds between fingers darken, as a real face does under
// soft light. Seams are welded by position so the skin stays continuous.
export function bakeFooteraCavity(THREE,geometry,strength=1){
 const pos=geometry.getAttribute('position'),index=geometry.index,n=pos.count;if(!index)return;
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const nrm=geometry.getAttribute('normal'),key=new Map(),weld=new Int32Array(n);
 for(let i=0;i<n;i++){const k=`${Math.round(pos.getX(i)*2e3)},${Math.round(pos.getY(i)*2e3)},${Math.round(pos.getZ(i)*2e3)}`;
  if(!key.has(k))key.set(k,key.size);weld[i]=key.get(k)}
 const m=key.size,sum=new Float32Array(m*3),cnt=new Float32Array(m),P=new Float32Array(m*3),N=new Float32Array(m*3),edge=new Float32Array(m);
 for(let i=0;i<n;i++){const w=weld[i];P[w*3]=pos.getX(i);P[w*3+1]=pos.getY(i);P[w*3+2]=pos.getZ(i);N[w*3]+=nrm.getX(i);N[w*3+1]+=nrm.getY(i);N[w*3+2]+=nrm.getZ(i)}
 const idx=index.array;
 for(let t=0;t<idx.length;t+=3)for(let k=0;k<3;k++){const a=weld[idx[t+k]],b=weld[idx[t+(k+1)%3]];if(a===b)continue;
  for(const [u,v] of [[a,b],[b,a]]){sum[u*3]+=P[v*3];sum[u*3+1]+=P[v*3+1];sum[u*3+2]+=P[v*3+2];cnt[u]++;
   edge[u]+=Math.hypot(P[v*3]-P[u*3],P[v*3+1]-P[u*3+1],P[v*3+2]-P[u*3+2])}}
 let cav=new Float32Array(m);
 for(let i=0;i<m;i++){if(!cnt[i])continue;const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1,e=edge[i]/cnt[i]||1;
  cav[i]=((sum[i*3]/cnt[i]-P[i*3])*N[i*3]+(sum[i*3+1]/cnt[i]-P[i*3+1])*N[i*3+1]+(sum[i*3+2]/cnt[i]-P[i*3+2])*N[i*3+2])/l/e}
 // Two smoothing rounds over the welded neighbours.
 for(let r=0;r<2;r++){const next=new Float32Array(m),c=new Float32Array(m);
  for(let t=0;t<idx.length;t+=3)for(let k=0;k<3;k++){const a=weld[idx[t+k]],b=weld[idx[t+(k+1)%3]];next[a]+=cav[b];c[a]++;next[b]+=cav[a];c[b]++}
  for(let i=0;i<m;i++)cav[i]=c[i]?(cav[i]*.5+.5*next[i]/c[i]):cav[i]}
 const colors=new Float32Array(n*3);
 for(let i=0;i<n;i++){const c=cav[weld[i]],v=clamp(1-Math.max(0,c)*2.6*strength+Math.max(0,-c)*.35,.42,1.08);colors[i*3]=v;colors[i*3+1]=v*.97;colors[i*3+2]=v*.96}
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
}

// Strand relief from the haircut's own texture: bright strands stand out,
// gaps sink in, so light catches individual locks instead of a helmet.
const hairNormals=new WeakMap();
function hairStrandNormal(THREE,map){
 const image=map?.image;if(!image||typeof document==='undefined')return null;
 if(hairNormals.has(image))return hairNormals.get(image);
 const w=image.width||512,h=image.height||512,c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
 ctx.drawImage(image,0,0);const px=ctx.getImageData(0,0,w,h).data,size=Math.min(w,h),f=new Float32Array(size*size);
 for(let i=0;i<size*size;i++)f[i]=px[i*4]/255*(px[i*4+3]/255);
 const t=new THREE.DataTexture(heightToNormal(f,size,4,false),size,size,THREE.RGBAFormat);
 t.flipY=map.flipY;t.colorSpace=THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
 hairNormals.set(image,t);return t;
}

// Replaces the dressed hero's materials. Returns new disposables.
export function upgradeFooteraHero(THREE,meshes,look,kitMap,layout,seed=1){
 const owned=[],{normal:pores,rough}=footeraSkinDetail(THREE);
 let folds=null;
 for(const mesh of meshes){
  const old=mesh.material,name=mesh.name,m=new THREE.MeshPhysicalMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(m,old);
  // The broadcast look leaves these alone and only hands them its stadium reflections.
  m.userData={...old.userData,footeraBroadcastLook:true,footeraHD:true};
  if(name==='FooteraBody'){
   // Pores repeat ~30 times over the body atlas: about 4 cm per tile.
   const n=pores.clone(),g=rough.clone();n.repeat.set(30,30);g.repeat.set(30,30);n.needsUpdate=g.needsUpdate=true;owned.push({texture:n},{texture:g});
   m.normalMap=n;m.normalScale.set(.35,.35);m.roughnessMap=g;m.roughness=1;
   m.specularIntensity=.55;m.sheen=.2;m.sheenRoughness=.45;
   m.sheenColor=new THREE.Color(look.skin).lerp(new THREE.Color('#ffffff'),.55);
   bakeFooteraCavity(THREE,mesh.geometry);m.vertexColors=true;
   m.envMapIntensity=.45;addSkinScatter(m,look.skinKey?.startsWith('dark')?.7:1);
  }else if(name==='FooteraEyes'){
   m.roughness=.3;m.clearcoat=1;m.clearcoatRoughness=.04;m.envMapIntensity=.25;m.color.multiplyScalar(.82);
  }else if(name==='FooteraShirt'||name==='FooteraShorts'){
   // One shared fold map per session: generating it costs a few hundred ms.
   if(!folds)folds=sharedFolds||(sharedFolds=footeraFabricNormal(THREE,layout,1024,1));
   m.normalMap=folds;m.normalMapType=THREE.TangentSpaceNormalMap;m.normalScale.set(1,1);
   // Tangents come from the kit UV (channel 0), like the colour canvas.
   m.sheen=.6;m.sheenRoughness=.35;m.sheenColor=new THREE.Color('#d7dce6');m.roughness=.62;m.envMapIntensity=.35;
   m.aoMap=old.aoMap;m.aoMapIntensity=1;
  }else if(name==='FooteraSocks'){
   m.sheen=.4;m.sheenRoughness=.6;m.sheenColor=new THREE.Color('#ffffff');m.envMapIntensity=.25;
  }else if(name==='FooteraBoots'){
   m.clearcoat=.8;m.clearcoatRoughness=.18;m.roughness=.35;m.envMapIntensity=1;
  }else if(/^Footera(Hair|Facial|Brows)-/.test(name)){
   // Strand highlight along the hair cards, softer cut-out edges.
   m.anisotropy=.7;m.anisotropyRotation=Math.PI/2;m.roughness=.42;m.specularIntensity=.7;
   m.sheen=.5;m.sheenRoughness=.4;m.sheenColor=new THREE.Color(look.hairColor).lerp(new THREE.Color('#ffffff'),.15);m.sheen=.3;
   const strands=hairStrandNormal(THREE,old.map);if(strands){m.normalMap=strands;m.normalScale.set(1.2,1.2)}
   if(name.startsWith('FooteraHair'))m.color.multiplyScalar(1.15);
   m.alphaToCoverage=true;m.alphaTest=name.startsWith('FooteraBrows')?.12:.22;m.envMapIntensity=.3;
  }
  m.needsUpdate=true;mesh.material=m;owned.push({material:m});old.dispose();
 }
 return owned;
}
