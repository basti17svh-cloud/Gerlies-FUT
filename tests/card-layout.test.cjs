const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const classCode=html.slice(html.indexOf('function cardClass('),html.indexOf('function itemBase('));
const emblemsCode=html.slice(html.indexOf('function emblemsHTML('),html.indexOf('function playerClubLabel('));
const rendererCode=html.slice(html.indexOf('function cardHTML('),html.indexOf('function normalizeKey('));
const positionsCode=html.slice(html.indexOf('function playerPositions('),html.indexOf('function detailChemHTML('));
const positionLabelCode=html.split('\n').find(line=>line.startsWith('function positionLabel('));
const css=fs.readFileSync(path.join(__dirname,'../card-layout.css'),'utf8');
function context(){
 const ctx={esc:String,FOUNDER_PLAYER_ID:'footera-founder-bastian-gerlach',FOUNDER_BASTIAN_STATIC_SRC:'',MARCO_FOUNDER_PLAYER_ID:'footera-founder-marco-gerlach',resolvedPlayer:p=>p,isFounderItem:i=>['footera-founder-bastian-gerlach','footera-founder-marco-gerlach'].includes(i?.pid),isMomentumItem:i=>i?.eventType==='momentum',isLegacyEventName:n=>n==='Legacy Event',
  rarityOf:p=>p.rarity||'gold',isCardRare:()=>false,itemRating:i=>i.displayRating||88,
  playerGender:()=> 'male',cardStatPairs:p=>p.position==='GK'?[['HEC',80],['BSI',81],['ABS',82],['REF',83],['TMP',84],['POS',85]]:[['TEM',91],['SCH',89],['PAS',82],['DRI',88],['DEF',45],['PHY',84]],
  nationLabel:n=>n,flagAsset:()=>'<span>DE</span>',badgeAsset:k=>`<span>${k}</span>`,leagueShort:()=>'',clubShort:()=>'',
  portraitHTML:()=>'<img src="portrait.png">',ensureEaPlayerAssets(){},activeEvolutionForUid:()=>null};
 vm.createContext(ctx);vm.runInContext(classCode+emblemsCode+positionsCode+positionLabelCode+rendererCode,ctx);
 return ctx;
}
const gerlach={id:'founder-preview',name:'B. Gerlach',position:'ST',ovr:88,nation:'Deutschland',team:'FC Gerlies',league:'Footera-Liga'};

test('active Evolutions have the shared skin before the first claim and keep live player fields',()=>{
 const ctx=context();ctx.isCardRare=()=>true;ctx.activeEvolutionForUid=uid=>uid==='active-player'?{uid}:null;
 const item={uid:'active-player',evo:0,evoStats:{}};
 for(const mini of [false,true]){
  const card=ctx.cardHTML({...gerlach,name:'Real Evolution Player',alt:'CAM,LM'},item,mini);
  assert.match(card,/class="card-shell evolution-shell"/);assert.match(card,/class="custom-card evolution"/);
  assert.match(card,/class="evo-active-marker"/);assert.doesNotMatch(card,/rare-mark|base-rare/);
  assert.match(card,/title="Real Evolution Player"/);assert.match(card,/ZOM · LM/);
  assert.equal((card.match(/<small>(?:TEM|SCH|PAS|DRI|DEF|PHY)<\/small>/g)||[]).length,6);
  assert.doesNotMatch(card,/A\. VOSS|84.*CM/);
 }
 assert.equal(ctx.cardClass(gerlach,{uid:'ordinary',evo:0,evoStats:{},evoPlaystyles:[]}), 'gold');
});

test('completed and legacy Evolutions replace their original event skin without requiring an OVR boost',()=>{
 const ctx=context();
 for(const item of [{evo:2},{evo:0,evoStats:{pas:3}},{evo:0,evoPlaystyles:['Pass']},{evo:0,evoPlaystyle:'Pass'},{evo:0,evoDesign:true},{variant:'special',eventType:'momentum',evo:1},{variant:'special',eventName:'Legacy Event',evo:1},{variant:'special',eventName:'Team of the Week 3',evo:1}]){
  const card=ctx.cardHTML({...gerlach,position:'GK'},item);
  assert.match(card,/class="custom-card evolution"/);assert.doesNotMatch(card,/evo-active-marker|legacy-facets|momentum-shell/);
  assert.match(card,/<small>HEC<\/small><b>80<\/b>/);
 }
 assert.equal(ctx.cardClass(gerlach,{pid:ctx.FOUNDER_PLAYER_ID,variant:'founder',evo:1}),'founder');
 assert.equal(ctx.cardClass(gerlach,{variant:'story',evo:1}),'story');
});

