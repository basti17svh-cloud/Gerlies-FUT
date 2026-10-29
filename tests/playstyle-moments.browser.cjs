const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','playstyle-moments-v21304');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname;if(rel==='/qa.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0"><script src="./playstyles.js"></script><script src="./3d-highlights.js"></script></body>');return}const f=path.resolve(root,'.'+decodeURIComponent(rel));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return}res.setHeader('Content-Type',/\.m?js$/.test(f)?'text/javascript':f.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');fs.createReadStream(f).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});const page=await browser.newPage({viewport:{width:412,height:400}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/qa.html');
 const checks=await page.evaluate(async()=>{
  const M=await import('./3d-highlights-scene.mjs'),T=await import('./vendor/three/three.module.min.js');await M.prepareFooteraPlayerModel();await M.prepareFooteraHumanModel();
  const canvas=document.createElement('canvas');canvas.id='proof';document.body.append(canvas);const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
  const plus=(...ids)=>ids.map(id=>({id,plus:true})),H=FooteraHighlights,rows=[];
  const cases=[
   {id:'roulette-finesse',sequence:'skill_roulette_left',actionKind:'dribble',finish:'finesse',skillMove:'roulette',skillMoves:3,playerStyles:plus('trickster','finesse-shot')},
   {id:'through-first-touch',sequence:'split_defenders',actionKind:'through',playerStyles:plus('first-touch'),creatorStyles:plus('incisive-pass')},
   {id:'tiki-pass-shot',sequence:'five_pass_carousel_right',finish:'power',playerStyles:plus('first-touch','power-shot'),creatorStyles:plus('tiki-taka')},
   {id:'shield',sequence:'dribble',actionKind:'dribble',playerStyles:plus('press-proven')},
   {id:'intercept',type:'ball_won',sequence:'defense_interception',defenseKind:'interception',defensePhase:'build',defenderAction:'lane_read',defenderStyles:plus('intercept')},
   {id:'duel',type:'ball_won',sequence:'defense_standing_tackle',defenseKind:'tackle',defensePhase:'duel',defenderAction:'close_down',defenderStyles:plus('bruiser')},
   {id:'block-attempt-goal',finish:'power',defenderAction:'block_attempt',defenderStyles:plus('block'),playerStyles:plus('power-shot')},
   {id:'keeper-reach',type:'big_chance_saved',actionKind:'distance',finish:'power',keeperAction:'fingertip',keeperStyles:plus('far-reach')},
   {id:'keeper-feet',type:'big_chance_saved',actionKind:'through',keeperAction:'low_reflex',keeperStyles:plus('footwork')},
   {id:'keeper-parry',type:'big_chance_saved',keeperAction:'parry',keeperStyles:plus('deflector')},
   {id:'corner',sceneKind:'corner',sequence:'extended_corner',actionKind:'cross',finish:'header',creatorStyles:plus('dead-ball')},
   {id:'throw',sceneKind:'throw_in',sequence:'extended_throw_in',creatorStyles:plus('long-throw')},
   {id:'outside',sequence:'dribble',actionKind:'dribble',playerStyles:plus('trivela')},
   {id:'late-creative',finish:'finesse',tightLateGame:true,playerStyles:plus('gamechanger')}
  ];
  window.plusQA={M,renderer,canvas,cases,H};
  for(let i=0;i<cases.length;i++){
   const raw={type:'goal',team:'home',period:i%2?2:1,actionKind:'combination',finish:'normal',sequence:'central',creatorName:'Provider',playerName:'Finisher',defenderIndex:8,shotFoot:i%2?'Left':'Right',...cases[i]};raw.signatures=H.signatureMoments(raw);raw.signature=H.signatureStyle(raw);const e=H.snapshot(raw),before=JSON.stringify(e),width=[360,390,412][i%3],model=i%2?'human':'quaternius';
   const world=M.makeScene(renderer,e,false,false,true,false,true,true,model);world.resize(width,340);world.update(0);const expected=world.inspect().plusMoments;
   if(!expected.length)throw Error('missing expected moments '+e.id);
   const times=[...new Set(expected.flatMap(m=>[m.badge[0]+.09,(m.badge[0]+m.badge[1])/2,m.badge[1]-.09]).concat([5.4,6.65]))].sort((a,b)=>a-b),seen=new Set();
   for(const time of times){
    world.update(time);const x=world.inspect();if(!x.ball.every(Number.isFinite)||!x.camera.every(Number.isFinite))throw Error('invalid frame '+e.id);
    const active=x.plusMoments.filter(m=>m.visible);if(new Set(active.map(m=>m.actor)).size!==active.length)throw Error('stacked icons '+e.id);
    for(const m of active){
     if(!m.ownerPosition||Math.hypot(m.position[0]-m.ownerPosition[0],m.position[2]-m.ownerPosition[2])>.001||Math.abs(m.position[1]-m.ownerPosition[1]-2.45)>.001)throw Error('wrong icon owner '+e.id+' '+m.id);
     if(time<=m.badge[0]||time>=m.badge[1])throw Error('icon outside phase '+e.id);seen.add(m.id+':'+m.phase);
    }
    if(e.type==='big_chance_saved'&&time===6.65){const gap=Math.min(...x.gloves.map(g=>Math.hypot(...g.map((v,k)=>v-x.ball[k]))));if(gap>.25)throw Error('keeper contact lost '+gap)}
    if(JSON.stringify(e)!==before)throw Error('renderer mutated authoritative snapshot');
    rows.push({id:e.id,time,width,model,type:e.type,active:active.map(m=>({id:m.id,phase:m.phase,actor:m.actor})),drawCalls:x.drawCalls});
   }
   for(const m of expected)if(!seen.has(m.id+':'+m.phase))throw Error('moment never visible '+e.id+' '+m.id);
   world.dispose();
  }
  return rows;
 });
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));
 for(const [id,time] of [['roulette-finesse',2.5],['through-first-touch',2.9],['intercept',4.4],['keeper-reach',6.65]]){
  await page.evaluate(({id,time})=>{const {M,renderer,cases,H,canvas}=plusQA;plusQA.world?.dispose();const raw={type:'goal',team:'home',period:1,actionKind:'combination',finish:'normal',sequence:'central',creatorName:'Provider',playerName:'Finisher',defenderIndex:8,...cases.find(c=>c.id===id)};raw.signatures=H.signatureMoments(raw);raw.signature=H.signatureStyle(raw);plusQA.world=M.makeScene(renderer,H.snapshot(raw),false,false,true,false,true,true,'human');plusQA.world.resize(390,340);plusQA.world.update(time)}, {id,time});
  await page.evaluate(async time=>{await new Promise(r=>requestAnimationFrame(r));plusQA.world.update(time)},time);
  await page.locator('#proof').screenshot({path:path.join(out,id+'.png')});
 }
 console.log(JSON.stringify({frames:checks.length,cases:14,widths:[360,390,412],errors}));
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
