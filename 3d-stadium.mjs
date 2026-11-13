// Footera V21.406 "Stadien" (Basti 2026-11-13): "Manche Tribünen sind leer im
// Spiel. Es sollen überall Fans sein. Individuelle Stadien und vor dem Spiel
// soll man das Stadion in einer Szene sehen."
//  - stadium looks: three builds with seat colours and name. Which ground a
//    match is in (own / opponent, alternating) is decided in footera-app.js.
//  - the fan wall: one cheap textured layer of supporters on every terrace row,
//    so no stand is ever empty, whatever the phone can draw in 3D fans
//  - the stadium shot before kick-off
// Pure and deterministic: seeded hashes only, no randomness, no clock.

export const STADIUM_VERSION='21.406-stadiums';
export const STADIUM_STYLES=Object.freeze(['arena','kessel','tradition']);
export const STADIUM_STYLE_LABELS=Object.freeze({arena:'Flutlicht-Arena',kessel:'Hexenkessel',tradition:'Traditionsstadion'});
export const STADIUM_NAME_MAX=28;

const HEX=/^#[0-9a-f]{6}$/i;
const hexOr=(v,f)=>HEX.test(String(v||''))?String(v).toLowerCase():f;
function rgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]}
function toHex(c){return'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
export function mixHex(a,b,t){const x=rgb(a),y=rgb(b);return toHex(x.map((v,i)=>v+(y[i]-v)*t))}
export function cleanStadiumName(name,fallback='Footera Arena'){
 const s=String(name??'').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,STADIUM_NAME_MAX);
 return s||fallback;
}
export function defaultStadium(clubName='Footera Club',colors={}){
 return{name:cleanStadiumName(`${String(clubName||'Footera Club').trim()} Arena`),style:'arena',seatPrimary:hexOr(colors.primary,'#d8ff3e'),seatSecondary:hexOr(colors.secondary,'#173627')};
}
export function cleanStadium(raw,fallback=defaultStadium()){
 const x=raw&&typeof raw==='object'?raw:{};
 return{name:cleanStadiumName(x.name,fallback.name),style:STADIUM_STYLES.includes(x.style)?x.style:fallback.style,
  seatPrimary:hexOr(x.seatPrimary,fallback.seatPrimary),seatSecondary:hexOr(x.seatSecondary,fallback.seatSecondary)};
}
// What the scene builds for a stadium. Distances in metres, see 3d-arena.mjs.
export function stadiumLook(stadium){
 const s=cleanStadium(stadium),dark='#0d151a';
 const look={name:s.name,style:s.style,seatPrimary:s.seatPrimary,seatSecondary:s.seatSecondary,
  steps:[mixHex(s.seatPrimary,dark,.82),mixHex(s.seatSecondary,dark,.78)],
  tierSeat:[mixHex(s.seatPrimary,dark,.72),mixHex(s.seatSecondary,dark,.66)],
  upper:{r0:21.2,y0:12.4,r1:34,y1:25.2},roof:true,ring:'#f4f8ff',ribbon:null};
 if(s.style==='kessel'){
  // Steeper, closer and higher: the noise stays inside. Light ring in club colour.
  look.upper={r0:21.2,y0:12.4,r1:31,y1:28.2};look.ring=mixHex(s.seatPrimary,'#ffffff',.55);look.ribbon=s.seatPrimary;
 }else if(s.style==='tradition'){
  // No upper tier and no roof: the old ground with four floodlight masts.
  look.upper=null;look.roof=false;
 }
 return look;
}

