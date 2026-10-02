const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
function setup(saved={}){
 let now=Date.parse('2026-10-02T17:00:00Z'),sequence=0;const timers=new Map(),stored={...saved},contexts=[];
 const ctx={Date:class extends Date{static now(){return now}},localStorage:{getItem:k=>stored[k]||null,setItem:(k,v)=>{stored[k]=v}},
  setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,at:now+ms});return sequence},clearTimeout:id=>timers.delete(id),
  P_BY_ID:new Map(),ICON_PORTRAIT_CACHE:{},iconPortraitUrl:p=>p.face||'',iconPortraitKey:n=>n,
  queueIconPortrait(){},promoItemInfo:()=>null,esc:String,
  IntersectionObserver:class{constructor(cb){this.cb=cb;this.observed=new Set();contexts.push(this)}observe(el){this.observed.add(el)}unobserve(el){this.observed.delete(el)}},
  MutationObserver:class{constructor(cb){ctx.mutation=cb}observe(){}},document:{body:{nodeType:1,matches:()=>false,querySelectorAll:()=>[]}}
 };
 vm.createContext(ctx);vm.runInContext(section('const IMAGE_SOURCE_CACHE=','const API_SPORTS_LEAGUE_IDS=')+'\n'+
  section('function imgCandidatesAttr(','function badgeAsset('),ctx);
 const read=expr=>vm.runInContext(expr,ctx),tick=ms=>{const end=now+ms;while(true){const job=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,t])=>t.at<=end);if(!job)break;timers.delete(job[0]);now=job[1].at;job[1].fn()}now=end};
 return{ctx,stored,read,tick,contexts,timers}
}
function image(candidates){
 const fallback={style:{},classList:{contains:n=>n==='face-fallback'}},el={nodeType:1,dataset:{candidates:JSON.stringify(candidates),idx:'0',cacheKey:'portrait:237383'},style:{},src:candidates[0],
  isConnected:true,complete:false,naturalWidth:0,loading:'lazy',fetchPriority:'auto',
  closest:()=>({}),parentElement:{querySelector:()=>fallback},classList:{add(){}},getAttribute:k=>k==='src'?el.src:null,
  matches:selector=>selector==='.face img',querySelectorAll:()=>[]};return{el,fallback}
}

test('a CSV portrait reaches the working FC27 CDN before blocked legacy hosts',()=>{
 const{ctx}=setup(),p={id:'237383',name:'Bastoni',face:'https://cdn.sofifa.net/players/237/383/27_120.png'};
 const arr=Array.from(ctx.portraitCandidates(p));assert.equal(arr[0],'https://cdn.futwiz.com/assets/img/fc27/faces/237383.png');
 assert.ok(arr.indexOf(p.face)>arr.indexOf('https://cdn.futwiz.com/assets/img/fc25/faces/237383.png'));
 assert.ok(arr.every(u=>!u.includes('components/items')));
});

test('correct custom/local images and verified Icon identities retain priority',()=>{
 const{ctx}=setup();assert.equal(ctx.portraitCandidates({id:'7',face:'./assets/portraits/seven.webp'})[0],'./assets/portraits/seven.webp');
 const icon={id:'midicon-oliver-kahn',name:'Oliver Kahn',isIcon:true,face:'https://game-assets.fut.gg/27-488.hash.webp',futwizId:'488'};
 const arr=Array.from(ctx.portraitCandidates(icon));assert.equal(arr[0],icon.face);
 assert.ok(arr.includes('https://cdn.futwiz.com/assets/img/fc27/faces/488.png'));assert.ok(!arr.some(u=>u.includes('midicon')||u.includes('/27/.png')));
});

test('a persisted network miss cannot suppress a portrait for a whole day',()=>{
 const old=Date.parse('2026-10-02T16:50:00Z'),url='https://cdn.futwiz.com/assets/img/fc27/faces/237383.png';
 const{ctx}=setup({gfutImageFailureCacheV9:JSON.stringify({[url]:old})});assert.equal(ctx.imageFailedRecently(url),false);
 assert.deepEqual(Array.from(ctx.prioritizeCached([url],'portrait:237383')),[url]);
});

test('after an offline launch every failed candidate remains recoverable on the next view',()=>{
 const urls=['primary','fallback'],{ctx,read}=setup();read('IMAGE_FAILURE_CACHE.set("primary",Date.now());IMAGE_FAILURE_CACHE.set("fallback",Date.now())');
 assert.deepEqual(Array.from(ctx.prioritizeCached(urls,'portrait:test')),urls);
 read('IMAGE_FAILURE_CACHE.delete("fallback")');assert.deepEqual(Array.from(ctx.prioritizeCached(urls,'portrait:test')),['fallback']);
});

