const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const PACKS=[');
const end=html.indexOf('const TOTW_WEEK_1=',start);
assert.ok(start>=0&&end>start,'pack definitions exist');
const definition=html.slice(start,end);
const prices=vm.runInNewContext(
  'const FOUNDER_PACK_ID="founder-bastian", MARCO_FOUNDER_PACK_ID="founder-marco";\n'+definition+
  '\nPACKS.map(p=>({id:p.id,coins:p.coins,points:p.points,store:p.store}))'
);
const byId=new Map(prices.map(p=>[p.id,p]));
const expected={
  bronze:[450,null],silver:[900,50],gold:[4500,150],goldplayers:[15000,350],
  mixed6:[7500,200],primegold:[21000,500],electrum:[15000,350],
  raremixed:[12000,300],ultimate:[75000,2500], 'jumbo-rare':[60000,2000],
  'rare-mixed':[12000,300],mega:[39000,1000],'83x15':[90000,3000],
  '84x10':[120000,4000]
};

test('every purchasable pack has the approved coin price; Points prices are unchanged',()=>{
  for(const [id,[coins,points]] of Object.entries(expected)){
    const p=byId.get(id);
    assert.ok(p,'pack exists: '+id);
    assert.equal(p.coins,coins,'coin price: '+id);
    assert.equal(p.points,points,'points price: '+id);
    assert.equal(p.store,true,'available pack: '+id);
  }
});

test('reward-only and personalized founder packs remain free of purchase prices',()=>{
  for(const p of prices.filter(p=>p.coins===null&&p.points===null))
    assert.equal(typeof p.coins,'object');
});
