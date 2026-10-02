const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const BUILD=html.match(/const GFUT_BUILD="([^"]+)"/)[1],WORKER=html.match(/service-worker\.js\?v=(\d+)/)[1];
const [MAJOR,MINOR]=BUILD.slice(1).split('.').map(Number),NEXT=`V${MAJOR}.${MINOR+1}`,LATER=`V${MAJOR}.${MINOR+2}`;
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function app({resume,controller=null,remote=BUILD,storageFails=false}={}){
 const storage=new Map(),nodes=new Map(),listeners={},timers=new Map(),navigations=[],restored=[],warnings=[];let sequence=0,flushes=0;
 if(resume!==undefined)storage.set('gfut-update-resume',typeof resume==='string'?resume:JSON.stringify(resume));
 function node(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,style:{display:id==='dbGate'?'none':''},removed:false,listeners:{},classList:{add:x=>classes.add(x),contains:x=>classes.has(x)},addEventListener(t,fn){this.listeners[t]=fn},remove(){this.removed=true;nodes.delete(id)},pause(){this.pauses=(this.pauses||0)+1},play(){this.plays=(this.plays||0)+1;return Promise.resolve()},removeAttribute(){},load(){}})}return nodes.get(id)}
 node('bootIntro');node('bootIntroVideo');node('bootIntroSkip');
 const serviceWorker={controller,listeners:{},addEventListener(t,fn){this.listeners[t]=fn},registration:{active:{state:'activated'},async update(){this.updates=(this.updates||0)+1}},async register(){return this.registration},async getRegistration(){return this.registration}};
 const c={Date,Set,URL,Number,Math,pendingPack:[],activeSbcId:null,$:id=>nodes.get(id)||node(id),
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(storageFails)throw Error('Storage unavailable');storage.set(k,v)},removeItem:k=>storage.delete(k)},
  navigator:{serviceWorker},location:{protocol:'https:',hostname:'footera.test',href:'https://footera.test/game/',replace:url=>navigations.push(url)},
  window:{scrollY:210,addEventListener:(t,fn)=>listeners[t]=fn,scrollTo:opts=>restored.push({scroll:opts.top})},
  document:{activeElement:{matches:()=>false},querySelector:()=>null},
  setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),
  flushSave:()=>flushes++,currentViewId:()=>c.view||'objectivesView',switchView:(view,opts)=>{c.view=view;restored.push({view,opts})},replaceUiState:(kind,opts)=>restored.push({kind,...opts}),
  console:{warn:(...a)=>warnings.push(a)},fetch:async()=>({ok:true,text:async()=>`<title>Footera ${remote}</title>`})
 };
 // A removed intro must really be absent for the update guard.
 c.$=id=>nodes.get(id)||(['bootIntro','bootIntroVideo','bootIntroSkip'].includes(id)?null:node(id));
 vm.createContext(c);vm.runInContext(section('function takeGerliesUpdateResume()','</script>'),c);
 const run=code=>vm.runInContext(code,c),tick=()=>{const [id,timer]=[...timers.entries()].filter(([,v])=>v.ms===500).at(-1)||[];if(timer){timers.delete(id);timer.fn()}},ready=()=>{nodes.delete('bootIntro');c.completeGerliesStartup()};
 return{c,storage,nodes,serviceWorker,listeners,timers,navigations,restored,warnings,run,tick,ready,flushes:()=>flushes};
}

test('fresh launch plays one normal intro; the first real worker claim does not reload the app',async()=>{
 const a=app();assert.equal(a.nodes.get('bootIntroVideo').plays,1);assert.equal(a.nodes.get('bootIntro').removed,false);
 a.listeners.load();await new Promise(r=>setImmediate(r));a.ready();a.serviceWorker.controller={scriptURL:'https://footera.test/game/service-worker.js?v='+WORKER};a.serviceWorker.listeners.controllerchange();
 assert.equal(a.navigations.length,0);assert.equal(a.storage.has('gfut-update-resume'),false);assert.equal(a.flushes(),0);
});

test('an existing worker with the same release URL cannot trigger another app start',async()=>{
 const old={scriptURL:'https://footera.test/game/service-worker.js?v='+WORKER},a=app({controller:old});a.listeners.load();await new Promise(r=>setImmediate(r));a.ready();
 a.serviceWorker.controller={scriptURL:old.scriptURL};a.serviceWorker.listeners.controllerchange();assert.equal(a.navigations.length,0);
});

