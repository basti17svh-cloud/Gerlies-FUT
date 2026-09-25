const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const section=(from,to)=>{
 const a=html.indexOf(from),b=html.indexOf(to,a);
 assert.ok(a>=0&&b>a,`missing ${from}`);
 return html.slice(a,b)
};

test('board lights and plaque appear before the card, then clear for the result',async()=>{
 const nodes=new Map();
 const el=id=>{
  const classes=new Set();
  return {id,style:{},innerHTML:'',textContent:'',className:'',offsetWidth:1,
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
   querySelector:()=>null};
 };
 for(const id of ['opening','openPackBtn','openStage','bigPack','packCountdown','flash','boardIntro','walkoutTunnel','walkoutClue','reveal','revealBadge','revealCard','revealSecondCard','walkoutTitle','results'])nodes.set(id,el(id));
 const $=id=>nodes.get(id),frames=[];
 const ctx={$,displayBase:()=>({name:'Boardspieler',position:'CM',team:'Testverein'}),cardHTML:()=>'<div class="card-shell">Karte</div>',positionLabel:()=> 'ZM',
  addPackFloorLights:()=>{},spawnPackSparks:()=>{},spawnPackConfetti:()=>{},renderPackResults:()=>{},
  sleep:ms=>{frames.push({ms,intro:$('boardIntro').classList.contains('active'),card:$('revealCard').innerHTML,pack:$('openStage').style.display});return Promise.resolve()}
 };
 vm.createContext(ctx);
 vm.runInContext(section('function finishPack(){','function packFxLayer(){')+section('function showPackRevealCard(plan){','$("openPackBtn").addEventListener("click"'),ctx);
 await vm.runInContext('runPackReveal({mode:"board",cards:[{}],label:"BOARD",duration:2350})',ctx);
 assert.deepEqual(frames.map(f=>f.ms),[350,1050,220,2350]);
 assert.equal(frames[0].intro,false);
 assert.equal(frames[1].intro,true);
 assert.equal(frames[1].pack,'none');
 assert.ok(frames.slice(0,3).every(f=>!f.card));
 assert.equal(frames[2].intro,false);
 assert.match(frames[3].card,/Karte/);
 assert.ok($('results').classList.contains('active'));
 assert.ok(!$('boardIntro').classList.contains('active'));
 assert.ok(!$('walkoutTunnel').classList.contains('active'));
});
