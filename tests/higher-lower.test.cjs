'use strict';
// V21.379 Höher oder tiefer: rewards only for a new personal record, capped per round, one-time milestone packs.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-higher-lower.js'),'utf8');
function load(saved,players=[]){
 const ctx={granted:[],saves:0};
 vm.createContext(ctx);
 vm.runInContext(`var state=${JSON.stringify({coins:0,packs:{},higherLower:saved})};var PLAYERS=${JSON.stringify(players)};function grant(r){granted.push(r)}function save(){saves++}function flushSave(){}`,ctx);
 vm.runInContext(src,ctx);
 return ctx;
}
const play=(api,n)=>{const r=api.newRound();const out=[];for(let i=0;i<n;i++){r.streak++;out.push(api.recordStep(r))}api.finishRound(r);return{r,out}};

test('first round pays 200 Coins per record point and the 10er pack once',()=>{
 const ctx=load(),api=ctx.FooteraHigherLower;
 const {r}=play(api,12);
 assert.equal(r.coins,2400);
 assert.deepEqual([...r.packs],['Premium Gold Pack']);
 assert.equal(ctx.state.higherLower.best,12);
 assert.equal(ctx.state.higherLower.rounds,1);
 assert.deepEqual([...ctx.state.higherLower.milestones],[10]);
});

test('no reward at or below the old record, only the points above it',()=>{
 const ctx=load({best:12,rounds:1,milestones:[10]}),api=ctx.FooteraHigherLower;
 assert.equal(play(api,12).r.coins,0);
 assert.equal(ctx.granted.length,0);
 const {r}=play(api,15);
 assert.equal(r.coins,600);
 assert.equal(ctx.state.higherLower.best,15);
 assert.equal(ctx.state.higherLower.rounds,3);
});

test('one round pays at most 5.000 Coins, milestone packs still come',()=>{
 const ctx=load(),api=ctx.FooteraHigherLower;
 const {r}=play(api,32);
 assert.equal(r.coins,5000);
 assert.deepEqual([...r.packs],['Premium Gold Pack','Gemischtes Spieler-Set','82+ Players Pack']);
 assert.deepEqual(ctx.granted.filter(g=>g.pack).map(g=>g.pack),['gold','mixed6','82']);
 assert.equal(ctx.granted.reduce((a,g)=>a+(g.coins||0),0),5000);
});

test('milestone packs are paid only once even if an old save forgot the record',()=>{
 const ctx=load({best:0,rounds:5,milestones:[10]}),api=ctx.FooteraHigherLower;
 const {r}=play(api,11);
 assert.deepEqual([...r.packs],[]);
 assert.equal(r.coins,2200);
});

test('players: 75+ only, no tie with the shown card, right/wrong judged by GES',()=>{
 const players=[{name:'A',ovr:80},{name:'B',ovr:80},{name:'C',ovr:85},{name:'D',ovr:70},{name:'A',ovr:91}];
 const api=load(undefined,players).FooteraHigherLower;
 assert.deepEqual([...api.pool().map(p=>p.name)],['A','B','C']);
 for(let i=0;i<20;i++){const n=api.pickNext(api.pool(),{name:'A',ovr:80},()=>i/20);assert.equal(n.name,'C')}
 assert.equal(api.judge({ovr:80},{ovr:85},'higher'),true);
 assert.equal(api.judge({ovr:80},{ovr:85},'lower'),false);
 assert.equal(api.judge({ovr:85},{ovr:80},'lower'),true);
});

test('broken saves are harmless',()=>{
 const api=load({best:'x',milestones:'kaputt'}).FooteraHigherLower;
 const d=api.data();assert.equal(d.best,0);assert.equal(d.rounds,0);assert.equal(d.milestones.length,0);
});

test('tile and files ship with the build',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(html,/data-higher-lower-open/);
 assert.match(html,/footera-higher-lower\.js\?v=21379/);
 assert.match(sw,/footera-higher-lower\.js\?v=21379/);
 assert.match(sw,/footera-higher-lower\.css\?v=21379/);
});
