const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const odds=require('../pack-odds.js');

function player(id,ovr){return{id,ovr}}
test('guaranteed rating is always 100 percent without mutating source data',()=>{
 const p={id:'gold',count:2,min:75,max:99,guarantee:85,iconChance:0};
 const pool=[player('a',75),player('b',79),player('c',85),player('d',90)];
 const original=JSON.stringify(pool),res=odds.calculate(p,pool,{trials:1000});
 assert.equal(res.available,true);
 assert.equal(res.rows.find(x=>x.threshold===85).guaranteed,true);
 assert.equal(res.rows.find(x=>x.threshold===85).rate,1);
 assert.equal(res.rows.find(x=>x.threshold===93).possible,false);
 assert.equal(odds.percent(res.rows.find(x=>x.threshold===93)),'0 %');
 assert.equal(JSON.stringify(pool),original);
});
test('composition and unique-card restriction mirror the shop',()=>{
 const p={id:'mixed',count:3,composition:[{count:2,min:75,max:99},{count:1,min:65,max:74}],guarantee:82};
 const pool=[player('gold-high',84),player('gold-low',75),player('silver',69)];
 const res=odds.calculate(p,pool,{trials:1000});
 assert.equal(res.available,true);
 for(const t of [65,70,75,80,82])assert.equal(res.rows.find(x=>x.threshold===t).rate,1);
 assert.equal(res.rows.find(x=>x.threshold===85).possible,false);
});
test('Icon exact chance is taken from pack settings',()=>{
 const p={id:'icon-pack',count:1,min:75,max:99,iconChance:0.002};
 const res=odds.calculate(p,[player('a',78)],{trials:2500,icons:[player('icon',92)]});
 assert.equal(res.available,true);
 assert.equal(res.iconExact,0.002);
 assert.equal(odds.percent(res.rows.find(x=>x.threshold===93)),'0 %');
});
test('event and TOTW estimates classify the selected card',()=>{
 const p={id:'event-pack',count:1,min:75,max:80,iconChance:0};
 const pool=[player('a',78),player('b',78)];
 const res=odds.calculate(p,pool,{trials:1200,classify:p=>({rating:p.id==='a'?85:78,kind:p.id==='a'?'event':'totw'})});
 assert.equal(res.available,true);
 assert.ok(res.events.rate>0&&res.events.rate<1);
 assert.ok(res.totw.rate>0&&res.totw.rate<1);
 assert.equal(res.special.rate,1);
});
test('empty player pool never yields invented odds',()=>{
 const res=odds.calculate({id:'empty',count:5,min:75,max:99},[],{trials:1000});
 assert.equal(res.available,false);
});
test('the store provides an odds button for purchased and owned packs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/id="packOddsModal"[^>]+aria-modal="true"/);
 assert.match(html,/data-pack-odds="\$\{esc\(p\.id\)\}"/);
 assert.match(html,/pack-odds\.js\?v=21120/);
 assert.match(html,/pack-odds-ui\.js\?v=21120/);
 assert.match(html,/pack-odds\.css\?v=21120/);
});

test('duplicate database IDs never count as separate pack players',()=>{
 const pack={id:'duplicates',count:2,min:75,max:99};
 const players=[player('same',75),player('same',90)];
 assert.equal(odds.calculate(pack,players,{trials:1000}).available,false);
});
test('an unavailable event card cannot appear in a Bronze pack',()=>{
 const pack={id:'bronze-event',count:1,min:0,max:64};
 const players=[player('bronze',59),player('event',86)];
 const result=odds.calculate(pack,players,{trials:1000,classify:p=>({rating:p.ovr,kind:p.id==='event'?'event':'base'})});
 assert.equal(result.available,true);
 assert.equal(result.events.possible,false);
 assert.equal(odds.percent(result.events),'0 %');
});
