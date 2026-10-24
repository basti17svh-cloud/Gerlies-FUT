/* Real WebGL ball render and production-scene integration; no external writes. */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  let body=fs.readFileSync(file);
  if(file.endsWith("index.html")){const html=body.toString(),last=html.lastIndexOf("<script>");body=Buffer.from(html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9))}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:900,height:900},deviceScaleFactor:1});
  await page.goto(base+'/players-fallback.json');
  await page.setContent('<html><body style="margin:0;background:#09131d"></body></html>');
  const proof=await page.evaluate(async base=>{
   const T=await import(base+'/vendor/three/three.module.min.js'),B=await import(base+'/3d-match-ball.mjs');
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(900,900);renderer.setPixelRatio(1);
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.append(renderer.domElement);
   const scene=new T.Scene();scene.background=new T.Color('#101b26');
   scene.add(new T.HemisphereLight('#e6f4ff','#25303e',2.2));
   const light=new T.DirectionalLight('#fff7e5',3.4);light.position.set(-3,4,5);scene.add(light);
   const rim=new T.DirectionalLight('#8bbdff',1.7);rim.position.set(4,1,-2);scene.add(rim);
   const t=performance.now(),surface=B.createMatchBallSurface(T,{size:2048});const generateMs=performance.now()-t;
   const cached=B.createMatchBallSurface(T,{size:2048});if(cached.map.image!==surface.map.image)throw Error('CPU artwork not cached');cached.map.dispose();cached.bumpMap.dispose();cached.material.dispose();
   const ball=new T.Mesh(new T.SphereGeometry(1,64,48),surface.material);ball.rotation.set(.15,0,.10);scene.add(ball);
   const camera=new T.PerspectiveCamera(31,1,.1,20);camera.position.set(0,.15,4.6);camera.lookAt(0,0,0);renderer.render(scene,camera);
   window.qaBall={renderer,scene,camera,ball};
   // Spherical artwork closes at the UV seam and does not vary at either pole.
   for(const y of [-1,-.7,0,.7,1]){const r=Math.sqrt(1-y*y),a=B.ballSurfaceSample(-r,y,0),b=B.ballSurfaceSample(-r,y,Math.sin(Math.PI*2)*r);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Visible texture seam')}
   if(B.MATCH_BALL_RADIUS!==.14)throw Error('Physics radius changed');
   // Low-end uses the same artwork, at reduced texture resolution.
   const low=B.createMatchBallSurface(T,{size:512});if(low.map.image.width!==512||low.bumpMap.image.height!==256)throw Error('Low texture wrong');low.map.dispose();low.bumpMap.dispose();low.material.dispose();
   return{generateMs,map:[surface.map.image.width,surface.map.image.height],material:surface.material.name};
  },base);
  assert.equal(proof.material,'Footera Astral Pro');assert.deepEqual(proof.map,[2048,1024]);
  await page.screenshot({path:path.join(output,'footera-astral-pro-front.png')});
  if(process.env.FOOTERA_BALL_PREVIEW){const png=await page.evaluate(()=>qaBall.renderer.domElement.toDataURL('image/png').split(',')[1]);fs.writeFileSync(process.env.FOOTERA_BALL_PREVIEW,Buffer.from(png,'base64'));}
  await page.evaluate(()=>{qaBall.ball.rotation.y+=2.2;qaBall.renderer.render(qaBall.scene,qaBall.camera)});
  await page.screenshot({path:path.join(output,'footera-astral-pro-back.png')});
  // The production world must instantiate the same material and keep ball motion.
  const integration=await page.evaluate(async base=>{
   qaBall.renderer.dispose();const T=await import(base+'/vendor/three/three.module.min.js'),M=await import(base+'/3d-highlights-scene.mjs');
   const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(640,360);let actualScene;const draw=renderer.render.bind(renderer);renderer.render=(s,c)=>{actualScene=s;draw(s,c)};
   const event={id:'astral-proof',type:'goal',team:'home',minute:27,period:1,attackDirection:1,sequence:'cut_inside_right',finish:'finesse',playerName:'QA',keeperName:'Keeper',homeColor:'#12472b',awayColor:'#ffffff',playerStyles:[],creatorStyles:[],defenderStyles:[],keeperStyles:[]};
   const world=M.makeScene(renderer,event,true,false,false,false,false,false,'procedural');world.resize(640,360);world.update(2);
   const ball=actualScene.getObjectByName('Footera Astral Pro');if(!ball)throw Error('Production ball not installed');
   const before=ball.position.toArray();world.update(4);const after=ball.position.toArray();
   const result={radius:ball.scale.x,texture:ball.material.map.image.width,moved:before.some((v,i)=>v!==after[i])};world.dispose();renderer.dispose();return result;
  },base);
  assert.deepEqual(integration,{radius:.14,texture:512,moved:true});
  console.log('PASS real WebGL ball, seam continuity, cached artwork, low quality, unchanged radius and production motion',JSON.stringify(proof));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
