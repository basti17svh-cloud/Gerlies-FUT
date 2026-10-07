const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../chem-boosts.js'),html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const base=Object.freeze({name:'L. König',ovr:88,position:'CAM',pac:86,sho:84,pas:84,dri:87,def:65,phy:78});
const fresh=()=>({club:[{uid:'one',pid:'one',eventStats:[86,84,84,87,65,78]}],chemBoostInventory:Object.fromEntries(C.DEFINITIONS.map(d=>[d.id,4]))});
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
test('twelve centralized definitions match German labels, colors and reference arrows',()=>{
 assert.equal(C.DEFINITIONS.length,12);assert.deepEqual(C.ATTRIBUTES.map(x=>x.short),['TEM','SCH','PAS','DRI','DEF','PHY']);
 const arrows=[
  {pac:3,sho:3},{pac:2,pas:2,dri:2},{pac:3,def:3},{def:3,phy:3},{pas:3,dri:3},{pac:1,sho:1,pas:1,dri:1,def:1,phy:1},
  {sho:3,dri:3},{sho:3,phy:3},{pas:3,phy:3},{pac:3,pas:3},{pac:2,sho:2,phy:2},{sho:2,pas:2,dri:2}
 ];
 C.DEFINITIONS.forEach((d,i)=>{assert.deepEqual(d.arrows,arrows[i]);const card=C.cardHTML(d.id);assert.match(card,/CHEMIE-BOOST/);assert.match(card,new RegExp(d.name.toUpperCase()));assert.doesNotMatch(card,/PAC|SHO|STYLE|SPIELSTIL/);for(const a of C.ATTRIBUTES)if(d.arrows[a.key]){assert.ok(card.includes(a.name.toUpperCase()));assert.ok(card.includes('↑'.repeat(d.arrows[a.key])))} });
 assert.equal(new Set(C.DEFINITIONS.map(d=>d.symbol)).size,12);assert.equal(new Set(C.DEFINITIONS.map(d=>d.color)).size,12);
});
for(const d of C.DEFINITIONS)test(`${d.name}: zero, reduced, middle and full chemistry leave bases and OVR intact`,()=>{
 const item=Object.freeze({chemBoost:Object.freeze({id:d.id})}),snapshot=JSON.stringify(base);
 for(let chem=0;chem<=3;chem++){const e=C.effect(base,item,chem);assert.equal(e.values.ovr,88);for(const a of C.ATTRIBUTES){const expected=Math.round(C.CONFIG.arrowBonus[d.arrows[a.key]||0]*C.CONFIG.chemScale[chem]);assert.equal(e.values[a.key],base[a.key]+expected)}assert.equal(JSON.stringify(base),snapshot)}
});
test('attribute cap, invalid IDs and centrally configurable numbers',()=>{
 assert.equal(C.effect({...base,pac:98},{chemBoost:{id:'vollstrecker'}},3).values.pac,99);
 assert.deepEqual(C.effect(base,{chemBoost:{id:'future'}},3).values,base);
 assert.equal(C.effect(base,{chemBoostId:'vollstrecker'},1,{...C.CONFIG,arrowBonus:[0,3,6,9]}).values.pac,89);
});
test('apply consumes exactly one and only attaches data, including after JSON save/reload',()=>{
 const s=fresh(),stats=JSON.stringify(s.club[0].eventStats);assert.equal(C.apply(s,'one','vollstrecker').ok,true);
 assert.equal(s.chemBoostInventory.vollstrecker,3);assert.equal(JSON.stringify(s.club[0].eventStats),stats);assert.equal(C.active(JSON.parse(JSON.stringify(s)).club[0]).id,'vollstrecker');
 assert.equal(C.apply(s,'one','vollstrecker',{expected:'vollstrecker',confirmed:true}).ok,false);assert.equal(s.chemBoostInventory.vollstrecker,3);
});
test('cancelled/stale replacements, insufficient stock and missing players never consume',()=>{
 const s=fresh();C.apply(s,'one','vollstrecker');const snapshot=JSON.stringify(s);
 assert.equal(C.apply(s,'one','dynamo',{expected:'vollstrecker'}).reason,'confirmation');assert.equal(JSON.stringify(s),snapshot);
 assert.equal(C.apply(s,'one','dynamo',{confirmed:true,expected:null}).reason,'changed');assert.equal(JSON.stringify(s),snapshot);
 assert.equal(C.apply(s,'missing','dynamo').ok,false);s.chemBoostInventory.dynamo=0;
 assert.equal(C.apply(s,'one','dynamo',{confirmed:true,expected:'vollstrecker'}).reason,'empty');assert.equal(C.active(s.club[0]).id,'vollstrecker');
});
test('confirmed replacement consumes one new item, never stacks and never refunds the old one',()=>{
 const s=fresh();C.apply(s,'one','vollstrecker');assert.equal(C.apply(s,'one','dynamo',{confirmed:true,expected:'vollstrecker'}).ok,true);
 assert.equal(s.chemBoostInventory.vollstrecker,3);assert.equal(s.chemBoostInventory.dynamo,3);assert.equal(C.active(s.club[0]).id,'dynamo');
 assert.equal(C.effect(base,s.club[0],3).values.sho,84);assert.equal(C.effect(base,s.club[0],3).values.pac,90);
});
test('old saves load without boosts and malformed inventory counts are safe',()=>{
 const old={club:[{uid:'one',pid:'one'}]};assert.equal(C.active(old.club[0]),null);assert.deepEqual(C.effect(base,old.club[0],3).values,base);assert.equal(C.count(old,'vollstrecker'),0);
 old.chemBoostInventory={vollstrecker:-5,dynamo:'4.9',bollwerk:Infinity};assert.equal(C.count(old,'vollstrecker'),0);assert.equal(C.count(old,'dynamo'),4);assert.equal(C.count(old,'bollwerk'),0);
});
test('extra pack slots stack items separately, survive reload and prevent duplicate claims',()=>{
 let n=0;const pack={id:'gold',type:'gold',count:12},players=Array(12).fill(base),s={pendingPack:players,pendingChemBoosts:C.rollPack(pack,()=>0,()=>`boost${n++}`)};
 assert.equal(s.pendingPack.length,12);assert.equal(s.pendingChemBoosts.length,1);let reloaded=JSON.parse(JSON.stringify(s));assert.equal(C.collect(reloaded,'boost0'),true);assert.equal(C.collect(reloaded,'boost0'),false);assert.equal(C.count(reloaded,'vollstrecker'),1);
 reloaded.pendingChemBoosts=C.rollPack({id:'promo',promo:true},()=>0,()=>`boost${n++}`);assert.equal(C.collectAll(reloaded),2);assert.equal(C.count(reloaded,'vollstrecker'),3);assert.equal(reloaded.pendingPack.length,12);
 assert.equal(C.rollPack(pack,()=>.999).length,0);assert.equal(C.rollPack({id:'bronze',type:'bronze'},()=>0).length,0);assert.equal(C.rollPack({id:'founder-bastian',type:'founder'},()=>0).length,0);
});
test('all twelve definitions can actually drop with weighted rarity',()=>{
 const total=C.DEFINITIONS.reduce((sum,d)=>sum+(d.dropWeight||1),0);let before=0;
 for(const d of C.DEFINITIONS){
  const midpoint=(before+(d.dropWeight||1)/2)/total;let calls=0;
  const rows=C.rollPack({chemBoostSlots:{slots:1,chance:1}},()=>calls++===0?0:midpoint,()=>d.id);
  assert.equal(rows[0].chemBoostId,d.id);before+=d.dropWeight||1
 }
});

