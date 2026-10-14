// Shared high-contrast perimeter advertising artwork.
export function drawPerimeterBoard(ctx,w,h,kind='footera'){
 const sx=w/2048,sy=h/256;ctx.save();ctx.scale(sx,sy);
 const instagram=kind==='instagram';
 ctx.fillStyle=instagram?'#f5f6ee':'#101f27';ctx.fillRect(0,0,2048,256);
 ctx.fillStyle=instagram?'#d62c85':'#a8ff61';ctx.fillRect(0,0,2048,8);
 ctx.fillStyle=instagram?'#d8ddd6':'#29464a';ctx.fillRect(0,248,2048,8);
 if(instagram){
  // One camera glyph per panel. Its rounded square, lens and dot stay clear
  // even when the panel is seen obliquely from the broadcast camera.
  const x=64,y=30,size=196,g=ctx.createLinearGradient(x,y+size,x+size,y);
  g.addColorStop(0,'#ffb340');g.addColorStop(.38,'#f53565');g.addColorStop(.72,'#d52da0');g.addColorStop(1,'#7041d7');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,size,size,44);ctx.fill();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=13;ctx.beginPath();ctx.roundRect(x+40,y+40,116,116,33);ctx.stroke();
  ctx.beginPath();ctx.arc(x+98,y+98,29,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x+137,y+59,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#14252a';ctx.font='800 168px Arial, sans-serif';ctx.textBaseline='middle';
  ctx.fillText('official_footera',314,139,1665);
 }else{
  ctx.fillStyle='#a8ff61';ctx.beginPath();ctx.moveTo(63,35);ctx.lineTo(242,35);ctx.lineTo(216,221);ctx.lineTo(37,221);ctx.closePath();ctx.fill();
  ctx.fillStyle='#102027';ctx.font='italic 900 158px Arial, sans-serif';ctx.textBaseline='middle';ctx.fillText('F',85,139);
  ctx.fillStyle='#f5f7ed';ctx.font='italic 900 198px Arial, sans-serif';ctx.fillText('FOOTERA',324,144,1645);
 }
 ctx.restore();
}
