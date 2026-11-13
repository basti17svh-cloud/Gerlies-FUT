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

test('a match is stored once, unread counts and the coach answers up to three times',()=>{
 const rows=squad().map(p=>({uid:p.uid,base:{name:p.name,id:p.pid,position:p.pos,ovr:p.ovr},position:p.pos,rating:p.uid==='u4'?5.4:p.rating,goals:p.uid==='u2'?1:0,assists:0,minutes:p.minutes,saves:p.saves,reds:0}));
 const ctx={matchReportPerformanceRows:()=>rows,matchReportPotm:()=>({base:{name:'Harry Kane'},uid:'u2',side:'home',rating:8.4}),matchHomeTeamName:()=>'FC Gerlies',matchAwayTeamName:()=>'Köln'};
 const {api:k,store}=load(ctx);
 const m={finished:true,resultId:'r1',home:1,away:0,initialStarters:rows.slice(0,11).map(r=>r.uid),goalEvents:[g('home',30,'Harry Kane','u2')]};
 const n=k.afterMatch(m);assert.ok(n>=3);
 assert.equal(k.afterMatch(m),0,'flag on the match');
 assert.equal(k.afterMatch({...m,kabineRecorded:false}),0,'same result id is not stored twice');
 assert.equal(k.unread(),n-1,'the Abpfiff line is not counted as a message');
 const v=k.read(),ref=v.msgs[0].ref,opts=k.replyOptions(v,ref),ids=opts.map(o=>o.id);
 assert.ok(opts.length>=10,'a dozen coach options after a win: '+ids.join(','));
 for(const id of ['praiseBest','criticize','bench','sermon','pizza','party','dayOff','run','voice','meme','tactics'])assert.ok(ids.includes(id),id);
 assert.equal(opts[0].t,'⭐ Harry Kane loben','praising the best player comes first');
 assert.equal(k.answersLeft(v,ref),3);
 const praise=k.answer(ref,'praiseBest');
 assert.equal(praise[0].kind,'me');assert.match(praise[0].text,/@\[Harry Kane\]/);
 assert.equal(praise[1].who.name,'Harry Kane','the praised player answers first');
 assert.ok(praise.filter(x=>x.kind==='msg'&&x.who.name!=='Harry Kane').length>=2,'teammates comment');
 assert.equal(k.read().mood,72,'60 + 4 for the win + 8 for the praise');
 assert.ok(!k.replyOptions(k.read(),ref).some(o=>o.id==='praiseBest'),'each option once');
 k.answer(ref,'sermon');
 const pizza=k.answer(ref,'pizza');
 assert.ok(pizza.some(x=>/Zuckerbrot|verwöhnen|Stimmungsschwankungen/.test(x.text)),'the players notice pizza after a Kabinenpredigt');
 assert.equal(k.replyOptions(k.read(),ref).length,0,'three answers per match');
 assert.equal(k.answer(ref,'meme').length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(k.read().memo)),{praised:{uid:'u2',name:'Harry Kane'},sermon:true,pizza:true});
 assert.ok(!store.has('gfutState')&&[...store.keys()].every(x=>x==='footera-kabine-v1'),'only its own key');
});

test('old chats from V21.404 keep working: answered once means done, unanswered gets the new options',()=>{
 const {api:k,store}=load();
 const old={msgs:[{kind:'sys',text:'Abpfiff',ref:'m:a',id:'m:a#0',ts:1,result:'win'},{kind:'msg',who:{name:'Harry Kane',uid:'u2',pid:'u2'},text:'Drei Punkte',ref:'m:a',id:'m:a#1',ts:2,result:'win'},
  {kind:'sys',text:'Abpfiff',ref:'m:b',id:'m:b#0',ts:3,result:'loss'},{kind:'msg',who:{name:'Jamal Musiala',uid:'u3',pid:'u3'},text:'Schade',ref:'m:b',id:'m:b#1',ts:4,result:'loss'}],refs:['m:a','m:b'],replies:{'m:a':1},seen:0};
 store.set('footera-kabine-v1',JSON.stringify(old));
 const v=k.read();
 assert.equal(k.replyOptions(v,'m:a').length,0);
 const ids=k.replyOptions(v,'m:b').map(o=>o.id);assert.ok(ids.includes('cheerUp')&&ids.includes('sermon')&&!ids.includes('pizza'));
 assert.equal(k.openRef(v),'m:b');
 assert.ok(k.answer('m:b','voice').length>=2);
});

