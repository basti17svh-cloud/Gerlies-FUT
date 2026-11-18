/* Real A/B GLB vs original Footera renderer; no generated assets. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','model-ab');
fs.mkdirSync(out,{recursive:true});
const cp=require('node:child_process');
cp.execFileSync('git',['fetch','--depth=1','origin','dad4bba1c3aad1d7fd8662490e85e5d8693bd4d8'],{cwd:root});
cp.execFileSync('git',['worktree','add','--detach','/tmp/footera-original','FETCH_HEAD'],{cwd:root});
let active=root;
const server=http.createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(active,'.'+decodeURIComponent(rel));
 if(!file.startsWith(active+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 for(const revision of ['Vorher','Nachher']){
 active=revision==='Vorher'?'/tmp/footera-original':root;
 const scene=fs.readFileSync(path.join(active,'3d-highlights.js'),'utf8').match(/3d-highlights-scene\.mjs\?v=\d+/)[0];
 const human=fs.readFileSync(path.join(active,'3d-highlights-scene.mjs'),'utf8').match(/from '(\.\/3d-player-human.mjs[^']*)'/)[1];
 const page=await browser.newPage();await page.route('**/render-fixture',route=>route.fulfill({contentType:'text/html',body:'<canvas></canvas>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/render-fixture');const images=await page.evaluate(async ([human,scene])=>{ const T=await import('./vendor/three/three.module.min.js'), H=await import(human), S=await import('./'+scene);await S.prepareFooteraPlayerModel();await H.prepareFooteraHumanModel();await H.footeraRealBodyLoaded();if(H.footeraHumanModelStatus().body!=='metahuman')throw Error('fallback');const event={id:'footera-real-model-comparison',type:'goal',team:'home',minute:38,period:1,attackDirection:1,
 sequence:'cut_inside_right',finish:'finesse',playerName:'Footera Modelltest',keeperName:'Footera Torwart',defenderName:'Footera Verteidiger',
 defenderIndex:10,defenderAction:'jockey',keeperAction:'classic',playerStyles:[],creatorStyles:[],defenderStyles:[],keeperStyles:[],
 homeColor:'#0c7964',homeSecondary:'#f4d184',homePattern:'diagonal',homeShorts:'#103c32',homeSocks:'#f4d184',
 awayColor:'#e7edf5',awaySecondary:'#a42748',awayPattern:'halves',awayShorts:'#18233b',awaySocks:'#e7edf5'};


 let seed=450;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); const r=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
 let sc;const draw=r.render.bind(r);r.render=(s,c)=>{sc=s;draw(s,c)};
 const w=S.makeScene(r,event,false,false,true,false,true,true,'human');w.resize(780,560);w.update(1.55);const save=()=>r.domElement.toDataURL('image/png').split(',')[1];const match=save();
 const root=sc.getObjectByName('FooteraScorerRoot');const body=root.getObjectByName('FooteraBody');if(!body?.material.userData.footeraHD)throw Error('no HD scorer');
 const head=root.getObjectByName('Head'); const aim=head.getWorldPosition(new T.Vector3());const c=new T.PerspectiveCamera(30,780/560,.03,120);
 const pos=root.localToWorld(new T.Vector3(.3,0,-.85)).sub(root.getWorldPosition(new T.Vector3()));c.position.copy(aim).add(pos);c.lookAt(aim);draw(sc,c);return [match,save()] },[human,scene]);
 for(const [i,k] of ['Match','Nahaufnahme'].entries())fs.writeFileSync(path.join(out,revision+'-'+k+'.png'),Buffer.from(images[i],'base64'));
 await page.close();
 }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});