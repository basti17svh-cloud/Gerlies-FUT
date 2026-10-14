// One-shot guarded V21.150 integration on main.
const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm");
let html=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
assert(html.includes("<title>Footera V21.149</title>"),"Unexpected base build, abort!");
const changes=[
 ['function sbcDraftStats(sbc,draft=sbcDraft(sbc.id)){',
  'function isTotwSbcItem(item){return !!item&&(item.cosmeticDesign==="totw"||String(item.eventType||"").toLowerCase().startsWith("totw")||/^team of the week/i.test(String(item.eventName||"")))}\nfunction isMomentumSbcItem(item){return !!item&&(item.cosmeticDesign==="momentum"||String(item.eventType||"").toLowerCase().startsWith("momentum")||item.eventName==="MOMENTUM")}\nfunction sbcDraftStats(sbc,draft=sbcDraft(sbc.id)){'],
 ['const maxSameClub=Math.max(0,...Object.values(clubCounts)),rareCount=items.filter(i=>!!i.variant||isCardRare(displayBase(i),i)).length,goldCount=items.filter(i=>rarityOf(displayBase(i))==="gold"||!!i.variant||!!i.evo).length,chem=sbcDraftChemistry(sbc,draft,map);',
  'const maxSameClub=Math.max(0,...Object.values(clubCounts)),rareCount=items.filter(i=>!!i.variant||!!i.cosmeticDesign||isCardRare(displayBase(i),i)).length,goldCount=items.filter(i=>rarityOf(displayBase(i))==="gold"||!!i.variant||!!i.evo||!!i.cosmeticDesign).length,chem=sbcDraftChemistry(sbc,draft,map);'],
 ['const totwCount=items.filter(i=>String(i.eventType||"").toLowerCase().startsWith("totw")||/^team of the week/i.test(String(i.eventName||""))).length,minTotwOk=!sbc.minTotw||totwCount>=sbc.minTotw;',
  'const totwCount=items.filter(isTotwSbcItem).length,minTotwOk=!sbc.minTotw||totwCount>=sbc.minTotw,momentumCount=items.filter(isMomentumSbcItem).length,minMomentumOk=!sbc.minMomentum||momentumCount>=sbc.minMomentum;'],
 ['&&minChemOk&&minTotwOk&&requiredClubOk','&&minChemOk&&minTotwOk&&minMomentumOk&&requiredClubOk'],
 ['minChemOk,totwCount,minTotwOk,requiredClubCount','minChemOk,totwCount,minTotwOk,momentumCount,minMomentumOk,requiredClubCount'],
 ['if(sbc.minTotw)reqs.push({label:"TOTW",value:', 'if(sbc.minMomentum)reqs.push({label:"MOMENTUM",value:String(stats.momentumCount)+"/"+String(sbc.minMomentum),ok:stats.minMomentumOk});\n  if(sbc.minTotw)reqs.push({label:"TOTW",value:'],
 ['const cls=x.item.variant||x.item.evo?"special":rarityOf(b);','const cls=x.item.variant||x.item.evo||x.item.cosmeticDesign?"special":rarityOf(b);'],
 ['if(item?.variant||item?.evo)return"special";return rarityOf(b)','if(item?.variant||item?.evo||item?.cosmeticDesign)return"special";return rarityOf(b)'],
 ['if(isStoryItem(item))return"STORY";\n if(isMomentumItem(item))return"MOMENTUM";',
  'if(isStoryItem(item))return"STORY";\n  if(item?.cosmeticDesign==="totw")return"TEAM OF THE WEEK · EVO";\n  if(item?.cosmeticDesign==="momentum")return"MOMENTUM · EVO";\n  if(item?.cosmeticDesign==="red")return"CHAMPIONS ROT";\n  if(item?.cosmeticDesign==="red-pro")return"CHAMPIONS ELITE ROT";\n  if(isMomentumItem(item))return"MOMENTUM";'],
 ['footera-cosmetic-evolutions.js?v=21149','footera-cosmetic-evolutions.js?v=21150'],
 ['service-worker.js?v=21149','service-worker.js?v=21150']
];
for(const [from,to] of changes){const n=html.split(from).length-1;assert(n>=1&&(n===1||from.includes('const cls=x.item.variant||x.item.evo?')),"Drift: "+from.slice(0,80)+" ("+n+")");html=html.replaceAll(from,to)}
html=html.replaceAll("V21.149","V21.150");
assert(sw.includes('const CACHE="footera-v21-149-cosmetic-evolutions"'),"Wrong old SW");
sw=sw.replace('const CACHE="footera-v21-149-cosmetic-evolutions"','const CACHE="footera-v21-150-sbc-special-types"');
sw=sw.replaceAll('footera-cosmetic-evolutions.js?v=21149','footera-cosmetic-evolutions.js?v=21150');
assert(html.includes('items.filter(isTotwSbcItem)')&&html.includes('items.filter(isMomentumSbcItem)'));
let count=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){if(/src=|type\s*=\s*["']module/i.test(m[1])||!m[2].trim())continue;new vm.Script(m[2]);count++}
new vm.Script(fs.readFileSync("footera-cosmetic-evolutions.js","utf8"));
assert(count>0&&html.includes("Footera V21.150")&&sw.includes("footera-v21-150"));
fs.writeFileSync("index.html",html);fs.writeFileSync("service-worker.js",sw);
console.log("V21.150 integrated; compiled inline scripts: "+count);

// Re-run verified integration after test extraction fix.
