// V21.479 Fouls: five foul kinds in seven places, each mirrored, with the
// referee, a card and the matching free kick or penalty afterwards.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../footera-match-actions.js'),C=require('../footera-commentary.js');

test('foul scenes: every kind and zone, human speeds, fouler meets the attacker at contact',async()=>{
 const F=await import('../3d-fouls.mjs'),P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs');
 assert.equal(F.FOUL_SCENES.length,F.FOUL_KINDS.length*F.FOUL_ZONE_IDS.length*2);
 for(const seq of F.FOUL_SCENES)assert.ok(P.DEFENSIVE_SCENES.includes(seq),seq+' listed');
 for(const seq of F.FOUL_SCENES){
  const f=F.parseFoul(seq);assert.ok(f&&F.FOUL_KINDS.includes(f.kind)&&F.FOUL_ZONES[f.zone],seq);
  assert.equal(F.foulSequence(f.kind,f.zone,f.mirror),seq);
  for(const i of [0,1,8,F.REFEREE_ACTOR]){
   let p=M.playerPosition(i,0,'ball_won',seq);
   for(let n=1;n<=1040;n++){const t=n/100,q=M.playerPosition(i,t,'ball_won',seq);assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])/.01<8.6,seq+' actor '+i+' speed at '+t);assert.ok(Math.abs(q[0])<=34.5&&Math.abs(q[1])<=52.5,seq+' on pitch');p=q}
  }
  const a=P.defensePosition(0,F.FOUL_CONTACT,seq),d=P.defensePosition(8,F.FOUL_CONTACT,seq);
  assert.ok(Math.hypot(a[0]-d[0],a[1]-d[1])<1.6,seq+' contact distance');
  // The referee gets close to the spot to show the card / point to the spot.
  const r=P.defensePosition(F.REFEREE_ACTOR,F.FOUL_TIMES.card,seq);
  assert.ok(Math.hypot(r[0]-a[0],r[1]-a[1])<14,seq+' referee near');
  if(f.mirror){const base=seq.slice(0,-5);for(const t of [0,2,4.4,7]){const x=P.defensePosition(8,t,base),y=P.defensePosition(8,t,seq);assert.ok(Math.abs(x[0]+y[0])<1e-9&&Math.abs(x[1]-y[1])<1e-9,seq+' mirror')}}
 }
 assert.ok(P.isDefenseSlide('defense_foul_slide_arc')&&P.isDefenseSlide('defense_foul_behind_box_wide')&&!P.isDefenseSlide('defense_foul_pull_flank'));
 assert.ok(F.cardRaise(F.FOUL_TIMES.card+.6)>.95&&F.cardRaise(2)===0);
 // The box foul happens inside the penalty area, the flank foul at the touchline.
 assert.ok(Math.abs(F.FOUL_ZONES.box.spot[1])>36&&Math.abs(F.FOUL_ZONES.box.spot[0])<20);
 assert.ok(Math.abs(F.FOUL_ZONES.flank.spot[0])>25);
});

test('foul plan is a stable hash: no RNG, realistic spread of places and cards',()=>{
 const orig=Math.random;let draws=0;Math.random=()=>{draws++;return .5};
 const zones={},kinds={};let cards=0;
 try{
  for(let n=0;n<4000;n++){const p=A.foulPlan('freekick','m|'+n);zones[p.zone]=(zones[p.zone]||0)+1;kinds[p.kind]=(kinds[p.kind]||0)+1;if(p.card)cards++}
 }finally{Math.random=orig}
 assert.equal(draws,0,'no Math.random draws');
 assert.deepEqual(A.foulPlan('freekick','x|1'),A.foulPlan('freekick','x|1'));
 assert.equal(A.foulPlan('open_play','x'),null);
 assert.equal(A.foulPlan('penalty','x').zone,'box');
 for(const z of ['center','side','arc','far','corner','flank'])assert.ok(zones[z]>4000*.06,z+' appears');
 assert.ok(!zones.box,'free kicks never come from the box');
 for(const k of ['slide','trip','behind','pull','push'])assert.ok(kinds[k]>4000*.08,k+' appears');
 assert.ok(cards>4000*.2&&cards<4000*.55,'cards '+cards);
 for(let n=0;n<200;n++){const p=A.foulPlan('freekick','v|'+n);if(p.zone==='flank')assert.equal(p.variant,'cross');if(p.zone==='corner')assert.equal(p.variant,'edge')}
});

test('ticker line names fouler, victim and the follow-up',()=>{
 const st={};
 const fk=C.foul(st,{kind:'pull',zone:'arc',name:'Rüdiger',victim:'Kane',place:'an der Strafraumgrenze',team:'Bayern'});
 assert.match(fk,/Rüdiger/);assert.match(fk,/Kane/);assert.match(fk,/Freisto/);
 assert.match(C.foul(st,{kind:'trip',zone:'box',name:'A',victim:'B',team:'T'}),/Elfmeter|Strafsto/);
});

test('free kicks after a foul: new variants exist, cross only for headers, match bridge caps fouls',async()=>{
 const E=await import('../3d-extended-match.mjs');
 for(const v of ['arc','cross','trick'])assert.ok(E.EXTENDED_SEQUENCES.includes('extended_free_kick_'+v),v);
 const hl=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
 const body=hl.slice(hl.indexOf('function queueMatchFoul3D'));
 assert.ok(body.length>0);assert.doesNotMatch(body.slice(0,body.indexOf('\n}')),/Math\.random/);
 const app=fs.readFileSync(path.join(__dirname,'../footera-app.js'),'utf8');
 assert.match(app,/function matchRecordFoul/);
});
