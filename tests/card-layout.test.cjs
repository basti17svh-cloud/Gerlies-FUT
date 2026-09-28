const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const classCode=html.slice(html.indexOf('function cardClass('),html.indexOf('function itemBase('));
const emblemsCode=html.slice(html.indexOf('function emblemsHTML('),html.indexOf('function playerClubLabel('));
const rendererCode=html.slice(html.indexOf('function cardHTML('),html.indexOf('function normalizeKey('));
const css=fs.readFileSync(path.join(__dirname,'../card-layout.css'),'utf8');
function context(){
 const ctx={esc:String,MARCO_FOUNDER_PLAYER_ID:'footera-founder-marco-gerlach',resolvedPlayer:p=>p,isFounderItem:i=>['footera-founder-bastian-gerlach','footera-founder-marco-gerlach'].includes(i?.pid),isMomentumItem:i=>i?.eventType==='momentum',isLegacyEventName:n=>n==='Legacy Event',
  rarityOf:p=>p.rarity||'gold',isCardRare:()=>false,itemRating:i=>i.displayRating||88,
  positionLabel:p=>p==='GK'?'TW':p,cardStatPairs:p=>p.position==='GK'?[['HEC',80],['BSI',81],['ABS',82],['REF',83],['TMP',84],['POS',85]]:[['TEM',91],['SCH',89],['PAS',82],['DRI',88],['DEF',45],['PHY',84]],
  nationLabel:n=>n,flagAsset:()=>'<span>DE</span>',badgeAsset:k=>`<span>${k}</span>`,leagueShort:()=>'',clubShort:()=>'',
  portraitHTML:()=>'<img src="portrait.png">',activeEvolutionForUid:()=>null};
 vm.createContext(ctx);vm.runInContext(classCode+emblemsCode+rendererCode,ctx);
 return ctx;
}
const gerlach={id:'founder-preview',name:'B. Gerlach',position:'ST',ovr:88,nation:'Deutschland',team:'FC Gerlies',league:'Footera-Liga'};

test('all card types share the Founder information order and visible name/stat grid',()=>{
 const ctx=context();
 const samples=[['bronze',{...gerlach,rarity:'bronze'},null],['silver',{...gerlach,rarity:'silver'},null],['gold',gerlach,null],
  ['totw',gerlach,{variant:'special',eventName:'Team of the Week 1'}],['legacy',gerlach,{variant:'special',eventName:'Legacy Event'}],
  ['momentum',gerlach,{variant:'special',eventType:'momentum'}],['icon',gerlach,{variant:'icon-mid'}],['founder',gerlach,{pid:'footera-founder-bastian-gerlach',variant:'founder'}]];
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
