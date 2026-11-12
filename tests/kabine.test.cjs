'use strict';
// V21.404 Kabinen-Chat: the squad group chat after matches, pack signings and SBCs. Device-local, save untouched.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-kabine.js'),'utf8');
function load(extra={}){
 const store=new Map();
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={window:{},localStorage,Intl,Date,Math,console,...extra};vm.createContext(ctx);vm.runInContext(src,ctx);return{api:ctx.window.FooteraKabine,store,ctx};
}
const {api}=load();
const P=(name,uid,pos,extra={})=>({name,uid,pid:uid,pos,ovr:85,rating:7,goals:0,assists:0,minutes:90,saves:0,reds:0,started:true,...extra});
const squad=()=>[P('Manuel Neuer','gk','GK',{saves:5}),P('Joshua Kimmich','u1','CDM',{ovr:88}),P('Harry Kane','u2','ST',{ovr:90}),P('Jamal Musiala','u3','CAM',{ovr:89}),P('Leroy Sané','u4','RW'),P('Kingsley Coman','u5','LW'),P('Dayot Upamecano','u6','CB'),P('Kim Min-jae','u7','CB'),P('Alphonso Davies','u8','LB'),P('Sacha Boey','u9','RB'),P('Leon Goretzka','u10','CM'),P('Thomas Müller','u11','CAM',{started:false,minutes:20})];
const g=(side,minute,scorer,uid,extra={})=>({side,minute,scorer,scorerUid:uid,type:'assist',assist:'',assistUid:'',...extra});
const text=r=>r.messages.map(m=>(m.who?m.who.name+': ':'')+m.text).join('\n');

test('a hattrick: the scorer brags first, the keeper talks about the clean sheet',()=>{
 const players=squad();players[2].goals=3;
 const r=api.matchMessages({seed:'m1',home:'FC Gerlies',away:'Dortmund',gh:3,ga:0,players,goals:[g('home',10,'Harry Kane','u2'),g('home',40,'Harry Kane','u2',{type:'penalty'}),g('home',70,'Harry Kane','u2',{assist:'Jamal Musiala',assistUid:'u3'})],potm:{name:'Harry Kane',uid:'u2',side:'home',rating:9.4}});
 assert.equal(r.result,'win');
 assert.equal(r.messages[0].kind,'sys');assert.match(r.messages[0].text,/FC Gerlies 3:0 Dortmund/);
 assert.equal(r.messages[1].who.name,'Harry Kane');
 assert.ok(r.messages.some(m=>m.who?.name==='Manuel Neuer'),'keeper writes after a clean sheet');
 assert.ok(r.messages.some(m=>m.who?.name==='Jamal Musiala'&&/@\[Harry Kane\]/.test(m.text)),'assist mentions the scorer');
 assert.ok(r.messages.filter(m=>m.kind==='msg').length<=10);
});

