const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith('index.html')){let html=body.toString(),last=html.lastIndexOf('<script>');html=html.slice(0,last)+html.slice(html.indexOf('</script>',last)+9);body=Buffer.from(html)}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body)}catch(_){res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url,{waitUntil:'load'});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}'});
  await page.evaluate(()=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   const names=['Isco','Jérémy Doku','Jules Koundé','Bruno Guimarães'],ids=['197781','246420','241486','247851'];
   const options=names.map((name,i)=>({id:'totw:5:'+ids[i],item:{pid:ids[i],variant:'special',cosmeticDesign:'red',displayRating:87,eventName:'Team of the Week 5',tradeable:false,baseSnapshot:{id:ids[i],name,fullName:name,position:'CM',ovr:87,pac:84,sho:87,pas:89,dri:88,def:68,phy:76,nation:'Germany',league:'Bundesliga',team:'FC Bayern München',face:'./assets/footera/totw/5/'+ids[i]+'.png'}}}));
   window.testOffer={id:'00000000-0000-4000-8000-000000001161',type:'champions-red',min_rating:85,choices:4,options};
   state.onboarded=true;state.club=[];state.squad=Array(23).fill(null);state.profile.saveId='pick-test';state.profile.username='Tester';state.profile.clubName='Testclub';
   PLAYERS=options.map(o=>o.item.baseSnapshot);P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   localStorage.setItem('footera-cloud-owner','test-owner');let claimed=false;window.cloudAutoSyncCalls=0;
   FooteraAccount.getClient=async()=>({rpc:async(name,args)=>{
    if(name==='footera_open_player_pick')await new Promise(resolve=>setTimeout(resolve,350));
    return {data:name==='footera_list_player_picks'?(claimed?[]:[testOffer]):testOffer,error:null};
   }});
   FooteraAccount.user=async()=>({id:'test-owner',email_confirmed_at:'2026-10-01',is_anonymous:false});
   FooteraAccount.autoAttachAndBackup=async()=>{window.cloudAutoSyncCalls++};FooteraAccount.pendingPlayerPick=()=>null;
   FooteraAccount.choosePlayerPick=async(id,option,apply)=>{
    await new Promise(r=>setTimeout(r,80));
    const item={...options.find(x=>x.id===option).item,uid:id,playerPickId:id,acquisitionSource:'reward-pick'};
    const data={pick_id:id,item,save_data:{sbcStorage:[],playerPickClaims:{[id]:option}}};apply(data);apply(data);claimed=true;return data;
   };
   renderAll();switchView('storeView',{push:false});
  });
  await page.evaluate(()=>FooteraPlayerPicks.refresh());
  assert.equal(await page.evaluate(()=>window.cloudAutoSyncCalls),0,'Listing Picks must not trigger full cloud synchronization');
  await page.evaluate(()=>switchView('homeView',{push:false,scroll:false}));
  assert.equal(await page.locator('#homePlayerPickNotice').isVisible(),true,'Home banner for outstanding Picks');
  assert.match(await page.locator('#homePlayerPickCopy').textContent(),/1 Player Pick/);
  await page.locator('[data-picks-jump]').click();
  assert.equal(await page.locator('#storeView.active').count(),1,'Home banner routes to Store');
  await page.locator('[data-pick-open]').click();
  await page.locator('#playerPickModal.active').waitFor();
  assert.ok((await page.locator('.pick-loading-card').count())===4 || (await page.locator('.pick-option').count())===4,'Opening shows either loading cards or the already resolved offer');
  await page.locator('.pick-option').first().waitFor();
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('.pick-option').count(),4);assert.equal(await page.locator('.pick-option .champions-red').count(),4);
   assert.equal(await page.locator('.pick-option.revealed').count(),0,'All Picks are initially face down');
   assert.ok(await page.evaluate(()=>document.getElementById('playerPickModal').scrollWidth<=innerWidth+1));
   assert.ok(await page.locator('[data-pick-confirm]').isDisabled());
   const bounds=await page.locator('.pick-option').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{width:r.width,right:r.right,left:r.left}}));
   assert.ok(bounds.every(r=>r.width>130&&r.left>=0&&r.right<=width));
   const cards=await page.locator('.pick-option .card-shell').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height}}));
   assert.ok(cards.every(r=>r.width>=120&&r.height>=170),'Player cards must remain readable at '+width+'px: '+JSON.stringify(cards));
   console.log('PASS mobile four-card selection',width);
  }
  fs.mkdirSync(path.join(root,'test-artifacts'),{recursive:true});await page.screenshot({path:path.join(root,'test-artifacts/player-picks-412.png')});
  await page.locator('[data-pick-close]').click();await page.locator('[data-pick-open]').click();
  await page.locator('.pick-option').first().waitFor();
  assert.equal(await page.locator('.pick-option').count(),4);
  await page.locator('.pick-option').first().click();
  assert.equal(await page.locator('.pick-option.revealed').count(),1);
  assert.ok(await page.locator('[data-pick-confirm]').isDisabled(),'Reveal alone must not select a player');
  await page.locator('.pick-option').first().click();assert.ok(await page.locator('[data-pick-confirm]').isEnabled());
  await page.locator('[data-pick-confirm]').click();await page.waitForFunction(()=>state.club.length===1);
  assert.equal(await page.evaluate(()=>state.club.length),1);assert.equal(await page.evaluate(()=>state.club[0].tradeable),false);
  assert.equal(await page.evaluate(()=>Object.keys(state.playerPickClaims).length),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gerliesFutV9')).club.length),1);
  assert.equal(await page.locator('[data-pick-open]').count(),0);
  assert.equal(await page.evaluate(()=>document.getElementById('homePlayerPickNotice').hidden),true,'Home Pick hint disappears after claim');
  assert.equal(await page.evaluate(()=>cardClass(displayBase(state.club[0]),state.club[0])),'champions-red');
  assert.deepEqual(errors,[]);console.log('PASS reopen, confirm, duplicate delivery, stored red card and consumed pick');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
