// Generates the TEAM OF THE YEAR card frame (1024x1536, transparent) in midnight blue, in the same field grid as
// the Black Friday / Halloween / Winter cards (info column, name bar, five stat columns), so the same CSS vars fit.
// Basti 2026-11-13: "zu langweilig, muss besonders sein, Farbe midnight blue" -> three richer midnight-blue drafts.
// Usage: node scripts/generate-toty-card.cjs <krone|galaxie|kristall> <out.png>
const {chromium}=require('playwright');
const MIDNIGHT={base1:'#132a6b',base2:'#030924',deep:'#01040f'};
const VARIANTS={
 krone:{...MIDNIGHT,line:'#ffd76a',line2:'#ffb52e',glow:'#ffd76a',hot:'#fffbe8',edge:'gold'},
 galaxie:{...MIDNIGHT,line:'#9fe3ff',line2:'#ffd76a',glow:'#7fc8ff',hot:'#ffffff',edge:'holo'},
 kristall:{...MIDNIGHT,line:'#dbe8ff',line2:'#ffd76a',glow:'#a9c6ff',hot:'#ffffff',edge:'silver'}
};
function rng(seed){let s=seed;return()=>((s=(s*1103515245+12345)%2147483648)/2147483648)}
function star(x,y,r,fill,o=1,inner=.42,points=5){let d='';for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,rr=i%2?r*inner:r;d+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+' '+(y+Math.sin(a)*rr).toFixed(1)}return `<path d="${d}Z" fill="${fill}" opacity="${o}"/>`}
function sparkle(x,y,r,fill,o=1){return star(x,y,r,fill,o,.16,4)}
const OUTER='M512 10 L566 84 L654 40 L676 118 L992 186 L1000 198 L1000 1270 L992 1282 L520 1502 L504 1502 L32 1282 L24 1270 L24 198 L32 186 L348 118 L370 40 L458 84 Z';
const INNER='M512 58 L556 120 L626 86 L642 148 L960 214 L966 222 L966 1252 L960 1262 L516 1466 L508 1466 L64 1262 L58 1252 L58 222 L64 214 L382 148 L398 86 L468 120 Z';
function background(v,c,r){
 if(v==='krone'){
  // sunburst rays behind the portrait + giant faint TOTY lettering + gold filigree corners
  let rays='';for(let i=0;i<36;i++){const a=i*10;rays+=`<path d="M680 420 L${(680+Math.cos(a*Math.PI/180-0.05)*1400).toFixed(0)} ${(420+Math.sin(a*Math.PI/180-0.05)*1400).toFixed(0)} L${(680+Math.cos(a*Math.PI/180+0.05)*1400).toFixed(0)} ${(420+Math.sin(a*Math.PI/180+0.05)*1400).toFixed(0)} Z" fill="${c.line}" opacity="${i%2?.05:.11}"/>`}
  const fil=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s} 1)" fill="none" stroke="${c.line}" stroke-width="3" opacity=".55"><path d="M0 0 C40 0 60 20 60 60 C60 30 90 20 120 30"/><path d="M0 0 C0 40 20 60 60 60 C30 60 20 90 30 120"/><circle cx="60" cy="60" r="7" fill="${c.line}"/></g>`;
  return `${rays}<text x="512" y="1150" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="330" fill="${c.line}" opacity=".1" letter-spacing="-10">TOTY</text>${fil(76,234,1)}${fil(948,234,-1)}`;
 }
 if(v==='galaxie'){
  let stars='';for(let i=0;i<240;i++){const x=40+r()*940,y=100+r()*1350,s=.6+r()*2.4;stars+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#fff" opacity="${(.2+r()*.7).toFixed(2)}"/>`}
  let glints='';for(let i=0;i<14;i++){glints+=sparkle(80+r()*860,140+r()*1100,8+r()*18,i%3?'#ffffff':c.line2,.8)}
  return `<ellipse cx="700" cy="420" rx="520" ry="260" fill="url(#nebA)" transform="rotate(-24 700 420)"/><ellipse cx="300" cy="900" rx="460" ry="200" fill="url(#nebB)" transform="rotate(18 300 900)"/>
   <path d="M-40 760 C200 600 420 700 620 520 C780 380 900 360 1080 240" stroke="url(#holo)" stroke-width="90" fill="none" opacity=".18"/>${stars}${glints}`;
 }
 // kristall: faceted diamond pattern with light catching a few facets
 let facets='';const cols=9,rows=13;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const cx=x*128+(y%2?64:0),cy=90+y*110,l=r();
  facets+=`<path d="M${cx} ${cy-60} L${cx+64} ${cy} L${cx} ${cy+60} L${cx-64} ${cy} Z" fill="${l>.86?c.line:'#7da2ff'}" opacity="${l>.86?(.1+r()*.12).toFixed(2):(.02+l*.06).toFixed(2)}" stroke="${c.line}" stroke-opacity=".12" stroke-width="2"/>`}
 let glints='';for(let i=0;i<10;i++)glints+=sparkle(90+r()*840,150+r()*1050,10+r()*20,'#ffffff',.85);
 return `${facets}<path d="M620 120 L980 120 L760 980 L420 980 Z" fill="url(#beam)" opacity=".5"/>${glints}`;
}
function svg(v){
 const c=VARIANTS[v],r=rng(v.length*104729+11);
 const edgeFill=c.edge==='holo'?'url(#holo)':c.edge==='silver'?'url(#silver)':'url(#metal)';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
<defs>
 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".16" stop-color="#ffb52e"/><stop offset=".33" stop-color="#7a4b0c"/><stop offset=".5" stop-color="#ffe9a3"/><stop offset=".68" stop-color="#c98a1c"/><stop offset=".84" stop-color="#fff2c0"/><stop offset="1" stop-color="#a8700f"/></linearGradient>
 <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".2" stop-color="#8fa9d9"/><stop offset=".38" stop-color="#2b3f7a"/><stop offset=".55" stop-color="#f4f8ff"/><stop offset=".72" stop-color="#ffd76a"/><stop offset=".86" stop-color="#9fb4e8"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
 <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cf6ff"/><stop offset=".2" stop-color="#8a7dff"/><stop offset=".38" stop-color="#ff7ad9"/><stop offset=".55" stop-color="#ffe27a"/><stop offset=".72" stop-color="#7affc1"/><stop offset=".88" stop-color="#7cc4ff"/><stop offset="1" stop-color="#c79bff"/></linearGradient>
 <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.base1}"/><stop offset=".55" stop-color="${c.base2}"/><stop offset="1" stop-color="${c.deep}"/></linearGradient>
 <radialGradient id="spot" cx=".64" cy=".27" r=".55"><stop offset="0" stop-color="${c.glow}" stop-opacity=".5"/><stop offset=".5" stop-color="${c.glow}" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <radialGradient id="nebA"><stop offset="0" stop-color="#5b7bff" stop-opacity=".55"/><stop offset=".5" stop-color="#7a3cff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <radialGradient id="nebB"><stop offset="0" stop-color="#2fd0ff" stop-opacity=".35"/><stop offset=".6" stop-color="#1b4bff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".45"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></linearGradient>
 <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".58" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></linearGradient>
 <clipPath id="innerClip"><path d="${INNER}"/></clipPath>
