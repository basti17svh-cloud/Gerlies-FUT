// V21.350: varied live commentary, tactics read-out and the unused 3D wing plays.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),C=require('../footera-commentary.js'),H=require('../3d-highlights.js');
const shot=(extra={})=>({actionKind:'through',finish:'normal',creationType:'assist',shooter:'Kane',creator:'Kimmich',keeper:'Neuer',defender:'Rüdiger',team:'FC Footera',opponent:'Rivals XI',side:'home',defendingSide:'away',minute:30,xg:.2,scoreFor:1,scoreAgainst:0,...extra});

test('V21.350: commentary never draws random numbers and is the same for the same match',()=>{
 const saved=Math.random;let calls=0;Math.random=()=>{calls++;return .5};
 try{
  const a={resultId:'m1'},b={resultId:'m1'};
  for(let i=0;i<40;i++)assert.equal(C.describe(a,'goal',shot({minute:i})).text,C.describe(b,'goal',shot({minute:i})).text);
 }finally{Math.random=saved}
 assert.equal(calls,0);
});

test('V21.350: lines vary, use the real names and never repeat back to back',()=>{
 const m={resultId:'variety'},seen=new Set();let last='';
 for(let i=0;i<30;i++){
  const kind=['goal','save','wide','block','post'][i%5],text=C.describe(m,kind,shot({minute:i,actionKind:['through','cross','dribble','combination','cutback','distance','switch'][i%7],finish:i%7===1?'header':'normal'})).text;
  assert.ok(text.length>10&&!/\{\w+\}/.test(text),text);
  assert.notEqual(text,last);last=text;seen.add(text);
 }
 assert.ok(seen.size>=25,'expected many different lines, got '+seen.size);
 const goal=C.describe({resultId:'names'},'goal',shot()).text;
 assert.ok(goal.includes('Kane')||goal.includes('Kimmich')||goal.includes('Neuer'),goal);
 // No creator: no line that would print an empty name.
 for(let i=0;i<20;i++){const t=C.describe({resultId:'solo'+i},'goal',shot({actionKind:'dribble',creator:'',creationType:'solo'})).text;assert.ok(!/ ,| \.|\s{2}/.test(t),t)}
 const skill=C.describe({resultId:'skill'},'wide',shot({actionKind:'dribble',creator:'',skillMove:'elastico'})).text;
 assert.match(skill,/Elastico/);
});

test('V21.350: goals carry the match situation (equaliser, hattrick, late winner)',()=>{
 assert.match(C.describe({resultId:'eq'},'goal',shot({scoreFor:1,scoreAgainst:1})).text,/Ausgleich|offen/);
 assert.match(C.describe({resultId:'hat'},'goal',shot({scoreFor:3,scoreAgainst:0,scorerGoals:3})).text,/Hattrick/);
 assert.match(C.describe({resultId:'late'},'goal',shot({minute:89,scoreFor:2,scoreAgainst:1})).text,/Siegtreffer|Entscheidung/);
 assert.match(C.describe({resultId:'pen'},'goal',shot({creationType:'penalty'})).text,/Elfmeter|Punkt|Strafstoß/);
});

test('V21.350: tactic notes follow real settings and are rationed',()=>{
 const m={resultId:'press'},ctx=minute=>({actionKind:'combination',phase:'build',side:'away',defendingSide:'home',team:'Rivals XI',opponent:'FC Footera',creator:'Musiala',defender:'Kimmich',minute,defenseTactics:{pressing:80}});
 const first=C.describe(m,'interception',ctx(10));
 assert.ok(first.note&&/Pressing|früh/.test(first.text),first.text);
 assert.equal(C.describe(m,'interception',ctx(15)).note,false,'no second note within 12 minutes');
 assert.equal(C.describe({resultId:'calm'},'interception',{...ctx(10),defenseTactics:{pressing:50}}).note,false,'normal pressing gets no pressing note');
 const line=C.describe({resultId:'line'},'goal',shot({attackTactics:{},defenseTactics:{depth:80}}));
 assert.match(line.text,/hohe|hoch/);
});

test('V21.350: attack counts, analysis, halftime tips and the report use the same numbers',()=>{
 const m={resultId:'stats'};
 for(let i=0;i<6;i++)C.recordAttack(m,'home',{actionKind:'cross'},'attack');
 C.recordAttack(m,'home',{actionKind:'through'},'attack');
 C.recordAttack(m,'home',{actionKind:'through',sceneKind:'turnover_counter'},'attack');
 C.recordAttack(m,'home',{actionKind:'cross'},'goal');
 for(let i=0;i<4;i++)C.recordWin(m,'away','build');
 assert.match(C.analysis(m,{home:'FC Footera',away:'Rivals XI'}),/Flügel, 6 von 8|4 Ballgewinne/);
 const r=C.report(m),wing=r.rows.find(x=>x.key==='wing');
 assert.equal(wing.home,6);assert.equal(wing.homeGoals,1);assert.equal(r.rows.find(x=>x.key==='counter').home,1);assert.equal(r.awayPress,4);
 const t=C.tips(m,{home:0,away:1,poss:45,tactic:'balanced',ownTactics:{buildUp:'balanced'},opponentTactics:{depth:70},awayName:'Rivals XI',fitness:90});
 assert.match(t.head,/Über die Flügel 6/);
 assert.ok(t.tips.length>=1&&t.tips.length<=2);
 assert.ok(t.tips.some(x=>/Aufbau/.test(x)),t.tips.join(' | '));
});

test('V21.350: the match uses the commentary and shows it in a live ticker',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 assert.ok(html.indexOf('footera-commentary.js?v=21350')>0&&html.indexOf('footera-commentary.js?v=21350')<html.indexOf('footera-app.js?v='));
 assert.ok(sw.includes('"./footera-commentary.js?v=21350"'));
 assert.match(html,/id="matchTicker"/);
 const sim=app.slice(app.indexOf('function simAttack('),app.indexOf('function simTick('));
 assert.match(sim,/recordAttack\(match,side,context,"attack"\)/);
 assert.match(sim,/recordAttack\(match,side,shot,"chance"\)/);
 assert.match(app,/recordAttack\(match,side,shot,"goal"\)/);
 assert.match(app,/matchTacticTipsHTML\(\)/);
 assert.match(app,/matchTacticReportHTML\(\)/);
});

test('V21.350: flat balls from the wing also show the overlap, low-cross and near-post plays',()=>{
 const families=new Set(),ids=new Set();
 for(let i=0;i<3000;i++){
  const p=H.choosePresentation({type:'goal',id:'cut'+i,actionKind:'cutback',finish:['normal','finesse','low_driven'][i%3],creationType:'assist',creatorName:'Wirtz',scorerSlot:'ST',creatorSlot:i%2?'LW':'RW'},[]);
  families.add(p.family);ids.add(p.sequence);
 }
 for(const f of ['cutback','lowcross','overlap','nearpost'])assert.ok(families.has(f),'missing family '+f);
 for(const id of ['overlap_left_low','early_low_delivery_right','near_post_tap','byline_drive_left','underlap_right'])assert.ok(ids.has(id),'missing '+id);
 for(const f of families)assert.ok(!['header','volley','bicycle'].includes(f));
 let power=false;for(let i=0;i<3000&&!power;i++)power=H.choosePresentation({type:'goal',id:'d'+i,actionKind:'distance',finish:'power',creationType:'assist',creatorName:'Wirtz',scorerSlot:'CM',creatorSlot:'CAM'},[]).sequence==='first_time_power';
 assert.ok(power,'first_time_power is reachable for long shots');
});