// ---- fan wall ---------------------------------------------------------------
// One quad per terrace row, standing right behind the 3D fans of that row.
// Where a phone draws fewer 3D fans (low tier rows, slow-frame reduction,
// aisle gaps between instances) supporters on the texture fill the seats.
// Rows: lower stands as in 3d-highlights-scene.mjs (side x=±(39.3+r*1.42),
// end z=±(59.4+r*1.42), step top .84+r*.72, corners round (±37,±57.1)).
export const FAN_WALL_ROWS=12,FAN_TILE_METRES=7.2;
const rowTop=r=>.84+r*.72;
// Quads as [x0,z0,x1,z1,y,bandIndex,uOffset]; band 0 host fans, 1 guests, 2 mixed.
export function fanWallQuads({hostEnd=-1,aisles={side:[],end:[]},hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}}={}){
 // Every quad is wound so its front face (normal (-dz,dx)) looks at the pitch.
 const quads=[],push=(x0,z0,x1,z1,y,band,seed)=>{const mx=(x0+x1)/2,mz=(z0+z1)/2,toward=-(z1-z0)*-mx+(x1-x0)*-mz;quads.push(toward>=0?[x0,z0,x1,z1,y,band,hash(seed)*8]:[x1,z1,x0,z0,y,band,hash(seed)*8])};
 const cut=(from,to,gaps)=>{const out=[];let a=from;for(const g of [...gaps].sort((p,q)=>p-q)){if(g-.55>a)out.push([a,g-.55]);a=Math.max(a,g+.55)}if(to>a)out.push([a,to]);return out};
 for(const side of [-1,1])for(let r=0;r<FAN_WALL_ROWS;r++){
  // Side stands: the guest block sits in the guest end's corner of each side.
  const x=side*(39.3+r*1.42+.12),y=rowTop(r);
  for(const [a,b] of cut(-58.6,58.6,aisles.side)){
   // Away fans fill the last 20 m towards the guest end, the rest host or mixed.
   const split=-hostEnd*38;
   const parts=hostEnd<0?[[a,Math.min(b,split),0],[Math.max(a,split),b,1]]:[[a,Math.min(b,split),1],[Math.max(a,split),b,0]];
   for(const [p,q,band] of parts)if(q-p>.3)push(x,p,x,q,y,band===0&&Math.abs((p+q)/2)<14?2:band,r*31+side*7+p);
  }
  const z=side*(59.4+r*1.42+.12),band=side===hostEnd?0:1;
  for(const [a,b] of cut(-38.6,38.6,aisles.end))push(a,z,b,z,y,band,r*37+side*11+a);
 }
 for(const sx of [-1,1])for(const sz of [-1,1])for(let r=0;r<FAN_WALL_ROWS;r++){
  const radius=2.3+r*1.42+.12,count=8,band=sz===hostEnd?0:1;
  for(let c=0;c<count;c++){
   const a0=c/count*Math.PI/2,a1=(c+1)/count*Math.PI/2;
   const p=[sx*(37+Math.cos(a0)*radius),sz*(57.1+Math.sin(a0)*radius)],q=[sx*(37+Math.cos(a1)*radius),sz*(57.1+Math.sin(a1)*radius)];
   push(p[0],p[1],q[0],q[1],rowTop(r),band,r*41+c*5+sx*3+sz);
  }
 }
 return quads;
}
// Front normal of quad (x0,z0)->(x1,z1) in the xz plane (counter-clockwise front).
export function quadNormal(q){const dx=q[2]-q[0],dz=q[3]-q[1],l=Math.hypot(dx,dz)||1;return[-dz/l,dx/l]}

