/* Footera V21.215 Aussehen-Editor: per-player skin tone, hair colour, haircut and
 * beard for the 3D highlights. Purely cosmetic and stored on this device only
 * (own localStorage key, never inside the save or online data). Anything left
 * on "Standard" uses the starting look of a well-known player, else the look the
 * 3D scene picks from the player's name.
 */
(function(root){
 'use strict';
 const KEY='footera-player-looks-v1';
 // Same six complexions as resolvePlayerSkinTone in 3d-highlights-scene.mjs.
 const SKINS=Object.freeze([['1','#f1d2b3','Sehr hell'],['2','#dbad88','Hell'],['3','#c88f69','Mittel'],
  ['4','#a96d4b','Gebräunt'],['5','#805035','Dunkel'],['6','#503326','Sehr dunkel']]);
 const HAIR_COLORS=Object.freeze([['#14110f','Schwarz'],['#3b2a1f','Dunkelbraun'],['#6e5038','Braun'],
  ['#9a7448','Hellbraun'],['#c9a061','Blond'],['#e8d7a8','Platinblond'],['#a4552a','Rot'],['#8f8c88','Grau'],['#e9e6df','Weiß']]);
 const STYLES=Object.freeze([['short01','Kurz'],['short02','Pony'],['short04','Zurückgegelt'],['afro01','Afro'],['bald','Glatze']]);
 const BEARDS=Object.freeze([['none','Ohne'],['Full_beard','Vollbart'],['Moustache','Schnurrbart']]);
 const FIELDS=Object.freeze({skin:SKINS.map(x=>x[0]),hairColor:HAIR_COLORS.map(x=>x[0]),hair:STYLES.map(x=>x[0]),beard:BEARDS.map(x=>x[0])});
 // Starting looks for well-known players, from how they appear in public
 // photos (Basti 2026-10-21: "zumindest dunkle und helle Spieler und die
 // bekannten wie Haaland blond"). EA id -> skin 1-6, haircut, hair colour,
 // beard as one code; the player's own editor choice always wins.
 const PRESET_CODES=Object.freeze({
  '209331':'4aSv', '231747':'4kSn', '203376':'4kSv', '231443':'5kSv', '231866':'2kDv', '239085':'1rGn', '252371':'4kSn', '192119':'2rDv',
  '202126':'1rLn', '212622':'1rLn', '212831':'2rDv', '230621':'2kSv', '233419':'3kSv', '235212':'3kSv', '238794':'5aSn', '239053':'2kDv',
  '251854':'2fDn', '255253':'2kDv', '256630':'1fLn', '277643':'4kSn', '188545':'1kBn', '200389':'1kLv', '231478':'2rSv', '232580':'3kSv',
  '233731':'4kSn', '246669':'5kSn', '256790':'4kSn', '177683':'1kBn', '192985':'1kRn', '207865':'3kSv', '212198':'2kDn', '213331':'4kSv',
  '215441':'5kSv', '215698':'5xSv', '220901':'2kDv', '222665':'1fBv', '224232':'2kDv', '228702':'1rLn', '232293':'5kSn', '234378':'1kBn',
  '237383':'1kBv', '239837':'1kLv', '241486':'4kSm', '241651':'1kLv', '243715':'5kSn', '246191':'2kDn', '247635':'1fDv', '256079':'4kSn',
  '257534':'1kRn', '158023':'2kDv', '192448':'1kGn', '205452':'5xSv', '208128':'2kSv', '211110':'2kDv', '231281':'4kSn', '235073':'1kLn',
  '237678':'5kSv', '239818':'2kSv', '240638':'2kDv', '241096':'1fDv', '247827':'5kSn', '247851':'3kSv', '252145':'4kSn', '256196':'5kSv',
  '256516':'5kSn', '20801':'2kDn', '165153':'3xSv', '200104':'2fSn', '202811':'2kSv', '215914':'5kSn', '228093':'4kSn', '229558':'5kSn',
  '237692':'1kBn', '241084':'4aSn', '243812':'4kSn', '244260':'2kDn', '246104':'4aSn', '247819':'1kLv', '271421':'4kSn', '272834':'2fDn',
  '167495':'1kGn', '192505':'5kSv', '234396':'5kSn', '241721':'4aSn', '242516':'4kSn', '247090':'2kDv', '251517':'1kBn', '264652':'4kSn',
  '177003':'1fGn', '208722':'5xSv', '218667':'2kDv', '236772':'1rBn', '264240':'2fDn', '248243':'5aSn', '241637':'5kSn', '240130':'4xSv',
  '257289':'4kSn', '253149':'4kSn', '206113':'4kSv', '256675':'3aSv', '236610':'4kSn', '230899':'5kSn', '227796':'1kBn',
  '192318':'1kDn', '212194':'1fBn', '250959':'1kLn', '194765':'1kLv', '213345':'4kSn'});
 const PRESET_STYLE={f:'short02',r:'short04',k:'short01',a:'afro01',x:'bald'};
 const PRESET_COLOR={S:'#14110f',D:'#3b2a1f',B:'#6e5038',L:'#9a7448',G:'#c9a061',P:'#e8d7a8',R:'#a4552a'};
 const PRESET_BEARD={n:'none',v:'Full_beard',m:'Moustache'};
 function preset(player){
  const code=PRESET_CODES[String(player?.id??'').trim()];if(!code)return null;
  return{skin:code[0],hair:PRESET_STYLE[code[1]],hairColor:PRESET_COLOR[code[2]],beard:PRESET_BEARD[code[3]]};
 }
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 function readAll(){
  try{const data=JSON.parse(root.localStorage?.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch(_){return{}}
 }
 function writeAll(data){try{root.localStorage?.setItem(KEY,JSON.stringify(data))}catch(_){}}
 // EA id when the player has one, else the name, so the same player looks the
 // same in every card version and on both sides of a match.
 function keyOf(player){
  if(!player)return'';
  const id=String(player.id??'').trim();
  if(id)return'id:'+id;
  const name=String(player.name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
  return name?'name:'+name:'';
 }
 function clean(raw){
  if(!raw||typeof raw!=='object')return null;
  const out={};
  for(const [field,allowed] of Object.entries(FIELDS))if(allowed.includes(String(raw[field])))out[field]=String(raw[field]);
  return Object.keys(out).length?out:null;
 }
 // The player's own choices only (what "Standard" undoes).
 function own(player){const key=keyOf(player);return key?clean(readAll()[key]):null}
 function get(player){const merged={...(preset(player)||{}),...(own(player)||{})};return Object.keys(merged).length?merged:null}
 function set(player,field,value){
  const key=keyOf(player);if(!key||!FIELDS[field])return own(player);
  const data=readAll(),look={...(clean(data[key])||{})};
  if(FIELDS[field].includes(String(value)))look[field]=String(value);else if(value==='auto')delete look[field];else return clean(look);
  if(Object.keys(look).length)data[key]=look;else delete data[key];
  writeAll(data);return clean(look);
 }
 function reset(player){const key=keyOf(player),data=readAll();if(key&&data[key]){delete data[key];writeAll(data)}}
 // What the 3D scene takes: skin as tone 1-6, the rest as a custom look.
 function sceneSkin(player){return get(player)?.skin||null}
 function sceneLook(player){
  const look=get(player);if(!look)return null;
  const out={};if(look.hair)out.hair=look.hair;if(look.hairColor)out.hairColor=look.hairColor;if(look.beard)out.beard=look.beard;
  return Object.keys(out).length?out:null;
 }

 // Small front view of the head so a choice is visible before the next match.
 function previewSVG(look){
  const skin=(SKINS.find(x=>x[0]===look?.skin)||SKINS[2])[1],hair=look?.hairColor||'#2a1d16',style=look?.hair||'short01';
  const shade='rgba(0,0,0,.18)';
  const hairShape={
   short02:'<path d="M27 37c0-15 9-23 23-23s23 8 23 23c-4-6-9-9-12-9-5 3-17 3-22 0-4 0-8 3-12 9Z"/>',
   short04:'<path d="M28 34c1-12 10-18 22-18s21 6 22 18c-5-5-10-7-22-7s-17 2-22 7Z" opacity=".92"/>',
   short01:'<path d="M27 38c-1-15 9-23 23-23s24 8 23 23c-3-5-6-8-9-9-6 2-22 2-28 0-3 1-6 4-9 9Z"/>',
   afro01:'<path d="M18 44c-6-24 10-38 32-38s38 14 32 38c-3-10-8-14-13-16-8 3-30 3-38 0-5 2-10 6-13 16Z"/>',
   bald:''
  }[style]||'';
  const beard={
   Full_beard:`<path d="M30 52c1 15 9 24 20 24s19-9 20-24c-3 5-6 7-9 7-3-2-19-2-22 0-3 0-6-2-9-7Z" fill="${hair}"/><path d="M42 64c4 2 12 2 16 0" stroke="${shade}" stroke-width="2" fill="none"/>`,
   Moustache:`<path d="M40 61c4-3 16-3 20 0-3 2-7 2-10 1-3 1-7 1-10-1Z" fill="${hair}"/>`
  }[look?.beard]||'';
  return`<svg class="look-preview-head" viewBox="0 0 100 100" aria-hidden="true">
   <path d="M34 84c3-5 9-7 16-7s13 2 16 7l10 16H24Z" fill="${skin}"/><path d="M24 100l8-14c5 4 11 6 18 6s13-2 18-6l8 14Z" fill="#1b4c52"/>
   <ellipse cx="26" cy="48" rx="4" ry="7" fill="${skin}"/><ellipse cx="74" cy="48" rx="4" ry="7" fill="${skin}"/>
   <path d="M27 40c0-17 10-26 23-26s23 9 23 26v8c0 19-10 30-23 30S27 67 27 48Z" fill="${skin}"/>
   <path d="M38 42h8M54 42h8" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>
   <circle cx="42" cy="48" r="2.2" fill="#24201d"/><circle cx="58" cy="48" r="2.2" fill="#24201d"/>
   <path d="M50 50v8l-3 2" stroke="${shade}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
   <path d="M44 67c4 2 8 2 12 0" stroke="${shade}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
   ${beard}<g fill="${hair}">${hairShape}</g>
  </svg>`;
 }
 function chips(field,options,current,kind,chosen){
  const auto=`<button type="button" class="look-chip look-auto ${chosen?'':'active'}" data-look-field="${field}" data-look-value="auto" aria-pressed="${!chosen}">Standard</button>`;
  return auto+options.map(([value,a,b])=>{
   const label=kind==='swatch'?(b||a):a,color=kind==='swatch'?(field==='skin'?a:value):'';
   // A value from "Standard" is only outlined; an own choice is highlighted.
   const on=current===value&&chosen,base=current===value&&!chosen?'is-default':'';
   return kind==='swatch'
    ?`<button type="button" class="look-chip look-swatch ${on?'active':base}" data-look-field="${field}" data-look-value="${esc(value)}" aria-pressed="${on}" title="${esc(label)}" aria-label="${esc(label)}" style="--look-color:${esc(color)}"></button>`
    :`<button type="button" class="look-chip ${on?'active':base}" data-look-field="${field}" data-look-value="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
  }).join('');
 }
 function profileHTML(player){
  const key=keyOf(player);if(!key)return'';
  const look=get(player)||{},mine=own(player)||{};
  const row=(title,field,options,kind)=>`<div class="look-row"><span class="look-label">${title}</span><div class="look-chips">${chips(field,options,look[field],kind,!!mine[field])}</div></div>`;
  return`<section class="bio-panel bio-look-panel" data-look-key="${esc(key)}" data-look-id="${esc(player.id??'')}" data-look-name="${esc(player.name||'')}">
   <div class="bio-panel-head"><div><span class="bio-panel-kicker">3D-HIGHLIGHTS</span><h4>Aussehen</h4></div><small>Nur auf diesem Gerät</small></div>
   <div class="look-body"><div class="look-preview">${previewSVG(look)}</div><div class="look-rows">
    ${row('Hautton','skin',SKINS.map(([v,c,l])=>[v,c,l]),'swatch')}
    ${row('Haarfarbe','hairColor',HAIR_COLORS.map(([v,l])=>[v,l]),'swatch')}
    ${row('Frisur','hair',STYLES,'text')}
    ${row('Bart','beard',BEARDS,'text')}
   </div></div>
   <p class="look-note">Standard nimmt den Start-Look bekannter Spieler, sonst wählt das 3D-Spiel. Gilt für diesen Spieler in allen Highlights, auch beim Gegner.</p>
  </section>`;
 }
 function bind(doc){
  if(!doc||doc.__footeraLooksBound)return;doc.__footeraLooksBound=true;
  doc.addEventListener('click',event=>{
   const button=event.target?.closest?.('[data-look-field]');if(!button)return;
   const panel=button.closest('.bio-look-panel');if(!panel)return;
   const player={id:panel.dataset.lookId,name:panel.dataset.lookName};
   set(player,button.dataset.lookField,button.dataset.lookValue);
   const holder=doc.createElement('div');holder.innerHTML=profileHTML(player);
   if(holder.firstElementChild)panel.replaceWith(holder.firstElementChild);
  });
 }
 if(root.document)bind(root.document);
 root.FooteraPlayerLooks=Object.freeze({KEY,own,preset,SKINS,HAIR_COLORS,STYLES,BEARDS,keyOf,get,set,reset,sceneSkin,sceneLook,previewSVG,profileHTML});
})(typeof window!=='undefined'?window:globalThis);
