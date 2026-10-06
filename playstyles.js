(function(root){
"use strict";

const DEFINITIONS = [
 {id:"power-shot",name:"Powerschuss",group:"Abschluss",symbol:"PS",aliases:["Power Shot"],description:"Kräftige Abschlüsse werden schneller vorbereitet und mit höherer Wucht ausgeführt."},
 {id:"finesse-shot",name:"Angeschnittener Schuss",group:"Abschluss",symbol:"AS",aliases:["Finesse Shot"],description:"Angeschnittene Abschlüsse erhalten mehr Präzision und eine verlässlichere Flugkurve."},
 {id:"low-driven-shot",name:"Flacher Vollspannschuss",group:"Abschluss",symbol:"FV",aliases:["Low Driven Shot"],description:"Flache, harte Abschlüsse werden kontrollierter und zielgerichteter ausgeführt."},
 {id:"chip-shot",name:"Lupfer",group:"Abschluss",symbol:"LU",aliases:["Chip Shot"],description:"Lupfer über herauslaufende Torhüter gelingen kontrollierter und präziser."},
 {id:"power-header",name:"Präziser Kopfball",group:"Abschluss",symbol:"PK",aliases:["Power Header","Precision Header"],description:"Kopfbälle aufs Tor werden gezielter und mit mehr Druck ausgeführt."},
 {id:"acrobatic",name:"Akrobatik",group:"Abschluss",symbol:"AK",aliases:["Acrobatic"],description:"Akrobatische Abschlüsse und schwierige Direktabnahmen werden zuverlässiger."},
 {id:"dead-ball",name:"Ruhender Ball",group:"Abschluss",symbol:"RB",aliases:["Dead Ball"],description:"Freistöße, Ecken und andere ruhende Bälle werden präziser ausgeführt."},
 {id:"gamechanger",name:"Gamechanger",group:"Abschluss",symbol:"GC",aliases:["Game Changer"],description:"Schwierige und kreative Abschlüsse erhalten in engen Spielsituationen einen Vorteil."},

 {id:"incisive-pass",name:"Entscheidender Pass",group:"Passspiel",symbol:"EP",aliases:["Incisive Pass"],description:"Steile und linienbrechende Pässe erreichen Mitspieler präziser."},
 {id:"through-ball",name:"Schnittstellenpass",group:"Passspiel",symbol:"SP",aliases:["Through Ball"],description:"Pässe in die Tiefe werden besser gewichtet und schneller gespielt."},
 {id:"long-ball-pass",name:"Weiter Pass",group:"Passspiel",symbol:"WP",aliases:["Long Ball Pass","Long Ball"],description:"Lange Zuspiele und Seitenwechsel kommen präziser beim Zielspieler an."},
 {id:"pinged-pass",name:"Harter Pass",group:"Passspiel",symbol:"HP",aliases:["Pinged Pass"],description:"Scharfe flache Pässe werden schneller und kontrollierter gespielt."},
 {id:"tiki-taka",name:"Tiki-Taka",group:"Passspiel",symbol:"TT",aliases:["Tiki Taka"],description:"Kurze Direktpässe und schnelle Kombinationen werden sauberer ausgeführt."},
 {id:"flair",name:"Einfallsreich",group:"Passspiel",symbol:"EI",aliases:["Flair"],description:"Kreative Pässe und technisch anspruchsvolle Zuspiele gelingen verlässlicher."},

 {id:"technical",name:"Technik",group:"Ballkontrolle",symbol:"TE",aliases:["Technical"],description:"Kontrolliertes Dribbling und enge Richtungswechsel werden präziser."},
 {id:"rapid",name:"Raserei",group:"Ballkontrolle",symbol:"RA",aliases:["Rapid"],description:"Sprints mit Ball werden schneller aufgenommen und sauberer kontrolliert."},
 {id:"quick-step",name:"Schneller Schritt",group:"Ballkontrolle",symbol:"SS",aliases:["Quick Step"],description:"Kurze explosive Antritte erfolgen schneller, besonders aus engem Raum."},
 {id:"first-touch",name:"First Touch",group:"Ballkontrolle",symbol:"FT",aliases:["First Touch"],description:"Ballannahmen werden sauberer und der Ball springt seltener weit vom Fuß."},
 {id:"trickster",name:"Tricks",group:"Ballkontrolle",symbol:"TR",aliases:["Trickster"],description:"Technische Spezialbewegungen und kreative Dribblings werden wirkungsvoller."},
 {id:"press-proven",name:"Ruhepol",group:"Ballkontrolle",symbol:"RU",aliases:["Press Proven"],description:"Unter Gegnerdruck bleibt die Ballkontrolle stabiler und Abschirmbewegungen werden sicherer."},

 {id:"anticipate",name:"Antizipation",group:"Defensive",symbol:"AN",aliases:["Anticipate"],description:"Defensive Duelle und saubere Ballgewinne im Stand werden zuverlässiger."},
 {id:"intercept",name:"Abfangen",group:"Defensive",symbol:"AB",aliases:["Intercept"],description:"Passwege werden besser geschlossen und Bälle häufiger abgefangen."},
 {id:"block",name:"Block",group:"Defensive",symbol:"BL",aliases:["Block"],description:"Schüsse und Pässe werden mit größerer Reichweite geblockt."},
 {id:"jockey",name:"Abdrängen",group:"Defensive",symbol:"AD",aliases:["Jockey"],description:"Seitliche Defensivbewegungen bleiben kontrollierter und reaktionsschneller."},
 {id:"slide-tackle",name:"Grätsche",group:"Defensive",symbol:"GR",aliases:["Slide Tackle"],description:"Grätschen erreichen den Ball kontrollierter und mit höherer Erfolgsquote."},
 {id:"aerial",name:"Kopfballmacht",group:"Defensive",symbol:"KM",aliases:["Aerial"],description:"Luftduelle werden häufiger gewonnen und Kopfbälle kraftvoller ausgeführt."},

 {id:"enforcer",name:"Kante",group:"Physis",symbol:"KA",aliases:["Enforcer"],description:"Körperkontakte und robuste Duelle werden wirkungsvoller bestritten."},
 {id:"bruiser",name:"Durchsetzungskraft",group:"Physis",symbol:"DU",aliases:["Bruiser"],description:"Physische Zweikämpfe und Schulterduelle werden mit mehr Stabilität geführt."},
 {id:"relentless",name:"Unerbittlich",group:"Physis",symbol:"UN",aliases:["Relentless"],description:"Hohe Intensität kann länger gehalten und Ermüdung besser kompensiert werden."},
 {id:"long-throw",name:"Langer Einwurf",group:"Physis",symbol:"LE",aliases:["Long Throw"],description:"Einwürfe erreichen größere Distanzen und können gefährlicher in den Strafraum gebracht werden."},

 {id:"rush-out",name:"Herauskommen",group:"Torwart",symbol:"HE",aliases:["Rush Out"],description:"Der Torwart reagiert entschlossener auf tiefe Bälle und Situationen außerhalb des Tores."},
 {id:"cross-claimer",name:"Flankenfang",group:"Torwart",symbol:"FF",aliases:["Cross Claimer"],description:"Flanken werden sicherer attackiert und häufiger kontrolliert abgefangen."},
 {id:"deflector",name:"Deflector",group:"Torwart",symbol:"DE",aliases:["Deflector"],description:"Paraden werden häufiger kontrolliert in weniger gefährliche Bereiche gelenkt."},
 {id:"far-reach",name:"Große Reichweite",group:"Torwart",symbol:"GR",aliases:["Far Reach"],description:"Der Torwart erreicht schwierige Bälle in den Ecken mit größerer Reichweite."},
 {id:"far-throw",name:"Weiter Abwurf",group:"Torwart",symbol:"WA",aliases:["Far Throw"],description:"Abwürfe erreichen Mitspieler über größere Distanz mit besserer Präzision."},
 {id:"footwork",name:"Beinarbeit",group:"Torwart",symbol:"BA",aliases:["Footwork"],description:"Schnelle Reaktionen mit Füßen und Beinen werden bei nahen Abschlüssen verbessert."}
];

const ICON_BODIES=Object.freeze({
 "power-shot":'<circle cx="7" cy="12" r="3"/><path d="M11 12h9M16 8l4 4-4 4"/>',
 "finesse-shot":'<circle cx="7" cy="15" r="3"/><path d="M10 15c5 0 8-3 9-8"/><path d="m16 8 3-1 1 3"/>',
 "low-driven-shot":'<circle cx="7" cy="15" r="3"/><path d="M11 15h9"/><path d="M13 18h6"/>',
 "chip-shot":'<circle cx="6" cy="17" r="3"/><path d="M9 16c3-8 8-9 11-4"/><path d="m17 10 3 2-2 3"/>',
 "power-header":'<circle cx="15" cy="6" r="3"/><path d="M5 18c1-5 3-8 6-8s5 3 6 8"/><path d="M9 12c1 1 3 1 4 0"/>',
 "acrobatic":'<circle cx="8" cy="6" r="2"/><path d="m8 8 3 4 5-2M11 12l-4 5M11 12l5 4"/><circle cx="19" cy="8" r="2"/>',
 "dead-ball":'<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
 "gamechanger":'<path d="m12 3 1.7 5.3H19l-4.3 3.1 1.7 5.3-4.4-3.2-4.4 3.2 1.7-5.3L5 8.3h5.3Z"/><circle cx="19" cy="18" r="2"/>',
 "incisive-pass":'<circle cx="4" cy="12" r="2"/><path d="M7 12h12"/><path d="m15 8 4 4-4 4"/><path d="M11 7v10"/>',
 "through-ball":'<circle cx="4" cy="12" r="2"/><path d="M7 12h12"/><path d="m16 9 3 3-3 3"/><path d="M11 8v3M11 13v3"/>',
 "long-ball-pass":'<circle cx="4" cy="17" r="2"/><path d="M6 16c4-9 9-10 14-5"/><path d="m17 8 3 3-1 4"/>',
 "pinged-pass":'<circle cx="4" cy="12" r="2"/><path d="M7 10h10M7 14h10"/><path d="m14 7 4 3-4 3M14 11l4 3-4 3"/>',
 "tiki-taka":'<circle cx="12" cy="4" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="m11 6-5 8M7 17h9M18 15l-5-9"/>',
 "flair":'<path d="M5 15c3-8 11-10 14-4 2 4-3 8-7 6-3-2 0-6 3-4"/><path d="m5 15-1-4M5 15l4 1"/>',
 "technical":'<circle cx="16" cy="16" r="3"/><path d="M4 8c5 0 8 2 10 5"/><path d="m5 5-1 3 3 2M9 6l-1 4"/>',
 "rapid":'<path d="M4 8h8M2 12h11M5 16h9"/><path d="m13 7 7 5-7 5"/>',
 "quick-step":'<path d="M8 4c3 1 4 4 3 7-1 2-3 3-5 2-2-1-2-4 0-6"/><path d="M14 9h6M13 13h7M15 17h4"/>',
 "first-touch":'<path d="M4 15c4-1 7-4 9-9l4 2-3 6c-2 4-6 5-10 4Z"/><circle cx="19" cy="16" r="2"/>',
 "trickster":'<circle cx="12" cy="12" r="2"/><path d="M12 4c5 0 8 3 8 7M20 11l-2-2M20 11l-2 2M12 20c-5 0-8-3-8-7M4 13l2 2M4 13l2-2"/>',
 "press-proven":'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><circle cx="12" cy="11" r="3"/>',
 "anticipate":'<path d="M3 12c3-5 6-7 9-7s6 2 9 7c-3 5-6 7-9 7s-6-2-9-7Z"/><circle cx="12" cy="12" r="3"/>',
 "intercept":'<path d="M4 5l16 14M20 5 4 19"/><path d="m15 5 5 0v5M9 19H4v-5"/>',
 "block":'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><path d="M8 12h8"/>',
 "jockey":'<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"/><circle cx="12" cy="6" r="2"/>',
 "slide-tackle":'<path d="M3 17h12l5-4"/><path d="m7 13 5 4M13 11l3 3"/><circle cx="20" cy="10" r="2"/>',
 "aerial":'<circle cx="12" cy="5" r="3"/><path d="M7 20c1-5 3-8 5-8s4 3 5 8"/><path d="m8 11 4-3 4 3"/>',
 "enforcer":'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><path d="m9 9 3 3 3-3M9 14h6"/>',
 "bruiser":'<path d="M7 7c2-2 4-2 5 0l1 2 2-1c2-1 4 1 3 3l-2 6H8l-3-5c-1-2 1-4 3-3Z"/>',
 "relentless":'<path d="M4 12c2-5 5-5 8 0s6 5 8 0-1-8-5-5c-2 1-3 4-3 5s-1 4-3 5c-4 3-7 0-5-5Z"/>',
 "long-throw":'<circle cx="6" cy="7" r="2"/><path d="m6 9 4 4 3-3M10 13l-2 6M10 13l5 5"/><path d="M12 7c4-3 7-1 8 2"/><circle cx="19" cy="7" r="2"/>',
 "rush-out":'<path d="M4 12h12M12 8l4 4-4 4"/><path d="M18 7c3 2 3 8 0 10"/><circle cx="19" cy="12" r="2"/>',
 "cross-claimer":'<circle cx="12" cy="5" r="3"/><path d="M4 18c2-5 5-7 8-7s6 2 8 7"/><path d="M8 15l4-4 4 4"/>',
 "deflector":'<circle cx="7" cy="12" r="3"/><path d="M10 12h6"/><path d="m15 8 4 4-4 4"/><path d="M18 12c0 4-2 6-5 7"/>',
 "far-reach":'<path d="M3 15c5 0 7-3 9-7M12 8l5-3M12 8l5 2"/><circle cx="20" cy="5" r="2"/><path d="M8 16l3 4"/>',
 "far-throw":'<path d="M4 16c3-6 7-8 12-7"/><path d="m14 6 3 3-2 4"/><circle cx="20" cy="7" r="2"/><path d="M4 16l4 3"/>',
 "footwork":'<path d="M4 15c4-1 7-4 9-9l4 2-3 6c-2 4-6 5-10 4Z"/><path d="M16 16h5M18 13l3 3-3 3"/>'
});
function iconSVG(style){
 const body=ICON_BODIES[style&&style.id]||'<circle cx="12" cy="12" r="7"/><path d="M8 12h8M12 8v8"/>';
 return '<svg class="playstyle-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+body+'</svg>';
}

const byId = new Map(DEFINITIONS.map(x=>[x.id,x]));
const normalize = value => String(value == null ? "" : value)
 .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/\+/g," plus ").replace(/[^a-z0-9]+/g," ").trim();

const aliasMap = new Map();
for(const def of DEFINITIONS){
 for(const value of [def.id,def.name].concat(def.aliases||[])) aliasMap.set(normalize(value),def.id);
}
const extraAliases = {
 "powerheader":"power-header","precision header":"power-header","finesse":"finesse-shot",
 "incisive":"incisive-pass","throughpass":"through-ball","longball":"long-ball-pass",
 "pinged":"pinged-pass","quickstep":"quick-step","firsttouch":"first-touch",
 "pressproven":"press-proven","slidetackle":"slide-tackle","longthrow":"long-throw",
 "rushout":"rush-out","crossclaimer":"cross-claimer","farreach":"far-reach","farthrow":"far-throw"
};
for(const [a,id] of Object.entries(extraAliases)) aliasMap.set(normalize(a),id);

function htmlEsc(value){
 return String(value == null ? "" : value).replace(/[&<>"']/g,function(ch){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
 });
}
function listValues(value){
 if(value == null || value === "") return [];
 if(Array.isArray(value)) return value.flatMap(listValues);
 if(typeof value === "object"){
  if(value.name || value.label || value.id) return [value.name||value.label||value.id];
  return Object.values(value).flatMap(listValues);
 }
 let str=String(value).trim();
 if(!str)return [];
 if((str[0]==="["&&str[str.length-1]==="]")||(str[0]==="{"&&str[str.length-1]==="}")){
  try{return listValues(JSON.parse(str))}catch(e){}
 }
 return str.split(/[,;|]/).map(x=>x.trim()).filter(Boolean);
}
function canonical(value,forcePlus){
 let raw=String(value == null ? "" : value).trim();
 if(!raw)return null;
 const plus=!!forcePlus || /\+\s*$/.test(raw) || /\bplus\b/i.test(raw);
 raw=raw.replace(/\+\s*$/,"").replace(/\bplaystyle\s*\+?\s*:?\s*/i,"").trim();
 let key=normalize(raw).replace(/\bplus\b/g,"").trim();
 let id=aliasMap.get(key);
 if(!id){
  const compact=key.replace(/\s+/g,"");
  id=aliasMap.get(compact);
 }
 if(id){
  const def=byId.get(id);
  return {id:def.id,name:def.name,group:def.group,symbol:def.symbol,description:def.description,plus:plus};
 }
 const clean=raw || "PlayStyle";
 return {id:"custom-"+normalize(clean).replace(/\s+/g,"-"),name:clean,group:"Sonstige",symbol:"PS",description:"Individueller PlayStyle aus den hinterlegten Spielerdaten.",plus:plus};
}
function mergeStyle(map,style){
 if(!style || !style.id)return;
 const prev=map.get(style.id);
 if(!prev || style.plus) map.set(style.id,style);
}
function sourceStyles(normal,plus){
 const map=new Map();
 for(const raw of listValues(normal)) mergeStyle(map,canonical(raw,false));
 for(const raw of listValues(plus)) mergeStyle(map,canonical(raw,true));
 return Array.from(map.values());
}
function stat(player,key){const v=Number(player&&player[key]);return Number.isFinite(v)?v:0}
function rarity(player){
 const ovr=stat(player,"ovr");
 return ovr<65?"bronze":ovr<75?"silver":"gold";
}
function baseLimits(player){
 const r=rarity(player);
 return r==="bronze"?{total:2,plus:0}:r==="silver"?{total:3,plus:0}:{total:5,plus:1};
}
function scoreCandidate(rows,id,score){
 const current=rows.find(x=>x.id===id);
 if(current){if(score>current.score)current.score=score;return}
 rows.push({id:id,score:score});
}
function inferredCandidates(p){
 const pos=String(p&&p.position||"CM").toUpperCase();
 const pac=stat(p,"pac"),sho=stat(p,"sho"),pas=stat(p,"pas"),dri=stat(p,"dri"),def=stat(p,"def"),phy=stat(p,"phy"),ovr=stat(p,"ovr"),skills=stat(p,"skillMoves");
 const rows=[];
 const add=(id,score)=>scoreCandidate(rows,id,score);
 if(pos==="GK"){
  add("footwork",dri+ovr*.15);add("rush-out",pac+ovr*.12);add("cross-claimer",phy+ovr*.1);
  add("far-throw",pas+ovr*.08);add("far-reach",dri+phy*.25);add("deflector",ovr+def*.25);
 }else if(["ST","CF"].includes(pos)){
  add("finesse-shot",sho+pas*.08);add("power-shot",sho+phy*.12);add("first-touch",dri+pas*.08);
  add("rapid",pac+dri*.08);add("technical",dri+skills*2);add("aerial",phy+sho*.08);add("acrobatic",sho+dri*.08);
 }else if(["LW","RW","LM","RM"].includes(pos)){
  add("rapid",pac+dri*.12);add("quick-step",pac+dri*.08);add("technical",dri+skills*2);
  add("trickster",dri+skills*3);add("first-touch",dri+pas*.08);add("finesse-shot",sho+dri*.06);add("incisive-pass",pas+dri*.05);
 }else if(pos==="CAM"){
  add("technical",dri+skills*2);add("incisive-pass",pas+dri*.08);add("tiki-taka",pas+dri*.05);
  add("first-touch",dri+pas*.06);add("flair",dri+skills*2.5);add("finesse-shot",sho+dri*.05);add("trickster",dri+skills*2);
 }else if(pos==="CM"){
  add("tiki-taka",pas+dri*.06);add("incisive-pass",pas+sho*.04);add("long-ball-pass",pas+phy*.03);
  add("pinged-pass",pas+dri*.04);add("press-proven",dri+phy*.08);add("technical",dri+pas*.04);add("relentless",phy+def*.06);
 }else if(pos==="CDM"){
  add("anticipate",def+phy*.08);add("intercept",def+pas*.05);add("block",def+phy*.06);
  add("press-proven",dri+phy*.08);add("bruiser",phy+def*.08);add("long-ball-pass",pas+def*.03);add("jockey",def+pac*.05);
 }else if(pos==="CB"){
  add("anticipate",def+phy*.08);add("block",def+phy*.07);add("intercept",def+pas*.03);
  add("aerial",phy+def*.06);add("bruiser",phy+def*.07);add("slide-tackle",def+pac*.04);add("enforcer",phy+def*.05);
 }else if(["LB","RB","LWB","RWB"].includes(pos)){
  add("relentless",phy+pac*.06);add("quick-step",pac+dri*.05);add("rapid",pac+dri*.05);
  add("intercept",def+pac*.05);add("jockey",def+pac*.06);add("pinged-pass",pas+pac*.03);add("long-ball-pass",pas+phy*.03);add("bruiser",phy+def*.05);
 }else{
  add("first-touch",dri+pas*.05);add("relentless",phy+pac*.04);add("technical",dri+skills*2);
 }
 return rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
function derivedStyles(player){
 const ovr=stat(player,"ovr"),r=rarity(player),candidates=inferredCandidates(player);
 let target=r==="bronze"?(ovr>=61?2:1):r==="silver"?(ovr>=70?3:2):(ovr>=87?5:ovr>=82?4:3);
 const limits=baseLimits(player);
 target=Math.min(target,limits.total,candidates.length);
 const rows=candidates.slice(0,target).map(x=>{
  const def=byId.get(x.id);return {id:def.id,name:def.name,group:def.group,symbol:def.symbol,description:def.description,plus:false};
 });
 if(r==="gold"&&ovr>=89&&rows.length)rows[0]={...rows[0],plus:true};
 return rows;
}
function buildBase(player){
 const sourced=sourceStyles(player&&player.playstyles,player&&player.playstylesPlus);
 const rows=sourced.length?sourced:derivedStyles(player||{});
 const source=sourced.length?"fc27":"footera";
 return {styles:rows,source:source};
}
function enrichPlayer(player){
 if(!player || typeof player!=="object")return player;
 const built=buildBase(player);
 player._footeraPlaystyles={styles:built.styles.map(x=>({...x})),source:built.source};
 if(!sourceStyles(player.playstyles,player.playstylesPlus).length && built.styles.length){
  player.playstyles=built.styles.filter(x=>!x.plus).map(x=>x.name).join(", ");
  player.playstylesPlus=built.styles.filter(x=>x.plus).map(x=>x.name).join(", ");
 }
 return player;
}
function enrichPlayers(players){
 if(!Array.isArray(players))return players;
 for(const p of players)enrichPlayer(p);
 return players;
}
function itemKind(item,base){
 if(item && (item.evoDesign===true || Number(item.evo||0)>0 || (item.evoPlaystyles||[]).length || (item.evoPlaystylesPlus||[]).length))return "evolution";
 if(item && (String(item.eventType||"").startsWith("momentum") || item.eventName==="MOMENTUM"))return "momentum";
 if(item && item.variant==="icon-mid")return "icon";
 if(item && item.variant==="story")return "story";
 if(item && (item.eventType==="totw" || String(item.eventName||"").startsWith("Team of the Week")))return "totw";
 if(item && item.variant==="special")return "special";
 return rarity(base||{});
}
function cardLimits(kind,base){
 if(kind==="bronze")return{total:2,plus:0};
 if(kind==="silver")return{total:3,plus:0};
 if(kind==="gold")return{total:5,plus:1};
 if(kind==="totw")return{total:6,plus:1};
 if(kind==="story")return{total:6,plus:1};
 if(kind==="momentum")return{total:7,plus:1};
 if(kind==="icon")return{total:7,plus:2};
 if(kind==="evolution")return{total:8,plus:2};
 return{total:7,plus:2};
}
function signatureStyle(base,currentIds){
 const rows=inferredCandidates(base||{});
 for(const row of rows)if(currentIds.has(row.id))return row.id;
 return currentIds.values().next().value||null;
}
function complementaryStyle(base,currentIds){
 const rows=inferredCandidates(base||{});
 for(const row of rows)if(!currentIds.has(row.id))return canonical(row.id,false);
 return null;
}
function applyValues(map,value,plus){
 for(const raw of listValues(value))mergeStyle(map,canonical(raw,plus));
}
function resolve(base,item){
 if(!base)return{styles:[],normal:[],plus:[],kind:"gold",source:"footera"};
 let built=base._footeraPlaystyles;
 if(!built || !Array.isArray(built.styles)){enrichPlayer(base);built=base._footeraPlaystyles}
 const map=new Map();
 for(const style of built.styles||[])mergeStyle(map,{...style});
 applyValues(map,item&&item.playstyleAdds,false);
 applyValues(map,item&&item.playstyles,false);
 applyValues(map,item&&item.playstylePlusAdds,true);
 applyValues(map,item&&item.playstylesPlus,true);
 applyValues(map,item&&item.evoPlaystyle,false);
 applyValues(map,item&&item.evoPlaystyles,false);
 applyValues(map,item&&item.evoPlaystylePlus,true);
 applyValues(map,item&&item.evoPlaystylesPlus,true);
 const kind=itemKind(item,base);
 if(kind==="momentum"){
  const ids=new Set(map.keys());
  if(map.size<7){const extra=complementaryStyle(base,ids);if(extra)mergeStyle(map,extra)}
  if(!Array.from(map.values()).some(x=>x.plus)){
   const sig=signatureStyle(base,new Set(map.keys()));
   if(sig&&map.has(sig))map.set(sig,{...map.get(sig),plus:true});
  }
 }
 if(kind==="icon"&&!Array.from(map.values()).some(x=>x.plus)){
  const sig=signatureStyle(base,new Set(map.keys()));
  if(sig&&map.has(sig))map.set(sig,{...map.get(sig),plus:true});
 }
 const limits=cardLimits(kind,base);
 let rows=Array.from(map.values());
 let plusRows=rows.filter(x=>x.plus);
 if(plusRows.length>limits.plus){
  const keep=new Set(plusRows.slice(0,limits.plus).map(x=>x.id));
  rows=rows.map(x=>x.plus&&!keep.has(x.id)?{...x,plus:false}:x);
 }
 rows=rows.slice(0,limits.total);
 plusRows=rows.filter(x=>x.plus);
 return {styles:rows,normal:rows.filter(x=>!x.plus),plus:plusRows,kind:kind,source:built.source||"footera"};
}
function compactHTML(item,base){
 const data=resolve(base,item);
 if(!data.styles.length)return "";
 return '<div class="fc27-section footera-playstyle-compact"><div class="fc27-section-head"><strong>PlayStyles</strong><small>'+data.styles.length+' aktiv</small></div><div class="playstyle-chip-row">'+data.styles.map(function(style){
  return '<span class="playstyle-chip '+(style.plus?'plus':'')+'" title="'+htmlEsc(style.description)+'"><b>'+iconSVG(style)+'</b><span>'+htmlEsc(style.name)+(style.plus?'+':'')+'</span></span>';
 }).join("")+'</div></div>';
}
function profileHTML(item,base){
 const data=resolve(base,item);
 if(!data.styles.length)return "";
 const sourceLabel=data.source==="fc27"?"FC27-Spielerdaten":"Footera-Profil";
 return '<div class="bio-section footera-playstyles"><div class="playstyles-head"><h4>PlayStyles</h4><span>'+data.styles.length+' · '+htmlEsc(sourceLabel)+'</span></div><div class="playstyles-list">'+data.styles.map(function(style){
  return '<details class="playstyle-entry '+(style.plus?'plus':'')+'"><summary><span class="playstyle-icon">'+iconSVG(style)+'</span><span class="playstyle-copy"><strong>'+htmlEsc(style.name)+(style.plus?'+':'')+'</strong><small>'+htmlEsc(style.group)+'</small></span><span class="playstyle-chevron">›</span></summary><p>'+htmlEsc(style.description)+(style.plus?' PlayStyle+ verstärkt diesen Effekt zusätzlich.':'')+'</p></details>';
 }).join("")+'</div></div>';
}
function badgeHTML(item,base,mini){
 const data=resolve(base,item);
 if(!data.styles.length)return "";
 const label=data.styles.map(function(style){return style.name+(style.plus?"+":"")}).join(", ");
 return '<span class="playstyle-card-row '+(mini?'mini':'')+'" aria-label="PlayStyles: '+htmlEsc(label)+'">'+data.styles.map(function(style){
  return '<span class="playstyle-card-icon '+(style.plus?'plus':'')+'" title="'+htmlEsc(style.name)+(style.plus?'+':'')+'">'+iconSVG(style)+'</span>';
 }).join("")+'</span>';
}
const api={definitions:DEFINITIONS,resolve:resolve,enrichPlayer:enrichPlayer,enrichPlayers:enrichPlayers,profileHTML:profileHTML,compactHTML:compactHTML,badgeHTML:badgeHTML};
root.FooteraPlayStyles=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
