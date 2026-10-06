const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const champions=fs.readFileSync(path.join(root,"champions-system.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const hub=fs.readFileSync(path.join(root,"play-hub.js"),"utf8");
const competition=fs.readFileSync(path.join(root,"competition-system.js"),"utf8");
const css=fs.readFileSync(path.join(root,"play-hub.css"),"utf8");
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const manifest=fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8");

test("Champions scripts parse and V20.99 shell wires the mode",()=>{
 assert.doesNotThrow(()=>new vm.Script(champions));
 assert.doesNotThrow(()=>new vm.Script(hub));
 assert.match(html,/data-play-mode="champions"/);
 assert.match(html,/data-play-panel="champions"/);
 assert.match(html,/champions-system\.js\?v=2099/);
 assert.match(html,/const GFUT_BUILD="V20\.98"/);
 assert.match(html,/<title>Footera V20\.98<\/title>/);
 assert.match(hub,/champions:\{title:"Footera Champions"/);
 assert.match(hub,/function renderChampions\(/);
 assert.match(css,/\.play-champions\{/);
 assert.match(sw,/footera-v20-99-root-shell/);
 assert.match(sw,/champions-system\.js\?v=2099/);
 assert.equal(JSON.parse(manifest).start_url,"./index.html?v=20.99");
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
 assert.match(champions,/berlinShiftDays\(lastStart,3,9\)/);
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

console.log("Footera Champions V20.99: Qualifikation, Finals, Rewards, KI-Skalierung und Shell-Integration OK");
