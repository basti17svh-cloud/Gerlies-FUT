const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const section=(from,to)=>{
 const a=html.indexOf(from),b=html.indexOf(to,a);
 assert.ok(a>=0&&b>a,`could not find ${from}`);
 return html.slice(a,b)
};

test('walkout travels through nation, position and club before revealing the player',async()=>{
 const elements=new Map();
 function element(id){
  const classes=new Set();
  return {id,innerHTML:'',textContent:'',style:{},className:'',offsetWidth:1,
   classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)},
   querySelector:()=>null};
 }
 for(const id of ['opening','openPackBtn','openStage','bigPack','packCountdown','flash','boardIntro','walkoutTunnel','walkoutClue','reveal','revealBadge','revealCard','revealSecondCard','walkoutTitle','results'])elements.set(id,element(id));
 const get=id=>elements.get(id),snapshots=[];
 const base={name:'Testspieler',position:'ST',nation:'Germany',team:'FC Gerlies'};
 const ctx={
  $:get,displayBase:()=>base,cardHTML:()=>'<div class="card-shell">Spielerkarte</div>',
  positionLabel:()=> 'ST',flagAsset:()=>'<span>🇩🇪</span>',badgeAsset:()=>'<img alt="FC Gerlies">',clubShort:()=> 'FC',
  normalizeKey:v=>v.toLowerCase(),countryCode:()=> 'DE',nationLabel:()=> 'Deutschland',esc:String,
  addPackFloorLights:()=>{},spawnPackSparks:()=>{},spawnPackConfetti:()=>{},renderPackResults:()=>{},
  sleep:ms=>{snapshots.push({ms,clue:get('walkoutClue').innerHTML,tunnel:get('walkoutTunnel').classList.contains('active'),card:get('revealCard').innerHTML});return Promise.resolve()}
 };
 vm.createContext(ctx);
 vm.runInContext(section('function finishPack(){','function packFxLayer(){')+section('function showPackRevealCard(plan){','$("openPackBtn").addEventListener("click"'),ctx);
 await vm.runInContext('runPackReveal({mode:"walkout",cards:[{}],label:"WALKOUT",duration:5200})',ctx);
 assert.deepEqual(snapshots.map(x=>x.ms),[1050,900,800,1050,340,700,4500]);
 assert.match(snapshots[1].clue,/NATION.*Deutschland/s);
 assert.match(snapshots[2].clue,/POSITION.*ST/s);
 assert.match(snapshots[3].clue,/VEREIN.*FC Gerlies/s);
 assert.ok(snapshots.slice(0,5).every(x=>!x.card),'player card must stay hidden during the tunnel');
 assert.ok(snapshots.slice(0,4).every(x=>x.tunnel));
 assert.ok(!snapshots[4].tunnel);
 assert.match(snapshots[5].card,/Spielerkarte/);
 assert.ok(get('results').classList.contains('active'));
 assert.equal(get('walkoutClue').innerHTML,'');
});