test('healthy cached portraits are reused and a successful retry clears its failure record',()=>{
 const{ctx,read,tick,stored}=setup(),{el,fallback}=image(['primary','fallback']);el.src='fallback';el.complete=true;el.naturalWidth=250;
 read('IMAGE_FAILURE_CACHE.set("fallback",Date.now())');ctx.rememberLoadedImage(el);tick(600);
 assert.equal(fallback.style.display,'none');assert.equal(ctx.imageFailedRecently('fallback'),false);
 assert.equal(ctx.prioritizeCached(['primary','fallback'],'portrait:237383')[0],'fallback');
 assert.equal(JSON.parse(stored.gfutImageSourceCacheV9)['portrait:237383'],'fallback');
});

test('visible hanging requests advance once to the fallback, and successful images stop the timer',()=>{
 const{ctx,read,tick}=setup(),{el}=image(['hanging','working']);ctx.el=el;read('VISIBLE_PORTRAITS.add(el)');ctx.watchVisiblePortrait(el);
 tick(7999);assert.equal(el.src,'hanging');tick(1);assert.equal(el.src,'working');assert.equal(el.dataset.idx,'1');
 el.complete=true;el.naturalWidth=250;ctx.rememberLoadedImage(el);tick(9000);assert.equal(el.src,'working');assert.notEqual(el.style.display,'none');
});

test('offscreen lazy portraits are never timed out before being requested',()=>{
 const{ctx,tick}=setup(),{el}=image(['primary','fallback']);ctx.watchVisiblePortrait(el);tick(20000);
 assert.equal(el.src,'primary');assert.equal(el.dataset.idx,'0');assert.equal(ctx.imageFailedRecently('primary'),false);
});

test('a busy viewport lets valid queued portraits finish instead of cancelling every request after eight seconds',()=>{
 const{ctx,read,tick}=setup();ctx.batch=Array.from({length:12},(_,i)=>image(['primary-'+i,'fallback-'+i]).el);
 ctx.document.querySelectorAll=()=>ctx.batch;read('batch.forEach(el=>VISIBLE_PORTRAITS.add(el))');ctx.batch.forEach(el=>ctx.watchVisiblePortrait(el));
 tick(12000);assert.ok(ctx.batch.every((el,i)=>el.src==='primary-'+i));
 for(const el of ctx.batch){el.complete=true;el.naturalWidth=160;ctx.rememberLoadedImage(el)}
 tick(30000);assert.ok(ctx.batch.every((el,i)=>el.src==='primary-'+i&&el.style.display!=='none'));
});

test('the viewport observer promotes visible portraits and releases removed cards',()=>{
 const{ctx,contexts,tick}=setup(),{el}=image(['primary','fallback']);ctx.initializePortraitLoading();
 ctx.mutation([{addedNodes:[el],removedNodes:[]}]);assert.ok(contexts[0].observed.has(el));
 contexts[0].cb([{target:el,isIntersecting:true}]);assert.equal(el.loading,'eager');assert.equal(el.fetchPriority,'high');
 el.isConnected=false;ctx.mutation([{addedNodes:[],removedNodes:[el]}]);assert.equal(contexts[0].observed.has(el),false);
 tick(9000);assert.equal(el.src,'primary');assert.equal(ctx.imageFailedRecently('primary'),false);
});

test('fully failed requests show a safe placeholder and do not retry in an endless loop',()=>{
 const{ctx,read,tick}=setup(),{el,fallback}=image(['missing']);ctx.el=el;read('VISIBLE_PORTRAITS.add(el)');ctx.watchVisiblePortrait(el);
 tick(8000);assert.equal(el.style.display,'none');assert.equal(fallback.style.display,'flex');
 tick(16000);assert.equal(el.dataset.idx,'0');
});

test('event action shots keep priority and failed shots fall back to the correct normal portrait',()=>{
 const{ctx}=setup(),p={id:'237383',name:'Bastoni',face:'normal'},item={variant:'special',eventType:'momentum',dynamicFace:'./action.webp'};
 const markup=ctx.portraitHTML(p,false,item);assert.match(markup,/src="\.\/action.webp"/);
 const{el}=image(['./action.webp','normal']);el.closest=undefined;ctx.advanceImg(el);assert.equal(el.src,'normal');
 assert.match(ctx.portraitHTML(p,false,{variant:'special',eventName:'Team of the Week 3',dynamicFace:'./action.webp'}),/src="normal"/);
});