test('Vollstrecker and Bollwerk remain rarest; Abfangjäger is the next-rarest Chemie-Boost',()=>{
 const weights=Object.fromEntries(C.DEFINITIONS.map(d=>[d.id,d.dropWeight||1]));
 assert.equal(weights.vollstrecker,.4);assert.equal(weights.bollwerk,.4);assert.equal(weights.abfangjaeger,.6);
 const others=Object.entries(weights).filter(([id])=>!['vollstrecker','bollwerk','abfangjaeger'].includes(id)).map(([,w])=>w);
 assert.ok(Math.min(...others)>.6);
 const total=Object.values(weights).reduce((a,b)=>a+b,0);
 assert.ok(weights.vollstrecker/total<.05);assert.ok(weights.bollwerk/total<.05);
 assert.ok(weights.abfangjaeger/total>.055&&weights.abfangjaeger/total<.07);
});
test('profile shows only attributes configured for the active boost, with base → effective and unchanged OVR',()=>{
 const markup=C.profileHTML(base,{chemBoost:{id:'vollstrecker'}},3);assert.match(markup,/86 <i>→<\/i> 92/);assert.match(markup,/84 <i>→<\/i> 90/);assert.equal((markup.match(/class="cb-value /g)||[]).length,2);assert.equal((markup.match(/cb-value improved/g)||[]).length,2);assert.doesNotMatch(markup,/Passspiel|Dribbling|Defensive|Physis/);assert.match(markup,/3\/3 individuelle Chemie/);assert.match(markup,/Gesamtwertung bleibt 88/);
 const zero=C.profileHTML(base,{chemBoost:{id:'vollstrecker'}},0);assert.equal((zero.match(/class="cb-value /g)||[]).length,2);assert.equal((zero.match(/cb-value improved/g)||[]).length,0);assert.doesNotMatch(zero,/Passspiel|Dribbling|Defensive|Physis/);
 const allrounder=C.profileHTML(base,{chemBoost:{id:'allrounder'}},3);assert.equal((allrounder.match(/class="cb-value /g)||[]).length,6);
 assert.equal(C.badgeHTML({}), '');assert.match(C.badgeHTML({chemBoost:{id:'dynamo'}},true),/cb-symbol-only/);
});
test('real local match adapters use effective attributes on both sides with frozen chemistry; bench has zero',()=>{
 const s=fresh();C.apply(s,'one','vollstrecker');s.squad=['one'];const away={...base,id:'away'},awayItem={chemBoost:{id:'dynamo'}};
 const ctx={FooteraChemBoosts:C,state:s,match:{clubIndex:new Map(s.club.map(i=>[i.uid,i])),initialStarters:['one'],lineup:['one'],chemBoostChem:[3],opponentProfile:{squad:[away],items:[awayItem],chemScores:[2]}},displayBase:()=>base,resolvedPlayer:x=>x,P_BY_ID:new Map()};
 vm.createContext(ctx);vm.runInContext(section('function chemBoostPlayerChem(','function currentMatchRating(')+section('function opponentMatchBase(','function chooseOpponentScorer('),ctx);
 assert.equal(ctx.currentMatchBase('one').pac,92);assert.equal(ctx.opponentMatchBase(away).pac,89);assert.equal(ctx.opponentMatchBase(away).pas,87);assert.equal(base.pac,86);
 ctx.match.chemBoostChem=[0];assert.equal(ctx.currentMatchBase('one').pac,86);ctx.match.initialStarters=[];ctx.match.chemBoostChem=[3];assert.equal(ctx.currentMatchBase('one').pac,86);
});
test('unresolved consumables keep pack results open; collected-only pack finishes',()=>{
 const ctx={pendingPack:[],pendingResolved:new Set(),state:{pendingChemBoosts:[{uid:'x'}]},closed:0,closeResolvedPackResults(){ctx.closed++}};
 vm.createContext(ctx);vm.runInContext(section('function finishPackIfResolved(','function packResultsRefresh('),ctx);assert.equal(ctx.finishPackIfResolved(),false);assert.equal(ctx.closed,0);ctx.state.pendingChemBoosts=[];assert.equal(ctx.finishPackIfResolved(),true);assert.equal(ctx.closed,1);
});
test('pack-result Chemie-Boost cards use the same responsive grid density as player cards',()=>{
 const css=fs.readFileSync(require('node:path').join(__dirname,'../chem-boosts.css'),'utf8');
 assert.match(css,/\.cb-pack-items\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:6px\}/);
 assert.match(css,/@media\(max-width:560px\)[\s\S]*?\.cb-pack-items\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:6px\}/);
 assert.match(css,/\.cb-pack-item \.cb-card\{[^}]*aspect-ratio:\.72/);
 assert.match(css,/\.cb-pack-item \.cb-card-inner\{height:100%;min-height:0/);
});

test('new scripts and stylesheet are available offline and shell versioning stays consistent',()=>{
 const sw=fs.readFileSync(require('node:path').join(__dirname,'../service-worker.js'),'utf8'),manifest=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../manifest.webmanifest'))),version=html.match(/const GFUT_BUILD="V(\d+)\.(\d+)"/);
 for(const file of ['chem-boosts.js','chem-boosts-ui.js','chem-boosts.css']){
  const ref=html.match(new RegExp('\\./'+file.replace('.', '\\.')+'\\?v=(\\d+)'));assert.ok(ref,file+' reference');
  assert.ok(sw.includes(`"./${file}?v=${ref[1]}"`),file);
 }
 assert.ok(manifest.start_url.endsWith(`${version[1]}.${version[2]}`));assert.ok(sw.includes(`v${version[1]}-${version[2]}-`));assert.ok(html.includes(`service-worker.js?v=${version[1]}${version[2]}`));
});
