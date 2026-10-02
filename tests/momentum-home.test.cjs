const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}

test('active MOMENTUM goes before Rivals, and its actual event deadline is displayed',()=>{
 const event={name:'MOMENTUM',subtitle:'TEAM 1',players:Array.from({length:14},(_,i)=>({pid:String(i)})),activeUntilAt:'2026-10-02T19:00:00+02:00',activeUntil:'02.10.2026 · 19:00'};
 const c={Date,Intl,state:{rivals:{division:10,weeklyPoints:0},sp:0},MOMENTUM_EVENT:event,activeMomentumEvent:()=>event,totwIsActive:()=>false,activeEvolutionCount:()=>0,fmt:String};vm.createContext(c);
 vm.runInContext(section('function homeHeroSlides(){','function renderHomeRewards(){'),c);
 const slides=c.homeHeroSlides();assert.equal(slides.length,4);
 assert.equal(slides[0].theme,'momentum');assert.equal(slides[1].title.includes('RIVALS'),true);
 assert.equal(slides[0].button,'Zum Team');assert.equal(slides[0].teamButton,'Zum Shop');
 assert.match(slides[0].text,/MOMENTUM TEAM 1/);assert.match(slides[0].text,/Freitag.*2.*Oktober.*19:00 Uhr/);
 c.activeMomentumEvent=()=>null;assert.equal(c.homeHeroSlides().length,3);assert.equal(c.homeHeroSlides()[0].shield,'DR');
});

test('complete MOMENTUM team draws from the event list once, with 11 on the pitch and 3 on the bench',()=>{
 const c={Set,posFit:(p,slot)=>p.position===slot||String(p.alt||'').split(',').includes(slot)};vm.createContext(c);
 vm.runInContext(section('const MOMENTUM_EVENT=','let eventSelectedId='),c);
 vm.runInContext(section('const MOMENTUM_TEAM_SLOTS=','function momentumTeamCard('),c);
 const players=vm.runInContext('MOMENTUM_EVENT.players',c);
 const entries=players.map((player,index)=>({index,player:{...player,position:player.position,alt:player.alt}}));
 const {xi,bench}=c.momentumTeamLineup(entries);
 assert.equal(xi.length,11);assert.equal(bench.length,3);
 assert.equal(new Set([...xi,...bench].map(e=>e.index)).size,14);
 assert.equal(xi[0].player.position,'GK');
 for(let i=0;i<xi.length;i++)assert.equal(xi[i].player.position,vm.runInContext(`MOMENTUM_TEAM_SLOTS[${i}].p`,c));
});
