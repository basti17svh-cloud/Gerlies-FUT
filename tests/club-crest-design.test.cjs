const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'club-crest-art.js'),'utf8');
function api(){const c={window:{}};vm.createContext(c);vm.runInContext(code,c);return c.window.FooteraCrestArt}
function normalize(raw){const c={};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function defaultClubIdentity()'),html.indexOf('function ensureClubIdentityState()')),c);return JSON.parse(JSON.stringify(c.cleanClubIdentity(raw)))}
const crest={shape:'shield',symbol:'lion',primary:'#184b36',secondary:'#102d23',accent:'#f5f5f5',borderColor:'#bf2b32',symbolColor:'#aabbcc',textColor:'#112233',borderWidth:'medium',initials:'FCG05'};
test('all 36 motifs including eagle use recolourable vectors',()=>{
 const a=api();assert.equal(a.keys.length,36);assert.equal(new Set(a.keys).size,36);
 for(const key of a.keys){assert.match(a.emblemIcon(key),/<svg/);assert.doesNotMatch(a.emblemIcon(key),/🦅|🦁|🐺/)}
});
test('optional stars never appear by default and all badge parts have independent colours',()=>{
 const a=api();assert.doesNotMatch(a.render(crest),/data-crest-star/);
 for(const n of [0,1,2,3])assert.equal((a.render({...crest,stars:n}).match(/data-crest-star/g)||[]).length,n);
 const out=a.render(crest);assert.match(out,/color="#aabbcc"/);assert.match(out,/fill="#112233">FCG05/);assert.match(out,/stroke="#bf2b32"/);
 assert.match(a.render({...crest,initials:'<img>'}),/&lt;img&gt;/);
 assert.doesNotMatch(a.render({...crest,primary:'" onload="alert(1)'}),/onload/);
});
test('seven different silhouettes, true circular badge and varied club templates',()=>{
 const a=api(),shapes=new Set();
 for(const shape of ['shield','round','hex','point','modern','oval','diamond'])shapes.add(a.render({...crest,shape}).match(/clipPath[^>]*><path d="([^"]+)/)[1]);
 assert.equal(shapes.size,7);assert.match(a.render({...crest,shape:'round'}),/a88 88/);
 assert.equal(Object.keys(a.presets).length,6);assert.ok(Object.values(a.presets).filter(p=>p.crest.stars===0).length>=5);
 for(const width of ['thin','medium','strong','massive'])assert.match(a.render({...crest,borderWidth:width}),new RegExp('border-'+width));
});
test('legacy saves migrate safely and independent options survive repeated JSON save/load',()=>{
 const old=normalize({crest:{symbol:'eagle',accent:'#345678',initials:'FCG05'}});
 assert.equal(old.crest.symbolColor,'#345678');assert.equal(old.crest.textColor,'#ffffff');assert.equal(old.crest.stars,0);
 const x=normalize({crest:{...crest,shape:'oval',field:'quarters',decoration:'laurel',stars:2},kits:{home:{pattern:'diamonds'},away:{pattern:'reverse'}}});
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(x))),x);
 const bad=normalize({crest:{stars:99,symbolColor:'red',textColor:'<img>',field:'invalid',decoration:'x'}});
 assert.equal(bad.crest.stars,0);assert.equal(bad.crest.symbolColor,'#ffffff');assert.equal(bad.crest.field,'solid');
});
test('full editor previews pass mini=false and matching cache-busted assets ship together',()=>{
 for(const side of ['home','away'])assert.ok(html.includes(`kitHTML(x.kits.${side},false,x.crest)`));
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const asset of ['club-crest-art.js','club-crest-premium.css','club-identity.css']){assert.ok(html.includes(asset+'?v=2130'));assert.ok(sw.includes(asset+'?v=2130'))}
});
