/* Poster (feed 1080x1350, story 1080x1920) and reel (1080x1920, animated) HTML for the Social-Autopilot.
 * Cards come in as transparent PNG URLs rendered from the production card DOM. Footera colour is red. */
const REEL_SECONDS=9;
const THEMES={
 footera:{bg:"radial-gradient(ellipse 80% 40% at 50% 0%,rgba(227,32,43,.42),transparent 70%),linear-gradient(180deg,#160709 0%,#0b0b0e 60%,#070709 100%)",accent:"#ff3341",soft:"#ffb3b8",line:"rgba(255,70,80,.35)",glow:"rgba(255,40,50,.45)"},
 halloween:{bg:"radial-gradient(ellipse 70% 38% at 50% 0%,rgba(190,28,20,.55),transparent 70%),radial-gradient(ellipse 90% 60% at 50% 110%,rgba(120,10,10,.35),transparent 70%),linear-gradient(180deg,#1a0508 0%,#0c0306 55%,#080205 100%)",accent:"#ff3b2b",soft:"#ff9b85",line:"rgba(255,90,60,.3)",glow:"rgba(255,60,40,.5)",moon:true},
 blackfriday:{bg:"radial-gradient(ellipse 70% 38% at 50% 0%,rgba(170,255,40,.22),transparent 70%),linear-gradient(180deg,#0a0d06 0%,#050605 60%,#030303 100%)",accent:"#c6ff3d",soft:"#e4ffad",line:"rgba(198,255,61,.32)",glow:"rgba(198,255,61,.42)"},
 totw:{bg:"radial-gradient(ellipse at 50% 37%,#66532c3d,transparent 65%),linear-gradient(155deg,#1d2118 0%,#090c0a 50%,#252012 100%)",accent:"#ffd36b",soft:"#efe1b8",line:"rgba(214,184,114,.45)",glow:"rgba(219,163,57,.35)"},
 season:{bg:"radial-gradient(ellipse 70% 38% at 50% 0%,rgba(150,20,40,.55),transparent 70%),linear-gradient(180deg,#14040a 0%,#0a0307 60%,#060205 100%)",accent:"#ff4a5c",soft:"#ffb0ba",line:"rgba(255,80,100,.32)",glow:"rgba(255,50,70,.45)",moon:true}
};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
function themeOf(name){return THEMES[name]||THEMES.footera}
function baseCss(t,w,h){return `*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:#07070a}
body{font-family:Inter,"Inter Display",Arial,sans-serif;color:#fff}
#p{position:relative;overflow:hidden;width:${w}px;height:${h}px;background:${t.bg};display:flex;flex-direction:column;align-items:center}
.moon{position:absolute;left:50%;top:-260px;width:620px;height:620px;margin-left:-310px;border-radius:50%;background:radial-gradient(circle at 45% 40%,#c8392b 0%,#9c1f17 45%,#5c0d0a 75%,rgba(60,6,6,0) 100%);opacity:.5;filter:blur(2px)}
.frame{position:absolute;inset:22px;border:1.5px solid ${t.line};border-radius:4px;pointer-events:none}
.brand{position:relative;display:flex;align-items:center;gap:14px;font:800 30px Inter;letter-spacing:.32em;color:#fff}
.brand img{width:60px;height:60px;object-fit:contain}
.kicker{position:relative;font:700 24px Inter;letter-spacing:.34em;color:${t.soft};text-transform:uppercase;text-align:center}
h1{position:relative;font:900 96px/.98 "Inter Display",Inter;letter-spacing:-.01em;text-align:center;text-transform:uppercase;text-shadow:0 0 40px ${t.glow};padding:0 50px}
h1 em{font-style:normal;color:${t.accent}}
.sub{position:relative;font:800 30px/1.25 Inter;letter-spacing:.04em;color:#fff;text-transform:uppercase;text-align:center;padding:0 60px}
.rule{position:relative;width:820px;height:1px;background:linear-gradient(90deg,transparent,${t.line.replace(/[\d.]+\)$/,".9)")},transparent)}
.cards{position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:14px 8px}
.cards img{display:block;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
.sil img{filter:brightness(0) drop-shadow(0 0 22px ${t.glow}) drop-shadow(0 0 2px ${t.accent})}
.hero img{filter:drop-shadow(0 0 60px ${t.glow}) drop-shadow(0 24px 30px rgba(0,0,0,.7))}
.lines{position:relative;display:flex;flex-direction:column;gap:12px;align-items:center;padding:0 70px}
.lines div{border:2px solid ${t.line};border-radius:16px;background:rgba(0,0,0,.45);padding:14px 26px;font:700 28px/1.3 Inter;text-align:center}
.lines div b{color:${t.accent}}
.pill{position:relative;display:inline-block;padding:14px 32px;border:2px solid ${t.accent};border-radius:14px;background:rgba(0,0,0,.5);font:900 32px Inter;letter-spacing:.03em;text-transform:uppercase;box-shadow:0 0 30px ${t.glow}}
.foot{position:absolute;left:0;right:0;text-align:center}
.foot .era{font:800 28px Inter;letter-spacing:.42em;color:#fff}
.foot .line{margin-top:10px;font:700 21px Inter;letter-spacing:.06em;color:${t.soft};text-transform:uppercase}`}

