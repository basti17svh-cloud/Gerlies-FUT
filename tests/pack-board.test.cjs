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

test('nation, position and club pop up in the short pack intro before the card',async()=>{
 const nodes=new Map();
 const el=id=>{
  const classes=new Set();
  return {id,style:{},innerHTML:'',textContent:'',className:'',offsetWidth:1,
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
   querySelector:()=>null};
 };
 for(const id of ['opening','openPackBtn','openStage','bigPack','packCountdown','flash','boardIntro','boardCue','walkoutTunnel','walkoutClue','reveal','revealBadge','revealCard','revealSecondCard','walkoutTitle','results'])nodes.set(id,el(id));
 const $=id=>nodes.get(id),frames=[];
 const ctx={$,displayBase:()=>({name:'Testspieler',position:'CM',nation:'Germany',team:'Testverein'}),cardHTML:()=>'<div class="card-shell">Karte</div>',positionLabel:()=> 'ZM',
  flagAsset:()=>'<span>🇩🇪</span>',badgeAsset:()=>'<img alt="Testverein">',clubShort:()=> 'TV',
  normalizeKey:v=>v.toLowerCase(),countryCode:()=> 'DE',nationLabel:()=> 'Deutschland',esc:String,
  addPackFloorLights:()=>{},spawnPackSparks:()=>{},spawnPackConfetti:()=>{},renderPackResults:()=>{},
  sleep:ms=>{frames.push({ms,intro:$('boardIntro').classList.contains('active'),cue:$('boardCue').innerHTML,card:$('revealCard').innerHTML,pack:$('openStage').style.display});return Promise.resolve()}
 };
 vm.createContext(ctx);
 vm.runInContext(section('function finishPack(){','function packFxLayer(){')+section('function showPackRevealCard(plan){','$("openPackBtn").addEventListener("click"'),ctx);
 await vm.runInContext('runPackReveal({mode:"board",cards:[{}],label:"",duration:2350})',ctx);
 assert.deepEqual(frames.map(f=>f.ms),[250,550,520,620,220,2350]);
 assert.equal(frames[0].intro,false);
 assert.ok(frames.slice(1,4).every(f=>f.intro));
 assert.equal(frames[1].pack,'none');
 assert.match(frames[1].cue,/NATION.*Deutschland/s);
 assert.match(frames[2].cue,/POSITION.*ZM/s);
 assert.match(frames[3].cue,/VEREIN.*Testverein/s);
 assert.ok(frames.slice(0,5).every(f=>!f.card));
 assert.equal(frames[4].intro,false);
 assert.match(frames[5].card,/Karte/);
 assert.equal($('revealBadge').textContent,'');
 assert.doesNotMatch(html,/board-plaque[^>]*><strong>BOARD/);
 assert.ok($('results').classList.contains('active'));
 assert.ok(!$('boardIntro').classList.contains('active'));
 assert.equal($('boardCue').innerHTML,'');
 assert.ok(!$('walkoutTunnel').classList.contains('active'));
});
