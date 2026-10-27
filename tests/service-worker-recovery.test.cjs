const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../service-worker.js'),'utf8');
test('every script and stylesheet used by the main page is precached at its exact URL',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const shell=JSON.parse(source.match(/const SHELL=(\[[^;]+\]);/)[1]);
 for(const [,url] of html.matchAll(/(?:src|href)="(\.\/[^"<>]+\.(?:js|mjs|css)(?:\?[^"<>]*)?)"/g))
  assert.ok(shell.includes(url),'missing offline resource '+url);
});
function worker({status=200,offline=false,cached=true}={}){
 const handlers={},writes=[],deleted=[],work=[],page=cached?new Response('<title>Footera offline</title>'):null;
 const cacheName=source.match(/const CACHE="([^"]+)"/)[1];
 const cache={put:async(key,response)=>writes.push([key,await response.text()])};
 const c={URL,Request:class{constructor(r,opts){Object.assign(this,r,opts)}},
  self:{location:{origin:'https://footera.test'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}},
  caches:{open:async()=>cache,match:async()=>page?.clone(),keys:async()=>[cacheName,'footera-v21-old','another-game-cache'],delete:async k=>deleted.push(k)},
  fetch:async()=>{if(offline)throw Error('offline');return new Response(status===200?'<title>Footera fresh</title>':'Server error',{status})}
 };
 vm.runInNewContext(source,c);
 return{writes,deleted,async navigate(){let response;handlers.fetch({request:{url:'https://footera.test/index.html',method:'GET',mode:'navigate'},respondWith:p=>response=p,waitUntil:p=>work.push(p)});const result=await response;await Promise.all(work);return result},async activate(){handlers.activate({waitUntil:p=>work.push(p)});await Promise.all(work)}};
}
test('temporary server errors use the playable page and cannot poison the offline cache',async()=>{
 for(const status of [404,503]){const w=worker({status});const response=await w.navigate();assert.equal(response.status,200);assert.match(await response.text(),/Footera offline/);assert.equal(w.writes.length,0)}
});
test('a first visit without cached data returns the real HTTP error without saving it',async()=>{
 const w=worker({status:503,cached:false}),response=await w.navigate();assert.equal(response.status,503);assert.equal(w.writes.length,0);
});
test('successful navigation refreshes the offline page; loss of network retains it',async()=>{
 const online=worker(),response=await online.navigate();assert.match(await response.text(),/Footera fresh/);assert.deepEqual(online.writes,[['./index.html','<title>Footera fresh</title>']]);
 const offline=worker({offline:true});assert.match(await (await offline.navigate()).text(),/Footera offline/);assert.equal(offline.writes.length,0);
});
test('worker activation removes obsolete Footera caches and preserves other apps',async()=>{
 const w=worker();await w.activate();assert.deepEqual(w.deleted,['footera-v21-old']);
});