export function createFanWall(THREE,{scene,track=o=>o,weak=false,host='#d8ff3e',hostSecondary='#173627',guest='#e9ecf3',guestSecondary='#1d2430',seat='#1b2931',hostEnd=-1,aisles,hash}){
 const W=weak?512:1024,H=weak?192:384,band=H/3;
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 const skins=['#f0d5ba','#e8c3a0','#c99670','#8d5a3c','#5f3b26'],neutral=['#e4e1d8','#26343a','#52616a','#a39485','#d2c8b5','#343c49','#1c252b'];
 const palettes=[[host,host,host,hostSecondary,...neutral.slice(0,3)],[guest,guest,guest,guestSecondary,...neutral.slice(0,3)],[host,hostSecondary,guest,...neutral]];
 ctx.clearRect(0,0,W,H);
 for(let b=0;b<3;b++){
  // Two staggered lines of supporters per band: one standing behind, one in front.
  const people=weak?20:26;
  for(const [line,scale,y0] of [[0,.86,.04],[1,1,.2]])for(let i=0;i<people;i++){
   const k=b*997+line*331+i*17,cx=(i+.5+(line?.5:0)+(hash(k)-.5)*.35)/people*W,s=scale*(.9+hash(k+1)*.2)*(W/1024);
   const top=b*band+band*(y0+(1-scale)*.3+hash(k+2)*.05),shirt=palettes[b][Math.floor(hash(k+3)*palettes[b].length)];
   const tw=26*s,th=band*.62*scale,hr=8.5*s;
   for(const ox of [-W,0,W]){const x=cx+ox;if(x<-40||x>W+40)continue;
    const up=hash(k+4)<.28;ctx.fillStyle=shirt;
    if(up){ctx.fillRect(x-tw*.62,top+band*.02,5*s,th*.42);ctx.fillRect(x+tw*.62-5*s,top+band*.02,5*s,th*.42)}
    ctx.beginPath();ctx.moveTo(x-tw/2,top+band);ctx.lineTo(x-tw/2,top+hr*2.2+4*s);ctx.quadraticCurveTo(x,top+hr*1.8,x+tw/2,top+hr*2.2+4*s);ctx.lineTo(x+tw/2,top+band);ctx.closePath();ctx.fill();
    ctx.fillStyle=skins[Math.floor(hash(k+5)*skins.length)];ctx.beginPath();ctx.arc(x,top+hr*1.25,hr,0,Math.PI*2);ctx.fill();
    if(hash(k+6)<.4){ctx.fillStyle=hash(k+7)<.5?'#1d1712':'#3b2a1d';ctx.beginPath();ctx.arc(x,top+hr*1.05,hr,Math.PI,0);ctx.fill()}
    if(hash(k+8)<.18){ctx.fillStyle=palettes[b][0];ctx.fillRect(x-tw*.55,top+hr*2.6,tw*1.1,5*s)}
   }
  }
 }
 const map=track(new THREE.CanvasTexture(c));map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.anisotropy=2;
 const quads=fanWallQuads({hostEnd,aisles,hash}),position=[],normal=[],uv=[],index=[];
 const height=1.25;
 for(const q of quads){
  const [x0,z0,x1,z1,y,b,off]=q,[nx,nz]=quadNormal(q),len=Math.hypot(x1-x0,z1-z0),u0=off,u1=off+len/FAN_TILE_METRES,v0=1-(b+1)/3+.004,v1=1-b/3-.004,base=position.length/3;
  position.push(x0,y,z0,x1,y,z1,x1,y+height,z1,x0,y+height,z0);
  for(let i=0;i<4;i++)normal.push(nx*.82,.57,nz*.82);
  uv.push(u0,v0,u1,v0,u1,v1,u0,v1);index.push(base,base+1,base+2,base,base+2,base+3);
 }
 const g=track(new THREE.BufferGeometry());
 g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);
 const material=track(new THREE.MeshLambertMaterial({map,alphaTest:.5,color:'#d4d8da'}));
 const mesh=new THREE.Mesh(g,material);mesh.name='FooteraFanWall';mesh.frustumCulled=false;mesh.renderOrder=-1;scene.add(mesh);
 return{mesh,quads:quads.length,seat};
}

// ---- stadium shot before kick-off ------------------------------------------
// From high above the roof, round the bowl and down into the corner.
export function stadiumIntroCamera(time,duration){
 const u=Math.max(0,Math.min(1,time/duration)),e=u*u*(3-2*u);
 const angle=.42+e*.45,radius=235-e*155,height=125-e*101;
 return{position:[Math.cos(angle)*radius*.62,height,Math.sin(angle)*radius],target:[0,e*5.5,-10+e*2],fov:46-e*8,phase:'arena'};
}
