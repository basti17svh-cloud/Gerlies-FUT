'use strict';
// Event calendar in the Zentrale: upcoming content in order, never a player name before release.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function load(extra={}){
 const ctx=vm.createContext({console,Intl,Date,Math,Number,String,Array,Set,Map,JSON,...extra});
 vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),ctx);
 vm.runInContext(`const TOTW_WEEKS=[{id:7,releaseDate:"2026-10-28"}];function latestPublishedTotw(at){return Date.parse(at)>=Date.parse("2026-10-28T19:00:00+01:00")?TOTW_WEEKS[0]:null}
 const SEASON_SCHEDULE=[{number:2,key:"s2",name:"BLUTMOND",start:"2026-10-30T19:00:00+01:00",end:"2026-12-11T19:00:00+01:00"}];
 function seasonInfo(at){const s=SEASON_SCHEDULE[0];return{...s,start:new Date(s.start),end:new Date(s.end)}}
 const EVENT_PROMO_RELEASES=[
  {id:"t2",name:"HALLOWEEN",subtitle:"BLUTMOND · TEAM 2",theme:"halloween",activeFrom:"2026-11-06T19:00:00+01:00",activeUntilAt:"2026-11-13T19:00:00+01:00",players:Array.from({length:18},(_,i)=>({pid:String(i),name:"Geheim"+i})),
   sbcPlayer:{id:"mbeumo",name:"Bryan Mbeumo",releaseAt:"2026-11-07T19:00:00+01:00",activeUntilAt:"2026-11-13T19:00:00+01:00",segments:[1,2,3]}},
  {id:"week",name:"HALLOWEEN",subtitle:"GEISTER-SBC",theme:"halloween",activeFrom:"2026-11-02T19:00:00+01:00",activeUntilAt:"2026-11-09T19:00:00+01:00",players:[],
   sbcPlayer:{id:"gyo",name:"Viktor Gyökeres",releaseAt:"2026-11-02T19:00:00+01:00",activeUntilAt:"2026-11-09T19:00:00+01:00",segments:[1,2,3]}},
  {id:"t1",name:"HALLOWEEN",subtitle:"BLUTMOND · TEAM 1",theme:"halloween",activeFrom:"2026-10-30T19:00:00+01:00",activeUntilAt:"2026-11-13T19:00:00+01:00",players:Array.from({length:18},(_,i)=>({pid:"a"+i}))}];
 const EVENT_OBJECTIVES=[{id:"son",title:"HALLOWEEN: Son Heung Min",desc:"Gewinne 6 Rivals-Partien.",eventName:"HALLOWEEN",activeFrom:"2026-11-06T19:00:00+01:00",activeUntilAt:"2026-11-13T19:00:00+01:00",player:{name:"Son Heung Min",ovr:86}}];
 const EVOLUTION_POOL=[{id:"evo2",name:"Blutmond-Evolution II",band:"HALLOWEEN",activeFrom:"2026-11-06T19:00:00+01:00"},{id:"plain",name:"Basis"}];`,ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'event-calendar.js'),'utf8'),ctx);
 return ctx;
}
const at=s=>Date.parse(s);
test('upcoming rows are sorted and keep players secret',()=>{
 const ctx=load(),rows=ctx.footeraEventCalendar(at('2026-11-01T14:00:00+01:00')),text=rows.map(r=>r.title+' '+r.sub).join('\n');
 for(let i=1;i<rows.length;i++)assert.ok(rows[i].at>=rows[i-1].at,'sorted by time');
 assert.match(text,/Team der Woche 8/);
 assert.match(text,/HALLOWEEN · TEAM 2/);
 assert.match(text,/18 neue Karten/);
 assert.match(text,/Geheime Spieler-SBC/);
 assert.match(text,/Blutmond-Evolution II/);
 assert.match(text,/geheimem 86er/);
 const team2=rows.filter(r=>r.at===at('2026-11-06T19:00:00+01:00'));assert.equal(team2.length,1,'Team 2, Evo II and objective share one row');assert.equal(team2[0].title,'HALLOWEEN · TEAM 2');
 assert.doesNotMatch(text,/Gy(ö|o)keres|Mbeumo|Son Heung|Geheim\d/,'no names before release');
 assert.equal(rows.filter(r=>r.key.startsWith('event-end:halloween')).length,1,'Team 1 and Team 2 end together: one row');
 const totw=rows.find(r=>r.kind==='totw');assert.equal(totw.at,at('2026-11-04T19:00:00+01:00'));
 assert.equal(rows.at(-1).kind,'season','Season Pass end is always the last row');
 assert.ok(rows.filter(r=>r.kind!=='season').length<=12);
});
test('released content shows its name only once it is live',()=>{
 const ctx=load(),rows=ctx.footeraEventCalendar(at('2026-11-03T12:00:00+01:00')),text=rows.map(r=>r.title).join('\n');
 assert.match(text,/SBC Viktor Gyökeres endet/);
 assert.doesNotMatch(text,/Mbeumo/);
 const later=ctx.footeraEventCalendar(at('2026-11-08T12:00:00+01:00')).map(r=>r.title+' '+r.sub).join('\n');
 assert.match(later,/SBC Bryan Mbeumo endet/);
 assert.match(later,/Objective Son Heung Min endet/);
 assert.doesNotMatch(later,/Geheime Spieler-SBC|HALLOWEEN · TEAM 2/,'started content is no longer listed as upcoming');
});
test('Season-Pass final stretch inside the last 14 days',()=>{
 const ctx=load(),row=ctx.footeraEventCalendar(at('2026-12-01T12:00:00+01:00')).find(r=>r.kind==='season');
 assert.match(row.title,/Endspurt/);
 const early=ctx.footeraEventCalendar(at('2026-11-01T12:00:00+01:00')).find(r=>r.kind==='season');
 assert.match(early.title,/Season Pass endet/);assert.match(early.sub,/BLUTMOND/);assert.match(early.sub,/noch 40 Tage/);
});
test('relative labels use Berlin days',()=>{
 const ctx=load(),now=at('2026-11-01T14:00:00+01:00');
 assert.equal(ctx.eventCalendarWhen(at('2026-11-01T19:00:00+01:00'),now).relative,'Heute · 19:00');
 assert.equal(ctx.eventCalendarWhen(at('2026-11-02T19:00:00+01:00'),now).relative,'Morgen · 19:00');
 const w=ctx.eventCalendarWhen(at('2026-11-04T19:00:00+01:00'),now);assert.equal(w.relative,'In 3 Tagen · 19:00');assert.equal(w.weekday,'MI');assert.equal(w.date,'04.11.');
});
test('Zentrale has the calendar panel and loads the script after footera-app.js',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="homeCalendarPanel"/);assert.match(html,/id="homeCalendarList"/);
 const v=html.match(/event-calendar\.js\?v=(\d+)/)[1];assert.ok(html.indexOf('event-calendar.js')>html.indexOf('footera-app.js'));
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.ok(sw.includes(`./event-calendar.js?v=${v}`)&&sw.includes(`./event-calendar.css?v=${html.match(/event-calendar\.css\?v=(\d+)/)[1]}`),'SW caches the versioned calendar files');
});

test('BLACK FRIDAY deals of the day and the shop deal show up without player names',()=>{
 const ctx=load();
 vm.runInContext(`var BLACKFRIDAY_DEAL_SBCS=[{id:"bfpick",name:"Deal-Pick – Team 1",releaseAt:"2026-11-28T19:00:00+01:00",activeUntilAt:"2026-12-05T19:00:00+01:00"}];
  var BLACKFRIDAY_STORE_DEAL={from:"2026-11-27T19:00:00+01:00",until:"2026-12-01T19:00:00+01:00",coinDiscount:0.3};`,ctx);
 const before=ctx.footeraEventCalendar(at('2026-11-25T12:00:00+01:00')).map(r=>r.title).join('\n');
 assert.match(before,/Deal-Pick – Team 1/);assert.match(before,/Coin-Packs −30 %/);assert.doesNotMatch(before,/Deal-Pick – Team 1 endet|Shop-Deal endet/);
 const during=ctx.footeraEventCalendar(at('2026-11-29T12:00:00+01:00'));
 assert.ok(during.some(r=>r.title==='Shop-Deal endet'&&r.theme==='blackfriday'));
 assert.ok(during.some(r=>r.title==='Deal-Pick – Team 1 endet'));
});
