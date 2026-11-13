// Footera V21.406 "Stadien" (Basti 2026-11-13): "Manche Tribünen sind leer im
// Spiel. Es sollen überall Fans sein. Individuelle Stadien und vor dem Spiel
// soll man das Stadion in einer Szene sehen."
//  - stadium looks: three builds with seat colours and name. Which ground a
//    match is in (own / opponent, alternating) is decided in footera-app.js.
//  - the fan wall: one cheap textured layer of supporters on every terrace row,
//    so no stand is ever empty, whatever the phone can draw in 3D fans
//  - the stadium shot before kick-off
// Pure and deterministic: seeded hashes only, no randomness, no clock.

export const STADIUM_VERSION='21.410-stadiums';
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
 // V21.410 (Basti: "man sieht nur eine Ecke"): starts high behind one end so
 // the whole stadium and its surroundings fit a portrait phone, holds for a
 // moment, then swings round and down into the corner.
 const hold=Math.max(0,Math.min(1,(time/duration-.18)/.82)),f=hold*hold*(3-2*hold);
 const angle=1.36-f*.49,radius=232-f*152,height=138-f*114;
 return{position:[Math.cos(angle)*radius*.62,height,Math.sin(angle)*radius],target:[0,f*5.5,-14+f*6],fov:46-f*8,phase:'arena'};
}

