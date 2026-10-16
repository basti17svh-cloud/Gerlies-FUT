const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"squad-tactics.js"),"utf8");
const css=fs.readFileSync(path.join(root,"squad-tactics.css"),"utf8");
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8"));

test("squad planning and match actions load in the shell and offline cache",()=>{
 const build=html.match(/const GFUT_BUILD="V([\d.]+)"/)[1];
 assert.ok(html.includes('<title>Footera V'+build+'</title>'));
 for(const name of ['squad-tactics','footera-match-actions']){
  const url=html.match(new RegExp('\\./'+name+'\\.js\\?v=\\d+'))[0];assert.ok(sw.includes('"'+url+'"'));
 }
 assert.equal(manifest.start_url,'./index.html?v='+build);
 new vm.Script(js);
});

test("squad screen exposes separate Footera-style tactics, roles and assignments entry points",()=>{
 for(const id of ["openSquadTactics","openSquadRoles","openSquadAssignments","squadTacticsModal","squadRolesModal","squadAssignmentsModal"])assert.ok(js.includes(id),id);
 for(const label of ["Individuelle Taktik","Rollen & Fokus","Aufgaben","Kapitän","Ecke links","Ecke rechts","Freistöße","Elfmeter"])assert.ok(js.includes(label),label);
 assert.match(css,/#squadView \.role-panel\{display:none!important\}/);
 assert.match(css,/\.squad-plan-menu\{display:grid;grid-template-columns:repeat\(3/);
 assert.match(css,/@media\(max-width:560px\)/);
});

test("individual tactics persist per saved team and feed the match simulation without replacing base balance",()=>{
 for(const key of ["width","depth","pressing","buildUp","attackFocus","dribbling","crossing","longShots"])assert.ok(js.includes(key),key);
 assert.match(js,/state\.squadPlans/);
 assert.match(js,/state\?\.activeSquadPreset/);
 assert.match(js,/match\.customTactics=\{\.\.\.plan\.tactics\}/);
 assert.match(html,/tacticMods\(match\.tactic,match\.customTactics\)/);
 assert.match(html,/match\.opponentProfile\?\.customTactics/);
 assert.match(js,/const rawMods=tacticMods;tacticMods=function\(t,custom\)/);
});

test("set-piece assignments are resolved before finishing, without replacing the scorer afterward",()=>{
 assert.match(js,/normalizeAssignments/);
 assert.match(html,/attacker=setPiece\?matchSetPieceTaker\(side,creationType\)/);
 assert.doesNotMatch(js,/scorer=picked/);
});