/* slide: {theme, kicker, title, titleAccent, sub, pill, lines[], cards[url], layout:'grid'|'hero'|'text', silhouette} */
function posterHTML(slide,format){
 const t=themeOf(slide.theme),story=format==="story",W=1080,H=story?1920:1350;
 const n=(slide.cards||[]).length,layout=slide.layout||(n<=1?(n?"hero":"text"):"grid");
 const top=story?150:56,areaH=story?(layout==="hero"?820:980):(layout==="hero"?560:640),areaW=980;
 let cardW=0;
 if(layout==="grid"&&n){const ratio=1.45;for(let cols=1;cols<=7;cols++){const rows=Math.ceil(n/cols),w=Math.min((areaW-(cols-1)*8)/cols,(areaH-(rows-1)*14)/rows/ratio);if(w>cardW)cardW=Math.floor(w)}}
 if(layout==="hero")cardW=story?600:(slide.lines||[]).length?400:480;
 if(layout==="duo")cardW=story?430:330;
 const cards=n?`<div class="cards ${slide.silhouette?"sil":""} ${layout==="hero"?"hero":""}" style="width:${areaW}px;${layout==="grid"?`height:${areaH}px`:""}">${slide.cards.map(u=>`<img src="${esc(u)}" style="width:${cardW}px">`).join("")}</div>`:"";
 const lines=(slide.lines||[]).length?`<div class="lines">${slide.lines.map(l=>`<div>${l}</div>`).join("")}</div>`:"";
 const gap=story?34:22;
 return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(t,W,H)}
 #p{padding-top:${top}px;gap:${gap}px}
 .foot{bottom:${story?120:48}px}
 .main{position:relative;flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${story?40:26}px;padding-bottom:${story?260:150}px}
 ${layout==="text"?"h1{font-size:118px;margin-top:"+(story?260:120)+"px}":""}
 </style></head><body><div id="p">${t.moon?'<div class="moon"></div>':""}<div class="frame"></div>
 <div class="brand"><img src="assets/footera/emblem.png" alt="">FOOTERA</div>
 ${slide.kicker?`<div class="kicker">${esc(slide.kicker)}</div>`:""}
 <h1>${esc(slide.title)}${slide.titleAccent?` <em>${esc(slide.titleAccent)}</em>`:""}</h1>
 ${slide.sub?`<div class="sub">${esc(slide.sub)}</div>`:""}
 ${slide.pill?`<div class="pill">${esc(slide.pill)}</div>`:""}
 <div class="rule"></div>
 <div class="main">${cards}${lines}</div>
 <div class="foot"><div class="era">BUILD YOUR ERA</div><div class="line">Fußball-Manager fürs Handy · Link in Bio</div></div>
 </div></body></html>`
}

/* reel: {theme, kicker, title, titleAccent, sub, pill, lines[], cards[url], silhouette}. The first six cards fly in,
 * and when there are more, the whole team follows as one wall (Basti 2026-11-04: "am Ende soll das ganze Team erscheinen").
 * Timeline is paused + stepped by the renderer; reelTiming() gives its length and the beats the soundtrack hits. */
function reelTiming(reel){
 const n=(reel.cards||[]).length,wall=n>6;
 return wall?{seconds:REEL_SECONDS+3,wallAt:5.6,endAt:10.2,wall:true,cards:n}:{seconds:REEL_SECONDS,endAt:7.3,wall:false,cards:n}
}
function wallGrid(n){
 // fewest columns (= biggest cards) so that all n cards fit into ~1000 x 1380 px; a card png is ~1.43x as high as wide
 for(let cols=2;cols<=8;cols++){const gap=14,w=Math.floor((1000-(cols-1)*gap)/cols),rows=Math.ceil(n/cols);if(rows*w*1.43+(rows-1)*gap<=1380)return{cols,w}}
 return{cols:8,w:110}
}
function reelHTML(reel){
 const t=themeOf(reel.theme),W=1080,H=1920,all=reel.cards||[],tm=reelTiming(reel),cards=all.slice(0,all.length===1?1:6),n=cards.length;
 const hero=n===1,cardW=hero?560:n<=3?300:290,cols=hero?1:n<=3?n:3;
 const cardEls=cards.map((u,i)=>{const d=(hero?1.7:1.7+i*.32).toFixed(2);return `<img src="${esc(u)}" style="width:${cardW}px;animation:${hero?"heroIn 1.1s cubic-bezier(.2,.9,.25,1.15) "+d+"s both, heroFloat 5s ease-in-out "+(+d+1.1)+"s both":"cardIn .7s cubic-bezier(.2,.9,.25,1.2) "+d+"s both"}">`}).join("");
 const lines=(reel.lines||[]).slice(0,3).map((l,i)=>`<div style="animation:fadeUp .5s ease-out ${(4.9+i*.35).toFixed(2)}s both">${l}</div>`).join("");
 const E=tm.endAt,g=tm.wall?wallGrid(all.length):null,step=tm.wall?Math.min(.09,1.6/all.length):0;
 const wall=tm.wall?`<div class="wall"><div class="wk">Das ganze Team · ${all.length} Karten</div><h2>${esc(reel.title)}</h2>
 <div class="wg ${reel.silhouette?"sil":""}" style="grid-template-columns:repeat(${g.cols},${g.w}px)">${all.map((u,i)=>`<img src="${esc(u)}" style="width:${g.w}px;animation:wallIn .45s cubic-bezier(.2,.9,.3,1.25) ${(tm.wallAt+.35+i*step).toFixed(2)}s both">`).join("")}</div></div>`:"";
 return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(t,W,H)}
 #p{padding-top:150px;gap:30px}
 .cards{width:1000px;gap:22px 16px;perspective:1600px}
 .cards img{transform-origin:50% 60%}
 .cards{animation:drift 7.3s linear 0s both${tm.wall?`, out .35s ease-in ${tm.wallAt}s forwards`:""}}
 ${tm.wall?`.lines{animation:out .35s ease-in ${tm.wallAt}s forwards}`:""}
 #p>.moon{animation:moonDrift ${tm.seconds}s linear 0s both}
 .brand{animation:pop .8s cubic-bezier(.2,.9,.3,1.3) .1s both}
 .kicker{animation:fadeUp .5s ease-out .6s both}
 h1{animation:slam .55s cubic-bezier(.2,.9,.3,1) .85s both${tm.wall?`, out .35s ease-in ${tm.wallAt}s forwards`:""}}
 .sub,.pill{animation:fadeUp .5s ease-out 1.3s both${tm.wall?`, out .35s ease-in ${tm.wallAt}s forwards`:""}}
 .rule{animation:grow .6s ease-out 1.2s both}
 .flash{position:absolute;inset:0;background:${t.accent};mix-blend-mode:screen;opacity:0;animation:flash .5s ease-out 1.6s both}
 .flash2{position:absolute;inset:0;background:${t.accent};mix-blend-mode:screen;opacity:0;animation:flash .5s ease-out ${tm.wallAt||0}s both}
 .wall{position:absolute;left:0;right:0;top:120px;bottom:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0;animation:endIn .35s ease-out ${tm.wallAt||0}s both}
 .wall .wk{font:700 24px Inter;letter-spacing:.3em;color:${t.soft};text-transform:uppercase}
 .wall h2{font:900 64px/1 "Inter Display",Inter;text-transform:uppercase;text-shadow:0 0 40px ${t.glow};margin-bottom:8px}
 .wg{display:grid;gap:14px;justify-content:center;animation:drift ${(E-(tm.wallAt||0)).toFixed(2)}s linear ${tm.wallAt||0}s both}
 .wg img{display:block;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6))}
 .wg.sil img{filter:brightness(0) drop-shadow(0 0 16px ${t.glow}) drop-shadow(0 0 2px ${t.accent})}
 .end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;background:radial-gradient(circle at 50% 45%,rgba(0,0,0,.55),rgba(0,0,0,.94));animation:endIn .6s ease-out ${E}s both}
 .end img{width:300px;animation:pop .7s cubic-bezier(.2,.9,.3,1.3) ${(E+.2).toFixed(2)}s both}
 .end .word{font:900 92px Inter;letter-spacing:.24em;padding-left:.24em;animation:fadeUp .5s ease-out ${(E+.5).toFixed(2)}s both}
 .end .era{font:800 32px Inter;letter-spacing:.42em;color:${t.accent};animation:fadeUp .5s ease-out ${(E+.7).toFixed(2)}s both}
 .end .cta{font:700 28px Inter;color:#fff;opacity:.85;animation:fadeUp .5s ease-out ${(E+.9).toFixed(2)}s both}
 .foot{display:none}
 @keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
 @keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
 @keyframes slam{from{opacity:0;transform:scale(1.6);filter:blur(8px)}to{opacity:1;transform:scale(1);filter:none}}
 @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
 @keyframes flash{0%{opacity:0}20%{opacity:.35}100%{opacity:0}}
 @keyframes heroIn{from{opacity:0;transform:rotateY(-160deg) scale(.4)}to{opacity:1;transform:rotateY(0) scale(1)}}
 @keyframes heroFloat{from{transform:scale(1)}to{transform:scale(1.07)}}
 @keyframes cardIn{from{opacity:0;transform:translateY(120px) rotateX(50deg) scale(.7)}to{opacity:1;transform:none}}
 @keyframes wallIn{from{opacity:0;transform:scale(.4) translateY(60px)}to{opacity:1;transform:none}}
 @keyframes out{to{opacity:0}}
 @keyframes drift{from{transform:scale(.97)}to{transform:scale(1.05)}}
 @keyframes moonDrift{from{transform:translateY(0) scale(1)}to{transform:translateY(40px) scale(1.12)}}
 @keyframes endIn{from{opacity:0}to{opacity:1}}
 </style></head><body><div id="p">${t.moon?'<div class="moon"></div>':""}<div class="frame"></div>
 <div class="brand"><img src="assets/footera/emblem.png" alt="">FOOTERA</div>
 ${reel.kicker?`<div class="kicker">${esc(reel.kicker)}</div>`:""}
 <h1>${esc(reel.title)}${reel.titleAccent?` <em>${esc(reel.titleAccent)}</em>`:""}</h1>
 ${reel.sub?`<div class="sub">${esc(reel.sub)}</div>`:""}
 ${reel.pill?`<div class="pill">${esc(reel.pill)}</div>`:""}
 <div class="rule"></div>
 <div class="cards ${reel.silhouette?"sil":""} ${hero?"hero":""}" style="display:grid;grid-template-columns:repeat(${cols},${cardW}px);justify-content:center">${cardEls}</div>
 <div class="lines">${lines}</div>
 ${wall}
 <div class="flash"></div>${tm.wall?'<div class="flash2"></div>':""}
 <div class="end"><img src="assets/footera/emblem.png" alt=""><div class="word">FOOTERA</div><div class="era">BUILD YOUR ERA</div><div class="cta">Fußball-Manager fürs Handy · Link in Bio</div></div>
 </div></body></html>`
}
module.exports={posterHTML,reelHTML,reelTiming,REEL_SECONDS,THEMES};