// ---- around the stadium (V21.410, Basti: "Außenansicht mit mehr Leben") ----
// Plaza, ring road with street lights, fans on their way in, trees and a car
// park on the main-stand side. Seen in the stadium shot before kick-off; the
// match cameras never look this far out. Static: no per-frame work.
export function surroundingsPlan({facadeRadius:fr=34,weak=false,hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}}={}){
 const CX=37,CZ=57.1;
 // A point on the rounded rectangle of radius r at fraction t of its length.
 const at=(r,t)=>{const straightX=2*CZ,straightZ=2*CX,arc=Math.PI/2*r,total=2*straightX+2*straightZ+4*arc;let d=((t%1)+1)%1*total;
  const segs=[[straightX,(s)=>[CX+r,-CZ+s,1,0]],[arc,(s)=>{const a=s/r;return[CX+Math.cos(a)*r,CZ+Math.sin(a)*r,Math.cos(a),Math.sin(a)]}],[straightZ,(s)=>[CX-s,CZ+r,0,1]],[arc,(s)=>{const a=Math.PI/2+s/r;return[-CX+Math.cos(a)*r,CZ+Math.sin(a)*r,Math.cos(a),Math.sin(a)]}],
   [straightX,(s)=>[-CX-r,CZ-s,-1,0]],[arc,(s)=>{const a=Math.PI+s/r;return[-CX+Math.cos(a)*r,-CZ+Math.sin(a)*r,Math.cos(a),Math.sin(a)]}],[straightZ,(s)=>[-CX+s,-CZ-r,0,-1]],[arc,(s)=>{const a=Math.PI*1.5+s/r;return[CX+Math.cos(a)*r,-CZ+Math.sin(a)*r,Math.cos(a),Math.sin(a)]}]];
  for(const [len,f] of segs){if(d<=len)return f(d);d-=len}return segs[0][1](0)};
 const plaza=[fr,fr+24],road=[fr+24,fr+33];
 // Fans: denser towards the four entrances in the middle of each stand.
 const people=[],peopleCount=weak?240:700,entrances=[0.115,0.385,0.615,0.885];
 for(let i=0;i<peopleCount;i++){
  const near=hash(i*7+1)<.6,t=near?entrances[i%4]+(hash(i*7+2)-.5)*(hash(i*7+3)*.09):hash(i*7+4),r=plaza[0]+1.2+Math.pow(hash(i*7+5),near?1.6:1)*(plaza[1]-plaza[0]-2.4);
  const [x,z,nx,nz]=at(r,t);people.push({x,z,heading:Math.atan2(-nx,-nz)+(hash(i*7+6)-.5)*1.2,team:hash(i*7+8)<.48?'home':hash(i*7+8)<.86?'away':'neutral',size:.9+hash(i*7+9)*.25,index:i});
 }
 const lamps=[];{const n=Math.round((2*114+2*74+2*Math.PI*(road[0]+.5))/16);for(let i=0;i<n;i++){const [x,z]=at(road[0]+.6,i/n);lamps.push([x,z])}}
 // Car park on the main-stand side (+x), trees everywhere else around.
 const park={x0:CX+road[1]+6,x1:CX+road[1]+6+(weak?28:46),z0:-66,z1:66};
 const cars=[];for(let row=0,x=park.x0+3;x<park.x1-2;row++,x+=row%2?6.2:9.8)for(let z=park.z0+2;z<park.z1-2;z+=2.7){const k=Math.round(z*7.3)*31+row*977;if(hash(k)<.78)cars.push({x,z,yaw:(row%2?0:Math.PI)+(hash(k+1)-.5)*.08,colour:Math.floor(hash(k+2)*8)})}
 const trees=[];for(let i=0,tries=0;trees.length<(weak?45:110)&&tries<900;tries++,i++){const [x,z]=at(road[1]+5+hash(i*5+1)*42,hash(i*5+2));if(x>park.x0-6&&x<park.x1+6&&z>park.z0-6&&z<park.z1+6)continue;trees.push({x,z,s:.8+hash(i*5+3)*.6})}
 return{plaza,road,people,lamps,cars,trees,park};
}
export function createSurroundings(THREE,{group,track=o=>o,band,facadeRadius,kits=null,weak=false,spooky=false,hash}={}){
 const plan=surroundingsPlan({facadeRadius,weak,hash}),out=new THREE.Group();out.name='FooteraStadiumSurroundings';group.add(out);
 const tex=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
 const mesh=(g,m,name)=>{const o=new THREE.Mesh(track(g),track(m));o.name=name;out.add(o);return o};
 // Plaza: warm-lit paving, brightest along the facade.
 const paving=tex(256,64,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#8a8f8c');g.addColorStop(1,'#3e4648');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#00000030';ctx.lineWidth=1;for(let x=0;x<w;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}});
 mesh(band(plan.plaza[0],-.18,plan.plaza[1],-.18,24),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:paving,color:spooky?'#9a8fb0':'#c9c4b8'}),'FooteraStadiumPlaza');
 const asphalt=tex(256,32,(ctx,w,h)=>{ctx.fillStyle='#22282b';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e6e2c8';for(let x=0;x<w;x+=64)ctx.fillRect(x,h/2-1,34,2);ctx.fillStyle='#bfc4c4';ctx.fillRect(0,1,w,1);ctx.fillRect(0,h-2,w,1)});
 mesh(band(plan.road[0],-.19,plan.road[1],-.19,30),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:asphalt}),'FooteraStadiumRoad');
 mesh(band(plan.road[1],-.2,plan.road[1]+60,-.2,40),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,color:spooky?'#100c16':'#14241a'}),'FooteraStadiumLawn');
 // Car park surface with bay lines.
 {const p=plan.park,w=p.x1-p.x0,d=p.z1-p.z0,lines=tex(128,256,(ctx,cw,ch)=>{ctx.fillStyle='#262c2f';ctx.fillRect(0,0,cw,ch);ctx.fillStyle='#c9cdc8';for(let y=0;y<ch;y+=10)ctx.fillRect(0,y,cw*.3,1)});
  lines.repeat.set(Math.max(1,Math.round(w/16)),Math.round(d/26));const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate((p.x0+p.x1)/2,-.17,0);mesh(g,new THREE.MeshBasicMaterial({map:lines}),'FooteraStadiumCarPark')}
 const dummy=new THREE.Object3D(),colour=new THREE.Color();
 // Fans walking in: torso + head, in both clubs' colours.
 const home=kits?.home?.shirt||'#d8ff3e',away=kits?.away?.shirt||'#e9ecf3',neutral=['#2b3540','#d9d4c8','#55606a','#8f7a66'];
 const bodies=new THREE.InstancedMesh(track(new THREE.CylinderGeometry(.24,.2,1.25,5)),track(new THREE.MeshLambertMaterial({color:'#ffffff'})),plan.people.length);
 const heads=new THREE.InstancedMesh(track(new THREE.SphereGeometry(.15,5,4)),track(new THREE.MeshLambertMaterial({color:'#e2b48c'})),plan.people.length);
 plan.people.forEach((p,i)=>{dummy.position.set(p.x,.45+.62*p.size,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.setScalar(p.size*1.15);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
  bodies.setColorAt(i,colour.set(p.team==='home'?home:p.team==='away'?away:neutral[p.index%4]));
  dummy.position.y=.45+1.4*p.size;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix)});
 bodies.name='FooteraStadiumVisitors';out.add(bodies,heads);track(bodies);track(heads);
 // Street lights: poles plus warm glow sprites.
 const poles=new THREE.InstancedMesh(track(new THREE.BoxGeometry(.25,7,.25)),track(new THREE.MeshLambertMaterial({color:'#3b464c'})),plan.lamps.length);
 plan.lamps.forEach(([x,z],i)=>{dummy.position.set(x,3.3,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix)});out.add(poles);track(poles);
 const glow=tex(64,64,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,246,214,1)');g.addColorStop(.25,'rgba(255,214,140,.55)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
 const lampPos=[];plan.lamps.forEach(([x,z])=>lampPos.push(x,6.9,z));
 const lg=track(new THREE.BufferGeometry());lg.setAttribute('position',new THREE.Float32BufferAttribute(lampPos,3));
 const lights=new THREE.Points(lg,track(new THREE.PointsMaterial({map:glow,size:7,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false})));lights.name='FooteraStadiumStreetLights';out.add(lights);
 // Warm pools of light on the road under each lamp.
 const pool=new THREE.InstancedMesh(track(new THREE.CircleGeometry(4.2,12)),track(new THREE.MeshBasicMaterial({map:glow,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})),plan.lamps.length);
 plan.lamps.forEach(([x,z],i)=>{dummy.position.set(x,-.12,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();pool.setMatrixAt(i,dummy.matrix)});out.add(pool);track(pool);
 // Trees and cars.
 const trees=new THREE.InstancedMesh(track(new THREE.ConeGeometry(2.4,7.5,6)),track(new THREE.MeshLambertMaterial({color:'#ffffff'})),plan.trees.length);
 plan.trees.forEach((t,i)=>{dummy.position.set(t.x,3.6*t.s,t.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(t.s);dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);trees.setColorAt(i,colour.set(['#1f3a26','#24452b','#1a3322'][i%3]))});out.add(trees);track(trees);
 const carColours=['#d7dadb','#1d2226','#8b1d22','#2a4a7a','#9aa3a8','#3c3f42','#e6e2d6','#24563a'];
 const cars=new THREE.InstancedMesh(track(new THREE.BoxGeometry(1.8,1.35,4.3)),track(new THREE.MeshLambertMaterial({color:'#ffffff'})),Math.max(1,plan.cars.length));cars.count=plan.cars.length;
 plan.cars.forEach((c,i)=>{dummy.position.set(c.x,.5,c.z);dummy.rotation.set(0,c.yaw+Math.PI/2,0);dummy.scale.setScalar(1);dummy.updateMatrix();cars.setMatrixAt(i,dummy.matrix);cars.setColorAt(i,colour.set(carColours[c.colour]))});out.add(cars);track(cars);
 // Only drawn when the camera is high above the stands (the stadium shot):
 // match cameras never see this far out, so they pay no draw calls for it.
 out.visible=false;
 return{group:out,people:plan.people.length,lamps:plan.lamps.length,trees:plan.trees.length,cars:plan.cars.length};
}
