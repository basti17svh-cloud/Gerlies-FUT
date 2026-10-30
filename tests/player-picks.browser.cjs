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
   const user={id:'test-owner',email_confirmed_at:'2026-10-01',is_anonymous:false};
   window.pickTransportCalls=[];
   const client={
    auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    from:()=>({select:fields=>{
     window.pickTransportCalls.push(fields);
     return{maybeSingle:async()=>({data:{revision:1,save_data:structuredClone(state)},error:null})};
    }}),
    rpc:async(name,args)=>{
     if(name==='footera_open_player_pick'){
      if(window.holdPickOpen)await new Promise(resolve=>{window.releasePickOpen=resolve});
      await new Promise(resolve=>setTimeout(resolve,350));
     }
     if(name==='footera_choose_player_pick_compact'){
      window.pickTransportCalls.push(name);const wasClaimed=claimed;
      if(args.p_base_revision!==1)throw Error('wrong revision');
      const item={...options.find(x=>x.id===args.p_option).item,uid:args.p_id,playerPickId:args.p_id,acquisitionSource:'reward-pick'};
      const assertNotSave=Object.prototype.hasOwnProperty.call(args,'p_save');if(assertNotSave)throw Error('full save sent');
      const saved={profile:{saveId:args.p_save_id},sbcStorage:[],playerPickClaims:{[args.p_id]:args.p_option}};
      window.testDelivery={pick_id:args.p_id,item,save_data:saved,revision:2};claimed=true;
      if(window.dropNextCompactResponse){window.dropNextCompactResponse=false;throw Error('Simulated lost confirmation response')}
      return {data:{pick_id:args.p_id,option_id:args.p_option,save_id:args.p_save_id,item,destination:'club',revision:2,cloud_revision:2,replayed:wasClaimed},error:null};
     }
     return {data:name==='footera_list_player_picks'?(claimed||window.noAvailablePicks?[]:[testOffer]):testOffer,error:null};
    }
   };
   FooteraOnline.authClient=async()=>client;
   FooteraAccount.autoAttachAndBackup=async()=>{window.cloudAutoSyncCalls++};
   state.weeklyRewards=[{mode:'champions',week:'old-week',claimed:true,reward:{playerPicks:[{}]}}];
   window.noAvailablePicks=true;
   window.originalPickRewardSync=FooteraAccount.syncPlayerPickRewards;
   FooteraAccount.syncPlayerPickRewards=()=>new Promise(resolve=>{window.releasePickRewardSync=resolve});
   localStorage.setItem('footera-cloud-sync-point-v1',JSON.stringify({userId:'test-owner',saveId:'pick-test',revision:1}));
   renderAll();switchView('storeView',{push:false});
  });
  // The Verein > Spezial filter must include every custom card family,
  // not only items whose computed CSS card class is literally "special".
  const qualityCounts=await page.evaluate(()=>{
   const b=window.testOffer.options[0].item;
   const base=(uid,overrides={})=>({...b,uid,variant:'',eventName:'',eventType:'',cosmeticDesign:'',evo:0,...overrides});
   const preserved=state.club;
   state.club=[
    base('normal-gold'),
    base('own-icon',{variant:'icon-mid'}),
    base('own-momentum',{variant:'special',eventType:'momentum',eventName:'MOMENTUM'}),
    base('own-evolution',{evo:2,evoStats:{pac:3}}),
    base('own-cosmetic',{cosmeticDesign:'champions'}),
    founderItem()
   ];
   document.getElementById('clubRarity').value='special';
   renderClub();
   const special=document.querySelectorAll('#clubGrid .club-item').length;
   document.getElementById('clubRarity').value='gold';
   renderClub();
   const gold=document.querySelectorAll('#clubGrid .club-item').length;
   document.getElementById('clubRarity').value='';
   state.club=preserved;renderClub();
   return {special,gold};
  });
  // Since V21.315 a plain Evolution also counts as the quality of its rating (here Gold).
  assert.deepEqual(qualityCounts,{special:5,gold:2},'Verein Spezial includes icon, momentum, evolution, cosmetics and founder; Gold includes the gold-rated Evolution');
  assert.deepEqual(errors,[],'Immutable Founder cards render with PlayStyles without JavaScript errors');
  await page.waitForFunction(()=>typeof window.releasePickRewardSync==='function');
  assert.equal(await page.locator('#homePlayerPickNotice').isVisible(),false,'Historical rewards plus a pending sync cannot announce an open Pick');
  assert.equal(await page.locator('#homePlayerPickCount').textContent(),'0');
  assert.match(await page.locator('#playerPicks .pick-status').textContent(),/werden mit dem Konto abgeglichen/);
  await page.evaluate(()=>window.releasePickRewardSync());
  await page.waitForFunction(()=>!document.querySelector('[data-picks-refresh]').disabled);
  assert.equal(await page.locator('#homePlayerPickNotice').isVisible(),false,'An empty server list keeps the banner hidden after sync');
  await page.evaluate(()=>{
   state.weeklyRewards=[];window.noAvailablePicks=false;
   FooteraAccount.syncPlayerPickRewards=window.originalPickRewardSync;
   return FooteraPlayerPicks.refresh(true);
  });
  assert.equal(await page.locator('#homePlayerPickCount').textContent(),'1','One real server Pick shows exactly one');
  assert.equal(await page.evaluate(()=>window.cloudAutoSyncCalls),0,'Listing Picks must not trigger full cloud synchronization');
  await page.evaluate(()=>switchView('homeView',{push:false,scroll:false}));
  assert.equal(await page.locator('#homePlayerPickNotice').isVisible(),true,'Home banner for outstanding Picks');
  assert.match(await page.locator('#homePlayerPickCopy').textContent(),/1 Player Pick/);
  await page.locator('[data-picks-jump]').click();
  assert.equal(await page.locator('#storeView.active').count(),1,'Home banner routes to Store');
  await page.evaluate(()=>{window.holdPickOpen=true});
  await page.locator('[data-pick-open]').click();
  await page.locator('#playerPickModal.active').waitFor();
  await page.waitForFunction(()=>typeof window.releasePickOpen==='function');
  await page.goBack();
  assert.equal(await page.locator('#playerPickModal.active').count(),1,'Back cannot hide an in-flight Pick');
  await page.evaluate(()=>{window.holdPickOpen=false;window.releasePickOpen()});
  // Loading can resolve between individual Playwright reads; only the
  // fully available offer is a stable assertion across fast and slow devices.
  try{await page.locator('.pick-option').first().waitFor({timeout:8000})}
  catch(e){
   const diagnostics=await page.evaluate(()=>({feedback:document.querySelector('#playerPickFeedback')?.textContent,description:document.querySelector('#playerPickDescription')?.textContent,visibleOptions:document.querySelectorAll('.pick-option').length,loading:document.querySelectorAll('.pick-loading-card').length}));
   throw Error('Player Pick opening failed: '+JSON.stringify(diagnostics)+'; '+e.message);
  }
  await page.goBack();
  await page.waitForFunction(()=>!FooteraPlayerPicks.isActive());
  assert.equal(await page.locator('#playerPickModal.active').count(),0,'Back closes an idle Pick');
  await page.locator('[data-pick-open]').click();
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
  await page.locator('[data-pick-close]').click();
  await page.evaluate(()=>{
   const options=window.testOffer.options;
   state.sbcStorage=[
    {...options[0].item,uid:'stored-exact-duplicate'},
    {...options[1].item,uid:'stored-different-promo',eventName:'A different event'}
   ];
  });
  await page.locator('[data-pick-open]').click();
  await page.locator('.pick-option').first().waitFor();
  assert.equal(await page.locator('.pick-option').count(),4);
  assert.equal(await page.locator('.pick-option.duplicate').count(),1,'Only an exact same-version card counts as duplicate');
  await page.locator('.pick-option').first().click();
  assert.equal(await page.locator('.pick-option.revealed').count(),1);
  assert.equal(await page.locator('.pick-option.revealed .pick-duplicate-badge').count(),1,'A revealed owned card has a duplicate ribbon');
  assert.match(await page.locator('.pick-option').first().locator('.pick-select-label').textContent(),/Duplikat/);
  await page.evaluate(async()=>{state.sbcStorage=[];flushSave();await FooteraAccount.saveCloud();window.pickTransportCalls=[]});
  assert.ok(await page.locator('[data-pick-confirm]').isDisabled(),'Reveal alone must not select a player');
  await page.locator('.pick-option').first().click();assert.ok(await page.locator('[data-pick-confirm]').isEnabled());
  await page.evaluate(()=>{window.dropNextCompactResponse=true});
  await page.locator('[data-pick-confirm]').click();
  await page.waitForFunction(()=>document.getElementById('playerPickFeedback').textContent.includes('Simulated lost'));
  assert.ok(await page.evaluate(()=>!!FooteraAccount.pendingPlayerPick()),'lost response retains the accepted option');
  assert.equal(await page.evaluate(()=>state.club.length),0,'unconfirmed response must not invent a delivery');
  await page.locator('[data-pick-close]').click();
  await page.waitForFunction(()=>state.club.length===1&&!FooteraAccount.pendingPlayerPick());
  await page.evaluate(()=>FooteraPlayerPicks.applyDelivery(window.testDelivery));
  assert.deepEqual(await page.evaluate(()=>window.pickTransportCalls),['footera_choose_player_pick_compact','footera_choose_player_pick_compact']);
  assert.equal(await page.evaluate(()=>FooteraAccount.pendingPlayerPick()),null);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('footera-cloud-sync-point-v1')).revision),2);
  assert.equal(await page.evaluate(()=>state.club.length),1);assert.equal(await page.evaluate(()=>state.club[0].tradeable),false);
  assert.equal(await page.evaluate(()=>Object.keys(state.playerPickClaims).length),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gerliesFutV9')).club.length),1);
  assert.equal(await page.locator('[data-pick-open]').count(),0);
  assert.equal(await page.evaluate(()=>document.getElementById('homePlayerPickNotice').hidden),true,'Home Pick hint disappears after claim');
  assert.equal(await page.evaluate(()=>cardClass(displayBase(state.club[0]),state.club[0])),'champions-red');
  assert.deepEqual(errors,[]);console.log('PASS reopen, confirm, duplicate delivery, stored red card and consumed pick');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
