'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Sprint 1 broadcast turf keeps its detail on the existing pitch shader',()=>{
 const arena=read('3d-arena.mjs'),scene=read('3d-highlights-scene.mjs');
 for(const code of ['uArenaBlades','uArenaMow','goalmouth','penalty','falloff','inPlay'])assert.ok(arena.includes(code),code);
 assert.match(arena,/const TURF_FRAGMENT=`\{[\s\S]*?\}`;/);
 assert.match(scene,/createArena\(THREE,/);
 assert.match(scene,/3d-arena\.mjs\?v=21468/);
 assert.match(scene,/data\[i\]=64\+n\*\.67;data\[i\+1\]=128\+n/);
});
test('Footera perimeter and floodlight pass keep unmodified player and score logic',()=>{
 const boards=read('3d-advertising.mjs'),look=read('3d-broadcast-look.mjs'),scene=read('3d-highlights-scene.mjs');
 assert.match(boards,/#63f874/);assert.match(boards,/instagram\?'#fffaf8'/);assert.match(boards,/kind==='winter'\|\|kind==='silvester'/);
 assert.match(look,/new THREE\.DirectionalLight\('#dceaff',high\?1\.1:\.82\)/);
 assert.match(scene,/opacity:weak\?\.52:\.66/);
});
test('Graphic revision is consistently loaded from HTML and offline shell',()=>{
 const shell=read('service-worker.js'),html=read('index.html'),script=read('3d-highlights.js'),scene=read('3d-highlights-scene.mjs'),app=read('footera-app.js');
 for(const asset of ['3d-highlights.js','3d-highlights-scene.mjs','3d-arena.mjs','3d-broadcast-look.mjs','3d-advertising.mjs','footera-app.js'])assert.ok(shell.includes('./'+asset+'?v=21468'),asset);
 assert.ok(html.includes('./3d-highlights.js?v=21468'));assert.ok(html.includes('./footera-app.js?v=21468'));
 assert.ok(script.includes('./3d-highlights-scene.mjs?v=21468'));
 for(const dep of ['3d-arena.mjs','3d-broadcast-look.mjs','3d-advertising.mjs'])assert.ok(scene.includes('./'+dep+'?v=21468'),dep);
 assert.ok(app.includes('const GFUT_BUILD="V21.468"'));assert.ok(shell.includes('footera-v21-468-broadcast'));
});
