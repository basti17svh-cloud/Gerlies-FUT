// Generates the BLACK FRIDAY card frame (1024x1536, transparent) in the same field grid as
// the Halloween card (info column, name bar, five stat columns), so halloween-style CSS vars fit.
// Usage: node scripts/generate-blackfriday-card.cjs <variant> <out.png>
const {chromium}=require('playwright');
const fs=require('fs');
const VARIANTS={
 red:{neon:'#ff2a3d',neon2:'#ff7a45',hot:'#ffd0c8',tag:'#ff2a3d'},
 gold:{neon:'#ffc21a',neon2:'#ff8a00',hot:'#fff2c4',tag:'#ffc21a'},
 lime:{neon:'#d4ff2a',neon2:'#5cffb0',hot:'#f4ffd0',tag:'#d4ff2a'}
};
function svg(v){
 const c=VARIANTS[v];
 // outer silhouette: straight sides, price-tag top (with punched hole), pointed bottom
 const outer='M512 40 L560 40 L600 70 L990 190 L997 200 L997 1268 L990 1280 L520 1498 L504 1498 L34 1280 L28 1268 L28 200 L34 190 L424 70 L464 40 Z';
 const inner='M512 74 L552 74 L590 100 L960 214 L966 222 L966 1252 L960 1262 L516 1466 L508 1466 L64 1262 L58 1252 L58 222 L64 214 L434 100 L472 74 Z';
 let streaks='';
 const lines=[[120,1180,760,160,.55],[300,1240,980,420,.35],[60,820,520,120,.25],[600,1250,1000,700,.3],[180,600,470,180,.18],[700,980,980,520,.22]];
 for(const [x1,y1,x2,y2,o] of lines)streaks+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c.neon}" stroke-width="3" opacity="${o}" filter="url(#glow)"/>`;
 let carbon='';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
<defs>
 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
 <pattern id="carbon" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="16" height="16" fill="#08080a"/><rect width="8" height="8" fill="#121216"/><rect x="8" y="8" width="8" height="8" fill="#121216"/>
 </pattern>
 <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#8d8f96"/><stop offset=".45" stop-color="#2a2b30"/><stop offset=".62" stop-color="#d9dbe0"/><stop offset=".85" stop-color="#3a3b40"/><stop offset="1" stop-color="#bfc1c7"/>
 </linearGradient>
 <radialGradient id="spot" cx=".62" cy=".22" r=".55"><stop offset="0" stop-color="${c.neon}" stop-opacity=".30"/><stop offset=".55" stop-color="${c.neon2}" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".15"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient>
 <clipPath id="innerClip"><path d="${inner}"/></clipPath>
</defs>
<path d="${outer}" fill="${c.neon}" opacity=".55" filter="url(#softglow)"/>
<path d="${outer}" fill="url(#chrome)"/>
<path d="${inner}" fill="url(#carbon)"/>
<g clip-path="url(#innerClip)">
 <rect width="1024" height="1536" fill="url(#spot)"/>
 <text x="640" y="700" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="520" fill="none" stroke="${c.neon}" stroke-width="3" opacity=".10">%</text>
 ${streaks}
 <polygon points="58,1000 966,640 966,700 58,1060" fill="${c.neon}" opacity=".05"/>
 <rect width="1024" height="1536" fill="url(#fade)"/>
</g>
<path d="${inner}" fill="none" stroke="${c.neon}" stroke-width="5" filter="url(#glow)"/>
<path d="M500 0" />
<!-- price-tag punch hole at the top -->
<circle cx="512" cy="112" r="17" fill="#000" stroke="url(#chrome)" stroke-width="6"/>
<circle cx="512" cy="112" r="24" fill="none" stroke="${c.neon}" stroke-width="2.5" opacity=".9" filter="url(#glow)"/>
<!-- info column -->
<path d="M86 216 L282 216 L312 246 L312 942 L86 942 Z" fill="#000" fill-opacity=".22" stroke="${c.neon}" stroke-width="3" filter="url(#glow)"/>
<!-- name bar -->
<path d="M100 942 L924 942 L958 998 L924 1055 L100 1055 L66 998 Z" fill="#000" fill-opacity=".72" stroke="${c.neon}" stroke-width="3.5" filter="url(#glow)"/>
<!-- stats box -->
<path d="M86 1055 L938 1055 L938 1236 L86 1236 Z" fill="#000" fill-opacity=".38" stroke="${c.neon}" stroke-width="2" stroke-opacity=".7"/>
${[228,370,513,656,797].map(x=>`<line x1="${x}" y1="1080" x2="${x}" y2="1222" stroke="${c.neon}" stroke-width="2.5" opacity=".75"/>`).join('')}
<!-- bottom emblem: lightning in a tag -->
<g transform="translate(512 1418) scale(.62)" filter="url(#glow)">
 <path d="M-46 -30 L30 -30 L54 0 L30 30 L-46 30 Z" fill="#050506" stroke="${c.neon}" stroke-width="4"/>
 <circle cx="-30" cy="0" r="6" fill="${c.neon}"/>
 <path d="M14 -22 L-6 4 L8 4 L-2 24 L24 -6 L10 -6 L18 -22 Z" fill="${c.hot}"/>
</g>
</svg>`;
}
(async()=>{
 const [v='red',out='card.png']=process.argv.slice(2);
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1536}});
 await p.setContent(`<html><body style="margin:0;background:transparent">${svg(v)}</body></html>`);
 await p.screenshot({path:out,omitBackground:true,clip:{x:0,y:0,width:1024,height:1536}});
 await b.close();
})();
