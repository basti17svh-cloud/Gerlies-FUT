const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,".."),html=fs.readFileSync(path.join(root,"index.html"),"utf8"),css=fs.readFileSync(path.join(root,"club-crest-premium.css"),"utf8");
const code=fs.readFileSync(path.join(root,"club-crest-art.js"),"utf8"),sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
function api(){const context={window:{}};vm.createContext(context);vm.runInContext(code,context);return context.window.FooteraCrestArt}
const crest={shape:"shield",symbol:"shieldmark",primary:"#184b36",secondary:"#102d23",accent:"#f5f5f5",borderColor:"#bf2b32",borderWidth:"medium",initials:"FCG05"};
test("all 36 motifs exist, 35 use dedicated vector illustrations and the eagle remains unchanged",()=>{
 const a=api();assert.equal(a.keys.length,36);assert.equal(new Set(a.keys).size,36);
 for(const key of a.keys){const icon=a.emblemIcon(key);if(key==="eagle"){assert.match(icon,/🦅/);assert.doesNotMatch(icon,/<svg/)}else{assert.match(icon,/<svg/);assert.match(icon,/<(path|circle)/);assert.doesNotMatch(icon,/🐺|🐻|🐂|🦈|🐉|🐍|🦂|🦊|🦁|🐏/)}}
});
test("long 5-character club initials sit inside the medal banner and cannot be HTML injected",()=>{
 const a=api(),shield=a.render(crest);
 assert.match(shield,/FCG05<\/text>/);assert.match(shield,/font-size="24"/);
 assert.match(shield,/M27 175 42 171H158L173 175/);
 assert.match(shield,/linearGradient/);assert.match(shield,/#bf2b32/);
 assert.match(a.render({...crest,initials:'<img>'}),/&lt;img&gt;/);
});
test("all five badge shapes and four widths are still supported, with dedicated metallic shading",()=>{
 const a=api(),results=new Set();
 for(const shape of ["shield","round","hex","point","modern"]){const out=a.render({...crest,shape});assert.match(out,new RegExp('shape-'+shape));results.add(out.match(/<path d="([^"]+)" fill="url/)[1])}
 assert.equal(results.size,5);
 for(const width of ["thin","medium","strong","massive"]){const out=a.render({...crest,borderWidth:width});assert.match(out,new RegExp('border-'+width));assert.match(out,/scale\(/)}
 const bird=a.render({...crest,symbol:"eagle"});assert.match(bird,/>🦅<\/text>/);
});
test("actual identity editor and both kit previews use the new art without rewriting save data",()=>{
 assert.match(html,/FooteraCrestArt\.render\(c,mini\)/);assert.match(html,/FooteraCrestArt\?\.enhanceOptions/);
 assert.match(html,/kitHTML\(x\.kits\.home,true,x\.crest\)/);assert.match(html,/kitHTML\(x\.kits\.away,true,x\.crest\)/);
 assert.match(html,/club-crest-art\.js\?v=2129/);assert.match(html,/club-crest-premium\.css\?v=2129/);
 assert.match(sw,/club-crest-art\.js\?v=2129/);assert.match(sw,/club-crest-premium\.css\?v=2129/);
 assert.match(css,/\.club-crest-art/);assert.match(css,/@media\(max-width:380px\)/);
 assert.match(html,/const GFUT_BUILD="V21\.29"/);
});