test('a late winner, a red card and a joker each get a message',()=>{
 const players=squad();players[11].goals=1;players[6].reds=1;
 const r=api.matchMessages({seed:'m2',home:'FC Gerlies',away:'Leipzig',gh:2,ga:1,players,goals:[g('home',20,'Harry Kane','u2'),g('away',50,'Openda',''),g('home',89,'Thomas Müller','u11')],potm:null});
 assert.match(r.messages[1].text,/89|Puls|Schluss/);assert.equal(r.messages[1].who.name,'Thomas Müller');
 assert.ok(r.messages.some(m=>m.who?.name==='Dayot Upamecano'),'red card apology');
 assert.ok(!/undefined|\{/.test(text(r)),'all placeholders filled');
});

test('defeats and draws stay respectful, the away player of the match is mentioned',()=>{
 const players=squad();
 const loss=api.matchMessages({seed:'m3',home:'FC Gerlies',away:'Real Madrid',gh:0,ga:3,players,goals:[g('away',10,'Mbappé',''),g('away',30,'Mbappé',''),g('away',60,'Vinícius Jr.','')],potm:{name:'Kylian Mbappé',uid:'',side:'away',rating:9.1}});
 assert.equal(loss.result,'loss');
 assert.ok(loss.messages.some(m=>/Mbappé/.test(m.text)));
 assert.ok(!loss.messages.some(m=>/Pizza|feiern|Musik/.test(m.text)),'no party after a loss');
 const draw=api.matchMessages({seed:'m4',home:'FC Gerlies',away:'Union',gh:0,ga:0,players,goals:[],potm:null});
 assert.equal(draw.result,'draw');assert.ok(draw.messages.length>=2);
});

test('the same match always gives the same chat',()=>{
 const d={seed:'m5',home:'A',away:'B',gh:2,ga:1,players:squad(),goals:[g('home',10,'Harry Kane','u2'),g('away',20,'X',''),g('home',60,'Leroy Sané','u4')],potm:null};
 assert.equal(JSON.stringify(api.matchMessages(d)),JSON.stringify(api.matchMessages(d)));
});

test('a match is stored once, unread counts and the coach answers once',()=>{
 const rows=squad().map(p=>({uid:p.uid,base:{name:p.name,id:p.pid,position:p.pos,ovr:p.ovr},position:p.pos,rating:p.rating,goals:p.uid==='u2'?1:0,assists:0,minutes:p.minutes,saves:p.saves,reds:0}));
 const ctx={matchReportPerformanceRows:()=>rows,matchReportPotm:()=>null,matchHomeTeamName:()=>'FC Gerlies',matchAwayTeamName:()=>'Köln'};
 const {api:k,store}=load(ctx);
 const m={finished:true,resultId:'r1',home:1,away:0,initialStarters:rows.slice(0,11).map(r=>r.uid),goalEvents:[g('home',30,'Harry Kane','u2')]};
 const n=k.afterMatch(m);assert.ok(n>=3);
 assert.equal(k.afterMatch(m),0,'flag on the match');
 assert.equal(k.afterMatch({...m,kabineRecorded:false}),0,'same result id is not stored twice');
 assert.equal(k.unread(),n-1,'the Abpfiff line is not counted as a message');
 const v=k.read(),ref=v.msgs[0].ref;
 assert.equal(k.replyOptions(v,ref).length,3);
 const added=k.answer(ref,2);assert.equal(added[0].kind,'me');assert.match(added[0].text,/Pizza/);
 assert.equal(k.replyOptions(k.read(),ref).length,0,'only one answer per match');
 assert.equal(k.answer(ref,0).length,0);
 assert.ok(!store.has('gfutState')&&[...store.keys()].every(x=>x==='footera-kabine-v1'),'only its own key');
});

test('top pack signings join the group, SBC players leave it',()=>{
 const items=[{uid:'n1',variant:'gold'},{uid:'n2',variant:'gold'}];
 const bases={n1:{name:'Florian Wirtz',id:'p1',ovr:89},n2:{name:'Bronze Mann',id:'p2',ovr:60},s1:{name:'Harry Kane',id:'p3',ovr:90}};
 const ctx={displayBase:i=>bases[i.uid],itemRating:i=>bases[i.uid].ovr,squadItems:()=>[{uid:'s1'}]};
 const {api:k}=load(ctx);
 assert.equal(k.afterPack([{uid:'n2',variant:'gold'}]),0,'no message for a 60er');
 assert.ok(k.afterPack(items)>=2);
 const v=k.read();assert.match(v.msgs[0].text,/Trainer hat Florian Wirtz hinzugefügt/);assert.equal(v.msgs[1].who.name,'Florian Wirtz');assert.equal(v.msgs[2].who.name,'Harry Kane');
 assert.equal(k.afterPack(items),0,'same card joins once');
 assert.equal(k.afterSbc([{uid:'n2'}]),0,'no message when only low players leave');
 assert.ok(k.afterSbc([{uid:'n1'},{uid:'n2'}])>=1);
 assert.match(k.read().msgs.at(-2).text,/Florian Wirtz und Bronze Mann haben die Gruppe verlassen/);
});

test('the chat is loaded, cached and offered in the match report and Extras',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const v=(html.match(/footera-kabine\.js\?v=(\d+)/)||[])[1];assert.ok(v,'script tag');
 assert.ok(html.includes(`footera-kabine.css?v=${v}`));
 assert.ok(sw.includes(`./footera-kabine.js?v=${v}`)&&sw.includes(`./footera-kabine.css?v=${v}`),'service worker shell');
 assert.ok(html.indexOf('footera-kabine.js')>html.indexOf('footera-app.js'),'loads after the app');
 assert.ok(html.includes('data-kabine-open'),'Extras entry');
 assert.match(app,/FooteraKabine\?\.buttonHTML/);assert.match(app,/FooteraKabine\?\.afterMatch\(match\)/);assert.match(app,/FooteraKabine\?\.afterPack\(items\)/);assert.match(app,/FooteraKabine\?\.afterSbc\(stats\.items\)/);
});
