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
 assert.match(html,/pack-odds\.js\?v=21121/);
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


test('exact 2-player probability matches independent exhaustive subset enumeration',()=>{
 const w0=1,w1=Math.pow(1.62,-1),w2=Math.pow(1.62,-15);
 const denom=w0*w1+w0*w2+w1*w2;
 const expected=w2*(w0+w1)/denom;
 const p={id:'enumeration',count:2,min:75,max:99,iconChance:0};
 const players=[player('a',75),player('b',76),player('c',90)];
 const result=odds.calculate(p,players);
 const actual=result.rows.find(x=>x.threshold===90).rate;
 assert.ok(Math.abs(actual-expected)<1e-12,actual+' vs '+expected);
});
test('conditional guarantee has an exact closed-form result',()=>{
 const w75=1,w80=Math.pow(1.62,-5),w85=Math.pow(1.62,-10),w90=Math.pow(1.62,-15);
 const denom=w85*(w75+w80)+w90*(w75+w80)+w85*w90;
 const expected=w90*(w75+w80+w85)/denom;
 const p={id:'conditional-enumeration',count:2,min:75,max:99,guarantee:85};
 const players=[player('a',75),player('b',80),player('c',85),player('d',90)];
 const actual=odds.calculate(p,players).rows.find(x=>x.threshold===90).rate;
 assert.ok(Math.abs(actual-expected)<1e-12,actual+' vs '+expected);
});
test('Icon addition and replacement are included in exact rating odds',()=>{
 const p={id:'icon-enumeration',count:1,min:75,max:99,iconChance:0.1};
 const players=[player('base-low',75),player('base-high',90)];
 const icons=[player('icon',92)];
 const baseProbability=Math.pow(1.62,-15)/(1+Math.pow(1.62,-15));
 const result=odds.calculate(p,players,{icons});
 const actual=result.rows.find(x=>x.threshold===90).rate;
 assert.ok(Math.abs(actual-(0.9*baseProbability+0.1))<1e-12);
 assert.ok(Math.abs(result.special.rate-0.1)<1e-12);
});
test('actual weighted pack draws have no duplicate IDs and obey guarantee for 200 runs',()=>{
 const p={id:'exact-many',count:8,min:75,max:99,guarantee:85,iconChance:0.2};
 const pool=Array.from({length:100},(_,i)=>player('item-'+i,75+i%16));
 const icons=[player('icon-88',88),player('icon-91',91)];
 for(let i=0;i<200;i++){
  const draw=odds.draw(p,pool,{icons});
  assert.equal(draw.available,true);
  assert.equal(draw.items.length,p.count);
  assert.equal(new Set(draw.items.map(x=>String(x.base.id))).size,p.count);
  assert.ok(draw.items.some(x=>x.base.ovr>=85));
 }
});
test('unavailable odds and drawing fail closed rather than inventing percentages',()=>{
 const p={id:'insufficient',count:3,min:75,max:99,guarantee:85};
 const players=[player('same',88),player('same',90)];
 assert.equal(odds.calculate(p,players).available,false);
 assert.equal(odds.draw(p,players).available,false);
});
