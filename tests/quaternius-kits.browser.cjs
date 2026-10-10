'use strict';
// Genuine Three.js WebGL frames plus exact shirt/sleeve atlas pixel assertions.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','quaternius-kits');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname;
 if(rel==='/qa.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Footera Kit QA</title>');return}
 const file=path.resolve(root,'.'+decodeURIComponent(rel));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa.html');
  const result=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),K=await import('./3d-rigged-footballer.mjs'),M=await import('./3d-highlights-scene.mjs');
   if(!await M.prepareFooteraPlayerModel())throw Error('Quaternius GLB unavailable');
   const canvas=document.createElement('canvas');document.body.appendChild(canvas);
   const renderer=new T.WebGLRenderer({canvas,preserveDrawingBuffer:true,antialias:false});
   renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
   const draw=renderer.render.bind(renderer);let scene;
   renderer.render=(s,c)=>{scene=s;draw(s,c)};
   const cfg={homeColor:'#a90016',homeSecondary:'#f8e3a0',homePattern:'halves',homeShorts:'#071f3b',homeSocks:'#f9e5ac',homeKitConfigured:true,
    awayColor:'#0d63c7',awaySecondary:'#f7f7ee',awayPattern:'diagonal',awayShorts:'#f2f2ed',awaySocks:'#185cc0',awayKitConfigured:true};
   const event={id:'real-kit-proof',type:'goal',team:'home',minute:27,period:1,attackDirection:1,sequence:'cut_inside_right',finish:'finesse',
    playerName:'Footera QA',keeperName:'Goalkeeper',defenderIndex:10,playerStyles:[],creatorStyles:[],defenderStyles:[],keeperStyles:[],...cfg};
   const world=M.makeScene(renderer,event,false,false,true,false,true,true,'quaternius');
   world.resize(640,480);world.update(1.55);
   const info=world.inspect();
    // The complete deployed squad, not just a showroom player, carries hair.
    const hairMeshes=[];
    scene.traverse(node=>{if(node.isMesh&&/^FooteraAthleteHair-/.test(node.name))hairMeshes.push(node)});
    if(hairMeshes.length!==17||new Set(hairMeshes.map(x=>x.name)).size<5)
     throw Error('Not enough individually fitted hairstyles: '+hairMeshes.map(x=>x.name).join(','));
   const rootModel=scene.getObjectByName('FooteraPlayerPrototypeMount');
   const skins=[];rootModel?.traverse(n=>{if(n.isSkinnedMesh)skins.push(n)});
   const body=skins.find(n=>n.material?.map?.image?.getContext);
   if(!body)throw Error('Production GLB missing actual kit atlas');
   const cv=body.material.map.image,cx=cv.getContext('2d'),tile=cv.height;
   const px=(x,y)=>Array.from(cx.getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3);
   const hex=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
   const near=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<35);
   const sampled=[px(tile*.125,tile*.27),px(tile*.375,tile*.27),px(tile*.625,tile*.27),px(tile*.875,tile*.27)];
   if(!near(sampled[0],hex(cfg.homeColor))||!near(sampled[1],hex(cfg.homeSecondary))||
      !near(sampled[2],hex(cfg.homeColor))||!near(sampled[3],hex(cfg.homeSecondary)))
    throw Error('Front/back exact kit colors wrong '+JSON.stringify(sampled));
   const frontA=K.footeraAtlasUV(-.16,.7,.12,0),frontB=K.footeraAtlasUV(.16,.7,.12,0),
    back=K.footeraAtlasUV(-.16,.7,-.12,0);
   if(!(frontA[0]>frontB[0]&&back[0]>.1&&back[0]<.2))throw Error('Shirt UVs wrong');
   const sig=(pattern,part)=>{
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const ctx=c.getContext('2d');K.paintFooteraKitTile(ctx,{shirt:'#a90016',shirtSecondary:'#f8e3a0',pattern},128,128,part);
    const bytes=ctx.getImageData(0,0,128,128).data;
    let hash=0;for(let i=0;i<bytes.length;i+=4){hash=(Math.imul(hash,31)+bytes[i]+bytes[i+1]*7+bytes[i+2]*13)|0}
    return hash;
   };
   const unique=new Set(K.FOOTERA_KIT_PATTERNS.map(p=>sig(p,'shirt')+':'+sig(p,'sleeves')));
   if(K.FOOTERA_KIT_PATTERNS.length!==20||unique.size<17)throw Error('Incomplete 20 pattern atlas: '+unique.size);
   const screenshots=[];
   for(const backView of [false,true]){
    world.resize(640,480);world.update(1.55);
    const lead=scene.getObjectByName('FooteraScorerRoot');lead.updateWorldMatrix(true,true);
    const cam=new T.PerspectiveCamera(36,640/480,.05,120);
    cam.position.copy(lead.localToWorld(new T.Vector3(2.4,1.5,backView?3.8:-3.8)));
    cam.lookAt(lead.localToWorld(new T.Vector3(0,1.04,0)));draw(scene,cam);
    const image=canvas.toDataURL('image/png');
    if(image.length<25000)throw Error('Empty WebGL frame');
    screenshots.push({name:backView?'player-back':'player-front',data:image.split(',')[1]});
   }
   world.resize(640,360);world.update(3.12);
   screenshots.push({name:'matchday',data:canvas.toDataURL('image/png').split(',')[1]});
   const proof={squad:info.importedSquadCount,keeper:info.importedKeeper,kit:info.kickoffKitSnapshot,
     drawCalls:info.drawCalls,triangles:info.triangles,hairCount:hairMeshes.length,hairStyles:new Set(hairMeshes.map(x=>x.name)).size,patterns:unique.size,atlas:[cv.width,cv.height],sampled,
     maxUV:Math.max(...Array.from(body.geometry.getAttribute('uv').array)),screenshots:screenshots.length};
   world.dispose();renderer.dispose();renderer.forceContextLoss();
   return{proof,screenshots};
  });
  assert.equal(result.proof.squad,16);assert.equal(result.proof.keeper,true);
  assert.equal(result.proof.kit.home.pattern,'halves');assert.equal(result.proof.kit.away.pattern,'diagonal');
  assert.equal(result.proof.kit.home.shorts,'#071f3b');assert.equal(result.proof.kit.home.socks,'#f9e5ac');
  assert.ok(result.proof.drawCalls<240);assert.equal(result.proof.hairCount,17);assert.ok(result.proof.hairStyles>=5);assert.ok(result.proof.maxUV<=1.00001);assert.deepEqual(errors,[]);
  for(const shot of result.screenshots)fs.writeFileSync(path.join(out,shot.name+'.png'),Buffer.from(shot.data,'base64'));
  fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify(result.proof,null,2));
  console.log('PASS QUATERNIUS IN-GAME KITS',JSON.stringify(result.proof));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});