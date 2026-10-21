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
function sheet(images,cell=256,cols=8){
 const rows=Math.ceil(images.length/cols),out=new PNG({width:cols*cell,height:rows*cell});
 out.data.fill(40);
 images.forEach((img,k)=>{if(!img)return;const ox=(k%cols)*cell,oy=Math.floor(k/cols)*cell;
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   const sx=Math.floor(x*img.width/cell),sy=Math.floor(y*img.height/cell),s=(sy*img.width+sx)*4,d=((oy+y)*out.width+ox+x)*4;
   const a=img.data[s+3]/255,grid=(x%(cell/10)===0||y%(cell/10)===0);
   for(let c=0;c<3;c++)out.data[d+c]=grid?(c===0?255:90):Math.round(img.data[s+c]*a+60*(1-a));out.data[d+3]=255}});
 return PNG.sync.write(out);
}
(async()=>{
 const list=players();
 if(process.env.SHEET){
  const n=Number(process.env.SHEET)||48,pick=list.slice(0,n);
  const imgs=await pool(pick,8,p=>fetchPNG(p.player_face_url));
  console.log('sizes',imgs.slice(0,3).map(i=>i&&i.width+'x'+i.height),'missing',imgs.filter(x=>!x).length);
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  fs.writeFileSync(path.join(root,'qa/looks-sheet.png'),sheet(imgs));
  fs.writeFileSync(path.join(root,'qa/looks-sheet.txt'),pick.map((p,i)=>i+' '+p.player_id+' '+(p.common_name||p.short_name)).join('\n'));
  return;
 }
})().catch(e=>{console.error(e);process.exit(1)});
