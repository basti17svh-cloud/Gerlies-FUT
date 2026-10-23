// Sharp, centered perimeter artwork shared by the 3D stadium boards.
// The Footera crest is the game's original transparent icon-512.png, not a
// hand-drawn approximation. Its image is supplied once it has loaded.
const WIDTH=2048, HEIGHT=256;
function instagramGlyph(ctx,x,y,size){
 const gradient=ctx.createLinearGradient(x,y+size,x+size,y);
 gradient.addColorStop(0,'#ffb340');gradient.addColorStop(.38,'#f53565');
 gradient.addColorStop(.72,'#d52da0');gradient.addColorStop(1,'#7041d7');
 ctx.fillStyle=gradient;
 ctx.beginPath();ctx.roundRect(x,y,size,size,43);ctx.fill();
 ctx.strokeStyle='#ffffff';ctx.lineWidth=13;
 ctx.beginPath();ctx.roundRect(x+40,y+40,size-80,size-80,33);ctx.stroke();
 ctx.beginPath();ctx.arc(x+size/2,y+size/2,29,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x+size*.70,y+size*.30,8,0,Math.PI*2);ctx.fill();
}
// Carved jack-o'-lantern for the HALLOWEEN boards: orange body, glowing triangle eyes and grin.
function pumpkinGlyph(ctx,cx,cy,r){
 const body=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
 body.addColorStop(0,'#ffb04a');body.addColorStop(.55,'#f2700f');body.addColorStop(1,'#a33a00');
 ctx.fillStyle=body;
 for(const [dx,sx] of [[-.42,.62],[.42,.62],[0,.7]]){ctx.beginPath();ctx.ellipse(cx+dx*r,cy,sx*r,r*.86,0,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#3d5a12';ctx.fillRect(cx-r*.08,cy-r*1.08,r*.16,r*.3);
 ctx.fillStyle='#ffe27a';
 for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(cx+s*r*.16,cy-r*.08);ctx.lineTo(cx+s*r*.36,cy-r*.42);ctx.lineTo(cx+s*r*.56,cy-r*.08);ctx.fill()}
 ctx.beginPath();ctx.moveTo(cx-r*.58,cy+r*.18);ctx.lineTo(cx-r*.3,cy+r*.3);ctx.lineTo(cx-r*.15,cy+r*.18);ctx.lineTo(cx,cy+r*.32);ctx.lineTo(cx+r*.15,cy+r*.18);ctx.lineTo(cx+r*.3,cy+r*.3);ctx.lineTo(cx+r*.58,cy+r*.18);ctx.lineTo(cx+r*.36,cy+r*.58);ctx.lineTo(cx-r*.36,cy+r*.58);ctx.fill();
}
export function drawPerimeterBoard(ctx,w,h,kind='footera',footeraLogo=null){
 if(kind==='halloween'){
  ctx.save();ctx.scale(w/WIDTH,h/HEIGHT);
  const bg=ctx.createLinearGradient(0,0,WIDTH,0);bg.addColorStop(0,'#1b0a26');bg.addColorStop(.5,'#2a0f1c');bg.addColorStop(1,'#1b0a26');
  ctx.fillStyle=bg;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle='#ff7a1a';ctx.fillRect(0,0,WIDTH,7);ctx.fillStyle='#5b2a86';ctx.fillRect(0,249,WIDTH,7);
  pumpkinGlyph(ctx,150,136,92);pumpkinGlyph(ctx,WIDTH-150,136,92);
  ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.fillStyle='#ff9a3c';ctx.font='900 176px Arial, sans-serif';
  ctx.fillText('HALLOWEEN',860,137,960);
  ctx.fillStyle='#f4e6ff';ctx.font='800 92px Arial, sans-serif';
  ctx.fillText('BLUTMOND',1560,140,380);
  ctx.restore();return;
 }
 ctx.save();ctx.scale(w/WIDTH,h/HEIGHT);
 const instagram=kind==='instagram';
 ctx.fillStyle=instagram?'#fffaf8':'#0d1b24';
 ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.fillStyle=instagram?'#e83191':'#dc293d';ctx.fillRect(0,0,WIDTH,7);
 ctx.fillStyle=instagram?'#d6d9db':'#374955';ctx.fillRect(0,249,WIDTH,7);
 ctx.textBaseline='middle';ctx.textAlign='center';
 if(instagram){
  // Equal spacing: logo / handle / logo, readable from the match camera.
  instagramGlyph(ctx,58,29,198);
  instagramGlyph(ctx,WIDTH-58-198,29,198);
  ctx.fillStyle='#111e26';ctx.font='800 174px Arial, sans-serif';
  ctx.fillText('official_footera',WIDTH/2,136,1440);
 }else{
  if(footeraLogo?.complete&&footeraLogo.naturalWidth>0){
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(footeraLogo,24,12,232,232);
   ctx.drawImage(footeraLogo,WIDTH-24-232,12,232,232);
  }
  ctx.fillStyle='#f7f9f9';ctx.font='900 211px Arial, sans-serif';
  ctx.fillText('FOOTERA',WIDTH/2,137,1420);
 }
 ctx.restore();
}
