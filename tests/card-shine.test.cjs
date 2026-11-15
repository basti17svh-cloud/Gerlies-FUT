'use strict';
// V21.440 Karten zum Anfassen: tilt + shine on big cards. Pure visuals, no save/purchase/online changes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-card-shine.js'),'utf8');
const css=fs.readFileSync(path.join(root,'footera-card-shine.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

function load({stored=null,reduced=false}={}){
 const listeners={};
 const el=cls=>({className:cls});
 const document={readyState:'complete',documentElement:{classList:{add(){}}},addEventListener:(t,f)=>{(listeners[t]||(listeners[t]=[])).push(f)},getElementById:()=>null};
 const window={matchMedia:()=>({matches:reduced}),addEventListener(){},removeEventListener(){}};
 const ctx={window,document,navigator:{userAgent:'test'},localStorage:{getItem:k=>k==='footera-card-shine'?stored:null},getComputedStyle:()=>({}),requestAnimationFrame:f=>0,setTimeout,clearTimeout,WeakSet};
 vm.runInNewContext(src,ctx);
 const shell=cls=>({querySelector:sel=>sel===':scope > .custom-card'&&cls!=null?el(cls):null});
 return{api:window.FooteraCardShine,shell,listeners}
}

test('finish: plain gold, rare gold metal, icon gold shimmer, special cards holo',()=>{
 const {api,shell}=load();
 assert.equal(api.finish(shell('custom-card gold')),'plain');
 assert.equal(api.finish(shell('custom-card silver base-rare')),'rare');
 assert.equal(api.finish(shell('custom-card icon')),'icon');
 for(const c of['totw','toty','halloween','champions-red','momentum','evolution','winter','blackfriday','special'])assert.equal(api.finish(shell('custom-card '+c)),'holo',c);
 assert.equal(api.finish(shell('custom-card founder founder-rangers')),'plain');
 assert.equal(api.finish(shell(null)),'plain');
});

test('opt-out flag switches everything off and reveals nothing',()=>{
 const {api}=load({stored:'0'});
 assert.equal(api.disabled(),true);
 assert.equal(api.eligible({closest:()=>null,querySelector:()=>({})}),false);
});

test('only big cards in profile, pack reveal, compare and picks; never minis or the 3D match',()=>{
 assert.match(src,/#bioModal \.bio-hero-card/);
 assert.match(src,/#reveal \.reveal-cards/);
 assert.match(src,/\.pc-card/);
 assert.match(src,/\.mini,\[data-card-shine-off\],\.fh3d/);
});

test('shine takes the shape of the card frame image, never a rectangle',()=>{
 assert.match(src,/maskImage/);
 assert.match(css,/\.fcs-glare\[data-masked=none\]\{display:none\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('no save, purchase or online access',()=>{
 for(const bad of[/\bstate\./,/\bsave\(/,/supabase/i,/fetch\(/,/setItem\(/])assert.doesNotMatch(src,bad);
});

test('release wiring: loaded after compare, cached by the service worker',()=>{
 assert.ok(html.indexOf('footera-card-shine.js?v=21440')>html.indexOf('footera-compare.js'));
 assert.ok(html.includes('footera-card-shine.css?v=21440'));
 assert.ok(sw.includes('"./footera-card-shine.js?v=21440"')&&sw.includes('"./footera-card-shine.css?v=21440"'));
});
