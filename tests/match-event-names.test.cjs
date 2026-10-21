const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('./helpers/app-html.cjs')();
const line=re=>{const m=html.match(re);assert.ok(m,String(re));return m[0]};

test('goal, shot and save events name players like their cards (Raphinha, not Raphael Dias Belloli)',()=>{
 const ctx={isExclusiveFounderBase:b=>b?.id==='founder'};vm.createContext(ctx);
 vm.runInContext(line(/^function matchEventPlayerName\(.*$/m),ctx);
 const row=(base)=>({name:base.name,base});
 assert.equal(ctx.matchEventPlayerName(row({id:'233419',name:'Raphinha',fullName:'Raphael Dias Belloli',firstName:'Raphael',lastName:'Dias Belloli'}),'Spieler'),'Raphinha');
 assert.equal(ctx.matchEventPlayerName(row({id:'238794',name:'Vini Jr.',fullName:'Vinícius José de Oliveira Júnior'}),'Spieler'),'Vini Jr.');
 assert.equal(ctx.matchEventPlayerName(row({id:'founder',name:'B. Gerlach',fullName:'Bastian Gerlach'}),'Spieler'),'Bastian Gerlach','founder cards keep their full name');
 assert.equal(ctx.matchEventPlayerName(null,'Torwart'),'Torwart');
 for(const field of['playerName:matchEventPlayerName(scorer','playerName:matchEventPlayerName(attacker','matchEventPlayerName(keeperRow'])assert.ok(html.includes(field),field);
 assert.ok(!/playerName:[a-z]+\??\.base\?\.fullName/.test(html),'no match event falls back to the legal name');
});
