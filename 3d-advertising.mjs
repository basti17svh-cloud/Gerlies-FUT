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
export function drawPerimeterBoard(ctx,w,h,kind='footera',footeraLogo=null){
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
