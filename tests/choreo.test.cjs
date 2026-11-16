'use strict';
// V21.427 Fan-Choreo: own tifo at the walk-out of home matches. Device-local, save untouched.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-choreo.js'),'utf8');
function load(extra={}){
 const store=new Map();
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const identity={kits:{home:{shirtPrimary:'#c8102e',shirtSecondary:'#ffffff'}},colors:{primary:'#c8102e',secondary:'#ffffff',accent:'#111111'},crest:{initials:'FCG'}};
 const ctx={window:{},localStorage,Math,Date,JSON,console,clubIdentitySnapshot:()=>JSON.parse(JSON.stringify(identity)),state:{profile:{clubName:'FC Gerlies',clubShortName:'FCG'}},...extra};
 vm.createContext(ctx);vm.runInContext(src,ctx);return{api:ctx.window.FooteraChoreo,store};
}

test('without any setup the fans show a choreo in the club colours with the club name',()=>{
 const {api,store}=load();
 const c=api.forMatch({venue:'home',mode:'rivals'});
 assert.equal(c.a,'#c8102e');assert.equal(c.b,'#ffffff');assert.equal(c.text,'FC GERLIES');assert.equal(c.motif,'stripes');
 assert.equal(store.size,0,'reading writes nothing');
});

test('only at your own ground and only when switched on',()=>{
 const {api}=load();
 assert.equal(api.forMatch({venue:'away'}),null);
 assert.equal(api.forMatch({venue:'home',mode:'friend_online'}),null);
 api.save({...api.read(),on:false});
 assert.equal(api.forMatch({venue:'home'}),null);
});

test('saved design is cleaned: colours, motif, text length, placeholders',()=>{
 const {api,store}=load();
 api.save({motif:'sun',a:'#123456',b:'nope',ink:'#000000',text:'nur der <b>{short}</b> und noch viel mehr text',top:'seit {YEAR}',stars:9,crest:false});
 const r=api.read();
 assert.equal(r.motif,'sun');assert.equal(r.a,'#123456');assert.equal(r.b,'#ffffff','bad colour falls back');assert.equal(r.stars,3);assert.equal(r.crest,false);
 assert.ok(!/[<>]/.test(r.text)&&r.text.length<=26&&r.text===r.text.toUpperCase());
 const m=api.forMatch({venue:'home'});
 assert.match(m.text,/^NUR DER BFCG\/B/);assert.equal(m.top,'SEIT 2026');
 api.save({motif:'disco'});assert.equal(api.read().motif,'stripes');
 assert.deepEqual([...store.keys()],['footera-choreo-v1'],'only its own key');
});

test('draw paints every motif without errors',()=>{
 const {api}=load();const calls=[];
 const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:k==='measureText'?(s=>({width:String(s).length*20})):/Gradient$/.test(String(k))?(()=>({addColorStop(){}})):(...a)=>calls.push(k),set:(t,k,v)=>(t[k]=v,true)});
 for(const motif of Object.keys(api.MOTIFS))api.draw(ctx,1024,320,{motif,a:'#111111',b:'#eeeeee',ink:'#ffffff',text:'FC GERLIES',top:'BUILD YOUR ERA',stars:2,crest:true},null);
 assert.ok(calls.includes('fillText'));
});

test('loaded, cached, in the club identity, in Extras and in the 3D walk-out',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const v=(html.match(/footera-choreo\.js\?v=(\d+)/)||[])[1];assert.ok(v,'script tag');
 assert.ok(html.includes(`footera-choreo.css?v=${v}`));
 assert.ok(sw.includes(`./footera-choreo.js?v=${v}`)&&sw.includes(`./footera-choreo.css?v=${v}`),'service worker shell');
 assert.ok(html.indexOf('footera-choreo.js')>html.indexOf('footera-app.js'),'loads after the app');
 assert.ok(html.includes('data-identity-tab="choreo"')&&html.includes('id="identityChoreo"'),'identity tab');
 assert.ok(html.includes('data-choreo-open'),'Extras entry');
 const match=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8'),hl=fs.readFileSync(path.join(root,'3d-highlights.js'),'utf8'),scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(match,/choreo:kind==='kickoff'&&typeof FooteraChoreo!=='undefined'\?FooteraChoreo\.forMatch\(current\):null/);
 assert.match(hl,/choreo:cleanChoreo\(event\.choreo\)/);
 assert.match(scene,/FooteraChoreo\.draw\(ctx,w,h,customChoreo,crestImage\)/);
 assert.match(scene,/tifo\?\.update\(time\)/);
});

// V21.438: many more designs and a different motif at every home match.
test('24 motifs, each with an icon, and "jedes Heimspiel ein anderes Motiv"',()=>{
 const {api}=load();
 assert.ok(Object.keys(api.MOTIFS).length>=24,'motifs: '+Object.keys(api.MOTIFS).length);
 const css=fs.readFileSync(path.join(root,'footera-choreo.css'),'utf8');
 for(const id of Object.keys(api.MOTIFS))assert.ok(css.includes('i.m-'+id),'icon for '+id);
 assert.equal(api.forMatch({venue:'home',resultId:'a'}).motif,'stripes','fixed motif by default');
 api.save({...api.read(),rotate:true});
 const seen=new Set();for(let i=0;i<40;i++)seen.add(api.forMatch({venue:'home',resultId:'r'+i}).motif);
 assert.ok(seen.size>=12,'many motifs over 40 home matches: '+seen.size);
 assert.equal(api.forMatch({venue:'home',resultId:'r7'}).motif,api.forMatch({venue:'home',resultId:'r7'}).motif,'same match, same choreo');
 const hl=fs.readFileSync(path.join(root,'3d-highlights.js'),'utf8');
 assert.match(hl,/FooteraChoreo\.MOTIFS/,'the 3D walk-out accepts every motif');
});
