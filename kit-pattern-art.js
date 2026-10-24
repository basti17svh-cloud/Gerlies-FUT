/* Original Footera signature-kit artwork. One vector recipe for editor and 3D. */
(function(root){
 'use strict';
 const designs=Object.freeze([
  {id:'volt',name:'VOLT',detail:'Blitz & Echo-Linien'},
  {id:'rift',name:'RIFT',detail:'Asymmetrische Bruchkanten'},
  {id:'prism',name:'PRISMA',detail:'Facetten & Lichtkanten'},
  {id:'topo',name:'TOPO',detail:'Fließende Höhenlinien'},
  {id:'velocity',name:'VELOCITY',detail:'Dynamische Speedlines'},
  {id:'deco',name:'DECO',detail:'Geometrischer Art-déco-Fächer'},
  {id:'orbit',name:'ORBIT',detail:'Versetzte Ringbögen'}
 ]);
 const ids=Object.freeze(designs.map(d=>d.id));
 function recipe(id,part='shirt'){
  if(!ids.includes(id))return null;
  const shapes=[];
  const poly=(points,alpha=1,ink='b')=>shapes.push({type:'poly',points,alpha,ink});
  const path=(d,width,alpha=1,ink='b')=>shapes.push({type:'path',d,width,alpha,ink});
  const rect=(x,y,w,h,alpha=1,ink='b')=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],alpha,ink);
  if(part==='sleeves'){
   rect(0,.83,1,.055);rect(0,.93,1,.025,.65);
   if(id==='volt'||id==='rift')poly([[0,.08],[1,.25],[1,.40],[0,.22]],.75);
   if(id==='prism')for(let x=0;x<1;x+=.25)poly([[x,.2],[x+.25,.35],[x,.5]],.5);
   return shapes;
  }
  if(part!=='shirt')return [];
  switch(id){
   case 'volt':
    for(let x=-.9;x<1.5;x+=.18)path([['M',x,0],['L',x+.55,1]],.004,.16);
    poly([[.65,-.04],[.29,.48],[.48,.43],[.32,1.06],[.79,.32],[.56,.39]],1);
    path([['M',.78,0],['L',.41,.54],['L',.63,.48],['L',.40,1]],.013,.72);
    path([['M',.88,0],['L',.52,.60],['L',.72,.54],['L',.52,1]],.005,.52);break;
   case 'rift':
    poly([[0,0],[.34,0],[.47,.24],[.24,.43],[.43,.69],[.19,1],[0,1]],1);
    poly([[1,.13],[.69,.36],[.86,.56],[.62,.78],[.78,1],[1,1]],.27);
    for(const shift of [.045,.075])path([['M',.34+shift,0],['L',.47+shift,.24],['L',.24+shift,.43],['L',.43+shift,.69],['L',.19+shift,1]],.008,shift===.045?.85:.35);
    poly([[.48,0],[.72,.06],[.55,.23]],.20);poly([[.47,.76],[.63,.87],[.45,1]],.22);break;
   case 'prism':
    for(let row=-1;row<6;row++)for(let col=-1;col<5;col++){
     const x=col*.30+(row%2)*.15,y=row*.24;
     poly([[x,y],[x+.30,y+.07],[x+.15,y+.27]],.13+((col*7+row*11+100)%4)*.16);
     poly([[x,y],[x+.15,y+.27],[x-.10,y+.20]],.08+((col+row+100)%3)*.1);
    }
    path([['M',.07,0],['L',.63,.34],['L',.36,.69],['L',.90,1]],.009,.90);break;
   case 'topo':
    for(let i=-4;i<16;i++){
     const y=i*.083;
     path([['M',-.2,y],['C',.05,y-.27,.25,y+.30,.46,y+.07],['C',.73,y-.25,.81,y+.22,1.20,y-.10]],i%4===0?.014:.005,i%4===0?.80:.38);
    }
    rect(.08,0,.028,1,.65);rect(.125,0,.008,1,.4);break;
   case 'velocity':
    poly([[0,0],[.32,0],[.22,.28],[0,.45]],.22);
    for(let i=0;i<9;i++){
     const y=.18+i*.083;
     path([['M',-.1,y+.20],['C',.23,y+.23,.41,y+.28,.64,y+.03],['C',.85,y-.15,.91,y-.20,1.13,y-.19]],i===2||i===3?.040:.009,i<5?.95:.30);
    }
    rect(.83,0,.055,.21,.9);break;
   case 'deco':
    for(let i=0;i<8;i++){
     const x=.06+i*.057,y=.92-i*.083;
     path([['M',x,0],['L',x,y],['L',.5,1.04-i*.051],['L',1-x,y],['L',1-x,0]],i%3===0?.015:.006,i%3===0?.95:.48);
    }
    poly([[.5,.21],[.56,.34],[.5,.47],[.44,.34]],.95);
    rect(0,.89,1,.015,.8);rect(0,.925,1,.005,.5);break;
   case 'orbit':
    for(let i=0;i<15;i++){
     const rx=.13+i*.052,ry=.11+i*.061;
     shapes.push({type:'ellipse',cx:.20,cy:.55,rx,ry,angle:-.48,width:i%4===0?.018:.006,alpha:i%4===0?.9:.30,ink:'b'});
    }
    poly([[.77,0],[1,0],[1,.24],[.86,.32]],.65);break;
  }
  return shapes;
 }
 const validColor=(v,fallback)=>/^#[a-f\d]{6}$/i.test(v||'')?v:fallback;
 function paint(ctx,kit,w,h,part='shirt'){
  const shapes=recipe(kit?.pattern,part);if(!shapes)return false;
  const a=validColor(kit.shirt||kit.shirtPrimary,'#173e42'),b=validColor(kit.shirtSecondary,'#d9f099');
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.fillStyle=a;ctx.fillRect(0,0,w,h);ctx.scale(w,h);
  ctx.lineJoin='round';ctx.lineCap='round';
  for(const s of shapes){
   ctx.globalAlpha=s.alpha;ctx.fillStyle=ctx.strokeStyle=s.ink==='a'?a:b;ctx.beginPath();
   if(s.type==='poly'){s.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
   else if(s.type==='ellipse'){ctx.ellipse(s.cx,s.cy,s.rx,s.ry,s.angle,0,Math.PI*2);ctx.lineWidth=s.width;ctx.stroke()}
   else {for(const [op,...v] of s.d){if(op==='M')ctx.moveTo(...v);else if(op==='L')ctx.lineTo(...v);else if(op==='C')ctx.bezierCurveTo(...v)}ctx.lineWidth=s.width;ctx.stroke()}
  }
  ctx.restore();return true;
 }
 function svg(id){
  const shapes=recipe(id);if(!shapes)return '';
  const ink=s=>s.ink==='a'?'var(--kit-a)':'var(--kit-b)';
  const art=shapes.map(s=>s.type==='poly'?`<polygon points="${s.points.map(p=>p.join(',')).join(' ')}" fill="${ink(s)}" opacity="${s.alpha}"/>`:s.type==='ellipse'?`<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" transform="rotate(${s.angle*180/Math.PI} ${s.cx} ${s.cy})" stroke="${ink(s)}" stroke-width="${s.width}" opacity="${s.alpha}" fill="none"/>`:`<path d="${s.d.map(p=>p.join(' ')).join(' ')}" fill="none" stroke="${ink(s)}" stroke-width="${s.width}" opacity="${s.alpha}"/>`).join('');
  return `<svg class="kit-pattern-art" aria-hidden="true" viewBox="0 0 1 1" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g stroke-linejoin="round" stroke-linecap="round">${art}</g></svg>`;
 }
 root.FooteraKitArt=Object.freeze({designs,ids,recipe,paint,svg});
 if(typeof module==='object'&&module.exports)module.exports=root.FooteraKitArt;
})(globalThis);
