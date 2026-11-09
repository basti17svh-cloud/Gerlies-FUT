'use strict';
// V21.375 Spielervergleich: partner choice, picker list and value rows. Read-only feature, no save changes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-compare.js'),'utf8');

function load({club,squad,formation}){
 const byUid=new Map(club.map(x=>[x.uid,x]));
 const ctx={
  window:{},document:{},state:{club},
  displayBase:item=>item.base,resolvedPlayer:b=>b,itemRating:item=>item.base.ovr,
  posFit:(b,slot)=>[b.position,...String(b.alt||'').split(',')].includes(slot)?1:0,
  squadItems:()=>squad.map(uid=>byUid.get(uid)||null),currentFormation:()=>formation,
  packItemKey:item=>item.base.id+'|'+(item.variant||''),
  cardStatPairs:p=>p.position==='GK'?[['HEC'],['BSI'],['ABS'],['REF'],['TMP'],['POS']]:[['TEM'],['SCH'],['PAS'],['DRI'],['DEF'],['PHY']],
  esc:s=>String(s),positionLabel:p=>p,playerPositions:b=>[b.position],
 };
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return ctx.window.FooteraCompare;
}
const p=(id,name,position,ovr,extra={})=>({uid:'u'+id,base:{id,name,position,ovr,pac:70,sho:70,pas:70,dri:70,def:40,phy:70,weakFoot:3,skillMoves:3,...extra}});
const formation=[{p:'GK'},{p:'RB'},{p:'CB'},{p:'CB'},{p:'LB'},{p:'CM'},{p:'CM'},{p:'CAM'},{p:'RW'},{p:'ST'},{p:'LW'}];

test('a new striker is compared with the starting striker, not with the best bench card',()=>{
 const keeper=p(1,'Keeper','GK',80),st=p(2,'Kane','ST',90),bench=p(3,'Isak','ST',86),newcomer=p(4,'Haaland','ST',91);
 const club=[keeper,st,bench,newcomer];
 const api=load({club,squad:['u1',null,null,null,null,null,null,null,null,'u2',null,'u3'],formation});
 assert.equal(api.defaultPartner(newcomer).uid,'u2');
});

test('a starter is compared with the best other card of the same line',()=>{
 const st=p(2,'Kane','ST',90),bench=p(3,'Isak','ST',86),wing=p(5,'Salah','RW',89),cb=p(6,'van Dijk','CB',90);
 const api=load({club:[st,bench,wing,cb],squad:[null,null,null,null,null,null,null,null,null,'u2'],formation});
 const partner=api.defaultPartner(st);
 assert.equal(partner.uid,'u3','same position first, then rating');
 const list=[...api.candidates(st,'')].map(x=>x.uid);
 assert.deepEqual(list,['u3','u5'],'only attackers, never the card itself, no defenders');
});

test('keepers are only compared with keepers and search finds any club card',()=>{
 const gk1=p(1,'Neuer','GK',86),gk2=p(7,'Courtois','GK',89),cb=p(6,'van Dijk','CB',90);
 const api=load({club:[gk1,gk2,cb],squad:['u1'],formation});
 assert.deepEqual([...api.candidates(gk1,'')].map(x=>x.uid),['u7']);
 assert.deepEqual([...api.candidates(gk1,'dijk')].map(x=>x.uid),['u6']);
 assert.deepEqual([...api.candidates(gk1,'COURTOIS')].map(x=>x.uid),['u7']);
});

test('duplicate cards appear once in the picker',()=>{
 const st=p(2,'Kane','ST',90),a=p(3,'Isak','ST',86),b={...p(3,'Isak','ST',86),uid:'u3b'};
 const api=load({club:[st,a,b],squad:[],formation});
 assert.equal(api.candidates(st,'').length,1);
});

test('value rows cover rating, six stats, weak foot and skills',()=>{
 const a=p(2,'Kane','ST',90,{sho:94,weakFoot:4}),b=p(3,'Haaland','ST',91,{pac:87,skillMoves:3});
 const api=load({club:[a,b],squad:[],formation});
 const rows=[...api.rows(a,a.base,b,b.base)];
 assert.deepEqual([...rows.slice(0,7)].map(r=>r.label),['GES','TEM','SCH','PAS','DRI','DEF','PHY']);
 assert.equal(rows[0].l,90);assert.equal(rows[0].r,91);
 assert.equal(rows.find(r=>r.label==='SCH').l,94);
 assert.ok(rows.some(r=>r.label==='Schwacher Fuß'&&r.l===4&&r.r===3));
});

test('the compare script ships with the app and the offline cache',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const js=html.match(/footera-compare\.js\?v=(\d+)/),css=html.match(/footera-compare\.css\?v=(\d+)/);
 assert.ok(js&&css,'script and stylesheet linked');
 assert.ok(sw.includes(`./footera-compare.js?v=${js[1]}`)&&sw.includes(`./footera-compare.css?v=${css[1]}`),'both in the SW shell with the same version');
 assert.ok(html.indexOf('footera-compare.js')>html.indexOf('footera-app.js?v='),'loads after the app script');
 assert.match(app,/data-player-compare/);assert.match(app,/data-pack-player-compare/);
});
