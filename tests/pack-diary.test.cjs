'use strict';
// V21.378 Pack-Tagebuch: device-local log of opened packs, best pull first, capped, filter for 85+.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-pack-diary.js'),'utf8');
function load(){
 const store=new Map();
 const ctx={window:{},document:{readyState:'complete',addEventListener(){},querySelector:()=>null},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},
  PACKS:[{id:'gold',name:'Gold-Pack'}],displayBase:i=>i.base,itemRating:i=>i.base.ovr,console};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {api:ctx.window.FooteraPackDiary,store};
}
const it=(name,ovr,extra={})=>({uid:'u'+name,base:{name,ovr,position:'ST'},...extra});

test('records pack name, players sorted by rating and a copy of the best card',()=>{
 const {api}=load();
 const e=api.record('gold',[it('A',78),it('B',86),it('C',81)],1000);
 assert.equal(e.name,'Gold-Pack');
 assert.deepEqual([...e.players].map(p=>p.ovr),[86,81,78]);
 assert.equal(e.best.uid,'uB');
 assert.equal(api.record('gold',[]),null);
});

test('newest first, stats count 85+ pulls, log is capped at 80 packs',()=>{
 const {api,store}=load();
 for(let i=0;i<85;i++)api.record('gold',[it('P'+i,i===84?90:70)],1000+i);
 assert.equal(JSON.parse(store.get(api.KEY)).length,80);
 const list=api.entries();assert.equal(list[0].at,1084);
 const s=api.stats();assert.equal(s.packs,80);assert.equal(s.big,1);assert.equal(s.top.ovr,90);
 assert.match(api.html({onlyBig:true}),/P84/);
 assert.doesNotMatch(api.html({onlyBig:true}),/P83/);
});

test('broken storage shows the empty state instead of failing',()=>{
 const {api,store}=load();store.set(api.KEY,'{kaputt');
 assert.equal(api.entries().length,0);assert.match(api.html(),/Noch keine Einträge/);
});

test('openPack records every opened pack, script is cached offline',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(app,/globalThis\.FooteraWeekRecap\?\.afterPack\(items\);globalThis\.FooteraPackDiary\?\.record\(id,items\);/);
 const v=html.match(/footera-pack-diary\.js\?v=(\d+)/)[1];assert.ok(sw.includes(`./footera-pack-diary.js?v=${v}`));assert.ok(sw.includes(`./footera-pack-diary.css?v=${v}`));
 assert.equal((html.match(/data-pack-diary-open/g)||[]).length,2);
});
