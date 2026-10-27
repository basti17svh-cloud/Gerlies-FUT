const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../footera-app.js'),'utf8');
const code=source.slice(source.indexOf('let saveQueued='),source.indexOf('function toast(t){'));
function fixture(){
 const stored=new Map(),events=[],listeners={},timers=new Map(),notices=[];let full=false,seq=0;
 const context={state:{coins:10,club:[]},persistActiveSquadPreset(){},console:{warn(){}},Event:class{constructor(type){this.type=type}},
  localStorage:{setItem(key,value){if(full)throw Error('QuotaExceededError');stored.set(key,value)}},
  setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(id){timers.delete(id)},
  window:{addEventListener(name,fn){listeners[name]=fn},dispatchEvent(event){events.push(event.type)}},
  document:{addEventListener(){},getElementById(){return{}}},$(){return{}},toast(text){notices.push(text)}};
 vm.createContext(context);vm.runInContext(code,context);
 return{context,stored,events,listeners,timers,notices,fill(value){full=value},run(code){return vm.runInContext(code,context)}};
}
test('a failed local write remains dirty and focus retries the latest game without a new action',()=>{
 const f=fixture();f.run('save()');f.fill(true);
 assert.equal(f.run('flushSave()'),false);assert.equal(f.run('saveDirty'),true);
 assert.equal(f.stored.size,0);assert.equal(f.notices.length,1);
 assert.deepEqual(f.events,['footera:save'],'cloud may still preserve the running game');
 assert.equal(f.run('flushSave()'),false);assert.equal(f.events.length,1,'no endless cloud retry loop');
 f.context.state.coins=57;f.fill(false);f.listeners.focus();
 assert.equal(JSON.parse(f.stored.get('gerliesFutV9')).coins,57);
 assert.equal(f.run('saveDirty'),false);assert.equal(f.run('saveFailed'),false);
 assert.equal(f.run('flushSave()'),true);assert.equal(f.timers.size,0);
});
test('a failed write preserves the previous durable save and pagehide can recover',()=>{
 const f=fixture();f.run('save();flushSave()');const before=f.stored.get('gerliesFutV9');
 f.fill(true);f.context.state.coins=80;f.run('save();flushSave()');
 assert.equal(f.stored.get('gerliesFutV9'),before);
 f.fill(false);f.listeners.pagehide();assert.equal(JSON.parse(f.stored.get('gerliesFutV9')).coins,80);
});
test('replacement guard prevents a late local write over a restored cloud save',()=>{
 const f=fixture();f.run('save()');f.context.window.FooteraAccountReplacingSave=true;
 assert.equal(f.run('flushSave()'),false);assert.equal(f.stored.size,0);
});