</defs>
<path d="${OUTER}" fill="${c.glow}" opacity=".6" filter="url(#softglow)"/>
<path d="${OUTER}" fill="${edgeFill}"/>
<path d="${OUTER}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
<path d="${INNER}" fill="url(#base)"/>
<g clip-path="url(#innerClip)">
 ${background(v,c,r)}
 <rect width="1024" height="1536" fill="url(#spot)"/>
 <rect width="1024" height="1536" fill="url(#fade)"/>
</g>
<path d="${INNER}" fill="none" stroke="${c.line}" stroke-width="6" filter="url(#glow)"/>
<!-- second inner rule and shoulder jewels -->
<path d="${INNER}" fill="none" stroke="${edgeFill}" stroke-width="3" transform="translate(512 760) scale(.955 .965) translate(-512 -760)" opacity=".9"/>
${[[64,214],[960,214],[58,1252],[966,1252]].map(([x,y])=>`<g filter="url(#glow)"><path d="M${x} ${y-22} L${x+16} ${y} L${x} ${y+22} L${x-16} ${y} Z" fill="${c.hot}" stroke="${c.line2}" stroke-width="3"/></g>`).join('')}
<!-- ornate wings on both shoulders -->
${[1,-1].map(sd=>`<g transform="translate(${sd>0?330:694} 150) scale(${sd} 1)" fill="none" stroke="${edgeFill}" stroke-width="7" stroke-linecap="round" filter="url(#glow)"><path d="M0 0 C-60 -6 -120 10 -190 46"/><path d="M-10 18 C-70 18 -120 36 -170 70"/><path d="M-22 36 C-70 40 -100 56 -140 88"/></g>`).join('')}
<!-- crown with three stars -->
<g filter="url(#glow)">${star(512,54,30,'#fffbe8',1)}${star(372,82,16,c.line2,.95)}${star(652,82,16,c.line2,.95)}${sparkle(512,54,52,'#ffffff',.6)}</g>
<!-- info column -->
<path d="M86 216 L282 216 L312 246 L312 942 L86 942 Z" fill="#000" fill-opacity=".25" stroke="${c.line}" stroke-width="3" filter="url(#glow)"/>
<!-- name bar -->
<path d="M100 942 L924 942 L958 998 L924 1055 L100 1055 L66 998 Z" fill="#020818" fill-opacity=".78" stroke="${c.line}" stroke-width="4" filter="url(#glow)"/>
<!-- stats box -->
<path d="M86 1055 L938 1055 L938 1236 L86 1236 Z" fill="#020818" fill-opacity=".45" stroke="${c.line}" stroke-width="2" stroke-opacity=".7"/>
${[228,370,513,656,797].map(x=>`<line x1="${x}" y1="1080" x2="${x}" y2="1222" stroke="${c.line}" stroke-width="2.5" opacity=".75"/>`).join('')}
<!-- bottom emblem: TOTY star medal -->
<g transform="translate(512 1404)" filter="url(#glow)">
 <circle r="38" fill="${c.deep}" stroke="${edgeFill}" stroke-width="6"/>
 ${star(0,0,24,'#fffbe8',1)}
</g>
</svg>`;
}
(async()=>{
 const [v='krone',out='card.png']=process.argv.slice(2);
 if(!VARIANTS[v])throw new Error('variant: '+Object.keys(VARIANTS).join('|'));
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1536}});
 await p.setContent(`<html><body style="margin:0;background:transparent">${svg(v)}</body></html>`);
 await p.screenshot({path:out,omitBackground:true,clip:{x:0,y:0,width:1024,height:1536}});
 await b.close();
})();