test('the reusable Evolution artwork and stylesheet are available in the offline shell',()=>{
 const skin=fs.readFileSync(path.join(__dirname,'../evolution-card.css'),'utf8');
 const art=fs.readFileSync(path.join(__dirname,'../assets/footera/card-evolution-v1.webp'));
 const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
 assert.ok(html.includes('href="./evolution-card.css"'));
 assert.ok(sw.includes('"./evolution-card.css"'));assert.ok(sw.includes('"./assets/footera/card-evolution-v1.webp"'));
 assert.match(skin,/\.custom-card\.evolution\{[\s\S]*?card-evolution-v1\.webp/);
 assert.equal(art.toString('ascii',0,4),'RIFF');assert.equal(art.toString('ascii',8,12),'WEBP');assert.ok(art.length<350000);
});

test('all card types share the Founder information order and visible name/stat grid',()=>{
 const ctx=context();
 const samples=[['bronze',{...gerlach,rarity:'bronze'},null],['silver',{...gerlach,rarity:'silver'},null],['gold',gerlach,null],
  ['totw',gerlach,{variant:'special',eventName:'Team of the Week 1'}],['legacy',gerlach,{variant:'special',eventName:'Legacy Event'}],
  ['momentum',gerlach,{variant:'special',eventType:'momentum'}],['icon',gerlach,{variant:'icon-mid'}],['evolution',gerlach,{evo:2}],['founder',gerlach,{pid:'footera-founder-bastian-gerlach',variant:'founder'}]];
 for(const [theme,player,item] of samples){
  const markup=ctx.cardHTML(player,item,true);
  assert.match(markup,new RegExp(`class="custom-card ${theme}(?: |")`),theme);
  const rating=markup.indexOf('class="ovr"'),position=markup.indexOf('class="pos"'),flag=markup.indexOf('class="card-flag"'),club=markup.indexOf('class="card-club"'),league=markup.indexOf('class="card-league"'),face=markup.indexOf('class="face"'),name=markup.indexOf('class="pname"'),stats=markup.indexOf('class="stats"');
  assert.ok(rating<position&&position<flag&&flag<club&&club<league&&league<face&&face<name&&name<stats,theme);
  assert.match(markup,/title="B\. Gerlach"/);
  assert.match(markup,/<small>TEM<\/small><b>91<\/b>/);
  assert.equal((markup.match(/<small>(?:TEM|SCH|PAS|DRI|DEF|PHY)<\/small>/g)||[]).length,6,theme);
  assert.doesNotMatch(markup,/official-card|chem-dots/);
 }
 assert.match(css,/container-type:inline-size/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test('extra positions use German labels, omit the displayed position and stay absent without alternatives',()=>{
 const ctx=context(),p={...gerlach,position:'RW',alt:'LW, CAM, RW, LW'};
 for(const item of [null,{variant:'special',eventName:'Team of the Week 3'},{variant:'special',eventName:'Legacy Event'},{variant:'special',eventType:'momentum'},{variant:'icon-mid'},{variant:'story'},{evo:2},{pid:ctx.MARCO_FOUNDER_PLAYER_ID,variant:'founder'}]){
  const markup=ctx.cardHTML(p,item,true);
  assert.match(markup,/class="card-alt-positions"[^>]*>LF · ZOM<\/div>/);
  assert.ok(markup.indexOf('class="stats"')<markup.indexOf('class="card-alt-positions"'));
 }
 assert.match(ctx.cardHTML(p,null,true,'CAM'),/class="card-alt-positions"[^>]*>RF · LF<\/div>/);
 assert.doesNotMatch(ctx.cardHTML({...p,alt:'RW, RW'},null,true),/card-alt-positions/);
 assert.doesNotMatch(ctx.cardHTML({...gerlach,position:'GK'},null,true),/card-alt-positions/);
 ctx.FOUNDER_BASTIAN_STATIC_SRC='data:image/webp;base64,test';
 assert.match(ctx.cardHTML({...gerlach,id:ctx.FOUNDER_PLAYER_ID,alt:'CAM'},{pid:ctx.FOUNDER_PLAYER_ID,variant:'founder'},true),/class="card-alt-positions"[^>]*>ZOM<\/div>/);
 const founderOnCam=ctx.cardHTML({...gerlach,id:ctx.FOUNDER_PLAYER_ID,alt:'CAM'},{pid:ctx.FOUNDER_PLAYER_ID,variant:'founder'},true,'CAM');
 assert.match(founderOnCam,/class="founder-live-position">ZOM<\/span>/);
 assert.match(founderOnCam,/class="card-alt-positions"[^>]*>ST<\/div>/);
});

test('approved clean skins are cached and the shared stats fit inside the card',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
 const legacy=fs.readFileSync(path.join(__dirname,'../legacy-card.css'),'utf8');
 for(const type of ['gold','silver','bronze','totw','icon']){
  const filename=`card-${type}-approved.webp`,art=fs.readFileSync(path.join(__dirname,'../assets/footera',filename));
  assert.match(css,new RegExp(`\\.custom-card\\.${type}\\{[\\s\\S]*?${filename}`));
  assert.ok(sw.includes(`./assets/footera/${filename}`),type);
  assert.equal(art.toString('ascii',0,4),'RIFF',type);
  assert.equal(art.toString('ascii',8,12),'WEBP',type);
  assert.ok(art.length<350000,type);
 }
 assert.match(css,/--card-bottom-left:8%;--card-bottom-right:8%/);
 assert.match(css,/--card-stats-left:3%;--card-stats-right:3%/);
 assert.match(css,/left:var\(--card-stats-left,0\)!important;right:var\(--card-stats-right,0\)!important/);
 assert.match(css,/\.custom-card:is\(\.gold,\.silver,\.bronze,\.totw,\.icon\)\{\s*clip-path:none;box-shadow:none/);
 assert.match(css,/--card-bottom-bottom:18%;--card-name-height:35%;--card-stats-top:41%/);
 assert.match(css,/--card-name-top:65%;--card-bottom-bottom:15%;--card-name-height:38%;--card-stats-top:43%/);
 assert.match(css,/\.custom-card:is\(\.gold,\.silver,\.bronze,\.totw,\.icon\):before\{content:none\}/);
 assert.match(legacy,/\.legacy-shell:before\{[\s\S]*?legacy-event-aura\.svg/);
 assert.ok(sw.includes('./assets/footera/legacy-event-aura.svg'));
});

test('goalkeepers use the same geometry with six keeper stats, long names fit the plate',()=>{
 const ctx=context();
 const keeper=ctx.cardHTML({...gerlach,name:'Thibaut Courtois',position:'GK'},null,true);
 assert.match(keeper,/class="pos">TW/);
 assert.match(keeper,/<small>HEC<\/small><b>80<\/b>/);
 assert.doesNotMatch(keeper,/<small>TEM<\/small>/);
 const long=ctx.cardHTML({...gerlach,name:'Trent Alexander-Arnold'},null,true);
 assert.match(long,/title="Trent Alexander-Arnold"/);
 assert.match(long,/T\. Alexander-Arnold/);
 assert.match(long,/--card-name-scale:0\.78/);
});

test('Founder uses the blank crystal artwork while position and attributes remain dynamic in the master renderer',()=>{
 const ctx=context(),founder={pid:'footera-founder-bastian-gerlach',variant:'founder'};
 const striker=ctx.cardHTML(gerlach,founder,false,'ST'),midfielder=ctx.cardHTML(gerlach,founder,false,'ZOM');
 assert.match(striker,/class="card-shell founder-shell"/);
 assert.match(striker,/class="custom-card founder"/);
 assert.match(striker,/class="pos">ST<\/div>/);
 assert.match(midfielder,/class="pos">ZOM<\/div>/);
 assert.match(striker,/title="B\. Gerlach"/);
 assert.match(striker,/<small>TEM<\/small><b>91<\/b>/);
 assert.doesNotMatch(striker,/chem-dots|official-card/);
 assert.match(css,/url\("\.\/assets\/footera\/founder-frame\.webp"\)/);
 assert.match(css,/:is\(\.founder-shell,[^)]*\) \.custom-card\.founder \.card-bottom/);
 assert.match(css,/\.card-shell \.custom-card\.founder:before\{content:none\}/);
});

test('the final Bastian image and live overlays share one proportional art layer in every slot',()=>{
 const ctx=context();ctx.FOUNDER_BASTIAN_STATIC_SRC='data:image/webp;base64,test';
 const card=ctx.cardHTML({...gerlach,id:ctx.FOUNDER_PLAYER_ID},{pid:ctx.FOUNDER_PLAYER_ID,variant:'founder'},true,'ZOM');
 assert.match(card,/class="mini"><div class="card-shell founder-shell bastian-static-founder-shell" data-rating="88"><div class="founder-card-art" data-rating="88"><img class="founder-static-card"/);
 assert.match(html,/const FOUNDER_BASTIAN_STATIC_SRC="\.\/assets\/footera\/founder-bastian-card-hd\.webp"/);
 const art=fs.readFileSync(path.join(__dirname,'../assets/footera/founder-bastian-card-hd.webp'));
 assert.equal(art.toString('ascii',0,4),'RIFF');assert.equal(art.toString('ascii',8,12),'WEBP');assert.equal(art.toString('ascii',12,16),'VP8L');
 const size=art.readUInt32LE(21);assert.equal((size&0x3fff)+1,1024);assert.equal(((size>>>14)&0x3fff)+1,1536);
 assert.match(css,/\.bastian-static-founder-shell\{[\s\S]*?aspect-ratio:\.7!important/);
 assert.match(css,/\.bastian-static-founder-shell>\.founder-card-art\{[\s\S]*?container-type:inline-size/);
 assert.match(card,/<div class="founder-card-art" data-rating="88"><img[\s\S]*?<span class="founder-live-position">ZOM<\/span>/);
 assert.match(css,/\.bastian-static-founder-shell \.founder-static-card\{[\s\S]*?position:absolute;[\s\S]*?object-fit:contain/);
 assert.match(css,/\.founder-card-art:before\{[\s\S]*?background:#01110e/);
 assert.match(css,/\.founder-card-art:after\{[\s\S]*?content:attr\(data-rating\)[\s\S]*?20cqw/);
 assert.doesNotMatch(html,/card-shell\.bastian-static-founder-shell > img\.founder-static-card/);
});

test('Rangers Founder uses the same renderer with its yellow-and-black 2:3 artwork',()=>{
 const ctx=context(),p={id:'footera-founder-marco-gerlach',name:'M. Gerlach',position:'ST',ovr:88,team:'Schweinfurt Rangers 09',nation:'Germany',league:'Footera'};
 const item={pid:p.id,variant:'founder'},card=ctx.cardHTML(p,item,false);
 assert.match(card,/class="custom-card founder rangers-founder"/);assert.match(card,/class="card-shell founder-shell"/);
 assert.match(card,/class="pos">ST<\/div>/);assert.match(card,/title="M\. Gerlach"/);
 assert.equal((card.match(/<small>(?:TEM|SCH|PAS|DRI|DEF|PHY)<\/small>/g)||[]).length,6);
 assert.doesNotMatch(card,/chem-dots|official-card/);
 assert.match(css,/\.custom-card\.founder\.rangers-founder\{/);
 assert.match(css,/\.rangers-founder[\s\S]*?founder-marco-frame\.webp/);
 assert.match(css,/\.custom-card \.face\{[\s\S]*?overflow:hidden!important/);
});

test('non-Founder portraits end above the nameplate while Founder geometry stays separate',()=>{
 assert.match(css,/\.card-shell\{[\s\S]*?--card-portrait-top:17%;[\s\S]*?--card-name-top:70%/);
 assert.match(css,/\.bio-card \.card-shell:not\(\.founder-shell\)\{--card-portrait-top:12%/);
 assert.match(css,/\.founder-shell\{[\s\S]*?--card-portrait-top:15%;[\s\S]*?--card-portrait-height:52%/);
 assert.match(css,/\.custom-card:is\(\.gold,\.silver,\.bronze,\.totw,\.icon\)\{[\s\S]*?--card-portrait-top:11%;--card-portrait-height:50%;[\s\S]*?--card-name-top:61\.5%/);
 assert.match(css,/\.custom-card\.icon\{[\s\S]*?--card-portrait-top:10%;--card-portrait-height:54%;[\s\S]*?--card-name-top:65%/);
});
