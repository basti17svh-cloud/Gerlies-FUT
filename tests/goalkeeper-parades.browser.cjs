/* Regression at the VISIBLE imported skeleton, not just the hidden guide rig.
 * Keeps the production camera for mobile captures; detail frames are QA only. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Keeper QA</body>');return}
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(p)?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(p).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(Number(process.env.FOOTERA_QA_PORT)||0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/keeper-qa');
  const result=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),M=await import('./3d-highlights-scene.mjs');
   await M.prepareFooteraPlayerModel();
   const canvas=document.createElement('canvas');document.body.replaceChildren(canvas);
   const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
   const render=renderer.render.bind(renderer);let scene,camera;
   renderer.render=(s,c)=>{scene=s;camera=c};
   const rows=[],captures=[],distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
   for(const action of ['classic','fingertip','parry','low_reflex','rush_spread','high_reach'])for(const side of [-1,1]){
    const direction=side,weak=side===-1;
    const event=Object.freeze({id:'keeper-'+action+side,type:'big_chance_saved',team:'home',period:side===1?1:2,minute:3,
     attackDirection:direction,sequence:'central',finish:action==='low_reflex'?'low_driven':'normal',keeperAction:action,
     shotPlacement:Object.freeze({side,zone:'corner',height:['fingertip','high_reach'].includes(action)?'high':'mid'}),
     playerName:'Footera Stürmer',keeperName:'Footera Torwart',homeColor:'#174f5a',awayColor:'#eeeeee'});
    const immutable=JSON.stringify(event),world=M.makeScene(renderer,event,weak,false,true,false,true);
    world.resize(390,300);world.update(0);
    const keeper=scene.getObjectByName('FooteraKeeperRoot'),model=keeper.getObjectByName('FooteraImportedFootballer');
    const field=keeper.parent,at=name=>field.worldToLocal(model.getObjectByName(name).getWorldPosition(new T.Vector3())).toArray();
    const samples=[];
    for(const time of [4.8,5.65,6.2,6.65,7.25,7.65,8.3,8.65,9.3]){
     world.update(time);
     const bones=Object.fromEntries(['pelvis','Head','hand_l','hand_r','foot_l','foot_r'].map(n=>[n,at(n)]));
     const ball=M.ballPosition(event.type,time,event.sequence,event.finish,action,event.shotPlacement);
     const data={time,bones,root:keeper.position.toArray(),ball,handGap:Math.min(distance(bones.hand_l,ball),distance(bones.hand_r,ball))};
     samples.push(data);
     if(side===1&&action==='fingertip'){
      // Magnify the actual scene for inspecting fingers, knee bend and landing.
      renderer.setSize(640,420,false);const detail=new T.PerspectiveCamera(38,640/420,.1,200);
      detail.position.set(7,3,-43);detail.lookAt(1,1,-50.6);render(scene,detail);
      captures.push({name:'keeper-detail-'+time,image:canvas.toDataURL().split(',')[1]});world.resize(390,300);
     }
    }
    world.update(6.65);const first=[at('Head'),at('hand_l'),at('hand_r')];
    world.update(8.3);world.update(6.65);const repeated=[at('Head'),at('hand_l'),at('hand_r')];
    if(side===1&&['classic','low_reflex','fingertip'].includes(action)){
     const width=action==='classic'?360:action==='low_reflex'?390:412;world.resize(width,300);world.update(6.65);render(scene,camera);
     captures.push({name:'keeper-mobile-'+width,image:canvas.toDataURL().split(',')[1]});
    }
    const frames=[];for(let i=0;i<=180;i++){world.update(5+i/60);frames.push({root:keeper.position.toArray(),head:at('Head')})}
    const maxStep=Math.max(...frames.slice(1).map((r,i)=>distance(r.head,frames[i].head)));
    rows.push({action,side,weak,imported:!!model,unchanged:immutable===JSON.stringify(event),deterministic:JSON.stringify(first)===JSON.stringify(repeated),samples,maxStep});
    world.dispose();
   }
   renderer.dispose();return{rows,captures};
  });
  for(const c of result.captures)fs.writeFileSync(path.join(out,c.name+'.png'),Buffer.from(c.image,'base64'));
  fs.writeFileSync(path.join(out,'keeper-parades.json'),JSON.stringify(result.rows,null,2));
  assert.deepEqual(errors,[]);
  for(const row of result.rows){
   const label=row.action+' side '+row.side;
   assert.ok(row.imported&&row.unchanged&&row.deterministic,label+' real model, immutable event, deterministic seek');
   assert.ok(row.maxStep<.3,label+' continuous motion: '+row.maxStep);
   for(const s of row.samples)assert.ok(Object.values(s.bones).flat().every(Number.isFinite),label+' finite bones');
   const contact=row.samples.find(s=>s.time===6.65),land=row.samples.find(s=>s.time===7.25),ready=row.samples.find(s=>s.time===5.65);
   assert.ok(contact.handGap<.22,label+' visible hand reaches ball: '+contact.handGap);
   assert.ok(Math.min(ready.bones.foot_l[1],ready.bones.foot_r[1])<.14,label+' planted takeoff');
   if(row.action!=='rush_spread'){
    const axis=contact.bones.Head.map((v,i)=>v-contact.bones.pelvis[i]);
    assert.ok(Math.abs(axis[0])>Math.abs(axis[1]),label+' visible horizontal dive');
    assert.ok(land.bones.Head[1]<.75,label+' real landing, not floating: '+land.bones.Head[1]);
   }
   assert.ok(Math.min(land.bones.hand_l[1],land.bones.hand_r[1])>-.035,label+' wrists stay above turf');
   assert.ok(row.samples.at(-1).bones.Head[1]>1.4,label+' gets up');
  }
  console.log('PASS: 12 keeper scenarios, both directions, LOW/STANDARD, contact/landing/recovery and mobile 360/390/412.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
