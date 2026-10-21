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
  const [from,count]=String(process.env.SHEET).split(':').map(Number),pick=count?list.slice(from,from+count):list.slice(0,from||48);
  const imgs=await pool(pick,8,p=>fetchPNG(p.player_face_url));
  console.log('sizes',imgs.slice(0,3).map(i=>i&&i.width+'x'+i.height),'missing',imgs.filter(x=>!x).length);
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  const ms=imgs.map(measure);
  for(let k=0;k*48<imgs.length;k++)fs.writeFileSync(path.join(root,`qa/looks-sheet-${k+1}.png`),sheet(imgs.slice(k*48,k*48+48),256,8,ms.slice(k*48,k*48+48)));
  fs.writeFileSync(path.join(root,'qa/looks-sheet.txt'),pick.map((p,i)=>{i+=(count?from:0);const m=ms[i-(count?from:0)]||{};return[i,p.player_id,p.common_name||p.short_name,'skinL',Math.round(m.skinL),'hairL',Math.round(m.hairL),'hairSkin',Math.round(m.hairSkin),'chinL',Math.round(m.chinL),'top',(m.top||0).toFixed(3),'skin',m.skin,'hair',m.hair].join(' ')}).join('\n'));
  return;
 }
 // Full run: measure every men's portrait, calibrate the cut-offs on the
 // hand-set looks in player-looks.js and write a 4-character code per player.
 const hand=Object.fromEntries([...fs.readFileSync(path.join(root,'player-looks.js'),'utf8').matchAll(/'(\d+)':'([1-6][kfrax][SDBLGPRYW][nvm])'/g)].map(m=>[m[1],m[2]]));
 const minOvr=Number(process.env.MIN_OVR||0),todo=list.filter(p=>Number(p.overall)>=minOvr);
 let done=0;
 const ms=await pool(todo,16,async p=>{const m=measure(await fetchPNG(p.player_face_url));if(++done%1000===0)console.log('measured',done);return m});
 const labelled=todo.map((p,i)=>[hand[p.player_id],ms[i]]).filter(([c,m])=>c&&m&&m.hair);
 const centroid=(key,pick)=>{const g={};for(const [c,m] of labelled){const k=c[key];(g[k]||(g[k]=[])).push(pick(m))}
  return Object.fromEntries(Object.entries(g).map(([k,v])=>[k,v[0].map((_,j)=>v.map(x=>x[j]).sort((a,b)=>a-b)[v.length>>1])]))};
 const nearest=(cents,v)=>Object.entries(cents).sort((a,b)=>dist3(a[1],v)-dist3(b[1],v))[0][0];
 const dist3=(a,b)=>Math.hypot(...a.map((x,j)=>x-b[j]));
 // Skin by brightness plus warmth (r-b), hair by colour, both against the hand-set medians.
 const skinKey=m=>[m.skinL,(m.skin[0]-m.skin[2])*.5,0],hairKey=m=>m.hair;
 const skinC=centroid(0,skinKey),hairC=centroid(2,hairKey);
 delete hairC.P;delete hairC.Y;delete hairC.W; // too few hand samples; dyed/grey stay hand-set only
 const beardRatio=m=>m.chinL/m.skinL;
 let best={acc:0,t:.8};for(let t=.4;t<1.05;t+=.01){const acc=labelled.filter(([c,m])=>(beardRatio(m)<t)===(c[3]!=='n')).length/labelled.length;if(acc>best.acc)best={acc,t}}
 const decide=m=>{
  if(!m||!m.hair)return null;
  const skin=nearest(skinC,skinKey(m));
  const bald=m.hairSkin<45&&Math.abs((m.hair[0]-m.hair[2])-(m.skin[0]-m.skin[2]))<25;
  return skin+(bald?'x':'k')+(bald?'S':nearest(hairC,hairKey(m)))+(beardRatio(m)<best.t?'v':'n');
 };
 const report=['labelled '+labelled.length,'beard cut '+best.t.toFixed(2)+' acc '+best.acc.toFixed(2)];
 for(const [j,name] of [[0,'skin'],[2,'hair'],[3,'beard']]){
  const ok=labelled.filter(([c,m])=>{const d=decide(m);return d&&d[j]===c[j]}).length;
  const near=j===0?labelled.filter(([c,m])=>{const d=decide(m);return d&&Math.abs(d[0]-c[0])<=1}).length:ok;
  report.push(name+' exact '+(ok/labelled.length).toFixed(2)+(j===0?' within1 '+(near/labelled.length).toFixed(2):''));
 }
 report.push('skin centroids '+JSON.stringify(skinC),'hair centroids '+JSON.stringify(hairC));
 const looks={};todo.forEach((p,i)=>{const d=decide(ms[i]);if(d)looks[p.player_id]=d});
 report.push('players '+todo.length+' coded '+Object.keys(looks).length);
 console.log(report.join('\n'));
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 fs.writeFileSync(path.join(root,'qa/looks-report.txt'),report.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'assets/player-looks.json'),JSON.stringify({version:1,source:'EA player portraits, measured by scripts/build-player-looks.cjs',looks})+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
