/* Footera V21.30 — configurable football club badges and recolourable vector emblems. */
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
  shield:'M22 18H178V103C178 151 149 185 100 207 51 185 22 151 22 103Z',
  round:'M100 22a88 88 0 1 1 0 176 88 88 0 1 1 0-176Z',
  hex:'M100 14 184 62V158L100 206 16 158V62Z',
  point:'M30 16H170V135L100 210 30 135Z',
  modern:'M30 18H182L166 163 100 204 18 170Z',
  oval:'M100 12C146 12 175 49 175 110S146 208 100 208 25 171 25 110 54 12 100 12Z',
  diamond:'M100 8 194 110 100 212 6 110Z'
 };
 const WIDTHS={thin:2,medium:4,strong:7,massive:10};
 // Solid, cut-out club emblems remain crisp at badge size and fully recolourable.
 const EMBLEMS={
 eagle:'<path fill="currentColor" stroke="none" d="M29 18 25 13 28 7 36 7 42 13 35 15 36 23 43 17 60 7 57 19 47 27 59 22 56 32 44 37 53 35 49 43 39 43 37 48 44 56 35 53 32 61 29 53 20 56 27 48 25 43 15 43 11 35 20 37 8 32 5 22 17 27 7 19 4 7 21 17 28 23Z"/><path d="m29 30 3 13 3-13M28 12h3" stroke="var(--crest-secondary)" stroke-width="2"/>',
 lion:'<path fill="currentColor" stroke="none" d="m32 3 9 6 10-1 1 12 9 9-5 11-1 11-13 2-10 9-10-9-13-2-1-11-5-11 9-9 1-12 10 1Z"/><path fill="var(--crest-secondary)" stroke="none" d="m19 21 6-5 7 6 7-6 6 5-2 19-11 13-11-13Z"/><path d="m21 29 7 3m15-3-7 3m-9 9 5-3 5 3-5 6Zm5 6v5"/>',
 wolf:'<path fill="currentColor" stroke="none" d="M8 3 25 16 32 12 39 16 56 3 53 27 61 37 46 49 32 62 18 49 3 37 11 27Z"/><path fill="var(--crest-secondary)" stroke="none" d="m15 17 9 8-10-2Zm34 0 1 6-10 2ZM13 32l14 7-7 3Zm38 0-14 7 7 3ZM23 46l9-5 9 5-9 10Z"/>',
 bull:'<path fill="currentColor" stroke="none" d="M18 19C9 16 5 8 6 2-3 17 6 30 19 30l-3 12 10 17h12l10-17-3-12C58 30 67 17 58 2c1 6-3 14-12 17L32 12Z"/><path d="m20 32 9 4m15-4-9 4m-8 12 5-3 5 3-5 5Z" stroke="var(--crest-secondary)"/>',
 fleur:'<path fill="currentColor" stroke="none" d="M32 2C12 21 24 30 28 40 11 14-4 26 4 39c4 8 15 6 11-1 5 0 9 4 10 8H15v6h12l-5 9 10-4 10 4-5-9h12v-6H39c1-4 5-8 10-8-4 7 7 9 11 1 8-13-7-25-24 1C40 30 52 21 32 2Z"/>'
 };
 // The same vector is used in the option grid, full crest and shirt stamp.
 GLYPHS.eagle=EMBLEMS.eagle;
 const presets={
  heritage:{name:'Tradition',crest:{shape:'round',symbol:'lion',primary:'#163e32',secondary:'#0b241c',borderColor:'#d9bd78',symbolColor:'#e5c888',textColor:'#fff4d7',accent:'#d9bd78',borderWidth:'medium',field:'solid',decoration:'laurel',stars:0}},
  athletic:{name:'Athletic',crest:{shape:'shield',symbol:'eagle',primary:'#f1eadb',secondary:'#ae2132',borderColor:'#182638',symbolColor:'#182638',textColor:'#182638',accent:'#182638',borderWidth:'medium',field:'split',decoration:'none',stars:0}},
  union:{name:'Union',crest:{shape:'hex',symbol:'wolf',primary:'#123d65',secondary:'#0a2743',borderColor:'#d8e9f1',symbolColor:'#eaf5ff',textColor:'#eaf5ff',accent:'#6faed0',borderWidth:'medium',field:'stripes',decoration:'none',stars:1}},
  racing:{name:'Racing',crest:{shape:'oval',symbol:'fleur',primary:'#172343',secondary:'#25375c',borderColor:'#d5b573',symbolColor:'#e6c785',textColor:'#f5e6bc',accent:'#d5b573',borderWidth:'thin',field:'solid',decoration:'none',stars:0}},
  city:{name:'City',crest:{shape:'round',symbol:'castle',primary:'#8b2637',secondary:'#561c2a',borderColor:'#e7dac5',symbolColor:'#e7dac5',textColor:'#fff7eb',accent:'#e7dac5',borderWidth:'strong',field:'solid',decoration:'none',stars:0}},
  dynamo:{name:'Dynamo',crest:{shape:'diamond',symbol:'bolt',primary:'#e9bf46',secondary:'#d7a932',borderColor:'#192b33',symbolColor:'#192b33',textColor:'#192b33',accent:'#192b33',borderWidth:'medium',field:'split',decoration:'none',stars:0}}
 };
 let counter=0;
 function escapeText(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function hex(value,fallback){return /^#[0-9a-f]{6}$/i.test(String(value))?value:fallback}
 function emblemIcon(symbol,mini){
  return '<svg class="crest-vector-icon'+(mini?' crest-vector-icon-mini':'')+'" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(EMBLEMS[symbol]||GLYPHS[symbol]||GLYPHS.star)+'</svg>';
 }
 function render(crest,mini){
  const c=crest||{},shapeKey=SHAPES[c.shape]?c.shape:'shield',shape=SHAPES[shapeKey],width=WIDTHS[c.borderWidth]||4;
  const uid='footera-crest-'+(++counter),initials=String(c.initials||'F').slice(0,5);
  const colors={primary:hex(c.primary,'#173627'),secondary:hex(c.secondary,'#0d241b'),accent:hex(c.accent,'#ffffff'),border:hex(c.borderColor,'#d8ff3e'),symbol:hex(c.symbolColor,hex(c.accent,'#ffffff')),text:hex(c.textColor,'#ffffff')};
  const symbol=GLYPHS[c.symbol]?c.symbol:'star',art=EMBLEMS[symbol]||GLYPHS[symbol];
  const stars=[1,2,3].includes(Number(c.stars))?Number(c.stars):0;
  let field='';
  if(c.field==='split')field='<path d="M100 0H200V220H100Z"/>';
  if(c.field==='stripes')field='<path d="M44 0h22v220H44ZM89 0h22v220H89ZM134 0h22v220h-22Z"/>';
  if(c.field==='diagonal')field='<path d="M0 0h34l166 186v34h-34L0 34Z"/>';
  if(c.field==='quarters')field='<path d="M100 0h100v110H100ZM0 110h100v110H0Z"/>';
  let decoration='';
  if(c.decoration==='laurel'){
   for(const sign of [-1,1]){
    decoration+='<g transform="translate(100 112) scale('+sign+' 1)" fill="'+colors.accent+'"><path d="M36 52Q72 22 56-27" fill="none" stroke="'+colors.accent+'" stroke-width="1.6"/>';
    for(let i=0;i<6;i++){const y=40-i*12,x=50+Math.sin(i/5*Math.PI)*10;decoration+='<path d="M'+x+' '+y+'q-14-2-13-12 12 0 13 12q13-7 12-17-13 4-12 17Z"/>'}
    decoration+='</g>';
   }
  }
  let starArt='';for(let i=0;i<stars;i++)starArt+='<svg data-crest-star="true" x="'+(100-(stars*17-3)/2+i*17)+'" y="38" width="14" height="14" viewBox="0 0 64 64" fill="'+colors.accent+'">'+GLYPHS.star+'</svg>';
  const iconWidth=c.decoration==='laurel'?72:88,iconX=(200-iconWidth)/2;
  return '<span class="club-crest shape-'+shapeKey+' border-'+(WIDTHS[c.borderWidth]?c.borderWidth:'medium')+(mini?' kit-badge-mini':'')+'" style="--crest-primary:'+colors.primary+';--crest-secondary:'+colors.secondary+';--crest-accent:'+colors.accent+';--crest-border:'+colors.border+'" role="img" aria-label="Vereinswappen '+escapeText(initials)+'">'+
   '<svg class="club-crest-art" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><clipPath id="'+uid+'-clip"><path d="'+shape+'"/></clipPath><linearGradient id="'+uid+'-sheen" x2=".2" y2="1"><stop stop-color="#fff" stop-opacity=".10"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>'+
   '<path data-crest-part="primary" d="'+shape+'" fill="'+colors.primary+'"/>'+
   '<g data-crest-part="secondary" clip-path="url(#'+uid+'-clip)" fill="'+colors.secondary+'">'+field+'</g>'+
   '<path d="'+shape+'" fill="url(#'+uid+'-sheen)"/>'+
   '<path data-crest-part="border" d="'+shape+'" fill="none" stroke="'+colors.border+'" stroke-width="'+width+'"/>'+
   '<path d="'+shape+'" transform="translate(100 110) scale(.92) translate(-100 -110)" fill="none" stroke="'+colors.accent+'" stroke-width=".7" opacity=".65"/>'+
   '<g data-crest-part="decoration">'+decoration+starArt+'</g>'+
   '<svg data-crest-part="symbol" x="'+iconX+'" y="'+(stars?64:57)+'" width="'+iconWidth+'" height="88" viewBox="0 0 64 64" color="'+colors.symbol+'"><g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'+art+'</g></svg>'+
   '<path d="M78 151H122" stroke="'+colors.accent+'" stroke-width="1.5"/>'+
   '<text data-crest-part="text" x="100" y="'+(shapeKey==='point'||shapeKey==='diamond'?168:176)+'" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="'+(shapeKey==='diamond'?16:initials.length>4?19:23)+'" letter-spacing="1.6" text-anchor="middle" fill="'+colors.text+'">'+escapeText(initials)+'</text></svg></span>';
 }
 function renderPresets(host){
  if(!host||host.childElementCount)return;
  host.innerHTML=Object.entries(presets).map(([id,p])=>'<button type="button" data-crest-preset="'+id+'" aria-label="Vorlage '+p.name+' übernehmen">'+render({...p.crest,initials:'FC'})+'<span>'+p.name+'</span></button>').join('');
 }
 function enhanceOptions(host){
  if(!host)return;
  host.querySelectorAll('[data-crest-symbol]').forEach(button=>{
   if(button.dataset.crestArtReady==='1')return;
   const id=button.dataset.crestSymbol,label=button.textContent.trim().split(/\s+/).slice(1).join(' ')||(id==='f'?'Footera':'Symbol');
   button.innerHTML='<span class="crest-option-art">'+emblemIcon(id,true)+'</span><span class="crest-option-name">'+escapeText(label)+'</span>';
   button.dataset.crestArtReady='1';
  });
 }
 window.FooteraCrestArt={render,emblemIcon,enhanceOptions,renderPresets,presets,keys:Object.freeze(Object.keys(GLYPHS))};
})();
