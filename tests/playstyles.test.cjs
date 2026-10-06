const assert=require("assert");
const fs=require("fs");
const vm=require("vm");
const path=require("path");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"playstyles.js"),"utf8");
const sandbox={console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:"playstyles.js"});
const ps=sandbox.FooteraPlayStyles;
assert(ps,"FooteraPlayStyles export fehlt");
assert.strictEqual(ps.definitions.length,36,"Es müssen genau 36 PlayStyles registriert sein");

const raw={id:"raw",name:"Raw",ovr:88,position:"CAM",pac:85,sho:82,pas:87,dri:91,def:45,phy:67,playstyles:"Technical, First Touch",playstylesPlus:"Trickster"};
ps.enrichPlayer(raw);
let resolved=ps.resolve(raw,{});
assert(resolved.styles.some(x=>x.name==="Technik"),"Technical muss als Technik normalisiert werden");
assert(resolved.styles.some(x=>x.name==="First Touch"),"First Touch fehlt");
assert(resolved.plus.some(x=>x.name==="Tricks"),"Trickster+ muss als Tricks+ normalisiert werden");

const bronze={id:"b",name:"Bronze",ovr:62,position:"ST",pac:68,sho:61,pas:49,dri:63,def:30,phy:64};
ps.enrichPlayer(bronze);
resolved=ps.resolve(bronze,{});
assert(resolved.styles.length<=2,"Bronze darf maximal 2 PlayStyles haben");
assert.strictEqual(resolved.plus.length,0,"Bronze darf kein PlayStyle+ haben");

const elite={id:"e",name:"Elite",ovr:91,position:"CAM",pac:91,sho:88,pas:90,dri:94,def:48,phy:74,skillMoves:5};
ps.enrichPlayer(elite);
resolved=ps.resolve(elite,{});
assert(resolved.styles.length<=5,"Gold-Basis darf maximal 5 PlayStyles haben");
assert(resolved.plus.length<=1,"Gold-Basis darf maximal 1 PlayStyle+ haben");

const momentum=ps.resolve(elite,{variant:"special",eventType:"momentum",eventName:"MOMENTUM"});
assert(momentum.styles.length<=7,"MOMENTUM darf maximal 7 PlayStyles haben");
assert.strictEqual(momentum.plus.length,1,"MOMENTUM soll genau ein PlayStyle+ besitzen");

const totw=ps.resolve(raw,{variant:"special",eventType:"totw",eventName:"Team of the Week 3"});
assert(totw.styles.length<=6,"TOTW darf maximal 6 PlayStyles haben");
assert(totw.plus.length<=1,"TOTW darf maximal 1 PlayStyle+ haben");
const explicitTotw=ps.resolve(raw,{variant:"special",eventType:"totw",eventName:"Team of the Week 3",playstyleAdds:["Finesse Shot"]});
assert(explicitTotw.styles.some(x=>x.name==="Angeschnittener Schuss"),"Expliziter TOTW-PlayStyle fehlt");

const evo=ps.resolve(raw,{evoDesign:true,evoPlaystyles:["Rapid"],evoPlaystylesPlus:["Technical"]});
assert(evo.plus.some(x=>x.name==="Technik"),"Evolution muss vorhandenen PlayStyle zu PlayStyle+ aufwerten");
assert(evo.styles.length<=8,"Evolution darf maximal 8 PlayStyles haben");

const html=ps.profileHTML({},raw);
assert(/PlayStyles/.test(html)&&/Technik/.test(html),"Spielerprofil muss PlayStyles darstellen");
assert(/playstyle-glyph/.test(html),"Spielerprofil muss symbolische PlayStyle-Icons verwenden");
const cardBadge=ps.badgeHTML({},raw,false);
assert(/playstyle-card-row/.test(cardBadge)&&/playstyle-card-icon/.test(cardBadge),"Karten brauchen eine dezente Symbolreihe");
assert((cardBadge.match(/playstyle-card-icon/g)||[]).length===3,"Alle aktiven PlayStyles müssen auf der Karte symbolisch sichtbar sein");
assert(!/playstyle-plus-card-badge/.test(cardBadge),"Der alte einzelne Buchstaben-Kreis darf nicht mehr erscheinen");
const playstyleCss=fs.readFileSync(path.join(root,"playstyles.css"),"utf8");
assert(/below the stats/.test(playstyleCss)&&/card-alt-positions/.test(playstyleCss),"PlayStyle-Symbole müssen getrennt von Stats und Nebenpositionen liegen");
assert(/background:rgba\(4,8,11,.84\);color:#f7fbff/.test(playstyleCss),"Normale PlayStyle-Icons brauchen neutralen Hochkontrast statt Ton-in-Ton");
assert(/\.mini \.card-shell>\.playstyle-card-row \.playstyle-card-icon/.test(playstyleCss),"Aufstellungs-Icons brauchen eine eigene kompakte Darstellung");

const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert(index.includes("./playstyles.js?v=2094"),"PlayStyle-Script ist nicht eingebunden");
assert(index.includes("./playstyles.css?v=2094"),"PlayStyle-CSS ist nicht eingebunden");
assert(index.includes("FooteraPlayStyles.enrichPlayers(PLAYERS)"),"Spielerdaten werden nicht mit PlayStyles angereichert");
assert(index.includes("FooteraPlayStyles.profileHTML(item,b)"),"Spielerbiografie zeigt PlayStyles nicht an");
assert(index.includes('const GFUT_BUILD="V20.94"'),"Build wurde nicht auf V20.94 erhöht");

const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
assert(sw.includes("./playstyles.js?v=2094")&&sw.includes("./playstyles.css?v=2094"),"Service Worker cached PlayStyle-Dateien nicht");
console.log("PlayStyle-System: 36 Definitionen, Basis/Spezial/Evolution/UI/Cache OK");
