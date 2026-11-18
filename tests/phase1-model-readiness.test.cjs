'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','3d-highlights.js'),'utf8');
const method=source.match(/  async function boundedModelReady\([\s\S]*?\n  \}/)?.[0];
if(!method)throw new Error('Bounded model preparation is missing');
function harness(){
 const timers=new Map();let next=0;
 const fn=vm.runInNewContext('('+method.trim()+')',{
  Promise,setTimeout:(callback,ms)=>{const id=++next;timers.set(id,{callback,ms});return id},
  clearTimeout:id=>timers.delete(id)
 });
 return{fn,timers};
}
test('premium models are given a bounded head start before the scene mounts',()=>{
 const model=source.indexOf('const ready=module.prepareFooteraHumanModel?.();');
 const premium=source.indexOf('await boundedModelReady(module.footeraRealBodyLoaded?.(),signal,450)');
 const scene=source.indexOf('module.play(event,signal)',premium);
 assert.ok(model>0&&premium>model&&scene>premium,'preparation precedes cloned 3D actors');
 assert.match(source,/if\(!disabled&&module\.footeraHumanPlayersWanted\?\.\(\)\)/);
});
test('an unresolved GLB settles on its budget and clears its timer',async()=>{
 const {fn,timers}=harness(),controller=new AbortController();
 const wait=fn(new Promise(()=>{}),controller.signal,950);
 assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,950);
 [...timers.values()][0].callback();await wait;assert.equal(timers.size,0);
});
test('a completed or aborted model request never holds a highlight',async()=>{
 const {fn,timers}=harness(),controller=new AbortController();
 await fn(Promise.resolve(true),controller.signal,950);assert.equal(timers.size,0);
 const hung=fn(new Promise(()=>{}),controller.signal,950);
 controller.abort();await hung;assert.equal(timers.size,0);
});
