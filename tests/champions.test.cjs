const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const champions=fs.readFileSync(path.join(root,"champions-system.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const hub=fs.readFileSync(path.join(root,"play-hub.js"),"utf8");
const competition=fs.readFileSync(path.join(root,"competition-system.js"),"utf8");
const css=fs.readFileSync(path.join(root,"play-hub.css"),"utf8");
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const manifest=fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8");

test("Champions scripts parse and V21.23 shell wires the mode",()=>{
 assert.doesNotThrow(()=>new vm.Script(champions));
 assert.doesNotThrow(()=>new vm.Script(hub));
 assert.match(html,/data-play-mode="champions"/);
 assert.match(html,/data-play-panel="champions"/);
 assert.match(html,/champions-system\.js\?v=21183/);
 const build=html.match(/const GFUT_BUILD="(V\d+\.\d+)"/)?.[1];
 assert.ok(build,"Footera build identifier exists");
 assert.ok(html.includes(`<title>Footera ${build}</title>`),"page title agrees with build");
 assert.match(hub,/champions:\{title:"Footera Champions"/);
 assert.match(hub,/function renderChampions\(/);
 assert.match(css,/\.play-champions\{/);
 assert.match(sw,/const CACHE="footera-v\d+-\d+-[a-z-]+"/);
 assert.match(sw,/champions-system\.js\?v=21183/);
 assert.equal(JSON.parse(manifest).start_url,`./index.html?v=${build.slice(1)}`);
});

test("Champions has one play-menu entry and qualification progress stays informational inside Rivals",()=>{
 assert.equal((html.match(/data-play-mode="champions"/g)||[]).length,1,"Champions darf im Spielen-Menü nur einmal vorkommen");
 const rivalsPanel=html.slice(html.indexOf('data-play-panel="rivals"'),html.indexOf('data-play-panel="champions"'));
 assert.doesNotMatch(rivalsPanel,/data-mode="champions"/,"Rivals darf keinen zweiten Champions-Start enthalten");
 assert.match(hub,/play-tile-qual/);
 assert.match(hub,/rivals-champions-status/);
 assert.match(hub,/Champions-Qualifikation/);
 assert.match(css,/\.play-tile-qual/);
 assert.match(css,/\.rivals-champions-status/);
});

test("Rivals result snapshots expose Champions CP before, after and earned for post-match UI",()=>{
 assert.match(champions,/snapshot\.championsQualification=\{before,after,earned:gain,target:CHAMPIONS_ENTRY_POINTS/);
 assert.match(competition,/function championsQualificationPostHtml\(snapshot\)/);
 assert.match(competition,/CHAMPIONS-QUALIFIKATION/);
 assert.match(competition,/CHAMPIONS QUALIFIZIERT/);
 assert.match(competition,/CHAMPIONS · \+\$\{fmt\(q\.earned\)\} CP/);
});

test("Champions has 1000 CP qualification, 15 matches and the approved rank ladder",()=>{
 const prefix=champions.slice(0,champions.indexOf("function championsWindow"));
 const box={};vm.createContext(box);
 vm.runInContext(prefix+"\nthis.entry=CHAMPIONS_ENTRY_POINTS;this.maxGames=CHAMPIONS_MAX_GAMES;this.ranks=CHAMPIONS_RANKS;this.rank=championsRank;",box);
 assert.equal(box.entry,1000);assert.equal(box.maxGames,15);
 assert.deepEqual(Array.from(box.ranks,row=>[row.name,row.min,row.max]),[
  ["Rang I",15,15],["Rang II",13,14],["Rang III",11,12],["Rang IV",9,10],
  ["Rang V",7,8],["Rang VI",5,6],["Rang VII",3,4],["Rang VIII",0,2]
 ]);
 for(const [wins,name] of [[15,"Rang I"],[14,"Rang II"],[12,"Rang III"],[10,"Rang IV"],[8,"Rang V"],[6,"Rang VI"],[4,"Rang VII"],[0,"Rang VIII"]])assert.equal(box.rank(wins).name,name);
 assert.match(champions,/berlinWeekStart\(now,5,19\)/);
 assert.match(champions,/championsWeekEnd\(lastStart\)/);
});

test("Champions rewards, qualification and record-based AI are integrated without owning results",()=>{
 assert.match(champions,/championsQualificationGain\(result\)\{return result==="win"\?200:result==="draw"\?100:0\}/);
 assert.match(champions,/recordCompetitionMatch=function\(mode,result/);
 assert.match(champions,/if\(mode==="champions"\)return recordChampionsResult\(result\)/);
 assert.match(champions,/const base=Math\.round\(82\+diff\*1\.15\+c\.games\*\.12\)/);
 assert.match(champions,/Champions Bonus Pack/);
 assert.match(html,/function matchNeedsWinner\(\)\{\s*return !!match&&match\.mode!=="rivals"\s*\}/);
 assert.match(html,/match\.mode==="champions"\?championsMatchCoins\("win"\)/);
 assert.match(html,/state\.stats\.championsMatches/);
 assert.match(html,/state\.stats\.championsWins/);
 assert.match(html,/match\.mode==="champions"\?150/);
 assert.match(html,/renderMatchPreview\(mode,championsOpponent\(\)\)/);
 assert.doesNotMatch(champions,/match\.home\s*=|match\.away\s*=/);
});

test("Rank rewards match the approved 15-game structure",()=>{
 assert.match(champions,/Rang I",min:15,max:15,coins:100000,rated:\[\[84,20\],\[86,10\]\],totw:3,bonus:true/);
 assert.match(champions,/Rang II",min:13,max:14,coins:75000,rated:\[\[84,20\],\[86,5\]\],totw:2/);
 assert.match(champions,/Rang III",min:11,max:12,coins:50000,rated:\[\[83,15\],\[85,5\]\],totw:2/);
 assert.match(champions,/Rang IV",min:9,max:10,coins:35000,rated:\[\[83,10\],\[85,3\]\],totw:1/);
 assert.match(champions,/Rang V",min:7,max:8,coins:25000,rated:\[\[82,10\],\[84,2\]\],totw:1/);
 assert.match(champions,/Rang VI",min:5,max:6,coins:15000,rated:\[\[82,5\]\],totw:1/);
 assert.match(champions,/Rang VII",min:3,max:4,coins:10000,rated:\[\[80,5\]\],totw:0/);
 assert.match(champions,/Rang VIII",min:0,max:2,coins:5000,rated:\[\[80,1\]\],totw:0/);
});

test("84+ x10 pack keeps its 0.3% ICON chance; Champions Bonus supports rare 87+ ICONS",()=>{
 const rated=html.split("\n").find(line=>line.includes('id:"84x10"'));
 assert.ok(rated,"84+ x10 pack registered");
 assert.match(rated,/iconChance:0\.003/);
 const championPackCode=champions.slice(champions.indexOf("function ensureChampionsPacks()"),champions.indexOf("function championsRewardForWins("));
 const iconCode=html.slice(html.indexOf("function randomMidIconBase("),html.indexOf("function makeMidIconItem("));
 const generateCode=html.slice(html.indexOf("function generatePack(id,tradeable=true)"),html.indexOf("function generateMarcoSurprisePack("));
 assert.ok(championPackCode.startsWith("function ensureChampionsPacks()"));
 assert.ok(iconCode.startsWith("function randomMidIconBase("));
 assert.ok(generateCode.startsWith("function generatePack(id,tradeable=true)"));
 let sequence=0;
 const sandbox={
  PACKS:[],MID_ICON_BASES:[{id:"low",ovr:84},{id:"high",ovr:90}],
  PLAYERS:Array.from({length:30},(_,i)=>({id:"gold-"+i,ovr:87+i%5})),Math:{floor:Math.floor,max:Math.max,random:()=>0},
  FooteraPackOdds:require("../pack-odds.js"),
  founderRuleForPack:()=>null,weightedPlayer:()=>({id:"gold-"+(++sequence),ovr:87+sequence}),
  makeLivePackItem:(base,tradeable)=>({pid:base.id,ovr:base.ovr,base,tradeable}),
  makeMidIconItem:(base,tradeable)=>({pid:base.id,ovr:base.ovr,base,tradeable,variant:"icon-mid"}),
  displayBase:item=>item.base,rarityOf:()=> "gold",isCardRare:()=>false
 };
 vm.createContext(sandbox);
 vm.runInContext(championPackCode+"\n"+iconCode+"\n"+generateCode+"\nensureChampionsPacks();this.items=generatePack('champions-bonus',false);",sandbox);
 const bonus=sandbox.PACKS.find(p=>p.id==="champions-bonus");
 assert.equal(bonus?.iconChance,0.05);
 assert.equal(bonus.count,5);
 assert.equal(bonus.min,87);
 assert.equal(bonus.store,false);
 assert.equal(sandbox.items.length,5);
 assert.equal(sandbox.items.filter(x=>x.variant==="icon-mid").length,1);
 assert.ok(sandbox.items.every(x=>x.ovr>=87),"ICON replacement must preserve 87+ guarantee");
 assert.ok(sandbox.items.every(x=>x.tradeable===false),"all bonus items remain untradeable");
});

console.log("Footera Champions V21.23: Qualifikation, Finals, Rewards, KI-Skalierung und Shell-Integration OK");

test("Champions extension is exactly one weekend through Tuesday 20 Oct at 09:00 Berlin",()=>{
 const clock=fs.readFileSync(path.join(root,"footera-time.js"),"utf8");
 const windowFunctions=champions.slice(champions.indexOf("const CHAMPIONS_EXTRA_WINDOW_START="),champions.indexOf("function championsDate("));
 const endFunction=champions.slice(champions.indexOf("function championsRunEnd("),champions.indexOf("function settleChampionsRun("));
 const box={};vm.createContext(box);
 vm.runInContext(clock+"\n"+windowFunctions+"\n"+endFunction+"\nthis.getWindow=championsWindow;this.runEnd=championsRunEnd;",box);
 const date=iso=>new Date(iso);
 const start=date("2026-10-16T19:00:00+02:00").getTime();
 for(const iso of ["2026-10-16T19:00:00+02:00","2026-10-18T21:33:00+02:00","2026-10-19T09:00:00+02:00","2026-10-20T08:59:59+02:00"]){
  const w=box.getWindow(date(iso));
  assert.equal(w.open,true,iso);
  assert.equal(w.start.getTime(),start);
  assert.equal(w.end.getTime(),date("2026-10-20T09:00:00+02:00").getTime());
  assert.equal(box.runEnd(String(start)).getTime(),w.end.getTime());
 }
 const closed=box.getWindow(date("2026-10-20T09:00:00+02:00"));
 assert.equal(closed.open,false);
 assert.equal(closed.start.getTime(),date("2026-10-23T19:00:00+02:00").getTime());
 assert.equal(closed.end.getTime(),date("2026-10-26T09:00:00+01:00").getTime());
 assert.equal(box.getWindow(date("2026-10-24T16:00:00+02:00")).open,true);
 assert.match(hub,/championsSpecial\?"/);
 assert.match(hub,/championsDate\(w\.end\)/);
 assert.match(champions,/const end=c.active\?championsRunEnd\(c\.week\):null/);
});
