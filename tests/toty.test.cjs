'use strict';
// V21.413 Team of the Year fan vote: 1/4/3/3 ballot, time window, reward only when the server says so.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-toty.js'),'utf8');
function load(toty,rpc={}){
 const ctx={granted:[],saves:0,calls:[],console};
 vm.createContext(ctx);
 vm.runInContext(`var state=${JSON.stringify({onboarded:true,toty})};
  function grant(r){granted.push(r)}function save(){saves++}function flushSave(){}
  function ratingRewardPack(min,count){return "reward-"+min+"-"+count}`,ctx);
 ctx.FooteraAccount={user:()=>({id:'u1'})};
 ctx.FooteraOnline={ready:true,authClient:async()=>({rpc:async(name,args)=>{ctx.calls.push(name);return rpc[name]?rpc[name](args):{data:null,error:null}}})};
 vm.runInContext(src,ctx);
 return ctx;
}
const ballot=api=>{const out=[];for(const s of api.SLOTS)out.push(...api.NOMINEES.filter(n=>n.slot===s.id).slice(0,s.count).map(n=>n.pid));return out};

test('nominees: 5 TW, 12 ABW, 10 MF, 10 ST, unique real players from the database',()=>{
 const {FooteraToty:api}=load();
 const per=Object.fromEntries(api.SLOTS.map(s=>[s.id,api.NOMINEES.filter(n=>n.slot===s.id).length]));
 assert.deepEqual(per,{gk:5,def:12,mid:10,att:10});
 assert.equal(new Set(api.NOMINEES.map(n=>n.pid)).size,api.NOMINEES.length);
 const csv=fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8');
 const pids=new Set(csv.split('\n').map(l=>l.split(',')[0]));
 for(const n of api.NOMINEES)assert.ok(pids.has(n.pid),`${n.name} (${n.pid}) in players-db.csv`);
});

test('client nominees match the SQL seed',()=>{
 const {FooteraToty:api}=load();
 const sql=fs.readFileSync(path.join(root,'online/footera-toty-vote-v21.413.sql'),'utf8');
 for(const n of api.NOMINEES)assert.match(sql,new RegExp(`\\(2026,\\s*'${n.pid}',\\s*'${n.slot}'\\)`),n.name);
});

test('vote window is Fr 11.12.2026 19:00 to So 03.01.2027 19:00 Berlin',()=>{
 const {FooteraToty:api}=load();
 assert.equal(api.phase(Date.parse('2026-12-11T17:59:00Z')),'before');
 assert.equal(api.phase(Date.parse('2026-12-11T18:00:00Z')),'open');
 assert.equal(api.phase(Date.parse('2027-01-03T17:59:00Z')),'open');
 assert.equal(api.phase(Date.parse('2027-01-03T18:00:00Z')),'closed');
});

test('a full position swaps its oldest pick; only 1/4/3/3 is complete',()=>{
 const {FooteraToty:api}=load();
 const gk=api.NOMINEES.filter(n=>n.slot==='gk');
 api.toggle(gk[0].pid);api.toggle(gk[1].pid);
 assert.deepEqual([...api.draft()],[gk[1].pid]);
 api.toggle(gk[1].pid);assert.equal(api.draft().length,0,'tap again removes');
 const b=ballot(api);api.draft(b);
 assert.equal(api.complete(api.draft()),true);
 assert.equal(api.complete(b.slice(1)),false);
 assert.equal(api.toggle('nope'),false);
});

