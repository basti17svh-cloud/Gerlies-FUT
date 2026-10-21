'use strict';
// Footera player looks from EA's own player portraits (run in GitHub Actions;
// EA's image host is not reachable from the dev sandbox).
// Usage: node scripts/build-player-looks.cjs            -> assets/player-looks.json
//        SHEET=48 node scripts/build-player-looks.cjs   -> qa/looks-sheet.png (debug grid)
const fs=require('fs'),path=require('path'),{PNG}=require(process.env.PNGJS||'pngjs');
const root=path.join(__dirname,'..');
function parseCSV(text){
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
  else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}
 if(cell||row.length){row.push(cell);rows.push(row)}
 const head=rows.shift();return rows.filter(r=>r.length===head.length).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])));
}
async function fetchPNG(url,tries=3){
 for(let t=0;t<tries;t++){
  try{const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 Footera'}});if(res.status===404)return null;if(!res.ok)throw new Error(res.status);
   return PNG.sync.read(Buffer.from(await res.arrayBuffer()))}catch(e){if(t===tries-1)return null;await new Promise(r=>setTimeout(r,500*(t+1)))}
 }
}
function players(){
 const all=parseCSV(fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8'));
 return all.filter(p=>/^Men/.test(p.gender)&&p.player_face_url).sort((a,b)=>Number(b.overall)-Number(a.overall));
}
async function pool(items,n,fn){const out=new Array(items.length);let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k],k)}}));return out}
function sheet(images,cell=256,cols=8,ms=[]){
 const rows=Math.ceil(images.length/cols),out=new PNG({width:cols*cell,height:rows*cell});
 out.data.fill(40);
 images.forEach((img,k)=>{if(!img)return;const ox=(k%cols)*cell,oy=Math.floor(k/cols)*cell;
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   const sx=Math.floor(x*img.width/cell),sy=Math.floor(y*img.height/cell),s=(sy*img.width+sx)*4,d=((oy+y)*out.width+ox+x)*4;
   const a=img.data[s+3]/255,grid=false;
   for(let c=0;c<3;c++)out.data[d+c]=grid?(c===0?255:90):Math.round(img.data[s+c]*a+60*(1-a));out.data[d+3]=255}
  // Measured skin | hair | chin as a bar along the bottom of each cell.
  const m=ms[k];if(m)[m.skin,m.hair,m.chin].forEach((col,j)=>{if(!col)return;for(let y=cell-22;y<cell;y++)for(let x=j*cell/3;x<(j+1)*cell/3-2;x++){const d=((oy+y)*out.width+ox+Math.floor(x))*4;out.data[d]=col[0];out.data[d+1]=col[1];out.data[d+2]=col[2]}});
 });
 return PNG.sync.write(out);
}
// Portrait geometry (EA 512x512 head shots, face centred): fractions of width/height.
const REGION={cheekL:[.35,.52,.42,.58],cheekR:[.58,.52,.65,.58],chin:[.44,.75,.56,.80],lip:[.44,.67,.56,.70]};
function px(img,x,y){const i=(Math.floor(y)*img.width+Math.floor(x))*4;return[img.data[i],img.data[i+1],img.data[i+2],img.data[i+3]]}
function patch(img,[x0,y0,x1,y1]){
 const out=[];for(let y=y0*img.height;y<y1*img.height;y+=2)for(let x=x0*img.width;x<x1*img.width;x+=2){const p=px(img,x,y);if(p[3]>200)out.push(p)}
 return out;
}
function median(list){if(!list.length)return null;const m=[0,1,2].map(c=>list.map(p=>p[c]).sort((a,b)=>a-b)[list.length>>1]);return m}
const lum=([r,g,b])=>.2126*r+.7152*g+.0722*b;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function measure(img){
 if(!img)return null;
 const skin=median([...patch(img,REGION.cheekL),...patch(img,REGION.cheekR)]);if(!skin)return null;
 // Top of the head: first opaque row in the centre columns.
 let top=-1;for(let y=0;y<img.height*.5&&top<0;y++)for(let x=img.width*.45;x<img.width*.55;x+=2)if(px(img,x,y)[3]>200){top=y;break}
 const hairPatch=top<0?[]:patch(img,[.44,(top/img.height)+.015,.56,(top/img.height)+.06]);
 const hair=median(hairPatch),chin=median(patch(img,REGION.chin));
 return{skin,hair,chin,top:top/img.height,skinL:lum(skin),hairL:hair?lum(hair):null,chinL:chin?lum(chin):null,hairSkin:hair?dist(hair,skin):null};
}
(async()=>{
 const list=players();
 if(process.env.SHEET){
  const n=Number(process.env.SHEET)||48,pick=list.slice(0,n);
  const imgs=await pool(pick,8,p=>fetchPNG(p.player_face_url));
  console.log('sizes',imgs.slice(0,3).map(i=>i&&i.width+'x'+i.height),'missing',imgs.filter(x=>!x).length);
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  const ms=imgs.map(measure);
  for(let k=0;k*48<imgs.length;k++)fs.writeFileSync(path.join(root,`qa/looks-sheet-${k+1}.png`),sheet(imgs.slice(k*48,k*48+48),256,8,ms.slice(k*48,k*48+48)));
  fs.writeFileSync(path.join(root,'qa/looks-sheet.txt'),pick.map((p,i)=>{const m=ms[i]||{};return[i,p.player_id,p.common_name||p.short_name,'skinL',Math.round(m.skinL),'hairL',Math.round(m.hairL),'hairSkin',Math.round(m.hairSkin),'chinL',Math.round(m.chinL),'top',(m.top||0).toFixed(3),'skin',m.skin,'hair',m.hair].join(' ')}).join('\n'));
  return;
 }
})().catch(e=>{console.error(e);process.exit(1)});
