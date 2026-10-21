/* Footera V21.216 player looks for the 3D highlights: skin tone, hair colour,
 * haircut and beard per real player. Two sources, both keyed by EA id:
 * assets/player-looks.json, measured from EA's own player portraits by
 * scripts/build-player-looks.cjs, and hand-set looks for well-known players,
 * which win field by field. Players without data keep the look the 3D scene
 * picks from the name. Nothing is stored on the device.
 */
(function(root){
 'use strict';
 // One look = 4 characters: skin 1-6, haircut, hair colour, beard; '_' = unknown.
 const STYLE={k:'short01',f:'short02',r:'short04',a:'afro01',x:'bald'};
 const COLOR={S:'#14110f',D:'#3b2a1f',B:'#6e5038',L:'#9a7448',G:'#c9a061',P:'#e8d7a8',R:'#a4552a',Y:'#8f8c88',W:'#e9e6df'};
 const BEARD={n:'none',v:'Full_beard',m:'Moustache'};
 // Hand-set for the best-known players, read off their EA portraits (and a few
 // from public photos), since a pixel measurement cannot tell a haircut
 // (Basti 2026-10-21: "die bekannten wie Haaland blond").
 const HAND=Object.freeze({
  '209331':'4kSv', '231747':'4kSn', '203376':'4kSv', '231443':'5kSv', '231866':'2kSv', '239085':'1rGn', '252371':'4kSn', '192119':'2rDv',
  '202126':'1rLv', '212622':'1kLn', '212831':'2rSv', '230621':'2kSv', '233419':'2kSv', '235212':'3kSn', '238794':'5aSn', '239053':'1rDv',
  '251854':'2fDn', '255253':'2fDv', '256630':'1kPn', '277643':'4aSn', '188545':'1kBn', '200389':'1rLv', '231478':'2rSn', '232580':'4kSv',
  '233731':'6kSn', '246669':'6aSn', '256790':'4kSn', '177683':'1fDn', '192985':'1rGn', '207865':'3aSv', '212198':'2kSv', '213331':'4kSv',
  '215441':'6kSv', '215698':'5kSv', '220901':'2aSv', '222665':'1rGn', '224232':'1kLn', '228702':'1rGn', '232293':'5kGn', '234378':'1fDv',
  '237383':'1aSn', '239837':'1kDv', '241486':'4aSm', '241651':'1rLn', '243715':'4kSv', '246191':'1rDn', '247635':'1fDv', '256079':'6kSn',
  '257534':'1kRn', '158023':'2kDv', '192448':'1kGn', '205452':'6kSv', '208128':'2rSv', '211110':'1fDn', '231281':'4kSn', '235073':'1fDv',
  '237678':'6kSn', '239818':'2rDv', '240638':'3kSn', '241096':'1fSn', '247827':'5aSn', '247851':'3kSn', '252145':'5kSn', '256196':'6kSn',
  '256516':'5aGn', '20801':'2kSn', '165153':'3xSv', '200104':'2fSn', '202811':'2rDn', '215914':'5kSn', '228093':'6kSv', '229558':'6kSv',
  '237692':'1kSn', '241084':'3aYv', '243812':'4kSn', '244260':'1kLn', '246104':'5kSv', '247819':'1kLn', '271421':'4aSn', '272834':'1aBn',
  '167495':'1kGn', '192505':'5kSv', '234396':'5kSn', '241721':'4aSn', '242516':'4kSn', '247090':'2rDn', '251517':'2aSv', '264652':'4aSn',
  '177003':'1fGn', '208722':'5xSv', '218667':'2kSv', '236772':'2rSv', '264240':'2fDn', '248243':'5aSn', '241637':'6aSn', '240130':'4kSm',
  '257289':'4aBn', '253149':'4kSn', '206113':'4kSv', '256675':'3aSv', '236610':'4kSn', '230899':'5kSn', '227796':'1kBn', '192318':'1kDn',
  '212194':'1fBn', '250959':'1kLn', '194765':'1rLv', '213345':'4kSn', '226268':'1xLv', '226271':'1rDv', '234577':'2kSv', '237238':'1kRn',
  '239231':'2aSv', '239580':'4kSv', '251570':'2kSv', '252154':'1fDn', '259532':'1kSv', '278046':'2kSn', '199503':'1kSn', '204935':'1rLn',
  '210008':'2rDv', '210035':'1kGm', '216393':'4kSn', '224293':'2rSv', '225375':'1kGv', '226161':'1fBn', '230869':'1kLv', '230872':'1fBm',
  '241159':'6kSn', '241236':'6kSv', '244176':'2kSv', '245037':'1kDv', '246863':'4kSn', '277179':'1rLn', '193698':'1rLv', '210676':'1kDv',
  '212218':'1kBv', '222077':'1aBv', '223848':'1kBm', '227678':'4kSn', '228813':'2kDv', '229476':'1kLv', '229582':'2kSn', '230142':'1kDn',
  '234579':'5kPv', '235794':'6kSn', '236987':'4aSv', '238074':'4kSv', '240243':'4kSv', '241461':'1kDn', '243014':'4xSv', '246420':'6aSn',
  '248148':'1kDn', '251805':'5kSn', '254243':'1kLn', '256197':'3kSn', '260247':'4kYn', '277846':'1fRn', '277954':'1fLn', '197781':'2rSv',
  '200145':'3kSn', '204525':'1kLv', '204638':'1fDn'});
 let measured={};
 function decode(code){
  const c=String(code||''),out={};
  if(/^[1-6]$/.test(c[0]))out.skin=c[0];
  if(STYLE[c[1]])out.hair=STYLE[c[1]];
  if(COLOR[c[2]])out.hairColor=COLOR[c[2]];
  if(BEARD[c[3]])out.beard=BEARD[c[3]];
  return out;
 }
 function get(player){
  const id=String(player?.id??'').trim();if(!id)return null;
  const look={...decode(measured[id]),...decode(HAND[id])};
  return Object.keys(look).length?look:null;
 }
 // What the 3D scene takes: skin as tone 1-6, the rest as a custom look.
 function sceneSkin(player){return get(player)?.skin||null}
 function sceneLook(player){
  const look=get(player);if(!look)return null;
  const out={};for(const k of ['hair','hairColor','beard'])if(look[k])out[k]=look[k];
  return Object.keys(out).length?out:null;
 }
 function load(data){measured=data&&typeof data==='object'&&data.looks&&typeof data.looks==='object'?data.looks:{};return Object.keys(measured).length}
 const ready=typeof root.fetch==='function'&&root.document
  ?root.fetch('./assets/player-looks.json').then(r=>r.ok?r.json():null).then(load).catch(()=>0)
  :Promise.resolve(0);
 root.FooteraPlayerLooks=Object.freeze({HAND,decode,get,sceneSkin,sceneLook,load,ready});
})(typeof window!=='undefined'?window:globalThis);
