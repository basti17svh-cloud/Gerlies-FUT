/* Footera V21.219 player looks for the 3D highlights: skin tone, hair colour,
 * haircut and beard per real player (V21.258: women's players flagged female).
 * Two sources, both keyed by EA id:
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
  '257534':'1kRn', '158023':'2kDv', '192448':'1kBn', '205452':'6kSv', '208128':'2rSv', '211110':'1fDn', '231281':'4kSn', '235073':'1fDv',
  '237678':'6kSn', '239818':'2rDv', '240638':'3kSn', '241096':'1fSn', '247827':'5aSn', '247851':'3kSn', '252145':'5kSn', '256196':'6kSn',
  '256516':'5aGn', '20801':'2kSn', '165153':'3kSv', '200104':'2fSn', '202811':'2rDn', '215914':'6xSn', '228093':'6kSv', '229558':'6kSv',
  '237692':'1kSn', '241084':'3aYv', '243812':'4kSn', '244260':'1kLn', '246104':'5kSv', '247819':'1kLn', '271421':'4aSn', '272834':'1aBn',
  '167495':'1kLn', '192505':'6kSv', '234396':'6kSv', '241721':'5kSn', '242516':'4kSv', '247090':'2rDn', '251517':'2aSv', '264652':'4aSn',
  '177003':'1fGn', '208722':'6kSn', '218667':'2kSv', '236772':'2rSv', '264240':'1kBn', '248243':'6aSn', '241637':'6aSn', '240130':'4kSm',
  '257289':'4aBn', '253149':'6aSn', '206113':'4aSm', '256675':'3aDv', '236610':'6aSm', '230899':'5aSn', '227796':'1kDv', '192318':'1kDn',
  '212194':'1fGm', '250959':'1kDn', '194765':'1rLv', '213345':'5aSv', '226268':'1xLv', '226271':'1rDv', '234577':'2kSv', '237238':'1kRn',
  '239231':'2aSv', '239580':'4kSv', '251570':'2kSv', '252154':'1fDn', '259532':'1kSv', '278046':'2kSn', '199503':'1kSn', '204935':'1rLn',
  '210008':'2rDv', '210035':'1kGm', '216393':'4kSn', '224293':'2rSv', '225375':'1kGv', '226161':'1fBn', '230869':'1kLv', '230872':'1fBm',
  '241159':'6kSn', '241236':'6kSv', '244176':'2kSv', '245037':'1kDv', '246863':'4kSn', '277179':'1rLn', '193698':'1rLv', '210676':'1kDv',
  '212218':'1kBv', '222077':'1aBv', '223848':'1kBm', '227678':'4kSn', '228813':'2kDv', '229476':'1kLv', '229582':'2kSn', '230142':'1kDn',
  '234579':'5kPv', '235794':'6kSn', '236987':'4aSv', '238074':'4kSv', '240243':'4kSv', '241461':'1kDn', '243014':'4xSv', '246420':'6aSn',
  '248148':'1kDn', '251805':'5kSn', '254243':'1kLn', '256197':'3kSn', '260247':'4kYn', '277846':'1fRn', '277954':'1fLn', '197781':'2rSv',
  '200145':'3kSn', '204525':'1kLv', '204638':'1fDn', '207862':'1kGn', '210514':'2kSn', '210881':'1kDv', '212228':'5kSv', '212616':'2rDv',
  '216435':'1xLv', '216549':'1kLn', '221697':'4kSn', '224371':'1kBv', '224987':'1kLv', '225193':'2kSv', '227647':'1kLv', '229237':'4kSn',
  '231447':'3xSm', '231521':'2kSn', '233096':'6aSn', '234236':'1kDn', '236015':'4aSm', '236403':'6kSn', '236703':'1kDv', '237086':'3kSn',
  '240225':'1kLn', '242444':'1fBn', '243576':'2kSn', '244263':'1aSn', '244669':'1aGv', '244778':'2fBm', '246147':'3kRm', '247103':'2kSv',
  '247257':'1rDm', '252042':'4aSm', '253124':'3aSm', '257279':'1kDv', '259480':'3aSv', '262621':'2kSv', '264309':'1kDn', '266127':'1kGn',
  '270673':'4aSv', '272449':'1kLn', '275298':'2aSm', '277427':'3aSn', '183898':'3kSm', '185122':'1kLv', '188335':'1kDn', '192984':'1kDv',
  '198176':'1kDv', '200888':'5xSv', '201024':'6kSv', '203263':'1kDn', '203574':'1aBv', '204970':'1kSn', '206517':'1rDv', '207421':'1kDn',
  '208418':'2kSv', '209499':'3xSm', '209981':'2fSn', '210257':'2aSn', '210406':'1fBv', '210935':'2kDv', '213516':'2kSv', '214979':'1kSn',
  '216460':'2kSm', '217870':'1aBm', '219683':'4kSv', '220502':'3kGv', '220570':'1kDn', '220697':'1kBv', '220834':'2kSv', '227236':'6kSv',
  '229188':'3kSv', '229391':'1kSn', '229891':'1kPn', '231677':'5kSn', '232488':'2kSv', '232656':'2rSv', '233306':'1kBn', '233556':'2kDm',
  '235243':'1kLn', '236506':'1kPn', '237646':'3kSv', '239301':'2kSn', '240950':'2kDv', '241852':'6kSn', '242187':'1kDv', '242964':'1kGn',
  '243245':'1kDv', '243657':'1kDn', '243854':'5aGm', '244067':'4kSm', '244257':'1kGn', '244675':'1kDn', '245158':'4aSv', '247263':'6aSv',
  '248550':'1kDn', '251377':'3kYn', '251852':'4aSm', '253109':'1kLn', '253396':'1kLn', '254803':'2kDn', '256948':'1kDn', '257711':'1fDn',
  '259240':'1kLn', '260592':'1kDn', '261188':'5kSv', '263578':'5aSn', '264388':'1kDn', '265693':'1kDn', '266866':'4aSv', '275771':'5kSv',
  '277031':'2kDn', '278016':'3kLn', '279015':'1fPn', '70415':'1fDm', '73078':'2fSn', '181458':'1aSn', '186153':'1kLn', '192123':'1kDn',
  '192629':'2kSn', '192883':'2kSv', '193747':'2kSv', '199641':'1kLn', '200155':'1kDn', '200724':'2kSv', '202024':'1kDv', '204883':'6kSn',
  '204923':'1rSm', '207410':'1kSv', '207439':'2kGv', '208093':'2kDn', '208268':'1kDv', '208333':'2rSv', '208787':'1kSv', '210047':'1kSm',
  '210385':'2kSv', '210413':'2kSn', '212523':'4kBn', '216354':'1kDv', '216447':'1kDv', '220710':'1kYn', '220814':'1kSv', '223710':'1kSv',
  '223959':'2kGv', '225116':'1kSv', '225859':'6kSn', '226110':'6kSv', '226166':'6kSn', '226456':'2kSv', '227127':'1kLv', '227174':'1rDv',
  '228383':'1rSv', '229236':'4kSv', '229261':'5kSn', '231410':'1rDn', '231913':'1xLv', '231936':'1kSv', '232363':'1kLv', '233486':'1kDn',
  '234642':'6kSn', '235353':'6kSn', '235790':'1kDn', '236461':'6xSv', '236496':'2aSn', '236632':'4aSn', '237386':'1kLv', '238616':'2kDm',
  '239340':'1kSv', '239482':'4kSm', '240359':'3kSv', '241464':'1kDn', '241509':'3kSn', '241850':'1fRn', '242201':'2aSv', '242641':'3aSv',
  '243241':'1kSn', '243559':'1kLn', '245155':'6aSn', '245367':'4aSn', '246430':'1kSn', '247246':'5aSn', '247394':'1kLv', '250723':'6aSv',
  '251470':'1kLn', '251809':'1kDn', '254117':'1kLn', '255069':'1kDv', '255475':'3kSm', '255565':'3fSn', '255654':'6kSn', '256261':'4kSm',
  '257057':'6kSn', '257876':'1aGn', '258498':'1kDn', '258601':'6aSn', '258908':'1kGn', '260908':'1kSn', '261299':'1kDn', '262118':'1aSn',
  '262138':'6aSn', '263139':'2kSn', '263798':'1fLn', '264432':'3kDm', '264453':'1kLn', '264862':'2aSn', '266039':'1kSn', '268804':'1kDv',
  '268889':'1fDn', '269136':'5aSn', '269701':'3kSm', '270531':'6aSv', '271918':'1kSn', '275192':'1fLn', '277869':'6aSn', '278349':'1kLn',
  '73562':'1kLv', '186146':'6kSn', '189596':'1kDn', '190674':'2kSn', '200458':'1kLn', '202695':'1kDv', '202884':'2kSv', '208461':'1kDn',
  '208920':'4aSm', '210411':'2kDn', '210602':'3kSm', '213648':'1kDv', '213655':'5aSv', '214096':'2kSv', '215270':'1kSn', '215316':'2kSv',
  '215590':'2kSv', '216201':'6aSv', '216267':'1kDv', '216409':'2kSv', '216547':'1aDv', '220793':'6aSn', '222492':'4aSm', '223334':'4kPv',
  '223874':'1kDm', '223885':'1kLn', '223952':'1kSn', '224179':'2kSv', '224411':'2aSv', '224836':'1xLv', '225309':'3kSn', '226162':'2kSv',
  '226226':'1kDv', '226300':'1kSv', '226376':'2kSn', '226851':'1aSn', '227950':'1kLv', '228618':'6xSn', '228789':'4kSv', '229348':'4kPv',
  '229723':'1kLv', '230918':'5aSn', '231416':'5kSn', '232411':'5kSm', '232498':'1xLn', '232639':'2kGn', '232665':'1kDv', '232756':'6kSv',
  '234742':'1kLn', '234824':'6xSv', '235149':'1kLn', '235152':'2aSv', '235410':'4kSv', '235735':'3aLn', '235805':'1fDn', '235840':'1kLv',
  '236045':'4kWm', '236401':'3kSv', '237681':'2fDn', '238095':'1kDn', '238160':'2kSv', '238744':'4aSv', '238900':'1kLv', '239807':'1kLn',
  '240091':'2kSv', '240277':'1kDv', '240753':'2kSv', '240913':'1fGn', '241095':'1kSv', '241508':'1kLn', '241707':'6kSn', '242434':'3kSv',
  '242664':'1kPm', '243057':'1aDv', '243580':'4aSm', '243586':'4kSv', '243593':'4aSn', '243630':'5kSn', '243702':'4aSv', '243780':'2fDn',
  '243952':'1kLn', '244470':'1kDv', '244749':'2kSn', '245630':'6kSv', '246350':'1kDm', '247463':'6kSn', '248165':'1fDm', '250753':'1kSn',
  '250954':'4kSm', '250955':'1kLn', '251566':'2kSm', '251752':'1kDv', '253163':'3kWm', '254022':'1fLm', '254796':'6aSn', '255303':'2kSv',
  '256769':'1kLv'});
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
 // Women's players (EA gender "Women's Football", V21.258) get the female
 // body, a women's haircut and no beard in 3D; a men's haircut code never applies.
 function isFemale(player){
  const g=String(player?.gender??player?.sex??'').trim().toLowerCase();
  return g==='f'||/wom[ae]n|female|frau/.test(g);
 }
 // What the 3D scene takes: skin as tone 1-6, the rest as a custom look.
 function sceneSkin(player){return get(player)?.skin||null}
 function sceneLook(player){
  const look=get(player)||{},female=isFemale(player);
  const out={};for(const k of female?['hairColor']:['hair','hairColor','beard'])if(look[k])out[k]=look[k];
  if(female)out.female=true;
  return Object.keys(out).length?out:null;
 }
 function load(data){measured=data&&typeof data==='object'&&data.looks&&typeof data.looks==='object'?data.looks:{};return Object.keys(measured).length}
 const ready=typeof root.fetch==='function'&&root.document
  ?root.fetch('./assets/player-looks.json').then(r=>r.ok?r.json():null).then(load).catch(()=>0)
  :Promise.resolve(0);
 root.FooteraPlayerLooks=Object.freeze({HAND,decode,get,isFemale,sceneSkin,sceneLook,load,ready});
})(typeof window!=='undefined'?window:globalThis);
