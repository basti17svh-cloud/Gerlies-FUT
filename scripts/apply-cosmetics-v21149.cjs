// One-shot guarded V21.149 integration; executed by the dedicated CI workflow.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
let html=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
assert(html.includes("<title>Footera V21.148</title>"),"Unexpected base version; abort");
const patches=[
 ['<link rel="stylesheet" href="./squad-numbers.css?v=2185">','<link rel="stylesheet" href="./squad-numbers.css?v=2185">\n<link rel="stylesheet" href="./footera-cosmetic-evolutions.css?v=21149">'],
 ['<script src="./footera-time.js"></script>','<script src="./footera-time.js"></script>\n<script src="./footera-cosmetic-evolutions.js?v=21149"></script>'],
 ['<button class="evo-tab" data-evo-tab="active">Aktiv</button>','<button class="evo-tab" data-evo-tab="cosmetic">Dekorativ</button><button class="evo-tab" data-evo-tab="active">Aktiv</button>'],
 ['function cardClass(p,item){if(isFounderItem(item))return"founder";','function cardClass(p,item){if(isFounderItem(item))return"founder";if(item?.cosmeticDesign==="momentum")return"momentum";if(item?.cosmeticDesign==="totw")return"totw";if(item?.cosmeticDesign==="red")return"champions-red";if(item?.cosmeticDesign==="red-pro")return"champions-pro";'],
 ['const baseRare=isCardRare(p,item)&&!item?.variant&&cls!=="evolution";','const baseRare=isCardRare(p,item)&&!item?.variant&&!item?.cosmeticDesign&&cls!=="evolution";'],
 ['else if(activeEvoTab==="completed")$("evoGrid").innerHTML=renderEvoHistory("completed");','else if(activeEvoTab==="cosmetic")globalThis.FooteraCosmetics.render();else if(activeEvoTab==="completed")$("evoGrid").innerHTML=renderEvoHistory("completed");'],
 ['service-worker.js?v=21148','service-worker.js?v=21149']
];
for(const [a,b] of patches){const hits=html.split(a).length-1;assert.equal(hits,1,"Anchor drift: "+a.slice(0,65));html=html.replace(a,b)}
html=html.replaceAll("V21.148","V21.149");
assert(sw.includes('const CACHE="footera-v21-148-elite-catchup";'),"Wrong old cache");
sw=sw.replace('const CACHE="footera-v21-148-elite-catchup";','const CACHE="footera-v21-149-cosmetic-evolutions";');
sw=sw.replace('const SHELL=[','const SHELL=["./footera-cosmetic-evolutions.js?v=21149","./footera-cosmetic-evolutions.css?v=21149",');
for(const file of ["footera-cosmetic-evolutions.js","footera-cosmetic-evolutions.css"])assert(fs.existsSync(file),"New cosmetic asset missing "+file);
let n=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){if(/src=|type\s*=\s*["']module/i.test(m[1])||!m[2].trim())continue;new vm.Script(m[2]);n++}
new vm.Script(fs.readFileSync("footera-cosmetic-evolutions.js","utf8"));
assert(html.includes('data-evo-tab="cosmetic"')&&html.includes("FooteraCosmetics.render()"));
fs.writeFileSync("index.html",html);fs.writeFileSync("service-worker.js",sw);
console.log("V21.149 integrated; inline scripts compiled: "+n);
