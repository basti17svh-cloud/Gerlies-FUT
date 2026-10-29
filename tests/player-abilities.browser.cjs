// Isolated WebGL regression, real production rigs; no account or live match state.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','player-abilities-v21303');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname;if(rel==='/qa.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body style="margin:0;background:#101a20"></body></html>');return}const f=path.resolve(root,'.'+decodeURIComponent(rel));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return}res.setHeader('Content-Type',/\.m?js$/.test(f)?'text/javascript':f.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');fs.createReadStream(f).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});const page=await browser.newPage({viewport:{width:412,height:400}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/qa.html');
 const checks=await page.evaluate(async()=>{
  const M=await import('./3d-highlights-scene.mjs'),P=await import('./3d-playbook.mjs'),S=await import('./3d-skill-actions.mjs'),T=await import('./vendor/three/three.module.min.js');
  await M.prepareFooteraPlayerModel();await M.prepareFooteraHumanModel();
  const canvas=document.createElement('canvas');canvas.id='proof';document.body.append(canvas);const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);const rows=[];
  window.qaSkills={M,P,S,renderer,canvas};
  const ids=['skill_stepover_left','skill_roulette_right','skill_elastico_left','skill_croqueta_right','five_pass_carousel_left','channel_overlap_thread_right'];
  for(let i=0;i<ids.length;i++){
   const id=ids[i],width=[360,390,412][i%3],direction=i%2?-1:1,model=i%2?'human':'quaternius',foot=i%2?'Left':'Right';
   const event={id:'qa'+id,type:['goal','big_chance_saved','big_chance_missed','shot_post'][i%4],team:i%2?'away':'home',sequence:id,finish:'normal',attackDirection:direction,shotFoot:foot,skillMoves:5,playerFeet:Array(16).fill(foot),playerName:'Testspieler',defenderIndex:8};
   const world=M.makeScene(renderer,event,false,false,true,false,true,true,model);world.resize(width,340);
   for(const time of [1.2,2.1,2.5,3.0,4.65,5.4,6.65]){
    world.update(time);const x=world.inspect();
    if(!x.ball.every(Number.isFinite)||!x.camera.every(Number.isFinite))throw Error('nonfinite '+id);
    if(x.importedSquadCount!==16||!x.importedKeeper)throw Error('missing real rigs '+id);
    if(x.visibleFieldPlayers<5)throw Error('lost actors '+id+' '+time+' '+x.visibleFieldPlayers);
    if(time===5.4&&x.goalFrameScreen.some(p=>Math.abs(p[0])>=.98||Math.abs(p[1])>=.98))throw Error('cropped goal '+id);
    if(x.skillAction?.weight>.1&&(x.controlCarrier!==0||x.ballToCarrier>1.1))throw Error('skill lost ball '+id+' '+time+' '+x.ballToCarrier);
    const distances=x.strikeFeet.map(f=>Math.hypot(f[0]-x.ball[0]/direction,f[1]-x.ball[1],f[2]-x.ball[2]/direction));
    if(time===5.4&&distances[foot==='Left'?0:1]>.75)throw Error('striking boot misses contact '+id+' '+foot+' '+distances.join(','));
    rows.push({id,width,time,model,foot,direction,visible:x.visibleFieldPlayers,ballDistance:x.ballToCarrier,footDistances:x.strikeFeet.map(f=>Math.hypot(f[0]-x.ball[0]/direction,f[1]-x.ball[1],f[2]-x.ball[2]/direction)),skill:x.skillAction?.move||'',skillWeight:x.skillAction?.weight||0,drawCalls:x.drawCalls});
   }
   if(S.skillScene(id))for(const boundary of [1.65,3.35]){
    world.update(boundary-.0001);const a=world.inspect().ball;
    world.update(boundary+.0001);const b=world.inspect().ball;
    const delta=Math.hypot(...a.map((v,k)=>v-b[k]));
    if(delta>.02)throw Error('skill handoff snaps '+id+' '+boundary+' '+delta);
    rows.push({id,width,model,foot,boundary,delta});
   }
   world.dispose();
  }
  return rows;
 });
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));
 // Representative normal-TV frames for visual inspection, both rigs and feet.
 for(const [id,model,width,time] of [['skill_stepover_left','quaternius',360,2.2],['skill_roulette_right','human',390,2.5],['five_pass_carousel_left','human',412,3.0]]){
  await page.evaluate(({id,model,width,time})=>{const {M,renderer}=qaSkills;qaSkills.world?.dispose();const event={id:'image'+id,type:'big_chance_saved',team:'home',attackDirection:1,sequence:id,finish:'normal',shotFoot:'Left',playerFeet:Array(16).fill('Left'),playerName:'Testspieler',defenderIndex:8};qaSkills.world=M.makeScene(renderer,event,false,false,true,false,true,true,model);qaSkills.world.resize(width,340);qaSkills.world.update(time)}, {id,model,width,time});
  await page.locator('#proof').screenshot({path:path.join(out,id+'.png')});
 }
 console.log(JSON.stringify({checks:checks.length,widths:[360,390,412],rigs:['quaternius','human'],errors,out}));
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
