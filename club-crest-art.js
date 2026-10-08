/* Footera V21.29 — Vereinswappen: metallic SVG renderer and bespoke emblem artwork. */
(function(){
 "use strict";
 const GLYPHS={
 star:'<path d="M32 4 40 23 61 25 45 39 50 60 32 49 14 60 19 39 3 25 24 23Z"/><path d="M32 10v11M5 12l9 9M59 12l-9 9"/>',
 ball:'<circle cx="32" cy="32" r="25"/><path d="m32 17 13 9-5 15H24l-5-15zM19 26 8 23m37 3 11-3M24 41l-8 12m24-12 8 12M32 17V7M9 36l15 5m16 0 15-5"/>',
 bolt:'<path d="M36 3 12 36h19l-4 25 26-37H33Z"/><path d="m8 20 10-9M48 51l8-10"/>',
 diamond:'<path d="m17 12 15-8 15 8 12 20-27 28L5 32Z"/><path d="m17 12 15 16 15-16M5 32h54M32 28v32M22 7l-8 4M42 7l8 4"/>',
 crown:'<path d="M8 48 4 16l16 11L32 7l12 20 16-11-4 32Z"/><path d="M9 54h46M14 43h36M20 32l5 9 7-6 7 6 5-9"/><circle cx="4" cy="14" r="3"/><circle cx="32" cy="5" r="3"/><circle cx="60" cy="14" r="3"/>',
 f:'<path d="M15 8h38l-5 11H29v10h17l-5 10H29v16H15Z"/><path d="m34 12 13 0M9 56l8-10"/>',
 lion:'<path d="M18 15 9 9l1 15-6 8 8 11 1 12 11-5 8 10 8-10 11 5 1-12 8-11-6-8 1-15-11 6-12-8Z"/><path d="M19 27 26 18l6 7 6-7 7 9-4 18-9 7-9-7Z"/><path d="M21 32h6m10 0h6M29 41h6l-3 4Z"/>',
 wolf:'<path d="M10 5 26 18 32 10l6 8L54 5l-3 24 8 9-11 6-6 12-10 4-10-4-6-12-11-6 8-9Z"/><path d="m16 31 12 6-6 4m26-10-12 6 6 4M27 48l5-3 5 3-5 6Z"/>',
 flame:'<path d="M34 3c3 11-9 16-3 28 8-7 12-16 9-21 25 22 25 42 6 50-25 10-44-5-38-25 4-12 13-15 15-26 6 8 4 18 2 22"/><path d="M31 58c-9-10-4-17 4-24-1 9 9 10 9 17 0 8-8 11-13 7Z"/>',
 trophy:'<path d="M19 8h26v19c0 11-5 16-13 16S19 38 19 27ZM20 13H7v10c0 9 8 13 16 12M44 13h13v10c0 9-8 13-16 12M32 43v10M22 54h20v5H22Z"/><path d="m30 16 4 7-7 5"/>',
 anchor:'<path d="M32 10v44M18 29h28M25 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0ZM8 40c-2 22 46 22 48 0M8 40l-5 7m5-7 7 3m41-3 5 7m-5-7-7 3"/>',
 castle:'<path d="M10 57V19h8v-9h9v9h10v-9h9v9h8v38Z"/><path d="M22 57V40q10-12 20 0v17M10 27h44M23 10V5m18 5V5M16 33h6m20 0h6"/>',
 sun:'<circle cx="32" cy="32" r="13"/><path d="M32 3v12M32 49v12M3 32h12m34 0h12M11 11l9 9m24 24 9 9m0-42-9 9M20 44l-9 9"/><path d="M24 31q8-9 16 0"/>',
 moon:'<path d="M44 7C21-1 4 22 10 42c6 21 33 28 49 8C35 53 21 24 44 7Z"/><path d="m45 12 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z"/>',
 cross:'<path d="M24 5h16v19h19v16H40v19H24V40H5V24h19Z"/><path d="M30 11v14m0 14v15M11 30h15m14 0h14"/>',
 comet:'<path d="m42 6 4 17 14 9-16 5-8 20-6-17-18-8 18-6Z"/><path d="M4 10 25 22M3 25l18 4M10 49l19-13"/>',
 skull:'<path d="M14 30c-6-25 12-28 18-28s24 3 18 28l-5 9v13H19V39Z"/><circle cx="23" cy="32" r="6"/><circle cx="41" cy="32" r="6"/><path d="m32 40-4 5h8ZM22 53v7m10-7v7m10-7v7"/>',
 bull:'<path d="M19 14C10 8 9 4 5 4 2 18 12 24 21 23M45 14c9-6 10-10 14-10 3 14-7 20-16 19"/><path d="M18 20 32 12l14 8 4 22-10 16H24L14 42Z"/><path d="m20 32 9 3m15-3-9 3M26 47l6-6 6 6-6 8Z"/>',
 bear:'<path d="M16 18C8 1 2 11 9 25M48 18C56 1 62 11 55 25"/><path d="M17 17 32 10l15 7 9 16-7 19-17 9-17-9-7-19Z"/><path d="M17 32h11m8 0h11M25 44l7-4 7 4-7 10Z"/>',
 fox:'<path d="M5 6 24 21 32 16l8 5L59 6l-6 28-21 26L11 34Z"/><path d="m15 32 12 3m22-3-12 3M25 46l7 3 7-3-7 9Z"/><path d="m20 20 12 8 12-8"/>',
 horse:'<path d="m17 60 4-16-8-14 7-18 8 3 6-10 13 12 5 18-9 9v16Z"/><path d="m20 18 10 7-4 13m12-10h7m-6 13-12 5M21 55h28"/>',
 dragon:'<path d="M14 56 8 39l14-9-5-13 14 4 5-17 7 16 13 7-8 9-4 15-12 10Z"/><path d="m10 37 12 6 7-11 11 6 12-9M35 28h7M16 56l14-10m16-5 12-8"/>',
 shark:'<path d="M4 39 25 30l7-22 10 19 18 8-11 8-10-3-6 13-12-10-17 2Z"/><path d="M40 35h2M16 40l8 5M53 33l7-6"/>',
 snake:'<path d="M45 6C21 0 12 21 28 27c20 7 26 5 23 18-2 9-14 15-24 9C16 48 8 46 5 53"/><path d="m40 9 10-4 9 6-2 10-9 1-7-7M51 22l5 7 6-4M42 13h1"/>',
 owl:'<path d="M13 18 7 7l18 7 7-8 7 8 18-7-6 11v26L32 60 13 44Z"/><circle cx="23" cy="31" r="9"/><circle cx="41" cy="31" r="9"/><path d="m32 34-5 8 5 7 5-7ZM12 46l9 6m31-6-9 6"/>',
 scorpion:'<path d="M20 25 32 14l12 11-5 18-7 9-7-9Z"/><path d="M20 30 8 19 3 25l9 13 13-3m19-5 12-11 5 6-9 13-13-3M32 14V7C32-3 52 1 53 15l-3 9-9 1"/><path d="m20 43-9 6m15-1-5 11m18-11 5 11m-1-16 9 6"/>',
 swords:'<path d="M5 6 39 40m20-34L25 40M13 13 8 22m48-9-3 9M15 38l11-10m23 10L38 28M34 41l-7 7-5 12-12-12 12-5 7-7m1 0 7 7 5 12 12-12-12-5-7-7"/>',
 shieldmark:'<path d="M32 4 55 12v21c0 14-9 22-23 27C18 55 9 47 9 33V12Z"/><path d="M32 11v39m-14-30 14-4 14 4m-28 7 14-4 14 4"/>',
 fleur:'<path d="M32 5c-15 11-12 26 0 32 12-6 15-21 0-32ZM19 37C5 10-4 30 10 43c8 5 16 1 22-6 6 7 14 11 22 6 14-13 5-33-9-6"/><path d="M16 47h32M22 54h20M32 37v17"/>',
 gear:'<path d="m27 4 10 0 2 8 7 3 7-4 7 9-5 7 1 9 5 7-7 9-8-4-7 4-2 8H27l-2-8-7-4-8 4-7-9 5-7-1-9-5-7 7-9 7 4 7-3Z"/><circle cx="32" cy="32" r="11"/>',
 mountain:'<path d="m3 55 22-39 12 19 8-12 16 32Z"/><path d="m15 37 10-21 7 12m7 8 6-13 7 17M12 59h43M8 45l6-4"/>',
 trident:'<path d="M32 5v52M20 57h24M10 12c-3 24 7 27 22 27 15 0 25-3 22-27M10 12l-6 8m6-8 7 7M54 12l-7 7m7-7 6 8M32 5l-7 12h14Z"/>',
 target:'<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="16"/><circle cx="32" cy="32" r="6"/><path d="m37 27 23-23m-3 0h3v9M4 55l7-7"/>',
 waves:'<path d="M4 14c8-8 16 8 24 0s16-8 24 0m-48 14c8-8 16 8 24 0s16-8 24 0M4 42c8-8 16 8 24 0s16-8 24 0"/><path d="m9 55 9-4m28-1 9 4"/>',
 ram:'<path d="M22 23C10 4 0 20 9 34c5 8 13 5 16 1M42 23C54 4 64 20 55 34c-5 8-13 5-16 1"/><path d="m22 19 10-8 10 8 6 19-8 19H24l-8-19Z"/><path d="m21 35 9 3m13-3-9 3m-7 9 5-5 5 5-5 7Z"/>'
 };
 const SHAPES={
  shield:"M28 10H172L190 38 176 164Q167 198 100 230 33 198 24 164L10 38Z",
  round:"M100 9C150 9 190 47 190 109c0 57-36 106-90 122C46 215 10 166 10 109 10 47 50 9 100 9Z",
  hex:"M48 9H152L188 56V165L100 231 12 165V56Z",
  point:"M25 9H175L190 39 156 165 100 232 44 165 10 39Z",
  modern:"M35 9H188L176 166 100 231 12 184 9 48Z"
 };
 const SCALES={thin:.94,medium:.915,strong:.885,massive:.85};
 let counter=0;
 function escapeText(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
 function emblemIcon(symbol,mini){
  if(symbol==="eagle")return '<span class="crest-eagle-symbol" aria-hidden="true">🦅</span>';
  return '<svg class="crest-vector-icon'+(mini?' crest-vector-icon-mini':'')+'" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(GLYPHS[symbol]||GLYPHS.star)+'</svg>';
 }
 function render(crest,mini){
  const c=crest||{};
  // The eagle continues to use its unchanged original emoji; all 35 other glyphs are SVG.
  const safeSymbol=c.symbol==="eagle"?"eagle":GLYPHS[c.symbol]?c.symbol:"star";
  const shape=SHAPES[c.shape]||SHAPES.shield,scale=SCALES[c.borderWidth]||SCALES.medium;
  const inner=scale-.050,uid="footera-crest-"+(++counter);
  const colors={primary:c.primary||"#d8ff3e",secondary:c.secondary||"#173627",accent:c.accent||"#ffffff",border:c.borderColor||c.primary||"#d8ff3e"};
  const initials=String(c.initials||"F").slice(0,5),labelSize=initials.length===5?24:initials.length===4?27:30;
  const layer=(s,fill,extra)=>'<path d="'+shape+'" transform="translate(100 120) scale('+s+') translate(-100 -120)" fill="'+fill+'" '+(extra||'')+'/>';
  const centerIcon=safeSymbol==="eagle"?'<text x="100" y="141" font-size="53" text-anchor="middle" aria-hidden="true">🦅</text>':
   '<svg x="58" y="86" width="84" height="77" viewBox="0 0 64 64" color="'+colors.accent+'" aria-hidden="true">'+
   '<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">'+GLYPHS[safeSymbol]+'</g></svg>';
  const star=(x,y,size)=>'<path d="M'+x+' '+(y-size)+'l'+(size*.26)+' '+(size*.71)+' '+(size*.76)+' '+(size*.05)+'-'+(size*.59)+' '+(size*.50)+' '+(size*.19)+' '+(size*.72)+'-'+(size*.62)+'-'+(size*.4)+'-'+(size*.62)+' '+(size*.4)+' '+(size*.19)+'-'+(size*.72)+'-'+(size*.59)+'-'+(size*.5)+' '+(size*.76)+'-'+(size*.05)+'Z" fill="url(#'+uid+'-metal)" stroke="#fff" stroke-width=".8"/>';
  const leaves=(right)=>{
   const dir=right?1:-1,x=right?160:40;
   let marks='<path d="M'+x+' 89 Q'+(x-12*dir)+' 116 '+(x-5*dir)+' 160" fill="none" stroke="url(#'+uid+'-metal)" stroke-width="3"/>';
   for(let i=0;i<5;i++){const y=94+i*13,dx=right?-1:1;const bx=x+(i%2?5:-5)*dx;marks+='<path d="M'+bx+' '+y+' q'+(10*dx)+' -12 '+(13*dx)+' -11 q'+(-1*dx)+' 12 '+(-13*dx)+' 16Z" fill="url(#'+uid+'-metal)" opacity=".93"/>'}
   return marks;
  };
  return '<span class="club-crest shape-'+escapeText(c.shape||"shield")+' border-'+escapeText(c.borderWidth||"medium")+(mini?' kit-badge-mini':'')+'" style="--crest-primary:'+colors.primary+';--crest-secondary:'+colors.secondary+';--crest-accent:'+colors.accent+';--crest-border:'+colors.border+'" role="img" aria-label="Vereinswappen '+escapeText(initials)+'">'+
   '<svg class="club-crest-art" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+
   '<defs><linearGradient id="'+uid+'-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" offset="0"/><stop stop-color="#9aabb7" offset=".15"/><stop stop-color="'+colors.border+'" offset=".27"/><stop stop-color="#f8fcff" offset=".41"/><stop stop-color="#56636e" offset=".58"/><stop stop-color="'+colors.border+'" offset=".73"/><stop stop-color="#f3f6fa" offset=".86"/><stop stop-color="#677681" offset="1"/></linearGradient>'+
   '<linearGradient id="'+uid+'-face" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="'+colors.secondary+'" offset="0"/><stop stop-color="'+colors.primary+'" offset=".38"/><stop stop-color="'+colors.secondary+'" offset="1"/></linearGradient>'+
   '<linearGradient id="'+uid+'-plaque" x1="0" y1="0" x2=".95" y2="1"><stop stop-color="'+colors.primary+'" offset="0"/><stop stop-color="'+colors.secondary+'" offset=".48"/><stop stop-color="'+colors.secondary+'" offset="1"/></linearGradient></defs>'+
   '<path d="'+shape+'" fill="url(#'+uid+'-metal)" stroke="#f3f7ff" stroke-width="1.5"/>'+
   layer(scale,colors.border,'stroke="#0a1018" stroke-width="2.2"')+
   layer(inner,'url(#'+uid+'-face)','stroke="url(#'+uid+'-metal)" stroke-width="2.8"')+
   '<path d="M32 34Q65 22 100 21Q139 23 170 36" fill="none" stroke="#fff" stroke-opacity=".30" stroke-width="2"/>'+
   '<path d="M100 66 147 82V125Q145 155 100 171 55 155 53 125V82Z" fill="url(#'+uid+'-metal)" stroke="#0b1720" stroke-width="3"/>'+
   '<path d="M100 73 139 88V122Q137 147 100 162 63 147 61 122V88Z" fill="url(#'+uid+'-plaque)" stroke="'+colors.accent+'" stroke-opacity=".35" stroke-width="1.6"/>'+
   '<g opacity=".92">'+leaves(false)+leaves(true)+'</g>'+
   star(69,52,8)+star(100,45,11)+star(131,52,8)+
   centerIcon+
   '<path d="M27 175 42 171H158L173 175 165 211 100 224 35 211Z" fill="#080b14" stroke="url(#'+uid+'-metal)" stroke-width="4"/>'+
   '<path d="M31 180 44 178H156L169 180 162 205 100 217 38 205Z" fill="url(#'+uid+'-plaque)" stroke="'+colors.accent+'" stroke-opacity=".36" stroke-width="1.2"/>'+
   '<path d="M46 183H154" stroke="#fff" stroke-opacity=".28" stroke-width="1.2"/>'+
   '<text x="100" y="202" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="'+labelSize+'" letter-spacing="1.1" text-anchor="middle" paint-order="stroke fill" stroke="#070b12" stroke-width="3.6" fill="#fff">'+escapeText(initials)+'</text>'+
   '</svg></span>';
 }
 function enhanceOptions(host){
  if(!host)return;
  host.querySelectorAll("[data-crest-symbol]").forEach(button=>{
   if(button.dataset.crestArtReady==="1")return;
   const id=button.dataset.crestSymbol,label=button.textContent.trim().split(/\s+/).slice(1).join(" ")||(id==="f"?"Footera":"Symbol");
   button.innerHTML='<span class="crest-option-art">'+emblemIcon(id,true)+'</span><span class="crest-option-name">'+escapeText(label)+'</span>';
   button.dataset.crestArtReady="1";
  });
 }
 window.FooteraCrestArt={render,emblemIcon,enhanceOptions,keys:Object.freeze(Object.keys(GLYPHS).concat("eagle"))};
})();