test('voting grants the 6x 84+ pack only when the server says so, never twice',async()=>{
 let claimed=false;
 const rpc={footera_toty_vote:()=>({data:{accepted:true,already:false},error:null}),
  footera_toty_claim_reward:()=>{const ok=!claimed;claimed=true;return{data:ok,error:null}},
  footera_toty_results:()=>({data:[],error:null}),
  footera_toty_my_vote:()=>({data:[{picks:[],reward_claimed:true}],error:null})};
 const ctx=load(undefined,rpc),api=ctx.FooteraToty;
 const open=Date.parse('2026-12-20T12:00:00Z');
 api.draft(ballot(api));
 await api.submit(open);
 assert.deepEqual(ctx.calls.slice(0,2),['footera_toty_vote','footera_toty_claim_reward']);
 assert.equal(ctx.granted.length,1);
 assert.equal(ctx.granted[0].pack,'reward-84-6');
 assert.equal(api.data().voted,true);
 assert.equal(api.data().rewarded,true);
 assert.match(api.message(),/Meine Packs/);
 // A second device with a fresh save: the server says no, nothing is granted.
 const other=load(undefined,rpc);other.FooteraToty.draft(ballot(other.FooteraToty));
 await other.FooteraToty.submit(open);
 assert.equal(other.granted.length,0);
 assert.equal(other.FooteraToty.data().rewarded,true);
 // Outside the window nothing is sent.
 const late=load(undefined,rpc);late.FooteraToty.draft(ballot(late.FooteraToty));
 await late.FooteraToty.submit(Date.parse('2027-01-04T12:00:00Z'));
 assert.equal(late.calls.length,0);
});

test('guests without an account cannot vote',async()=>{
 const ctx=load();ctx.FooteraAccount={user:()=>null};
 const api=ctx.FooteraToty;api.draft(ballot(api));
 await api.submit(Date.parse('2026-12-20T12:00:00Z'));
 assert.equal(ctx.calls.length,0);
 assert.match(api.message(),/Footera-Konto/);
});

test('saved ballot is sanitised and locks the picks',()=>{
 const base=load().FooteraToty;
 const b=ballot(base);
 const api=load({2026:{picks:[...b,'x',b[0]],voted:true,rewarded:'yes'}}).FooteraToty;
 const d=api.data();
 assert.deepEqual([...d.picks],b);
 assert.equal(d.voted,true);
 assert.equal(d.rewarded,false);
 const html=api.html(Date.parse('2026-12-20T12:00:00Z'));
 assert.match(html,/Deine Stimme ist abgegeben/);
 assert.doesNotMatch(html,/data-toty-submit/);
 assert.match(load().FooteraToty.html(Date.parse('2026-12-01T12:00:00Z')),/Ab Fr 11\.12\. um 19:00 Uhr/);
});

test('leaders: most votes per position, ties by rating',()=>{
 const {FooteraToty:api}=load();
 const gk=api.NOMINEES.filter(n=>n.slot==='gk');
 const [hi,lo]=[...gk].sort((a,b)=>b.ovr-a.ovr).filter((n,i,arr)=>i===0||n.ovr<arr[0].ovr);
 const lb=api.leaders([{pid:lo.pid,votes:5},{pid:hi.pid,votes:5},{pid:gk.find(n=>n!==hi&&n!==lo).pid,votes:1}]);
 assert.equal(lb.find(g=>g.slot.id==='gk').players[0].pid,hi.pid,'tie goes to higher rating');
 assert.equal(api.leaders([{pid:lo.pid,votes:6},{pid:hi.pid,votes:5}]).find(g=>g.slot.id==='gk').players[0].pid,lo.pid);
 assert.equal(lb.find(g=>g.slot.id==='def').players.length,4);
 assert.equal(api.leaders(null),null);
});

test('app wires the banner, calendar rows and the files ship with the build',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),cal=fs.readFileSync(path.join(root,'event-calendar.js'),'utf8');
 assert.match(app,/globalThis\.FooteraToty\?\.renderHome\(\)/);
 assert.match(html,/id="totyHome"/);
 assert.match(cal,/TOTY-Abstimmung startet/);
 for(const f of ['footera-toty.js?v=21413','footera-toty.css?v=21413']){
  assert.ok(html.includes(f),`index.html ${f}`);
  assert.ok(sw.includes(`"./${f}"`),`service worker ${f}`);
 }
});