test('the coach comes back after the next match: bench threat, praise, Straflauf, mood',()=>{
 const players=squad();players[4].goals=1;players[4].rating=8.1;
 const r=api.matchMessages({seed:'cb1',home:'FC Gerlies',away:'Mainz',gh:1,ga:0,players,goals:[g('home',55,'Leroy Sané','u4')],potm:null,
  memo:{benched:{uid:'u4',name:'Leroy Sané'},run:true},mood:20});
 const t=text(r);
 assert.match(t,/Leroy Sané: (Bank\? Welche Bank|Hab mir die Ansage)/,'the threatened player answers with a goal');
 assert.match(t,/Straflauf/);
 assert.match(t,/Stimmung|Spaß/,'low mood is felt');
 const p2=squad();p2[4].minutes=0;p2[4].rating=0;
 const r2=api.matchMessages({seed:'cb2',home:'FC Gerlies',away:'Mainz',gh:0,ga:1,players:p2,goals:[g('away',70,'X','')],potm:null,memo:{benched:{uid:'u4',name:'Leroy Sané'}}});
 assert.match(text(r2),/@\[Leroy Sané\].*Bank/,'teammates tease the benched player');
});

test('streaks, competitions, upsets, weather, night games, yellow cards and injuries are talked about',()=>{
 const base={home:'FC Gerlies',away:'Leipzig',gh:2,ga:1,goals:[g('home',20,'Harry Kane','u2'),g('away',50,'X',''),g('home',70,'Jamal Musiala','u3')],potm:null};
 const all=new Set();
 for(let i=0;i<40;i++){
  const players=squad();players[6].yellows=1;
  const r=api.matchMessages({...base,seed:'ctx'+i,players,prev:['win','win','win'],mode:i%2?'rivals':'champions',weather:i%3?'rain':'snow',hour:i%4?2:20,opp:90,power:84,injuredUid:'u5'});
  all.add(text(r));
 }
 const t=[...all].join('\n');
 assert.match(t,/4 Siege|Serie|Siege am Stück|Siege in Folge/);
 assert.match(t,/Rivals/);assert.match(t,/Champions|Flutlicht|Hymne/);
 assert.match(t,/Außenseiter|geglaubt|Papier/);
 assert.match(t,/Unterhose|Schuhe|Wasserball|Schnee|Zehen/);
 assert.match(t,/Uhr|Uhrzeit/);
 assert.match(t,/Gelb|Kasse|Foul/);
 assert.match(t,/Kingsley Coman: (Bin okay|Halb so wild|Der Physio)/,'the injured player gives an update');
 assert.ok(all.size>=25,'40 matches give many different chats: '+all.size);
 assert.ok(!/undefined|\{\w+\}|NaN/.test(t),'all placeholders filled');
});

test('running gags have fixed characters and do not repeat right away',()=>{
 const players=squad(),roles=api.castRoles(players,players[2]);
 const again=api.castRoles(squad().reverse(),players[2]);
 for(const r of ['late','dj','food','gamer','style'])assert.equal(roles[r].name,again[r].name,'same '+r+' every match');
 assert.equal(roles.kasse.name,'Harry Kane','the captain keeps the team fund');
 const gags=new Set();let recent=[];
 for(let i=0;i<30;i++){
  const r=api.matchMessages({seed:'gag'+i,home:'A',away:'B',gh:1,ga:0,players:squad(),goals:[g('home',10,'Harry Kane','u2')],potm:null,recentGags:recent});
  for(const id of r.ctx.gags){assert.ok(!recent.includes(id),'not one of the last gags');gags.add(id)}
  recent=[...recent,...r.ctx.gags].slice(-5);
 }
 assert.ok(gags.size>=12,'many different gags: '+gags.size);
});

