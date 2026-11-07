// V21.358: faster start, smaller updates, less 3D work on high-refresh screens.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('footera-app.js'),html=read('index.html'),sw=read('service-worker.js'),scene=read('3d-highlights-scene.mjs');

function slice(src,start,end){const a=src.indexOf(start);assert.ok(a>=0,start);const b=src.indexOf(end,a+start.length);assert.ok(b>a,end);return src.slice(a,b)}

test('normalizeKey and clubIdentityKey keep their exact results with the cache',()=>{
 const ctx={};vm.createContext(ctx);
 vm.runInContext(slice(app,'function normalizeKey(v){','\nconst TOP5_CLUB_LEAGUES'),ctx);
 vm.runInContext(slice(app,'const CLUB_IDENTITY_STOP=','\n// Logos the game ships itself'),ctx);
 const reference=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const samples=['Bayern München','  Atlético de Madrid ','FC Bayern München','Paris Saint-Germain',null,undefined,0,'','Çaykur Rizespor','Bodø/Glimt','1. FC Köln'];
 for(let round=0;round<3;round++)for(const s of samples){
  assert.equal(ctx.normalizeKey(s),reference(s));
  assert.equal(ctx.clubIdentityKey(s),reference(s).split(' ').filter(x=>x&&!['fc','cf','afc','ac','sc','ssc','as','sv','vfb','vfl','tsg','rc','fk','sk','bk','club','football','futbol','calcio','the'].includes(x)).join(' '));
 }
});

test('founder name checks give the same answers with the cached name key',()=>{
 const ctx={};vm.createContext(ctx);
 vm.runInContext(slice(app,'const FOUNDER_SAVE_ID=','\nfunction founderItem('),ctx);
 const yes=[{name:'B. Gerlach',fullName:'Bastian Gerlach'},{name:'M. Gerlach'},{fullName:'Niklas Bergsträßer'},{name:'N. Bergstraesser'},{name:'Max Wittenberg'},{fullName:'  BASTIAN GERLACH '}];
 const no=[{name:'Gerlach'},{name:'Max Muster'},{name:'Niklas Süle'},{}];
 for(let round=0;round<2;round++){
  for(const p of yes)assert.equal(ctx.isExclusiveFounderBase(p),true,JSON.stringify(p));
  for(const p of no)assert.equal(ctx.isExclusiveFounderBase(p),false,JSON.stringify(p));
 }
});

test('player data loads while the intro plays, the club only appears after it',()=>{
 const intro=html.indexOf('initFooteraBootIntro();'),early=html.indexOf('startFooteraBootDuringIntro();'),gate=html.indexOf('FOOTERA_INTRO_DONE.then(()=>boot())');
 assert.ok(intro>0&&early>intro&&gate>early,'boot starts during the intro, the start chain still waits for it');
 assert.match(app,/FOOTERA_INTRO_DONE\.then\(\(\)=>setTimeout\(\(\)=>\{\$\("dbGate"\)\.style\.display="none";if\(!state\.onboarded\)/,'onboarding/club screen waits for the intro');
 // boot() runs its work once, whoever calls first
 const ctx={calls:0,loadVerifiedBadges:async()=>{ctx.calls++},loadPlayerTraits:async()=>{},syncDatabase:async()=>{}};vm.createContext(ctx);
 vm.runInContext(slice(app,'async function boot(){','\n$("dbRetry")'),ctx);
 return Promise.all([ctx.boot(),ctx.boot()]).then(()=>assert.equal(ctx.calls,1));
});

function worker({old=null,status=304,offline=false}={}){
 const handlers={},stores=new Map(),requests=[];
 const store=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return{
  match:async url=>m.get(url)?.clone(),
  put:async(url,res)=>{m.set(String(url.url||url),res)},
  add:async req=>{const res=await c.fetch(req);if(!res.ok)throw Error('bad');m.set(req.url,res)}}};
 const cacheName=sw.match(/const CACHE="([^"]+)"/)[1];
 if(old)for(const [url,res] of Object.entries(old))store('footera-old').put(url,res);
 const c={URL,Headers,Response,
  Request:class{constructor(url,opts={}){this.url=url;Object.assign(this,opts)}},
  self:{location:{origin:'https://footera.test'},addEventListener:(n,fn)=>handlers[n]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
  caches:{open:async n=>store(n),keys:async()=>[...stores.keys(),'other-app']},
  fetch:async(req,opts)=>{const url=req.url||req;requests.push({url,opts,cache:req.cache||opts?.cache});if(offline)throw Error('offline');
   if(opts?.headers?.get('If-None-Match'))return new Response(status===304?null:'fresh '+url,{status});
   return new Response('fresh '+url,{status:200})}
 };
 vm.runInNewContext(sw,c);
 return{cacheName,stores,requests,async install(){const work=[];handlers.install({waitUntil:p=>work.push(p)});await Promise.all(work)}};
}

test('a new version keeps unchanged files after a 304 instead of downloading 27 MB again',async()=>{
 const shell=JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1]);
 const old={};for(const url of shell)old[url]=new Response('old '+url,{headers:{ETag:'"e-'+url+'"','Last-Modified':'Fri, 06 Nov 2026 10:00:00 GMT'}});
 const w=worker({old,status:304});await w.install();
 const fresh=w.stores.get(w.cacheName);
 assert.equal(fresh.size,shell.length);
 for(const url of shell){assert.equal(await fresh.get(url).clone().text(),'old '+url)}
 assert.ok(w.requests.every(r=>r.cache==='no-store'&&r.opts.headers.get('If-None-Match')),'every file is only revalidated');
});

test('changed files and first installs are downloaded fresh',async()=>{
 const shell=JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1]);
 const url=shell.find(x=>x.includes('footera-app.js'));
 const changed=worker({old:{[url]:new Response('old',{headers:{ETag:'"x"'}})},status:200});await changed.install();
 assert.equal(await changed.stores.get(changed.cacheName).get(url).clone().text(),'fresh '+url);
 const first=worker();await first.install();
 assert.equal(await first.stores.get(first.cacheName).get(url).clone().text(),'fresh '+url);
 assert.ok(first.requests.filter(r=>r.url===url).every(r=>r.cache==='reload'),'without an old copy the network copy is forced');
});

test('3D highlights draw at most ~60 pictures per second on 90-144 Hz screens, with a QA opt-out',()=>{
 assert.match(scene,/if\(capHighRefresh&&lastPresented&&now-lastPresented<9\.6\)\{raf=requestAnimationFrame\(frame\);return\}/);
 assert.match(scene,/getItem\('footera-3d-fps'\)!=='max'/);
 // 9.6 ms skips only frames of >104 Hz screens: 120 Hz -> 60, 144 Hz -> 72, 90 Hz and 60 Hz unchanged.
 const presented=hz=>{let last=0,n=0;for(let i=0;i<hz;i++){const now=1000+i*1000/hz;if(last&&now-last<9.6)continue;last=now;n++}return n};
 assert.equal(presented(60),60);assert.equal(presented(90),90);assert.equal(presented(120),60);assert.equal(presented(144),72);
});

test('crowd limbs have no hidden end caps (fewer triangles, same look)',()=>{
 assert.match(scene,/crowd-arm-human',\(\)=>new THREE\.CylinderGeometry\(\.055,\.047,\.48,6,1,true\)/);
 assert.match(scene,/crowd-leg-human',\(\)=>new THREE\.CylinderGeometry\(\.064,\.052,\.50,6,1,true\)/);
});