test('a genuine worker update waits for the intro and startup and preserves the current screen',async()=>{
 const a=app({controller:{scriptURL:'https://footera.test/game/service-worker.js?v=2024'}});a.listeners.load();await new Promise(r=>setImmediate(r));
 a.serviceWorker.controller={scriptURL:'https://footera.test/game/service-worker.js?v='+WORKER};a.serviceWorker.listeners.controllerchange();assert.equal(a.navigations.length,0);assert.ok([...a.timers.values()].some(t=>t.ms===500));
 a.ready();assert.equal(a.navigations.length,1);assert.equal(a.flushes(),1);const resume=JSON.parse(a.storage.get('gfut-update-resume'));assert.equal(resume.view,'objectivesView');assert.equal(resume.scrollY,210);
 assert.equal(a.storage.get('gfut-sw-reloaded-'+BUILD),'1');assert.match(a.navigations[0],/^https:\/\/footera.test\/game\/\?_gfut_updated=/);
 a.serviceWorker.listeners.controllerchange();assert.equal(a.navigations.length,1);
});

test('two simultaneous update sources coalesce into one refresh after the unfinished installation',()=>{
 const a=app();a.ready();a.run('gerliesUpdateRegistration={installing:{state:"installing"}}');
 a.c.requestGerliesUpdate('gfut-sw-reloaded-'+BUILD);a.c.requestGerliesUpdate('gfut-update-'+NEXT);assert.equal(a.navigations.length,0);
 a.run('gerliesUpdateRegistration.installing=null');a.tick();assert.equal(a.navigations.length,1);assert.equal(a.flushes(),1);assert.equal(a.storage.get('gfut-sw-reloaded-'+BUILD),'1');assert.equal(a.storage.get('gfut-update-'+NEXT),'1');
 a.c.requestGerliesUpdate('gfut-update-'+LATER);assert.equal(a.navigations.length,1);
});

test('updates are retained while playing, opening a pack, editing an SBC or using a modal/input',()=>{
 for(const mode of ['match','pack','results','pendingPack','sbc','modal','input','database']){
  const a=app();a.ready();let blocked=true;
  if(mode==='match'||mode==='pack'||mode==='results'){const id={match:'match',pack:'opening',results:'results'}[mode];a.c.$(id).classList.contains=()=>blocked;}
  if(mode==='pendingPack')a.c.pendingPack=[{uid:'unassigned'}];
  if(mode==='sbc')a.c.activeSbcId='sbc-in-progress';
  if(mode==='modal')a.c.document.querySelector=()=>blocked?{}:null;
  if(mode==='input')a.c.document.activeElement.matches=()=>blocked;
  if(mode==='database')a.c.$('dbGate').style.display='grid';
  a.c.requestGerliesUpdate('gfut-update-'+NEXT);a.tick();assert.equal(a.navigations.length,0,mode);assert.equal(a.storage.has('gfut-update-resume'),false,mode);
  blocked=false;a.c.pendingPack=[];a.c.activeSbcId=null;a.c.$('dbGate').style.display='none';a.tick();assert.equal(a.navigations.length,1,mode);
 }
});

test('automatic update resumes once without replaying the intro and restores the view and scroll',()=>{
 const a=app({resume:{at:Date.now(),view:'clubView',scrollY:240}});assert.equal(a.storage.has('gfut-update-resume'),false);assert.equal(a.nodes.has('bootIntro'),false);assert.equal(a.nodes.get('bootIntroVideo').plays,undefined);assert.equal(a.nodes.get('bootIntroVideo').pauses,1);
 a.c.$('clubView').classList.contains=cls=>cls==='view';a.c.completeGerliesStartup();assert.equal(a.c.view,'clubView');assert.ok(a.restored.some(x=>x.scroll===240));assert.ok(a.restored.some(x=>x.kind==='view'&&x.view==='clubView'));
 assert.equal(a.c.takeGerliesUpdateResume(),null);
});

test('a normal later launch, an expired marker and malformed session data keep the normal intro',()=>{
 for(const resume of [undefined,{at:Date.now()-120001,view:'clubView'},'broken JSON',{at:Date.now()+5000,view:'clubView'}]){
  const a=app({resume});assert.equal(a.nodes.get('bootIntroVideo').plays,1);assert.equal(a.nodes.has('bootIntro'),true);
 }
});

test('same or older cached HTML never refreshes a newer app; newer numeric versions still update',async()=>{
 for(const [remote,count] of [[BUILD,0],[`V${MAJOR}.${MINOR-1}`,0],[`V${MAJOR-1}.99`,0],['invalid',0],[NEXT,1],[`V${MAJOR}.${MINOR+100}`,1],[`V${MAJOR+1}.0`,1]]){
  const a=app({remote});a.ready();await a.c.checkForGerliesUpdate();assert.equal(a.navigations.length,count,remote);if(count){assert.equal(a.storage.get('gfut-update-'+remote),'1');await a.c.checkForGerliesUpdate();assert.equal(a.navigations.length,1);}
 }
});

test('unavailable session storage leaves the screen intact instead of forcing a blind restart',()=>{
 const a=app({storageFails:true});a.ready();a.c.requestGerliesUpdate('gfut-update-'+NEXT);assert.equal(a.navigations.length,0);assert.equal(a.flushes(),1);assert.equal(a.warnings.length,1);
});
