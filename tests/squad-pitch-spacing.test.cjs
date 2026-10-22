const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=require('./helpers/app-html.cjs')(root);
const css=fs.readFileSync(path.join(root,"ux-clarity.css"),"utf8");

const ctx={};
vm.runInNewContext(html.slice(html.indexOf('const FORMATIONS={'),html.indexOf('const ROLE_OPTIONS='))+html.slice(html.indexOf('const PITCH_SPOTS='),html.indexOf('function slotHTML('))+';this.FORMATIONS=FORMATIONS;this.squadPitchSpots=squadPitchSpots;',ctx);

test("V21.217 squad pitch: no card or chemistry tag covers another card in any formation",()=>{
 // Same geometry as ux-clarity.css: slot width 18%, pitch aspect .68, card aspect 1.42, tag hangs ~1.1% below the card.
 const W=18,H=W*1.42*.68,TAG=1.1;
 const names=Object.keys(ctx.FORMATIONS);assert.ok(names.length>=11);
 for(const name of names){
  const spots=ctx.squadPitchSpots(ctx.FORMATIONS[name]);
  assert.equal(spots.length,11,name);
  spots.forEach((a,i)=>{
   assert.ok(a.x-W/2>=0&&a.x+W/2<=100&&a.y-H/2>=0&&a.y+H/2+TAG<=100,`${name}: spot ${i} leaves the pitch`);
   spots.forEach((b,j)=>{if(j<=i)return;const[up,lo]=a.y<=b.y?[a,b]:[b,a];
    assert.ok(Math.abs(a.x-b.x)>=W||lo.y-up.y>=H+TAG,`${name}: slots ${i} and ${j} overlap`)});
  });
  assert.strictEqual(ctx.squadPitchSpots(ctx.FORMATIONS[name]),spots,"spots are cached per formation");
 }
});

test("V21.217 chem style sits with the chemistry diamonds in one tag outside the card flow",()=>{
 const slot=html.slice(html.indexOf('function slotHTML('),html.indexOf('function renderSquad('));
 assert.match(slot,/cardHTML\(base,item,true,shown,false\)/);
 assert.match(slot,/FooteraChemBoosts\.badgeHTML\(item,true\)/);
 assert.match(slot,/<div class="chem-dots\$\{boost\?" has-boost":""\}"[^>]*>\$\{boost\}/);
 assert.match(slot,/style="left:\$\{spot\.x\}%;top:\$\{spot\.y\}%"/);
 assert.match(css,/#pitch \.slot>\.chem-dots\{position:absolute;[^}]*top:100%/);
 assert.match(css,/#pitch\{aspect-ratio:\.68\}/);
 assert.match(css,/#pitch \.slot\{width:18%\}/);
});
