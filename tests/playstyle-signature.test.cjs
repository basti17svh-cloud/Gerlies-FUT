const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');
// V21.196: PlayStyle+ players get their own signature scene. Presentation only.
const plus=(...ids)=>ids.map(id=>({id,plus:true}));
test('a plus PlayStyle that fits the finish becomes the signature, a normal one does not',()=>{
 const sig=fields=>H.signatureStyle({type:'goal',creatorName:'ZM',...fields});
 assert.deepEqual({...sig({actionKind:'distance',finish:'power',playerStyles:plus('power-shot')})},{id:'power-shot',name:'Powerschuss',who:'scorer'});
 assert.equal(sig({actionKind:'distance',finish:'power',playerStyles:[{id:'power-shot',plus:false}]}),null);
 assert.equal(sig({actionKind:'distance',finish:'finesse',playerStyles:plus('power-shot')}),null,'only the style he actually uses');
 assert.equal(sig({actionKind:'cross',finish:'header',playerStyles:plus('power-header')}).id,'power-header');
 assert.equal(sig({actionKind:'cross',finish:'volley',playerStyles:plus('acrobatic')}).id,'acrobatic');
 assert.equal(sig({actionKind:'dribble',finish:'normal',creatorName:'',playerStyles:plus('trickster')}).id,'trickster');
 assert.equal(sig({sceneKind:'free_kick',finish:'normal',playerStyles:plus('dead-ball')}).id,'dead-ball');
 const pass=sig({actionKind:'through',finish:'normal',creatorStyles:plus('incisive-pass')});
 assert.equal(pass.id,'incisive-pass');assert.equal(pass.who,'creator');
 assert.equal(sig({actionKind:'through',finish:'normal',creationType:'solo',creatorStyles:plus('incisive-pass')}),null);
});
test('signatures show for goals, saves and misses alike and steer towards the star finish',()=>{
 for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post'])
  assert.equal(H.choosePresentation({id:'s',type,creatorName:'ZM',actionKind:'distance',finish:'power',playerStyles:plus('power-shot')}).signature.id,'power-shot');
 const count=styles=>[...Array(400)].filter((_,i)=>['long_shot','power_drive'].includes(H.choosePresentation({id:'p'+i,type:'goal',creatorName:'ZM',actionKind:'distance',finish:'power',playerStyles:styles}).sequence)).length;
 assert.ok(count(plus('power-shot'))>count([{id:'power-shot',plus:false}])*1.4);
 assert.equal(H.snapshot({id:'x',type:'goal',signature:{id:'power-shot',who:'scorer'}}).signature.name,'Powerschuss');
 assert.equal(H.snapshot({id:'x',type:'goal',signature:{id:'<script>',who:'scorer'}}).signature,null);
});
test('signature scene: slow motion into the strike, gold trail and close camera, never for ball wins',async()=>{
 const {createHighlightPlayback}=await import('../3d-playback-clock.mjs'),M=await import('../3d-highlights-scene.mjs');
 const signature={id:'power-shot',name:'Powerschuss',who:'scorer'};
 for(const type of ['goal','big_chance_saved']){
  const plain=createHighlightPlayback({type}),sig=createHighlightPlayback({type,signature});
  assert.ok(sig.totalSeconds>plain.totalSeconds+.5,'slow motion adds screen time');
  sig.presented(0);let prev=0,steps=[];for(let n=10;n<=sig.totalSeconds*1000+20;n+=10){const t=sig.tick(n).time;assert.ok(t>=prev);steps.push([prev,t]);prev=t}
  const rate=at=>{const s=steps.find(([a,b])=>a<=at&&b>at);return (s[1]-s[0])/.01};
  assert.ok(Math.abs(rate(5.1)-.4)<.05);assert.ok(Math.abs(rate(6)-1.5)<.05,'the flight keeps the common pace');
 }
 const win=M.signatureWindow({type:'big_chance_saved',sequence:'long_shot',finish:'power',signature});
 assert.equal(win.camera,'behind');assert.ok(win.badge[0]<M.SHOT_TIME&&win.trail[0]===M.SHOT_TIME);
 assert.equal(M.signatureWindow({type:'ball_won',sequence:'defense_interception',signature}),null);
 const creator=M.signatureWindow({type:'goal',sequence:'wing_left',signature:{id:'incisive-pass',name:'Entscheidender Pass',who:'creator'}});
 assert.ok(creator.trail[1]<M.SHOT_TIME&&!creator.camera);
});
