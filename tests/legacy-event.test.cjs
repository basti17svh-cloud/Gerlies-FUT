const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const css=read("legacy-card.css"),layout=read("card-layout.css"),playstyles=read("playstyles.css"),html=read("index.html"),sw=read("service-worker.js");
test("Legacy renderer remains universal in every view",()=>{
 assert.match(html,/function cardHTML\(p,item=null,mini=false/);
 assert.match(html,/cls==="legacy"\?" legacy-shell"/);
 assert.match(html,/cardStatPairs\(p\)\.map/);
 assert.match(html,/\$\{cardAltPositionsHTML\(p,pos\)\}/);
 assert.match(html,/\$\{playstyleMarker\}/);
 assert.match(html,/\.\/legacy-card\.css\?v=21158/);
});
test("Legacy uses violet art with the golden title/frame and no residual ruby",()=>{
 assert.match(css,/linear-gradient\(153deg,#080411/);
 assert.match(css,/content:"LEGACY EVENT"/);
 assert.match(css,/\.legacy-frame \.outer\{fill:none;stroke:#f6d793/);
 assert.doesNotMatch(css,/#ff2846|#750415|#84061e|#dd2042|#b10931|#ff244b/i);
 const aura=read("assets/footera/legacy-event-aura.svg");
 assert.match(aura,/id="amethyst"/);assert.doesNotMatch(aura,/ruby|#670313|#e5183c/i);
 assert.doesNotMatch(html.slice(html.indexOf("const legacyDecor="),html.indexOf(";const founderTheme=")),/#b10931|#6c0517|#dd2042|#ff244b|#cf1740|#ff5367/i);
});
test("Legacy-only coordinates reserve separate slots for portrait, six attributes, PlayStyles and alternate positions",()=>{
 assert.match(layout,/\.card-shell\.legacy-shell \.custom-card\.legacy\{/);
 for(const field of ["--card-name-top:62.5%","--card-bottom-bottom:17%","--card-portrait-top:15%","--card-portrait-height:47%","--card-emblems-top:39%"])assert.ok(layout.includes(field),field);
 assert.match(playstyles,/\.card-shell\.legacy-shell:has\(\.card-alt-positions\)>\.playstyle-card-row\{bottom:9.1%\}/);
 assert.match(playstyles,/\.custom-card\.legacy \.card-alt-positions\{bottom:2.8%!important\}/);
 assert.match(css,/\.legacy-shell \.custom-card\.legacy \.face img/);
});
test("V21.158 resources and application cache are coordinated",()=>{
 assert.match(html,/<title>Footera V21\.158<\/title>/);
 assert.match(html,/const GFUT_BUILD="V21\.158"/);
 assert.match(html,/service-worker\.js\?v=21158/);
 assert.match(sw,/const CACHE="footera-v21-158-legacy-violet"/);
 for(const asset of ["legacy-card.css?v=21158","card-layout.css?v=21158","playstyles.css?v=21158","assets/footera/legacy-event-aura.svg"])assert.ok(sw.includes(asset),"cache "+asset);
});
