const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"ux-overview.css"),"utf8");
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

test("V21.30 keeps the focused usability layer without replacing existing hubs",()=>{
 assert.match(html,/<title>Footera V21\.\d+<\/title>/);
 assert.match(html,/ux-overview\.css\?v=2114/);
 assert.match(html,/id="clubOverviewStrip"/);
 for(const id of ["clubUxPlayers","clubUxTransfer","clubUxSbc","clubUxEvos","clubFilterToggle","clubFilterSummary","clubFilterPanel","marketFilterToggle","marketFilterSummary","marketFilterPanel"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/function renderClubUx\(/);
 assert.match(html,/function renderMarketUx\(/);
 assert.match(html,/marketFiltersCollapsed=true/);
 assert.match(html,/function renderTasks\(\)\{const ordered=\[\.\.\.TASKS\]\.sort/);
 assert.match(html,/id="playModeHub"/);
});

test("club collection keeps all player cards at one size and suppresses Chemie-Boost badges only there",()=>{
 assert.match(html,/function cardHTML\(p,item=null,mini=false,shownPosition=null,includeChemBoost=true\)/);
 assert.match(html,/cardHTML\(b,i,false,null,false\)/);
 assert.match(html,/V21\.11 — Verein: jede Spielerkarte exakt gleich groß/);
 assert.match(html,/\.club-card-preview>div:first-child>\.card-shell\{width:150px!important;min-width:150px!important;max-width:150px!important/);
 assert.match(html,/@media\(max-width:560px\)[\s\S]*?\.club-card-preview>div:first-child>\.card-shell\{width:142px!important;min-width:142px!important;max-width:142px!important/);
 assert.match(html,/\.club-card-preview \.cb-player-badge\{display:none!important\}/);
 assert.match(html,/function chemBoostProfileHTML\(/);
});

test("compact filters are mobile-only and desktop keeps the full filter surface",()=>{
 assert.match(css,/\.ux-filter-toggle\{[\s\S]*?display:none/);
 assert.match(css,/@media\(max-width:620px\)[\s\S]*?\.ux-filter-toggle\{display:flex\}/);
 assert.match(css,/@media\(min-width:621px\)[\s\S]*?\.ux-filter-panel\.collapsed\{display:block!important\}/);
 assert.match(css,/\.ux-status-strip\{[\s\S]*?grid-template-columns:repeat\(4/);
 assert.match(css,/@media\(max-width:620px\)[\s\S]*?\.ux-status-strip\{grid-template-columns:repeat\(2/);
});

test("offline shell contains the usability stylesheet and new build cache",()=>{
 assert.match(sw,/const CACHE="footera-v\d+-\d+-[a-z-]+"/);
 assert.ok(sw.includes('./ux-overview.css?v=2114'));
 assert.ok(sw.includes('./3d-highlights.js?v=2150'));
});
console.log("V21.23 Übersichtlichkeit: Verein-Status und kompakte Mobile-Filter strukturell OK");
