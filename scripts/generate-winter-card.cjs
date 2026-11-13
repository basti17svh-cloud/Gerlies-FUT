// Generates the WINTER / Weihnachten card frame (1024x1536, transparent) in the same field grid as
// the Black Friday and Halloween cards (info column, name bar, five stat columns), so the same CSS vars fit.
// Usage: node scripts/generate-winter-card.cjs <eis|rot|nacht> <out.png>
const {chromium}=require('playwright');
const VARIANTS={
 eis:{base1:'#0d2a45',base2:'#04101c',line:'#bfe9ff',line2:'#7cc8ff',glow:'#9fdcff',hot:'#ffffff'},
 rot:{base1:'#5c0f1f',base2:'#1c0409',line:'#ffe08a',line2:'#ffbf3a',glow:'#ffcf5a',hot:'#fff6d8'},
 nacht:{base1:'#14204a',base2:'#05081a',line:'#ffe08a',line2:'#9fdcff',glow:'#ffd66b',hot:'#ffffff'}
};
// Pseudo-random but fixed, so the frame looks the same on every run.
function rng(seed){let s=seed;return()=>((s=(s*1103515245+12345)%2147483648)/2147483648)}
function flake(x,y,r,color,o,w=3){
 let arms='';
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,cx=Math.cos(a),cy=Math.sin(a),ex=x+cx*r,ey=y+cy*r;
  arms+=`<line x1="${x}" y1="${y}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/>`;
  for(const t of [.45,.7]){
   const bx=x+cx*r*t,by=y+cy*r*t,l=r*.26;
   for(const s of [-1,1]){const b=a+s*Math.PI/4;arms+=`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(b)*l).toFixed(1)}" y2="${(by+Math.sin(b)*l).toFixed(1)}"/>`}
  }
 }
 return `<g stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${o}">${arms}</g>`;
}
function svg(v){
 const c=VARIANTS[v];
 // outer silhouette: straight sides, ice-crystal crown at the top, pointed bottom
 const outer='M512 22 L548 70 L612 58 L640 96 L990 190 L997 200 L997 1268 L990 1280 L520 1498 L504 1498 L34 1280 L28 1268 L28 200 L34 190 L384 96 L412 58 L476 70 Z';
 const inner='M512 60 L540 98 L598 88 L620 118 L960 214 L966 222 L966 1252 L960 1262 L516 1466 L508 1466 L64 1262 L58 1252 L58 222 L64 214 L404 118 L426 88 L484 98 Z';
 const r=rng(v.length*7919+13);
 let snow='';
 for(let i=0;i<70;i++){const x=60+r()*900,y=120+r()*1300,s=1.5+r()*4.5;snow+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${c.hot}" opacity="${(.15+r()*.45).toFixed(2)}"/>`}
 const big=[[760,330,120,.18],[880,760,70,.14],[650,860,46,.16],[930,420,38,.2],[560,250,30,.16]].map(([x,y,s,o])=>flake(x,y,s,c.line,o,3.5)).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
<defs>
 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
 <linearGradient id="frost" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffffff"/><stop offset=".2" stop-color="${c.line2}"/><stop offset=".42" stop-color="${c.base1}"/><stop offset=".6" stop-color="#ffffff"/><stop offset=".82" stop-color="${c.line2}"/><stop offset="1" stop-color="#e8f6ff"/>
 </linearGradient>
 <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.base1}"/><stop offset="1" stop-color="${c.base2}"/></linearGradient>
 <radialGradient id="spot" cx=".62" cy=".24" r=".6"><stop offset="0" stop-color="${c.glow}" stop-opacity=".34"/><stop offset=".55" stop-color="${c.glow}" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>
 <linearGradient id="snowcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d6ecff"/></linearGradient>
 <clipPath id="innerClip"><path d="${inner}"/></clipPath>
</defs>
<path d="${outer}" fill="${c.glow}" opacity=".5" filter="url(#softglow)"/>
<path d="${outer}" fill="url(#frost)"/>
<path d="${inner}" fill="url(#base)"/>
<g clip-path="url(#innerClip)">
 <rect width="1024" height="1536" fill="url(#spot)"/>
 ${big}
 ${snow}
 <path d="M58 1150 C220 1110 360 1180 512 1150 C660 1120 800 1180 966 1140 L966 1470 L58 1470 Z" fill="#ffffff" opacity=".06"/>
 <rect width="1024" height="1536" fill="url(#fade)"/>
</g>
<path d="${inner}" fill="none" stroke="${c.line}" stroke-width="5" filter="url(#glow)"/>
<!-- snow on the shoulders of the frame -->
<path d="M64 214 L404 118 L420 128 C330 160 220 176 120 214 C100 222 80 224 64 222 Z" fill="url(#snowcap)" opacity=".9"/>
<path d="M960 214 L620 118 L604 128 C694 160 804 176 904 214 C924 222 944 224 960 222 Z" fill="url(#snowcap)" opacity=".9"/>
<!-- crystal at the crown -->
<g filter="url(#glow)">${flake(512,92,22,c.hot,.95,3)}</g>
<!-- info column -->
<path d="M86 216 L282 216 L312 246 L312 942 L86 942 Z" fill="#000" fill-opacity=".2" stroke="${c.line}" stroke-width="3" filter="url(#glow)"/>
<!-- name bar -->
<path d="M100 942 L924 942 L958 998 L924 1055 L100 1055 L66 998 Z" fill="#000" fill-opacity=".6" stroke="${c.line}" stroke-width="3.5" filter="url(#glow)"/>
<!-- stats box -->
<path d="M86 1055 L938 1055 L938 1236 L86 1236 Z" fill="#000" fill-opacity=".32" stroke="${c.line}" stroke-width="2" stroke-opacity=".7"/>
${[228,370,513,656,797].map(x=>`<line x1="${x}" y1="1080" x2="${x}" y2="1222" stroke="${c.line}" stroke-width="2.5" opacity=".75"/>`).join('')}
<!-- bottom emblem: snowflake in a star -->
<g transform="translate(512 1410)" filter="url(#glow)">
 <circle r="30" fill="${c.base2}" stroke="${c.line}" stroke-width="3"/>
 ${flake(0,0,20,c.hot,1,3)}
</g>
</svg>`;
}
(async()=>{
 const [v='eis',out='card.png']=process.argv.slice(2);
 if(!VARIANTS[v])throw new Error('variant: '+Object.keys(VARIANTS).join('|'));
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1536}});
 await p.setContent(`<html><body style="margin:0;background:transparent">${svg(v)}</body></html>`);
 await p.screenshot({path:out,omitBackground:true,clip:{x:0,y:0,width:1024,height:1536}});
 await b.close();
})();
