const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('../3d-highlights.js'),plus=(...ids)=>ids.map(id=>({id,plus:true}));
const event=fields=>({id:'moment',type:'goal',team:'home',actionKind:'combination',finish:'normal',creatorName:'Creator',...fields});
const moments=e=>H.signatureMoments(e),has=(list,id,phase)=>list.some(m=>m.id===id&&(!phase||m.phase===phase));
test('dribble, pass, reception and finish each retain their own actual Plus phase',()=>{
 const dribble=event({actionKind:'dribble',skillMove:'roulette',skillMoves:3,finish:'finesse',playerStyles:plus('trickster','finesse-shot')});
 assert.ok(has(moments(dribble),'trickster','carry'));assert.ok(has(moments(dribble),'finesse-shot','finish'));
 const assisted=event({actionKind:'through',finish:'finesse',creatorStyles:plus('incisive-pass'),playerStyles:plus('first-touch','finesse-shot')});
 const all=moments(assisted);assert.ok(has(all,'incisive-pass','pass'));assert.ok(has(all,'first-touch','receive'));assert.ok(has(all,'finesse-shot','finish'));
 assert.equal(moments(event({playerStyles:[{id:'first-touch',plus:false}],creatorStyles:[{id:'tiki-taka',plus:false}]})).length,0);
 assert.ok(!has(moments({...dribble,skillMove:'',playerStyles:plus('trickster')}),'trickster'),'no trick icon without an actual skill');
});
test('defender and keeper activations follow causal phase and matching visible action',()=>{
 const intercept=event({type:'ball_won',sequence:'defense_interception',defenseKind:'interception',defensePhase:'build',defenderStyles:plus('intercept'),playerStyles:plus('power-shot')});
 assert.deepEqual(moments(intercept).map(m=>[m.id,m.who,m.phase]),[['intercept','defender','defense']]);
 assert.equal(moments({...intercept,defensePhase:'duel'}).length,0);
 assert.ok(has(moments(event({type:'ball_won',defenseKind:'tackle',sequence:'defense_standing_tackle',defensePhase:'duel',defenderStyles:plus('anticipate')})),'anticipate'));
 for(const [id,kind,action,finish] of [['far-reach','distance','fingertip','power'],['footwork','through','low_reflex','normal'],['deflector','combination','parry','normal'],['rush-out','through','rush_spread','normal'],['cross-claimer','cross','high_reach','header']]){
  const e=event({type:'big_chance_saved',actionKind:kind,keeperAction:action,finish,keeperStyles:plus(id)});assert.ok(has(moments(e),id,'save'),id);assert.ok(!has(moments({...e,type:'goal'}),id),id+' cannot show a save on a goal');
 }
 assert.ok(!has(moments(event({type:'big_chance_saved',actionKind:'distance',keeperAction:'parry',keeperStyles:plus('deflector')})),'deflector'));
});
test('no false Dead Ball penalty, Pinged Pass cross, fatigue or throw icon on a foot distribution',()=>{
 assert.equal(moments(event({sceneKind:'penalty',playerStyles:plus('dead-ball'),creatorStyles:plus('tiki-taka')})).length,0);
 assert.ok(!has(moments(event({actionKind:'cross',finish:'header',creatorStyles:plus('pinged-pass')})),'pinged-pass'));
 assert.ok(has(moments(event({sceneKind:'free_kick',playerStyles:plus('dead-ball')})),'dead-ball'));
 assert.ok(has(moments(event({sceneKind:'corner',creatorStyles:plus('dead-ball')})),'dead-ball','restart'));
 assert.ok(has(moments(event({sceneKind:'throw_in',creatorStyles:plus('long-throw')})),'long-throw','restart'));
 assert.equal(moments(event({playerStyles:plus('relentless')})).length,0);
 assert.ok(!has(moments(event({sceneKind:'keeper_buildout',buildKeeperStyles:plus('far-throw')})),'far-throw'));
});
test('icon windows use authored pass schedules and skill windows, not guessed nearest players',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-playstyle-moments.mjs');
 for(const p of P.PLAYBOOK){assert.equal(H.creatorActor(p.id),p.order.at(-2),p.id);const e=event({sequence:p.id,signatures:[{id:'tiki-taka',who:'creator',phase:'pass'}]});const m=M.signatureTimeline(e)[0],last=P.playTouches(p).at(-1);assert.equal(m.actor,last.passer);assert.ok(m.badge[0]<=last.release&&m.badge[1]>last.release);}
 const e=event({sequence:'skill_roulette_left',actionKind:'dribble',finish:'finesse',skillMove:'roulette',playerStyles:plus('technical','finesse-shot')});e.signatures=moments(e);const list=M.signatureTimeline(e);
 const skill=list.find(m=>m.id==='technical'),finish=list.find(m=>m.id==='finesse-shot');assert.deepEqual([...skill.badge],[1.65,3.35]);assert.ok(finish.badge[0]>skill.badge[1]);
 assert.ok(M.activeSignatureMoments(list,2.5).some(m=>m.id==='technical'));assert.ok(M.activeSignatureMoments(list,5.4).some(m=>m.id==='finesse-shot'));
 const defense=event({type:'ball_won',defenderIndex:11,signatures:[{id:'intercept',who:'defender',phase:'defense'}]});assert.equal(M.signatureTimeline(defense)[0].actor,11);
});
test('snapshot freezes every phase and preserves actor roles; carry Plus does not add shot slow motion',async()=>{
 const e=event({actionKind:'dribble',skillMove:'roulette',playerStyles:plus('technical')});e.signatures=moments(e);e.signature=H.signatureStyle(e);const snap=H.snapshot(e);assert.equal(snap.signatures[0].phase,'carry');assert.ok(Object.isFrozen(snap.signatures));assert.ok(Object.isFrozen(snap.signatures[0]));
 const {createHighlightPlayback}=await import('../3d-playback-clock.mjs');assert.equal(createHighlightPlayback(snap).totalSeconds,createHighlightPlayback(event({type:'goal'})).totalSeconds);
 const malformed=H.snapshot(event({signatures:[{id:'<script>',who:'keeper'}],buildKeeperStyles:'bad'}));assert.equal(malformed.signatures.length,0);
});
test('fifteen contextual variants have distinct finite joint poses and smooth entry/exit',async()=>{
 const T=await import('../vendor/three/three.module.min.js'),M=await import('../3d-playstyle-moments.mjs');
 const actor=()=>({rig:new T.Group(),upper:new T.Group(),legs:[new T.Group(),new T.Group()],knees:[new T.Group(),new T.Group()],ankles:[new T.Group(),new T.Group()],arms:[new T.Group(),new T.Group()],elbows:[new T.Group(),new T.Group()]});
 for(const [family,id] of [['receive','first-touch'],['shield','press-proven'],['defense','intercept'],['defense','bruiser'],['save','far-reach']]){
  const shapes=new Set();for(let variant=0;variant<3;variant++){const moment={family,id,variant,badge:[1,2]};const a=actor();M.applyPlusMotion(a,moment,1.5);shapes.add(JSON.stringify([a.upper.rotation.toArray(),a.legs.map(n=>n.rotation.toArray()),a.knees.map(n=>n.rotation.toArray())]));assert.equal(M.applyPlusMotion(actor(),moment,.99),0);assert.equal(M.applyPlusMotion(actor(),moment,2.01),0);}assert.equal(shapes.size,3,family+' '+id);
 }
});
test('named creator layout aligns shirts and identity with the actual scene passer',()=>{
 const source=fs.readFileSync(require.resolve('../3d-highlights-match.js'),'utf8');const start=source.indexOf('function match3DAttackOrder('),end=source.indexOf('// Cosmetic-only',start);
 const rows=Array.from({length:11},(_,i)=>({uid:'h'+i,index:i,slot:i===0?'GK':'CM',name:'Player '+i}));const ctx={matchActorRows:()=>rows.map(r=>({...r}))};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const e={team:'home',playerId:'h9',playerName:'Player 9',creatorUid:'h6',creatorName:'Player 6',creatorActor:3},ordered=ctx.match3DAttackOrder(e);
 assert.equal(ordered[0].uid,'h9');assert.equal(ordered[3].uid,'h6');assert.equal(new Set(ordered.filter(Boolean).map(r=>r.uid)).size,8);
 const shirts=ctx.match3DShirtNumbers(e,{shirtNumbers:{h9:9,h6:6}},null,null,8);assert.equal(shirts.shirtNumbers[0],9);assert.equal(shirts.shirtNumbers[3],6);
});
