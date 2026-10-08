const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"club-identity.css"),"utf8");
const oldSymbols=["star","ball","bolt","diamond","crown","f","eagle","lion","wolf","flame","trophy","anchor","castle","sun","moon","cross","comet","skull"];
const newSymbols=["bull","bear","fox","horse","dragon","shark","snake","owl","scorpion","swords","shieldmark","fleur","gear","mountain","trident","target","waves","ram"];
const oldPatterns=["solid","stripes","hoops","diagonal","halves","sleeves"];
const newPatterns=["center","pinstripes","quarters","chevron","chestband","shoulders","sidepanels","reverse","doubleband","checkers","diamonds","fade","splitstripe","cuffs"];

test("existing crest symbols stay available and 18 new symbols are additive",()=>{
 for(const symbol of [...oldSymbols,...newSymbols])assert.match(html,new RegExp('data-crest-symbol="'+symbol+'"'),symbol);
 assert.equal((html.match(/data-crest-symbol=/g)||[]).length,36);
});
test("crest border has independent colour and four persisted strengths",()=>{
 assert.match(html,/borderColor:"#d8ff3e",borderWidth:"medium"/);
 assert.match(html,/id="identityCrestBorderColor" type="color"/);
 assert.match(html,/id="identityCrestBorderWidth"/);
 for(const strength of ["thin","medium","strong","massive"])assert.match(html,new RegExp('value="'+strength+'"'));
 assert.match(html,/borderColor:safeClubHex\(crest\.borderColor\|\|crest\.primary\|\|colors\.primary/);
 assert.match(css,/\.club-crest\.border-strong\{--crest-border-size:10px\}/);
 assert.match(css,/\.club-crest\.border-massive\{--crest-border-size:13px\}/);
});
test("all six previous kit patterns remain and seven new patterns are selectable",()=>{
 for(const pattern of [...oldPatterns,...newPatterns])assert.ok((html.match(new RegExp('value="'+pattern+'"',"g"))||[]).length>=2,pattern);
 for(const pattern of oldPatterns.filter(x=>x!=="solid"))assert.ok(css.includes(".kit-shirt.pattern-"+pattern),pattern);
 for(const pattern of newPatterns)assert.ok(css.includes(".kit-shirt.pattern-"+pattern),pattern);
});
test("exact colour transfer supports desktop drag/drop plus touch drag and tap fallback",()=>{
 for(const marker of ["text/x-footera-color","dragstart","dragover","drop","pointerdown","pointermove","pointerup","identityColorClipboard","elementFromPoint"])assert.ok(html.includes(marker),marker);
 assert.match(css,/\.identity-color-transfer\{/);
 assert.match(css,/\.identity-color-field\.color-drop-target\{/);
 assert.match(css,/touch-action:none/);
});
test("new kit patterns survive the 3D kit normalizer",async()=>{
 const M=await import("../3d-highlights-scene.mjs");
 for(const pattern of [...oldPatterns,...newPatterns]){
  const kits=M.kitColors({homeColor:"#137b78",homeSecondary:"#f0c34e",homePattern:pattern,homeShorts:"#111111",homeSocks:"#137b78",awayColor:"#ffffff",awaySecondary:"#222222",awayPattern:"solid",awayShorts:"#ffffff",awaySocks:"#ffffff",awayKitConfigured:true});
  assert.equal(kits.home.pattern,pattern);
 }
});
console.log("V21.06 Vereinsdesigner: Wappenrand, 36 Symbole, 13 Trikotmuster und Farbtransfer OK");

test("mini hero kits preserve repeating stripe patterns",()=>{
 for(const pattern of ["stripes","hoops","pinstripes"])assert.ok(css.includes(".kit-shirt.kit-mini.pattern-"+pattern),pattern);
});

test("every selectable editor pattern survives the Matchday clone unchanged",()=>{
 const vm=require('node:vm'),context={};vm.createContext(context);
 vm.runInContext(html.slice(html.indexOf('function defaultClubIdentity()'),html.indexOf('function ensureClubIdentityState()')),context);
 vm.runInContext(html.slice(html.indexOf('function matchKitClone('),html.indexOf('function generatedOpponentKits(')),context);
 const select=html.match(/id="identityHomePattern">([\s\S]*?)<\/select>/)[1];
 const patterns=[...select.matchAll(/value="([^"]+)"/g)].map(x=>x[1]);assert.equal(patterns.length,20);
 for(const pattern of patterns){
  const kit={pattern,shirtPrimary:'#173627',shirtSecondary:'#bb0011',shorts:'#172839',socks:'#aabbcc'};
  const saved=context.cleanClubIdentity({kits:{home:kit,away:kit}}).kits;
  for(const side of ['home','away'])assert.deepEqual(JSON.parse(JSON.stringify(context.matchKitClone(saved[side],context.defaultClubIdentity().kits[side]))),kit,pattern+' / '+side);
 }
 const fallback={pattern:'fade',shirtPrimary:'#112233',shirtSecondary:'#445566',shorts:'#778899',socks:'#aabbcc'};
 assert.deepEqual(JSON.parse(JSON.stringify(context.matchKitClone({pattern:'invalid',shirtPrimary:'no'},fallback))),fallback);
});
