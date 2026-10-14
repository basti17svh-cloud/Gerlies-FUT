/* V21.86 mobile WebGL smoke proof for ACTUAL authored passing and confirmed turnovers. */
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const newAttacks=process.argv.includes('--new-attacks'),cameraFix=process.argv.includes('--camera-fix');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts',cameraFix?'camera-v21.151':newAttacks?'playbook-v21.146':'playbook-v21.86');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname;
 if(rel==='/qa.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Footera Playbook QA</title>');return}
 const file=path.resolve(root,'.'+decodeURIComponent(rel));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa.html');
  const data=await page.evaluate(async({newAttacks,cameraFix})=>{
   const THREE=await import('./vendor/three/three.module.min.js');
   const M=await import('./3d-highlights-scene.mjs?v=2186');
   const P=await import('./3d-playbook.mjs?v=2186');
   if(!await M.prepareFooteraPlayerModel())throw Error('Production GLB not available');
   const canvas=document.createElement('canvas');document.body.append(canvas);
   const renderer=new THREE.WebGLRenderer({canvas,preserveDrawingBuffer:true,antialias:false});
   renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
   const checks=[],screenshots=[];
   const scenes=cameraFix?['wing_left','wing_right','early_cross_left','cutback_right','overlap_left_high','overlap_right_high'].map(id=>[id,'goal',M.cameraDelivery(id).release]):newAttacks?P.NEW_ATTACK_IDS.map((id,i)=>[id,['goal','big_chance_saved','big_chance_missed','shot_post'][i%4],4.8]):[
    ['triangle_left','goal',2.2],['split_defenders','big_chance_saved',4.3],
    ['overlap_left_low','goal',3.8],['overlap_right_high','big_chance_missed',4.5],
    ['switch_overlap_low','goal',2.7],['defense_interception','ball_won',4.4],
    ['defense_slide_tackle','ball_won',4.4]
   ];
   for(const [sequence,type,frame] of scenes){
    const plan=P.getPlay(sequence);
    const event={id:'qa-'+sequence,type,team:'home',minute:42,period:1,attackDirection:(newAttacks||cameraFix)&&checks.length%2?-1:1,
     sequence,finish:plan?.finish||'normal',playerName:'Stürmer',defenderName:'Verteidiger',defenderIndex:8,
     defenderAction:type==='ball_won'?(sequence.includes('slide')?'slide_attempt':'lane_read'):'close_down',
     keeperAction:type==='big_chance_saved'?'parry':'beaten',playerStyles:[],creatorStyles:[],defenderStyles:[],keeperStyles:[],
     homeColor:'#237154',homeSecondary:'#d9d5b6',homePattern:'halves',homeShorts:'#182825',homeSocks:'#217354',homeKitConfigured:true,
     awayColor:'#e8eceb',awaySecondary:'#324e61',awayPattern:'sleeves',awayShorts:'#e8eceb',awaySocks:'#e8eceb',awayKitConfigured:true};
    const world=M.makeScene(renderer,event,false,false,true,false,true,true,'quaternius');
    world.resize((newAttacks||cameraFix)?390:640,(newAttacks||cameraFix)?340:360);
    const times=cameraFix?[frame-.3,frame,frame+.2,5.4,6.8]:type==='ball_won'?[1.5,4.1,4.4,6.8]:[.8,2.2,frame,5.4,6.8];
    for(const t of times){
     world.update(t);const state=world.inspect();
     if(!state.ball.every(Number.isFinite)||!state.camera.every(Number.isFinite))throw Error('Invalid coords '+sequence+' '+t);
     if(state.importedSquadCount!==16||!state.importedKeeper)throw Error('Not rendering real GLB squad '+sequence);
     if(state.drawCalls>260)throw Error('Draw budget exceeded '+sequence+' '+state.drawCalls);
     if(state.visibleFieldPlayers<5)throw Error('Broadcast camera lost most actors '+sequence+' '+state.visibleFieldPlayers);
     if(type==='ball_won'&&t===4.4&&state.contactBallDistance>5)throw Error('Defensive boot never reaches ball '+sequence+' '+state.contactBallDistance);
     if((newAttacks&&t>=4.8||cameraFix&&t>=5.4)&&state.goalFrameScreen.some(p=>Math.abs(p[0])>=.98||Math.abs(p[1])>=.98))throw Error('Rendered broadcast camera crops goal '+sequence+' '+t);
     if(cameraFix&&t<=frame+.2&&state.deliveryFrameScreen.some(p=>Math.abs(p[0])>=.9||Math.abs(p[1])>=.9))throw Error('Crosser cropped before follow-through '+sequence);
     checks.push({sequence,type,time:t,visible:state.visibleFieldPlayers,drawCalls:state.drawCalls,ball:state.ball});
    }
    if(newAttacks||cameraFix)world.update(frame);
    const shot=canvas.toDataURL('image/png');
    if(shot.length<15000)throw Error('Empty WebGL frame '+sequence);
    screenshots.push({name:sequence,data:shot.split(',')[1]});
    world.dispose();
   }
   renderer.dispose();renderer.forceContextLoss();
   return{checks,screenshots};
  },{newAttacks,cameraFix});
  assert.deepEqual(errors,[]);assert.equal(data.screenshots.length,cameraFix?6:newAttacks?12:7);
  for(const item of data.screenshots)fs.writeFileSync(path.join(out,item.name+'.png'),Buffer.from(item.data,'base64'));
  fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({checks:data.checks},null,2));
  console.log('PASS REAL WEBGL PLAYBOOK: '+data.checks.length+' field samples / '+data.screenshots.length+' screenshots');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
