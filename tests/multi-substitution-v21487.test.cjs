// V21.487 Mehrfachwechsel (Basti 2026-11-19: "Wenn ich einen Doppelwechsel oder 3fach 4fach
// wechsle ... 4 Spieler gehen rein und 4 raus. Und das auch auf der Karte dargestellt"):
// up to four pairs change in one scene, the board and the result card show them all.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('../3d-highlights.js');

test('multi substitution: every pair changes at once, nobody collides, all walk into the dugout',async()=>{
 const C=await import('../3d-ceremony.mjs');
 // A single change is exactly the V21.484 scene.
 assert.equal(C.ceremonyEnd('substitution',{subs:1}),C.SUB_TIMES.end);
 for(const n of [2,3,4]){
  const end=C.ceremonyEnd('substitution',{subs:n});assert.ok(end>C.SUB_TIMES.end&&end<13,'end '+end);
  const actors=[...C.SUB_IN_ACTORS.slice(0,n),...C.SUB_OUT_ACTORS.slice(0,n)];
  const all=[...new Set([...actors,15,8,9,10,11,12,13,14,16])];
  let prev=null;
  for(let s=0;s<=Math.round(end*50);s++){const t=s/50,pos=all.map(i=>C.ceremonyActor('substitution',i,t,{subs:n}));
   pos.forEach((p,j)=>assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z),n+' actor '+all[j]+' finite'));
   for(let a=0;a<pos.length;a++){
    assert.ok(Math.hypot(pos[a].x-C.SUB_COACH_SPOT[0],pos[a].z-C.SUB_COACH_SPOT[1])>1.2,n+' past the manager '+all[a]+' at '+t);
    for(let b=a+1;b<pos.length;b++)assert.ok(Math.hypot(pos[a].x-pos[b].x,pos[a].z-pos[b].z)>=.78,n+' actors '+all[a]+'/'+all[b]+' apart at '+t)}
   if(prev)pos.forEach((p,j)=>assert.ok(Math.hypot(p.x-prev[j].x,p.z-prev[j].z)*50<8,n+' speed '+all[j]+' at '+t));prev=pos}
  // Every player going off ends in the dugout, every substitute on the pitch.
  for(const i of C.SUB_OUT_ACTORS.slice(0,n)){const p=C.ceremonyActor('substitution',i,end,{subs:n});
   assert.ok(Math.abs(p.x-C.DUGOUT_SPOT[0])<.6&&Math.abs(p.z-C.DUGOUT_SPOT[1])<3.2,n+' off '+i+' in the dugout '+p.x+','+p.z)}
  for(const i of C.SUB_IN_ACTORS.slice(0,n))assert.ok(C.ceremonyActor('substitution',i,end,{subs:n}).x<30,n+' on '+i);
  // Each pair slaps hands; the board stays up until the last one.
  for(let k=0;k<n;k++){const peak=[...Array(200)].reduce((m,_,j)=>Math.max(m,C.subHighFive(j/20,k,n)),0);assert.ok(peak>.95,'five '+k)}
  assert.ok(C.subBoardRaise(C.SUB_TIMES.meet+.3*(n-1)+.5,n)>.99);
  assert.match(C.ceremonyCamera('substitution',2,{subs:n}).phase,/substitution/);
  assert.ok(C.ceremonyCamera('substitution',2,{subs:n}).fov>C.ceremonyCamera('substitution',2).fov,'wider picture');
 }
});

test('multi substitution snapshot: up to four pairs, names and numbers only',()=>{
 const pairs=[1,2,3,4,5].map(i=>({inName:'<i>In '+i+'</i>',outName:'Out '+i,inNumber:10+i,outNumber:i===2?120:30+i,cardHTML:'<img>'}));
 const s=H.snapshot({id:'m',type:'ceremony',ceremony:'substitution',playerName:'In 1',subPairs:pairs});
 assert.equal(s.subPairs.length,4);assert.deepEqual(Object.keys(s.subPairs[0]).sort(),['inName','inNumber','outName','outNumber']);
 assert.equal(s.subPairs[0].inName,'iIn 1/i');assert.equal(s.subPairs[1].outNumber,0);
 assert.equal(H.snapshot({id:'o',type:'ceremony',ceremony:'substitution',subPairs:pairs.slice(0,1)}).subPairs.length,0);
 assert.equal(H.snapshot({id:'g',type:'goal',subPairs:pairs}).subPairs.length,0);
});

test('multi substitution wiring: bridge groups the changes, scene shows board and list',()=>{
 const hl=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
 const at=hl.indexOf('function queueMatchSubstitutions3D');const body=hl.slice(at,hl.indexOf('\n}',at));
 assert.doesNotMatch(body,/Math\.random/);assert.match(body,/subPairs:subPairs\.length>1\?subPairs:\[\]/);
 assert.match(body,/sub\.incoming/);assert.match(body,/Number\(e\.minute\)!==Number\(sub\.minute\)/);
 const scene=fs.readFileSync(path.join(__dirname,'../3d-highlights-scene.mjs'),'utf8');
 assert.match(scene,/DOPPELWECHSEL/);assert.match(scene,/VIERFACHWECHSEL/);assert.match(scene,/fh3d-sub-list/);
 assert.match(scene,/subBoardRaise\(time,subN\)/);assert.match(scene,/ceremonyCamera\(ceremony,time,ceremonyOpts\)/);
 assert.match(fs.readFileSync(path.join(__dirname,'../3d-highlights.css'),'utf8'),/\.fh3d-sub-in/);
});
