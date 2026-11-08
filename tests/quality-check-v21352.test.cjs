// V21.352: findings from a full new-player play-through (390/360/412 px).
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const app=read("footera-app.js"),tutorial=read("footera-tutorial.js"),hub=read("play-hub.js"),share=read("footera-share.js");

test("tutorial match step leads back from another play mode instead of pointing at the active Spielen tab",()=>{
 const targets=tutorial.slice(tutorial.indexOf('{id:"match"'),tutorial.indexOf('{id:"pack"'));
 assert.ok(targets.indexOf("[data-play-back]")>0,"back button is a coach target");
 assert.ok(targets.indexOf("[data-play-back]")<targets.indexOf('.nav [data-view="playView"]'),"back button comes before the nav tab");
 assert.ok(targets.indexOf('[data-play-mode="squad"]')<targets.indexOf("[data-play-back]"),"Squad Battles stays first when it is visible");
 assert.match(tutorial,/Tippe auf <b>Alle Spielmodi<\/b>/);
});

test("tapping the active Spielen tab returns from a play mode to the overview",()=>{
 assert.match(hub,/home:\(\)=>\{if\(area==='hub'\)return false;.*?show\('hub',\{push:false\}\);return true\}/);
 assert.match(app,/if\(b\.dataset\.view==="playView"&&currentViewId\(\)==="playView"&&window\.FooteraPlayHub\?\.home\?\.\(\)\)return;switchView\(b\.dataset\.view\)/);
});

test("invite and install hints wait until the tutorial is finished",()=>{
 assert.match(share,/function tutorialRunning\(\)\{try\{return typeof state!=="undefined"&&!!state\.tutorial&&!state\.tutorial\.done\}/);
 assert.match(share,/function showWinInvite\(force=false\)\{[\s\S]*?if\(tutorialRunning\(\)\)return false;[\s\S]*?const el=/);
 assert.match(share,/function showInstallHint\(force=false\)\{\n[^\n]*\n  if\(!force&&tutorialRunning\(\)\)return false;/);
});

test("event objective reward text shows the same rating as the card (Blutmond upgrade included)",()=>{
 assert.match(app,/a\.push\(`\$\{Math\.min\(99,Number\(task\.player\.ovr\)\+Number\(halloweenUpgradeFor\(\{eventType:task\.eventType\}\)\?\.ovr\|\|0\)\)\} \$\{task\.player\.name\} – \$\{task\.eventName\}`\)/);
});

test("evolution summary names the running season instead of a fixed Season 1",()=>{
 assert.doesNotMatch(app,/<strong>Season 1 · max\./);
 assert.match(app,/<strong>Season \$\{typeof seasonInfo==="function"\?seasonInfo\(\)\.number:1\} · max\. \$\{EVOLUTION_SEASON_MAX_OVR\} GES<\/strong>/);
});

test("countdowns write Tag/Tage instead of a bare T",()=>{
 for(const [file,src] of [["footera-app.js",app],["rivals-league.js",read("rivals-league.js")]]){
  assert.doesNotMatch(src,/\} T \$\{/,file+" has no '1 T 7 Std' countdown");
 }
 assert.match(app,/\$\{days\} \$\{days===1\?"Tag":"Tage"\} \$\{hrs\} Std/);
});

test("player-facing texts say Coins, not Münzen",()=>{
 for(const file of ["footera-account.js","tournaments.js","halloween-cup.js","footera-app.js","index.html"])assert.doesNotMatch(read(file),/Münzen/,file);
});

test("onboarding texts are written for players, not developers",()=>{
 assert.doesNotMatch(app,/Starter-Gold · \$\{si\}|Ratings werden nie verändert|valider 18er-Starterkader/);
 assert.match(app,/Goldspieler z\. B\. von \$\{esc\(clubs\.join\(", "\)\)\}/);
 assert.doesNotMatch(read("tournaments.js"),/Wochenbelohnung\(en\)/);
});
