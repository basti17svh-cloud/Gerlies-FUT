// Generates the TEAM OF THE YEAR card frame (1024x1536, transparent) in the same field grid as the
// Black Friday / Halloween / Winter cards (info column, name bar, five stat columns), so the same CSS vars fit.
// Usage: node scripts/generate-toty-card.cjs <blau|lorbeer|sterne> <out.png>
const {chromium}=require('playwright');
const VARIANTS={
 blau:{base1:'#0c2466',base2:'#020a24',line:'#ffd76a',line2:'#ffb52e',glow:'#ffd76a',hot:'#fffbe8',orn:'stars'},
 lorbeer:{base1:'#1d1606',base2:'#050402',line:'#ffd76a',line2:'#c9921f',glow:'#ffcc4d',hot:'#fff4cc',orn:'laurel'},
 sterne:{base1:'#241c6e',base2:'#06041a',line:'#e6ecff',line2:'#9fb4ff',glow:'#b9c8ff',hot:'#ffffff',orn:'constellation'}
};
function rng(seed){let s=seed;return()=>((s=(s*1103515245+12345)%2147483648)/2147483648)}
function star(x,y,r,fill,o=1){let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;d+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+' '+(y+Math.sin(a)*rr).toFixed(1)}return `<path d="${d}Z" fill="${fill}" opacity="${o}"/>`}
function laurel(cx,cy,side,c){
 // one branch of leaves curving up from the bottom emblem
 let g='';for(let i=0;i<9;i++){const t=i/8,a=Math.PI*(.95-.62*t),R=150,x=cx+side*Math.cos(a)*R*-1,y=cy-Math.sin(a)*R*.9+40;const rot=(side>0?-1:1)*(20+t*70);
  g+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="11" ry="26" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${c.line}" opacity="${(.55+t*.35).toFixed(2)}"/>`}
 return g;
}
function svg(v){
 const c=VARIANTS[v];
 // crown silhouette: three spikes at the top (team of the year crown), straight sides, pointed bottom
 const outer='M512 18 L560 92 L640 52 L660 120 L990 190 L997 200 L997 1268 L990 1280 L520 1498 L504 1498 L34 1280 L28 1268 L28 200 L34 190 L364 120 L384 52 L464 92 Z';
 const inner='M512 58 L552 122 L618 90 L634 146 L960 214 L966 222 L966 1252 L960 1262 L516 1466 L508 1466 L64 1262 L58 1252 L58 222 L64 214 L390 146 L406 90 L472 122 Z';
 const r=rng(v.length*104729+7);
 let dust='';for(let i=0;i<90;i++){const x=60+r()*900,y=140+r()*1300,s=.8+r()*2.6;dust+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${c.hot}" opacity="${(.12+r()*.5).toFixed(2)}"/>`}
 let orn='';
 if(c.orn==='stars'){for(const [x,y,s,o] of [[770,330,70,.16],[900,610,40,.2],[640,250,28,.22],[880,860,54,.12],[700,720,22,.2]])orn+=star(x,y,s,c.line,o)}
 if(c.orn==='laurel'){orn+=`<g opacity=".34">${laurel(700,640,-1,c)}${laurel(700,640,1,c)}</g>`;orn+=star(700,470,60,c.line,.14)}
 if(c.orn==='constellation'){const pts=[[600,260],[700,330],[820,300],[900,420],[860,560],[740,610],[650,520],[700,330]];orn+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${c.line}" stroke-width="2" opacity=".35"/>`+pts.map(([x,y])=>star(x,y,12,c.hot,.7)).join('')+[[930,780,30],[620,860,20],[880,240,18]].map(([x,y,s])=>star(x,y,s,c.line,.25)).join('')}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
<defs>
 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${c.hot}"/><stop offset=".18" stop-color="${c.line2}"/><stop offset=".4" stop-color="${c.base1}"/><stop offset=".58" stop-color="${c.hot}"/><stop offset=".8" stop-color="${c.line2}"/><stop offset="1" stop-color="${c.line}"/>
 </linearGradient>
 <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.base1}"/><stop offset="1" stop-color="${c.base2}"/></linearGradient>
 <radialGradient id="spot" cx=".62" cy=".26" r=".62"><stop offset="0" stop-color="${c.glow}" stop-opacity=".36"/><stop offset=".55" stop-color="${c.glow}" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>
 <linearGradient id="rays" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.glow}" stop-opacity="0"/><stop offset=".5" stop-color="${c.glow}" stop-opacity=".16"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></linearGradient>
 <clipPath id="innerClip"><path d="${inner}"/></clipPath>
</defs>
<path d="${outer}" fill="${c.glow}" opacity=".5" filter="url(#softglow)"/>
<path d="${outer}" fill="url(#metal)"/>
<path d="${inner}" fill="url(#base)"/>
<g clip-path="url(#innerClip)">
 <rect width="1024" height="1536" fill="url(#spot)"/>
 ${[-28,-12,6,22].map(a=>`<rect x="420" y="-200" width="180" height="1500" fill="url(#rays)" transform="rotate(${a} 680 180)"/>`).join('')}
 ${orn}
 ${dust}
 <rect width="1024" height="1536" fill="url(#fade)"/>
</g>
<path d="${inner}" fill="none" stroke="${c.line}" stroke-width="5" filter="url(#glow)"/>
<!-- crown jewels -->
<g filter="url(#glow)">${star(512,64,22,c.hot,.95)}${star(394,92,12,c.line,.9)}${star(630,92,12,c.line,.9)}</g>
<!-- info column -->
<path d="M86 216 L282 216 L312 246 L312 942 L86 942 Z" fill="#000" fill-opacity=".2" stroke="${c.line}" stroke-width="3" filter="url(#glow)"/>
<!-- name bar -->
<path d="M100 942 L924 942 L958 998 L924 1055 L100 1055 L66 998 Z" fill="#000" fill-opacity=".6" stroke="${c.line}" stroke-width="3.5" filter="url(#glow)"/>
<!-- stats box -->
<path d="M86 1055 L938 1055 L938 1236 L86 1236 Z" fill="#000" fill-opacity=".32" stroke="${c.line}" stroke-width="2" stroke-opacity=".7"/>
${[228,370,513,656,797].map(x=>`<line x1="${x}" y1="1080" x2="${x}" y2="1222" stroke="${c.line}" stroke-width="2.5" opacity=".75"/>`).join('')}
<!-- bottom emblem: star in a ring -->
<g transform="translate(512 1410)" filter="url(#glow)">
 <circle r="30" fill="${c.base2}" stroke="${c.line}" stroke-width="3"/>
 ${star(0,0,19,c.hot,1)}
</g>
</svg>`;
}
(async()=>{
 const [v='blau',out='card.png']=process.argv.slice(2);
 if(!VARIANTS[v])throw new Error('variant: '+Object.keys(VARIANTS).join('|'));
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1536}});
 await p.setContent(`<html><body style="margin:0;background:transparent">${svg(v)}</body></html>`);
 await p.screenshot({path:out,omitBackground:true,clip:{x:0,y:0,width:1024,height:1536}});
 await b.close();
})();