test('every coach option works in every situation without empty texts',()=>{
 const situations=[{gh:3,ga:0},{gh:0,ga:2},{gh:1,ga:1},{gh:2,ga:1}];
 for(const [i,s] of situations.entries()){
  const players=squad();players[6].reds=i===1?1:0;players[4].rating=5.2;players[11].goals=i===3?1:0;
  const goals=[];for(let k=0;k<s.gh;k++)goals.push(g('home',10+k*20,i===3&&k===0?'Thomas Müller':'Harry Kane',i===3&&k===0?'u11':'u2'));for(let k=0;k<s.ga;k++)goals.push(g('away',15+k*20,'X',''));
  const r=api.matchMessages({seed:'all'+i,home:'A',away:'B',players,goals,potm:{name:'Harry Kane',uid:'u2',side:'home',rating:8},...s});
  for(const id of Object.keys(api._COACH)){
   if(!api._COACH[id].when(r.ctx))continue;
   for(const prior of [[],['sermon'],['pizza','voice']]){
    const out=api.coachMessages(id,r.ctx,'m:x'+i,prior);
    assert.equal(out[0].kind,'me',id);assert.ok(out.length>=3,id+' gets at least two answers');
    assert.ok(out.every(m=>m.text&&!/undefined|\{\w+\}|NaN|@\[\]/.test(m.text)),id+': '+out.map(m=>m.text).join(' | '));
   }
  }
 }
 const pack=api.joinMessages({name:'Florian Wirtz',uid:'n1',pid:'p1',pos:'CAM'},[{name:'Jamal Musiala',uid:'u3',pid:'u3',pos:'CAM'},{name:'Harry Kane',uid:'u2',pid:'u2',pos:'ST'}],'p:n1');
 assert.ok(pack.some(m=>m.who?.name==='Jamal Musiala'&&/Konkurrenz|doppelt|Bank/.test(m.text)),'same position = rival');
 for(const id of ['welcome','cake','number']){const out=api.coachMessages(id,pack[0].ctx,'p:n1');assert.ok(out.length>=2&&out.every(m=>!/undefined|\{\w+\}/.test(m.text)),id)}
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

test('the share picture uses the whole chat of the latest match, in order, nothing left out',()=>{
 const rows=squad().map(p=>({uid:p.uid,base:{name:p.name,id:p.pid,position:p.pos,ovr:p.ovr},position:p.pos,rating:p.rating,goals:p.uid==='u2'?3:0,assists:0,minutes:p.minutes,saves:p.saves,reds:0}));
 const ctx={matchReportPerformanceRows:()=>rows,matchReportPotm:()=>({base:{name:'Harry Kane'},uid:'u2',side:'home',rating:9.5}),matchHomeTeamName:()=>'FC Gerlies',matchAwayTeamName:()=>'Köln',displayBase:i=>({name:'Florian Wirtz',id:'p9',ovr:89}),itemRating:()=>89,squadItems:()=>[]};
 const {api:k}=load(ctx);
 k.afterMatch({finished:true,resultId:'r9',home:3,away:0,initialStarters:rows.slice(0,11).map(r=>r.uid),goalEvents:[g('home',10,'Harry Kane','u2'),g('home',50,'Harry Kane','u2'),g('home',80,'Harry Kane','u2')]});
 const ref=k.read().msgs[0].ref;k.answer(ref,0);
 k.afterPack([{uid:'w1',variant:'gold'}]);
 const all=k.read().msgs,block=k.shareBlock();
 assert.deepEqual(block.map(m=>m.id),all.filter(m=>m.ref===ref).map(m=>m.id));
 assert.ok(block.length>=9,'match messages plus coach answer');
 assert.ok(block.some(m=>m.kind==='me'));
});
