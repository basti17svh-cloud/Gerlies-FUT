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
  return '<span class="playstyle-chip '+(style.plus?'plus':'')+'" title="'+htmlEsc(style.description)+'"><b>'+htmlEsc(style.symbol)+'</b><span>'+htmlEsc(style.name)+(style.plus?'+':'')+'</span></span>';
 }).join("")+'</div></div>';
}
function profileHTML(item,base){
 const data=resolve(base,item);
 if(!data.styles.length)return "";
 const sourceLabel=data.source==="fc27"?"FC27-Spielerdaten":"Footera-Profil";
 return '<div class="bio-section footera-playstyles"><div class="playstyles-head"><h4>PlayStyles</h4><span>'+data.styles.length+' · '+htmlEsc(sourceLabel)+'</span></div><div class="playstyles-list">'+data.styles.map(function(style){
  return '<details class="playstyle-entry '+(style.plus?'plus':'')+'"><summary><span class="playstyle-icon">'+htmlEsc(style.symbol)+'</span><span class="playstyle-copy"><strong>'+htmlEsc(style.name)+(style.plus?'+':'')+'</strong><small>'+htmlEsc(style.group)+'</small></span><span class="playstyle-chevron">›</span></summary><p>'+htmlEsc(style.description)+(style.plus?' PlayStyle+ verstärkt diesen Effekt zusätzlich.':'')+'</p></details>';
 }).join("")+'</div></div>';
}
function badgeHTML(item,base,mini){
 const data=resolve(base,item),style=data.plus[0];
 if(!style)return "";
 return '<span class="playstyle-plus-card-badge '+(mini?'mini':'')+'" title="'+htmlEsc(style.name)+'+" aria-label="PlayStyle+ '+htmlEsc(style.name)+'"><b>'+htmlEsc(style.symbol)+'</b><i>+</i></span>';
}
const api={definitions:DEFINITIONS,resolve:resolve,enrichPlayer:enrichPlayer,enrichPlayers:enrichPlayers,profileHTML:profileHTML,compactHTML:compactHTML,badgeHTML:badgeHTML};
root.FooteraPlayStyles=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
