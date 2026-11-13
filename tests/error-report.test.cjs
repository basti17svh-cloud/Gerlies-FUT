'use strict';
// V21.408: automatic error reports only with statistics consent, without personal data.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'footera-error-report.js'),'utf8');

function load({consent='yes',visitor='0f8fad5b-d9cb-469f-a165-70867728950e'}={}){
 const listeners={},store={'footera-visit-consent-v1':consent,'footera-visit-id-v1':visitor},sent=[];
 const timers=[];
 const win={
  addEventListener:(t,f)=>{(listeners[t]||=[]).push(f)},
  FOOTERA_ONLINE_CONFIG:{publishableKey:'sb_publishable_test'},
 };
 const ctx={window:win,localStorage:{getItem:k=>store[k]??null},
  document:{hidden:false,addEventListener(){},querySelector:sel=>sel==='section.view.active'?{id:'storeView'}:null,querySelectorAll:()=>[],getElementById:()=>({textContent:'V21.408'})},
  navigator:{userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36'},
  innerWidth:390,location:{href:'https://basti17svh-cloud.github.io/Gerlies-FUT/?utm_source=instagram'},
  URL,setTimeout:(f)=>{timers.push(f);return timers.length},clearTimeout(){},
  fetch:async(url,opt)=>{sent.push({url,body:JSON.parse(opt.body),opt});return{ok:true}}};
 ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(source,ctx);
 const api=ctx.window.FooteraErrorReport;
 const fire=(type,ev)=>(listeners[type]||[]).forEach(f=>f(ev));
 return{api,fire,sent,flush:async()=>{await api._flush()}};
}

test('no consent: nothing is queued or sent',async()=>{
 const r=load({consent:'no'});
 r.fire('error',{message:'TypeError: x is undefined',filename:'https://basti17svh-cloud.github.io/Gerlies-FUT/footera-app.js?v=21408',lineno:10,colno:5});
 assert.equal(r.api._queue().length,0);await r.flush();assert.equal(r.sent.length,0);
 const none=load({consent:null});none.fire('error',{message:'boom',filename:'a.js'});assert.equal(none.api._queue().length,0);
});

test('with consent: one cleaned report with version, screen, device and file:line',async()=>{
 const r=load();
 r.fire('error',{message:"Cannot read properties of undefined (reading 'contains')",filename:'https://basti17svh-cloud.github.io/Gerlies-FUT/footera-app.js?v=21408',lineno:10125,colno:19});
 r.fire('error',{message:"Cannot read properties of undefined (reading 'contains')",filename:'https://basti17svh-cloud.github.io/Gerlies-FUT/footera-app.js?v=21408',lineno:10125,colno:19});
 await r.flush();
 assert.equal(r.sent.length,1);
 const body=r.sent[0].body;
 assert.equal(body.action,'error');assert.equal(body.consent,true);assert.equal(body.errors.length,1,'same error is sent once per page');
 const e=body.errors[0];
 assert.equal(e.source,'footera-app.js:10125:19');assert.equal(e.build,'V21.408');assert.equal(e.screen,'storeView');
 assert.match(e.device,/^Android · Chrome · ≤430 px$/);
 assert.equal(Object.keys(e).sort().join(','),'build,device,kind,message,screen,source');
});

test('personal data and noise are removed or ignored',()=>{
 const {api}=load();
 const cleaned=api._clean('Fehler bei max@example.com für 0f8fad5b-d9cb-469f-a165-70867728950e https://x.supabase.co/rest/v1/table?select=*&token=abc eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig');
 assert.ok(!cleaned.includes('max@example.com')&&!cleaned.includes('0f8fad5b')&&!cleaned.includes('token=abc')&&!cleaned.includes('eyJhbGci'),cleaned);
 const r=load();
 for(const message of ['Script error.','ResizeObserver loop completed with undelivered notifications.','TypeError: Failed to fetch'])r.fire('error',{message,filename:'footera-app.js'});
 r.fire('unhandledrejection',{reason:{name:'AbortError',message:'The user aborted a request.'}});
 assert.equal(r.api._queue().length,0);
});

test('a broken loop cannot flood: at most 8 reports per page',()=>{
 const r=load();
 for(let i=0;i<30;i++)r.fire('error',{message:'Fehler '+i,filename:'footera-app.js',lineno:i});
 assert.equal(r.api._queue().length,8);
});

test('the reporter loads before every other script and is cached offline',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const first=html.indexOf('<script src=');
 assert.ok(html.slice(first).startsWith('<script src="./footera-error-report.js?v='),'error reporter must be the first script');
 const v=/footera-error-report\.js\?v=(\d+)/.exec(html)[1];
 assert.ok(fs.readFileSync(path.join(root,'service-worker.js'),'utf8').includes(`"./footera-error-report.js?v=${v}"`));
});

test('server side: function validates errors and consent withdrawal also forgets error counts',()=>{
 const fn=fs.readFileSync(path.join(root,'online/footera-analytics.ts'),'utf8');
 assert.match(fn,/action!=="error"/);assert.match(fn,/footera_error_log/);
 const sql=fs.readFileSync(path.join(root,'online/footera-error-reports-v21.408.sql'),'utf8');
 assert.match(sql,/delete from public\.footera_error_browsers where visitor_hash=p_visitor_hash/);
 assert.match(sql,/revoke all on public\.footera_error_reports, public\.footera_error_browsers from public, anon, authenticated/);
});

test('Escape without an open window no longer throws (first error the live smoke test found)',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const start=app.indexOf('function dismissTopModal(){'),end=app.indexOf('\n}',start)+2;
 assert.ok(start>0);
 const ctx={history:{state:null,back(){}},closeTopUiLayer(){ctx.closed=(ctx.closed||0)+1},BACKDROP_LOCKED_MODALS:new Set(),
  topUiLayer:()=>ctx.top,$:id=>id==='packModal'?{classList:{contains:c=>c==='modal'}}:null};
 vm.createContext(ctx);vm.runInContext(app.slice(start,end),ctx);
 ctx.top='';assert.equal(ctx.dismissTopModal(),false);
 ctx.top='missingModal';assert.equal(ctx.dismissTopModal(),false);
 ctx.top='packModal';assert.equal(ctx.dismissTopModal(),true);assert.equal(ctx.closed,1);
});
